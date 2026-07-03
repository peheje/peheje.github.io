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
function findTranslationTM(cv, canvasA, canvasB) {
    postLog(`TM [Step 1]: Reading image dimensions (${canvasA.width}x${canvasA.height})...`);

    // Downsample to ~400px wide for speed
    const targetW = 400;
    const scale = targetW / canvasA.width;
    const targetH = Math.round(canvasA.height * scale);

    postLog(`TM [Step 2]: Downsampling on canvas to ${targetW}x${targetH}...`);
    const smallCanvasA = new OffscreenCanvas(targetW, targetH);
    const ctxA = smallCanvasA.getContext("2d");
    ctxA.drawImage(canvasA, 0, 0, targetW, targetH);

    const smallCanvasB = new OffscreenCanvas(targetW, targetH);
    const ctxB = smallCanvasB.getContext("2d");
    ctxB.drawImage(canvasB, 0, 0, targetW, targetH);

    const imgDataA = ctxA.getImageData(0, 0, targetW, targetH);
    const imgDataB = ctxB.getImageData(0, 0, targetW, targetH);

    postLog("TM [Step 3]: Allocating OpenCV RGBA matrices...");
    let smallA = matFromImageData(cv, imgDataA);
    let smallB = matFromImageData(cv, imgDataB);

    postLog("TM [Step 4]: Converting matrices to Grayscale...");
    let grayA = new cv.Mat();
    let grayB = new cv.Mat();
    cv.cvtColor(smallA, grayA, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(smallB, grayB, cv.COLOR_RGBA2GRAY);

    const templateHeight = Math.max(10, Math.floor(targetH * 0.08)); // 8% strip height
    const margin = 40; // 40px margin on each side for horizontal search
    const templateW = targetW - 2 * margin; // 320px template width

    const candidateRatios = [0.72, 0.76, 0.80, 0.84, 0.88, 0.92];

    let bestScore = -Infinity;
    let bestMatchY = 0;
    let bestMatchX = 0;
    let bestTemplateTop = 0;

    postLog(`TM [Step 5]: Testing ${candidateRatios.length} candidate template positions...`);
    for (const ratio of candidateRatios) {
        const templateTop = Math.floor(targetH * ratio);
        if (templateTop + templateHeight >= targetH) continue;

        // Crop centered template from A
        const template = grayA.roi(new cv.Rect(margin, templateTop, templateW, templateHeight));
        const result = new cv.Mat();
        
        // Match against full width search region of B
        cv.matchTemplate(grayB, template, result, cv.TM_CCOEFF_NORMED);

        const minMaxLoc = cv.minMaxLoc(result);
        const score = minMaxLoc.maxVal;
        postLog(`  Template at ${(ratio*100).toFixed(0)}%: score=${score.toFixed(3)} at pos=(${minMaxLoc.maxLoc.x}, ${minMaxLoc.maxLoc.y})`);

        if (score > bestScore) {
            bestScore = score;
            bestMatchY = minMaxLoc.maxLoc.y;
            bestMatchX = minMaxLoc.maxLoc.x;
            bestTemplateTop = templateTop;
        }

        template.delete();
        result.delete();
    }

    postLog(`TM [Step 6]: Best overall score=${bestScore.toFixed(3)}, templateTop=${bestTemplateTop}, matchY=${bestMatchY}, matchX=${bestMatchX}`);

    if (bestScore < 0.2) {
        postLog("WARNING: Very low match score — results may be unreliable.");
    }

    // dx: bestMatchX is the left edge of the matched template in B.
    // If B has no horizontal shift, the template matches at matchX = margin.
    // dy: negative when B is below A
    const dx_small = bestMatchX - margin;
    const dy_small = bestMatchY - bestTemplateTop;

    const original_dx = Math.round(dx_small / scale);
    const original_dy = Math.round(dy_small / scale);

    postLog(`TM [Step 7]: TM Alignment result: dx=${original_dx}, dy=${original_dy}`);

    // Cleanup
    smallA.delete(); smallB.delete();
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

// Perform layout, blending, and cropping on OffscreenCanvas
function stitchImages(canvases, X, Y, canvasW, canvasH) {
    const canvas = new OffscreenCanvas(canvasW, canvasH);
    const ctx = canvas.getContext("2d");

    // Draw first image
    ctx.drawImage(canvases[0], X[0], Y[0]);

    for (let i = 1; i < canvases.length; i++) {
        const img = canvases[i];
        const yi = Y[i];
        const xi = X[i];
        const yp = Y[i - 1];
        const hp = canvases[i - 1].height;

        const overlapStart = yi;
        const overlapEnd = yp + hp;

        if (overlapEnd > overlapStart) {
            const overlapMid = Math.floor((overlapStart + overlapEnd) / 2);
            const blendH = 80;
            const b1 = Math.floor(overlapMid - blendH / 2);
            const b2 = Math.floor(overlapMid + blendH / 2);

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
    }

    // Crop horizontally to eliminate black side borders
    const startX = Math.max(...X);
    const endX = Math.min(...X.map((x, idx) => x + canvases[idx].width));
    const croppedW = Math.max(1, endX - startX);

    postLog(`Cropping horizontal borders. Width: ${canvasW}px -> ${croppedW}px.`);

    const croppedCanvas = new OffscreenCanvas(croppedW, canvasH);
    const croppedCtx = croppedCanvas.getContext("2d");
    croppedCtx.drawImage(canvas, startX, 0, croppedW, canvasH, 0, 0, croppedW, canvasH);

    return croppedCanvas;
}

// Listen for messages from the main thread
self.onmessage = async function (e) {
    const data = e.data;
    if (data.action !== "stitch") return;

    postLog("Background worker starting stitching process...");

    try {
        const bitmaps = data.bitmaps;
        const direction = data.direction;

        postStatus("Converting image bitmaps in background...");
        let canvases = bitmaps.map(bitmapToCanvas);
        postLog(`Converted ${canvases.length} bitmaps to OffscreenCanvas.`);

        if (direction === "horizontal") {
            postStatus("Rotating images for horizontal alignment...");
            canvases = canvases.map(rotateCanvas90CW);
            postLog("Images rotated 90 degrees clockwise.");
        }

        postStatus("Initializing OpenCV WebAssembly on background thread...");
        const { cv } = await initOpenCV();
        postLog("OpenCV ready.");

        postStatus("Aligning images on background thread...");
        const DX = [0];
        const DY = [0];

        for (let i = 1; i < canvases.length; i++) {
            postStatus(`Aligning Image ${i} -> Image ${i+1}...`);
            const shift = findTranslationTM(cv, canvases[i-1], canvases[i]);
            postLog(`Pair ${i}->${i+1}: dx=${shift.dx}, dy=${shift.dy}`);
            DX.push(shift.dx);
            DY.push(shift.dy);
        }

        // Calculate absolute offsets (img_i is below img_{i-1}, so dy is positive)
        const X = [0];
        const Y = [0];
        for (let i = 1; i < canvases.length; i++) {
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

        // Canvas dimensions
        const canvasW = Math.max(...normX.map((x, idx) => x + canvases[idx].width));
        const canvasH = Math.max(...normY.map((y, idx) => y + canvases[idx].height));
        postLog(`Output canvas size: ${canvasW}x${canvasH}`);

        postStatus("Blending and stitching seams on background thread...");
        let stitchedCanvas = stitchImages(canvases, normX, normY, canvasW, canvasH);

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
