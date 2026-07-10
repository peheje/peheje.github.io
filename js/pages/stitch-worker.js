/* global importScripts */
let cvPromise = null;

function postStatus(msg) {
    self.postMessage({ action: "status", message: msg });
}

// Ensure logs are posted and flushed
function postLog(msg) {
    self.postMessage({ action: "log", message: msg });
}

// Load OpenCV.js inside the background worker
// Returns a Promise resolving to a wrapper object { cv } to avoid Emscripten's thenable promise hang.
function initOpenCV() {
    if (cvPromise) return cvPromise;
    cvPromise = new Promise((resolve, reject) => {
        if (self.cv && typeof self.cv.Mat === "function") {
            resolve({ cv: self.cv });
            return;
        }

        const cdnUrl = "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.9.0-release.2/dist/opencv.js";
        postLog(`Worker loading OpenCV.js from CDN: ${cdnUrl}`);

        try {
            importScripts(cdnUrl);

            let pollCount = 0;
            const maxPoll = 400; // 20s timeout
            const pollInterval = setInterval(() => {
                pollCount++;
                if (self.cv && typeof self.cv.Mat === "function") {
                    clearInterval(pollInterval);
                    postLog(`OpenCV.js successfully initialized in worker (polled ${pollCount} times).`);
                    resolve({ cv: self.cv });
                } else if (pollCount >= maxPoll) {
                    clearInterval(pollInterval);
                    reject(new Error("Timeout initializing OpenCV.js inside background worker."));
                }
            }, 50);
        } catch (e) {
            reject(new Error(`Failed to load OpenCV.js script in worker: ${e.message}`));
        }
    });
    return cvPromise;
}

// Create a cv.Mat from an ImageData object manually
function matFromImageData(cv, imgData) {
    const mat = new cv.Mat(imgData.height, imgData.width, cv.CV_8UC4);
    mat.data.set(imgData.data);
    return mat;
}

// Template Matching using OpenCV's TM_CCOEFF_NORMED.
// Tries multiple template positions (72%–92% from top of A) and picks the one
// with the highest match score — robust to varying overlap sizes.
// Uses a 320px wide centered template in a 400px wide search space to allow
// horizontal alignment shifts up to ~600px.
function findTranslationTM(cv, smallA, smallB, originalW, originalH, direction) {
    postLog(`TM [Step 1]: Matching template on downsampled matrices (${smallA.width}x${smallA.height})...`);

    const targetW = 400;
    const scale = direction === "horizontal" ? (targetW / originalH) : (targetW / originalW);

    const imgDataA = smallA.getContext("2d").getImageData(0, 0, smallA.width, smallA.height);
    const imgDataB = smallB.getContext("2d").getImageData(0, 0, smallB.width, smallB.height);

    postLog("TM [Step 2]: Allocating OpenCV RGBA matrices...");
    let matA = matFromImageData(cv, imgDataA);
    let matB = matFromImageData(cv, imgDataB);

    postLog("TM [Step 3]: Converting matrices to Grayscale...");
    let grayA = new cv.Mat();
    let grayB = new cv.Mat();
    cv.cvtColor(matA, grayA, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(matB, grayB, cv.COLOR_RGBA2GRAY);

    const templateHeight = Math.max(10, Math.floor(smallA.height * 0.08)); // 8% strip height
    const margin = 40; // 40px margin on each side for horizontal search
    const templateW = targetW - 2 * margin; // 320px template width

    const candidateRatios = [0.72, 0.76, 0.80, 0.84, 0.88, 0.92];

    let bestScore = -Infinity;
    let bestMatchY = 0;
    let bestMatchX = 0;
    let bestTemplateTop = 0;

    postLog(`TM [Step 4]: Testing ${candidateRatios.length} candidate template positions...`);
    for (const ratio of candidateRatios) {
        const templateTop = Math.floor(smallA.height * ratio);
        if (templateTop + templateHeight >= smallA.height) continue;

        // Crop centered template from A
        const template = grayA.roi(new cv.Rect(margin, templateTop, templateW, templateHeight));
        const result = new cv.Mat();
        
        // Match against full width search region of B
        cv.matchTemplate(grayB, template, result, cv.TM_CCOEFF_NORMED);

        const minMaxLoc = cv.minMaxLoc(result);
        const score = minMaxLoc.maxVal;

        if (score > bestScore) {
            bestScore = score;
            bestMatchY = minMaxLoc.maxLoc.y;
            bestMatchX = minMaxLoc.maxLoc.x;
            bestTemplateTop = templateTop;
        }

        template.delete();
        result.delete();
    }

    const dx_small = bestMatchX - margin;
    const dy_small = bestMatchY - bestTemplateTop;

    const original_dx = Math.round(dx_small / scale);
    const original_dy = Math.round(dy_small / scale);

    postLog(`TM [Step 5]: TM Alignment result: dx=${original_dx}, dy=${original_dy}`);

    // Cleanup
    matA.delete(); matB.delete();
    grayA.delete(); grayB.delete();

    return { dx: original_dx, dy: original_dy };
}

// Convert ImageBitmap to OffscreenCanvas
function bitmapToCanvas(bitmap) {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    return canvas;
}

// Rotate canvas 90 degrees clockwise
function rotateCanvas90CW(canvas) {
    const rotated = new OffscreenCanvas(canvas.height, canvas.width);
    const ctx = rotated.getContext("2d");
    ctx.translate(canvas.height, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(canvas, 0, 0);
    return rotated;
}

// Rotate canvas 90 degrees counter-clockwise
function rotateCanvas90CCW(canvas) {
    const rotated = new OffscreenCanvas(canvas.height, canvas.width);
    const ctx = rotated.getContext("2d");
    ctx.translate(0, canvas.width);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(canvas, 0, 0);
    return rotated;
}

// Perform layout, blending, and cropping on OffscreenCanvas sequentially (one high-res image decoded at a time)
async function stitchImages(files, X, Y, canvasW, canvasH, direction, widths, heights, brightnessLevels, autoExposure) {
    const canvas = new OffscreenCanvas(canvasW, canvasH);
    const ctx = canvas.getContext("2d");

    postStatus("Stitching Image 1/" + files.length + "...");
    let img = await loadResizedCanvas(files[0], widths[0], heights[0], direction);
    if (brightnessLevels && brightnessLevels[0] !== 0) {
        applyBrightnessOffset(img, brightnessLevels[0]);
    }
    ctx.drawImage(img, X[0], Y[0]);
    img.width = 0; img.height = 0; // Release memory

    for (let i = 1; i < files.length; i++) {
        postStatus(`Stitching Image ${i + 1}/${files.length}...`);
        img = await loadResizedCanvas(files[i], widths[i], heights[i], direction);
        if (brightnessLevels && brightnessLevels[i] !== 0) {
            applyBrightnessOffset(img, brightnessLevels[i]);
        }

        const yi = Y[i];
        const xi = X[i];
        const yp = Y[i - 1];
        const hp = heights[i - 1];

        const overlapStart = yi;
        const overlapEnd = yp + hp;

        if (overlapEnd > overlapStart) {
            const overlapMid = Math.floor((overlapStart + overlapEnd) / 2);
            const blendH = 80;
            const b1 = Math.floor(overlapMid - blendH / 2);
            const b2 = Math.floor(overlapMid + blendH / 2);

            // Run auto exposure correction if requested
            if (autoExposure) {
                matchExposure(img, ctx, xi, yi, overlapStart, overlapEnd);
            }

            postLog(`Blending seam between Image ${i} and Image ${i+1} at rows [${b1} - ${b2}]`);

            // Draw region of new image below the blend zone
            if (img.height - (b2 - yi) > 0) {
                ctx.drawImage(
                    img,
                    0, b2 - yi, img.width, img.height - (b2 - yi),
                    xi, b2, img.width, img.height - (b2 - yi)
                );
            }

            // Fetch existing (previous image) pixels in blend zone
            const imgDataPrev = ctx.getImageData(xi, b1, img.width, blendH);

            // Fetch new image pixels in blend zone
            const sliceCanvas = new OffscreenCanvas(img.width, blendH);
            const sliceCtx = sliceCanvas.getContext("2d");
            sliceCtx.drawImage(img, 0, b1 - yi, img.width, blendH, 0, 0, img.width, blendH);
            const imgDataNew = sliceCtx.getImageData(0, 0, img.width, blendH);

            // Linear blend
            for (let y = 0; y < blendH; y++) {
                const alpha = y / (blendH - 1);
                for (let x = 0; x < img.width; x++) {
                    const idx = (y * img.width + x) * 4;
                    imgDataPrev.data[idx]     = imgDataPrev.data[idx]     * (1 - alpha) + imgDataNew.data[idx]     * alpha;
                    imgDataPrev.data[idx + 1] = imgDataPrev.data[idx + 1] * (1 - alpha) + imgDataNew.data[idx + 1] * alpha;
                    imgDataPrev.data[idx + 2] = imgDataPrev.data[idx + 2] * (1 - alpha) + imgDataNew.data[idx + 2] * alpha;
                    imgDataPrev.data[idx + 3] = 255;
                }
            }
            ctx.putImageData(imgDataPrev, xi, b1);
        } else {
            postLog(`No vertical overlap between Image ${i} and Image ${i+1}. Stacking directly.`);
            ctx.drawImage(img, xi, yi);
        }
        img.width = 0; img.height = 0; // Release memory
    }

    // Crop horizontally to eliminate black side borders
    const startX = Math.max(...X);
    const endX = Math.min(...X.map((x, idx) => x + widths[idx]));
    const croppedW = Math.max(1, endX - startX);

    postLog(`Cropping horizontal borders. Width: ${canvasW}px -> ${croppedW}px.`);

    const croppedCanvas = new OffscreenCanvas(croppedW, canvasH);
    const croppedCtx = croppedCanvas.getContext("2d");
    croppedCtx.drawImage(canvas, startX, 0, croppedW, canvasH, 0, 0, croppedW, canvasH);
    canvas.width = 0; canvas.height = 0; // Release memory

    return croppedCanvas;
}

// Apply brightness gain using direct color multiplier
function applyBrightnessGain(imgCanvas, gain) {
    const imgCtx = imgCanvas.getContext("2d");
    const fullData = imgCtx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);
    const dataLen = fullData.data.length;
    for (let i = 0; i < dataLen; i += 4) {
        fullData.data[i]   = Math.max(0, Math.min(255, Math.round(fullData.data[i]   * gain))); // R
        fullData.data[i+1] = Math.max(0, Math.min(255, Math.round(fullData.data[i+1] * gain))); // G
        fullData.data[i+2] = Math.max(0, Math.min(255, Math.round(fullData.data[i+2] * gain))); // B
    }
    imgCtx.putImageData(fullData, 0, 0);
}

// Convert brightness percentage to multiplier and apply
function applyBrightnessOffset(imgCanvas, percentage) {
    const gain = 1 + (percentage / 100);
    applyBrightnessGain(imgCanvas, gain);
    postLog(`Applied ${percentage >= 0 ? "+" : ""}${percentage}% manual brightness offset.`);
}

// Auto match exposure between new image and existing canvas in the overlap region
function matchExposure(imgCanvas, canvasCtx, xi, yi, overlapStart, overlapEnd) {
    const overlapH = overlapEnd - overlapStart;
    if (overlapH <= 10) return; // too small overlap
    
    // We sample a centered strip of the overlap zone to compute average brightness
    const sampleW = Math.min(200, imgCanvas.width);
    const sampleX = Math.floor((imgCanvas.width - sampleW) / 2);
    
    const prevData = canvasCtx.getImageData(xi + sampleX, overlapStart, sampleW, overlapH);
    
    const sliceCanvas = new OffscreenCanvas(sampleW, overlapH);
    const sliceCtx = sliceCanvas.getContext("2d");
    sliceCtx.drawImage(imgCanvas, sampleX, overlapStart - yi, sampleW, overlapH, 0, 0, sampleW, overlapH);
    const newData = sliceCtx.getImageData(0, 0, sampleW, overlapH);
    
    let sumPrev = 0;
    let sumNew = 0;
    let count = 0;
    
    const len = prevData.data.length;
    for (let i = 0; i < len; i += 4) {
        const rP = prevData.data[i];
        const gP = prevData.data[i+1];
        const bP = prevData.data[i+2];
        const aP = prevData.data[i+3];
        
        const rN = newData.data[i];
        const gN = newData.data[i+1];
        const bN = newData.data[i+2];
        const aN = newData.data[i+3];
        
        if (aP > 200 && aN > 200) {
            const lumP = 0.299 * rP + 0.587 * gP + 0.114 * bP;
            const lumN = 0.299 * rN + 0.587 * gN + 0.114 * bN;
            
            if (lumP > 5 && lumN > 5) {
                sumPrev += lumP;
                sumNew += lumN;
                count++;
            }
        }
    }
    
    if (count > 100) {
        const ratio = sumPrev / sumNew;
        const finalRatio = Math.max(0.5, Math.min(2.0, ratio));
        postLog(`Auto Exposure: gain ratio calculated as ${finalRatio.toFixed(3)} based on ${count} pixels.`);
        
        if (Math.abs(finalRatio - 1.0) > 0.01) {
            applyBrightnessGain(imgCanvas, finalRatio);
        }
    }
}

// Helper to load and resize image directly on decoding to save RAM/VRAM
async function loadResizedCanvas(file, targetW, targetH, direction) {
    let bitmap;
    try {
        const decodeW = direction === "horizontal" ? targetH : targetW;
        bitmap = await createImageBitmap(file, { resizeWidth: decodeW });
    } catch (e) {
        bitmap = await createImageBitmap(file);
    }
    
    let img = bitmapToCanvas(bitmap);
    bitmap.close();
    
    if (direction === "horizontal") {
        img = rotateCanvas90CW(img);
    }
    
    if (img.width !== targetW || img.height !== targetH) {
        const scaled = new OffscreenCanvas(targetW, targetH);
        const ctx = scaled.getContext("2d");
        ctx.drawImage(img, 0, 0, targetW, targetH);
        img.width = 0; img.height = 0; // Release memory
        return scaled;
    }
    return img;
}

// Helper to load a file/blob as a low-res canvas for alignment
async function loadLowResCanvasForAlignment(file, direction) {
    let bitmap = await createImageBitmap(file);
    const originalW = bitmap.width;
    const originalH = bitmap.height;
    
    let targetW = 400;
    let scale, targetH, canvas;
    
    if (direction === "horizontal") {
        scale = targetW / originalH;
        targetH = Math.round(originalW * scale);
        
        const tempCanvas = new OffscreenCanvas(Math.round(originalW * scale), Math.round(originalH * scale));
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(bitmap, 0, 0, tempCanvas.width, tempCanvas.height);
        
        canvas = rotateCanvas90CW(tempCanvas);
    } else {
        scale = targetW / originalW;
        targetH = Math.round(originalH * scale);
        
        canvas = new OffscreenCanvas(targetW, targetH);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    }
    
    bitmap.close();
    return { canvas, originalW, originalH };
}

// Dynamic test to check maximum canvas width/height supported by device GPU
function getMaxCanvasDimension() {
    const testSizes = [16384, 8192, 4096];
    for (const size of testSizes) {
        try {
            const canvas = new OffscreenCanvas(size, size);
            const ctx = canvas.getContext("2d");
            if (ctx) return size;
        } catch (e) {}
    }
    return 4096;
}

// Listen for messages from the main thread
self.onmessage = async function (e) {
    const data = e.data;
    if (data.action !== "stitch") return;

    postLog("Background worker starting stitching process...");

    try {
        const files = data.files;
        const direction = data.direction;
        const brightnessLevels = data.brightnessLevels;
        const autoExposure = data.autoExposure;

        postStatus("Decoding low-res images for alignment...");
        const lowResData = [];
        for (let i = 0; i < files.length; i++) {
            postStatus(`Decoding low-res Image ${i + 1}/${files.length}...`);
            const loaded = await loadLowResCanvasForAlignment(files[i], direction);
            lowResData.push(loaded);
        }
        postLog(`Loaded ${lowResData.length} low-res canvases.`);

        postStatus("Initializing OpenCV WebAssembly on background thread...");
        const { cv } = await initOpenCV();
        postLog("OpenCV ready.");

        postStatus("Aligning images on background thread...");
        const DX = [0];
        const DY = [0];

        for (let i = 1; i < lowResData.length; i++) {
            postStatus(`Aligning Image ${i} -> Image ${i+1}...`);
            const shift = findTranslationTM(
                cv, 
                lowResData[i-1].canvas, 
                lowResData[i].canvas, 
                lowResData[i-1].originalW, 
                lowResData[i-1].originalH, 
                direction
            );
            DX.push(shift.dx);
            DY.push(shift.dy);
        }

        // Clean up low-res canvases immediately
        lowResData.forEach(item => {
            item.canvas.width = 0;
            item.canvas.height = 0;
        });

        // Calculate absolute offsets
        const X = [0];
        const Y = [0];
        for (let i = 1; i < files.length; i++) {
            X.push(X[i-1] - DX[i]);
            Y.push(Y[i-1] - DY[i]);
        }

        postLog(`Raw positions: X=${JSON.stringify(X)}, Y=${JSON.stringify(Y)}`);

        // Normalize to positive coordinates
        const minX = Math.min(...X);
        const minY = Math.min(...Y);
        const normX = X.map(x => x - minX);
        const normY = Y.map(y => y - minY);

        postLog(`Normalized positions: X=${JSON.stringify(normX)}, Y=${JSON.stringify(normY)}`);

        // Get high-res dimensions for each image when placed (rotated if horizontal)
        let widths = [];
        let heights = [];
        for (let i = 0; i < files.length; i++) {
            const origW = lowResData[i].originalW;
            const origH = lowResData[i].originalH;
            if (direction === "horizontal") {
                widths.push(origH);
                heights.push(origW);
            } else {
                widths.push(origW);
                heights.push(origH);
            }
        }

        // Canvas dimensions
        let canvasW = Math.max(...normX.map((x, idx) => x + widths[idx]));
        let canvasH = Math.max(...normY.map((y, idx) => y + heights[idx]));
        postLog(`Calculated full-res output canvas size: ${canvasW}x${canvasH}`);

        // Check device limits to prevent Aw Snap crashes
        const maxDim = getMaxCanvasDimension();
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const maxArea = isMobile ? 60000000 : 400000000; // 60MP for mobile, 400MP for desktop

        let s = 1.0;
        if (canvasW > maxDim) s = Math.min(s, maxDim / canvasW);
        if (canvasH > maxDim) s = Math.min(s, maxDim / canvasH);
        const currentArea = canvasW * canvasH;
        if (currentArea * s * s > maxArea) s = Math.min(s, Math.sqrt(maxArea / currentArea));

        let normX_scaled = normX;
        let normY_scaled = normY;

        if (s < 1.0) {
            postLog(`Canvas size ${canvasW}x${canvasH} exceeds limits (max dimension: ${maxDim}, max area: ${maxArea}px). Auto-scaling stitching pipeline to ${(s * 100).toFixed(1)}% to fit device hardware...`);
            normX_scaled = normX.map(x => Math.round(x * s));
            normY_scaled = normY.map(y => Math.round(y * s));
            widths = widths.map(w => Math.round(w * s));
            heights = heights.map(h => Math.round(h * s));
            canvasW = Math.round(canvasW * s);
            canvasH = Math.round(canvasH * s);
            postLog(`New scaled canvas size: ${canvasW}x${canvasH}`);
        }

        postStatus("Blending and stitching seams on background thread...");
        let stitchedCanvas = await stitchImages(files, normX_scaled, normY_scaled, canvasW, canvasH, direction, widths, heights, brightnessLevels, autoExposure);

        if (direction === "horizontal") {
            postStatus("Rotating stitched panorama back...");
            stitchedCanvas = rotateCanvas90CCW(stitchedCanvas);
            postLog("Stitched panorama rotated 90 degrees counter-clockwise.");
        }

        postStatus("Encoding output panorama to JPEG...");
        const blob = await stitchedCanvas.convertToBlob({
            type: "image/jpeg",
            quality: 0.90
        });

        postLog(`Background stitching completed! Output: ${stitchedCanvas.width}x${stitchedCanvas.height}, ${(blob.size/1024/1024).toFixed(1)}MB`);
        self.postMessage({
            action: "success",
            blob: blob,
            width: stitchedCanvas.width,
            height: stitchedCanvas.height
        });

    } catch (err) {
        postLog(`Worker Error: ${err.stack || err.message}`);
        self.postMessage({ action: "error", message: err.message });
    }
};
