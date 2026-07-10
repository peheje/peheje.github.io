import { mountSiteShell } from "../site.js";

// Initialize the site shell navigation/themes
mountSiteShell();

const heic2anyUrl = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
let heic2anyLoadPromise = null;
let selectedFilesList = [];
const heicCache = new Map();

// Helper to get element by ID
function getElement(id) {
    return document.getElementById(id);
}

// Log message to visible debug console textbox
function logDebug(message) {
    const debugEl = getElement("debug-log");
    if (debugEl) {
        debugEl.value += `[${new Date().toLocaleTimeString()}] ${message}\n`;
        debugEl.scrollTop = debugEl.scrollHeight; // Scroll to bottom
    }
    console.log(message);
}

// Set progress status
function setStatus(message) {
    getElement("stitch-status").textContent = message;
    logDebug(message);
}

// Global window error logger
window.addEventListener("error", (e) => {
    logDebug(`Global JS Error: ${e.message} at ${e.filename}:${e.lineno}`);
});

// Helper to load external scripts dynamically
function loadScript(url, globalName, errorMessage) {
    if (window[globalName]) {
        return Promise.resolve(window[globalName]);
    }
    return new Promise((resolve, reject) => {
        logDebug(`Loading script: ${url}...`);
        const script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.onload = () => {
            if (window[globalName]) {
                logDebug(`Successfully loaded script: ${globalName}`);
                resolve(window[globalName]);
            } else {
                reject(new Error(errorMessage));
            }
        };
        script.onerror = () => reject(new Error(errorMessage));
        document.head.append(script);
    });
}

function loadHeic2Any() {
    heic2anyLoadPromise ||= loadScript(heic2anyUrl, "heic2any", "Could not load the HEIC converter library.");
    return heic2anyLoadPromise;
}

// Convert HEIC file to standard JPEG blob using heic2any
async function convertHeicToJpeg(file) {
    const cacheKey = `${file.name}_${file.size}`;
    if (heicCache.has(cacheKey)) {
        logDebug(`Using cached JPEG conversion for: ${file.name}`);
        return heicCache.get(cacheKey);
    }
    await loadHeic2Any();
    setStatus(`Converting HEIC to JPEG: ${file.name}...`);
    const resultBlob = await window.heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.8
    });
    const blob = Array.isArray(resultBlob) ? resultBlob[0] : resultBlob;
    logDebug(`HEIC conversion finished for ${file.name}. Size: ${(blob.size/1024).toFixed(1)} KB`);
    const jpegFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
    heicCache.set(cacheKey, jpegFile);
    return jpegFile;
}

// Main stitching trigger function spawning background worker
async function processStitch() {
    if (selectedFilesList.length < 2) return;

    const stitchBtn = getElement("stitch-btn");
    const clearBtn = getElement("clear-btn");
    stitchBtn.disabled = true;
    clearBtn.disabled = true;

    // Clear logs for new session
    const debugEl = getElement("debug-log");
    if (debugEl) debugEl.value = "";

    logDebug("Starting smart panorama stitch in Web Worker...");
    try {
        const direction = document.querySelector('input[name="stitch-direction"]:checked').value;
        const order = document.querySelector('input[name="stitch-order"]:checked').value;
        logDebug(`Stitching direction: ${direction}, sorting order: ${order}`);

        // Sort files alphabetically based on order setting
        const sortedFiles = [...selectedFilesList].sort((a, b) => {
            return order === "newest" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
        });

        setStatus("Processing files...");
        const processedFiles = [];
        
        for (const file of sortedFiles) {
            let activeFile = file;
            if (file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
                activeFile = await convertHeicToJpeg(file);
            }
            processedFiles.push(activeFile);
        }

        setStatus("Spawning background worker thread...");
        
        // Spawn background worker
        const worker = new Worker("js/pages/stitch-worker.js");

        worker.onerror = (err) => {
            console.error("Worker error:", err);
            logDebug(`Worker exception: ${err.message} at ${err.filename || 'unknown'}:${err.lineno || '0'}`);
            setStatus(`Worker exception: ${err.message}`);
            stitchBtn.disabled = false;
            clearBtn.disabled = false;
        };
        
        worker.onmessage = (e) => {
            const data = e.data;
            if (data.action === "status") {
                setStatus(data.message);
            } else if (data.action === "log") {
                logDebug(data.message);
            } else if (data.action === "success") {
                logDebug("Stitching succeeded on background thread. Loading result blob...");
                const blob = data.blob;
                
                // Display results on canvas
                const img = new Image();
                img.onload = () => {
                    const previewCanvas = getElement("preview-canvas");
                    previewCanvas.width = data.width;
                    previewCanvas.height = data.height;
                    const previewCtx = previewCanvas.getContext("2d");
                    previewCtx.drawImage(img, 0, 0);
                    
                    getElement("preview-dimensions").textContent = `Dimensions: ${data.width} x ${data.height}`;
                    
                    const downloadBtn = getElement("download-btn");
                    downloadBtn.setAttribute("download", direction === "horizontal" ? "panorama_horizontal.jpg" : "panorama_vertical.jpg");
                    if (downloadBtn.href && downloadBtn.href.startsWith("blob:")) {
                        URL.revokeObjectURL(downloadBtn.href);
                    }
                    downloadBtn.href = URL.createObjectURL(blob);
                    getElement("preview-section").style.display = "block";
                    setStatus("Panorama stitched successfully!");
                    
                    stitchBtn.disabled = false;
                    clearBtn.disabled = false;
                    worker.terminate();
                };
                img.src = URL.createObjectURL(blob);
                
            } else if (data.action === "error") {
                setStatus(`Error from background thread: ${data.message}`);
                stitchBtn.disabled = false;
                clearBtn.disabled = false;
                worker.terminate();
            }
        };

        // Post message with files
        worker.postMessage({
            action: "stitch",
            files: processedFiles,
            direction: direction
        });

    } catch (err) {
        console.error(err);
        setStatus(`Error initializing stitch: ${err.message}`);
        stitchBtn.disabled = false;
        clearBtn.disabled = false;
    }
}

// Update file list UI and control states
function updateFileList() {
    const fileListEl = getElement("file-list");
    const stitchBtn = getElement("stitch-btn");
    const clearBtn = getElement("clear-btn");

    if (selectedFilesList.length === 0) {
        fileListEl.replaceChildren(Object.assign(document.createElement("p"), {
            className: "result-line",
            textContent: "No files selected."
        }));
        stitchBtn.disabled = true;
        clearBtn.disabled = true;
        setStatus("Choose two or more images to begin.");
        return;
    }

    const rows = selectedFilesList.map((file) => {
        const item = document.createElement("article");
        item.className = "heic-metadata-row";

        const title = document.createElement("p");
        title.className = "heic-result-title";
        title.textContent = file.name;

        const sizeLabel = document.createElement("span");
        sizeLabel.className = "notice";
        const kbSize = (file.size / 1024).toFixed(1);
        sizeLabel.textContent = `${kbSize} KB`;

        item.append(title, sizeLabel);
        return item;
    });

    fileListEl.replaceChildren(...rows);
    stitchBtn.disabled = selectedFilesList.length < 2;
    clearBtn.disabled = false;
    setStatus(`${selectedFilesList.length} files selected. Ready to stitch.`);
}

// Copy Debug logs to clipboard
function copyDebugLogs() {
    const debugEl = getElement("debug-log");
    if (!debugEl) return;
    debugEl.select();
    navigator.clipboard.writeText(debugEl.value)
        .then(() => {
            const originalText = getElement("copy-log-btn").textContent;
            getElement("copy-log-btn").textContent = "Copied!";
            setTimeout(() => {
                getElement("copy-log-btn").textContent = originalText;
            }, 1500);
        })
        .catch(err => {
            logDebug(`Copy failed: ${err.message}`);
        });
}

// Reset UI
function clearAll() {
    selectedFilesList = [];
    heicCache.clear();
    getElement("stitch-files").value = "";
    getElement("preview-section").style.display = "none";
    const downloadBtn = getElement("download-btn");
    if (downloadBtn.href && downloadBtn.href.startsWith("blob:")) {
        URL.revokeObjectURL(downloadBtn.href);
    }
    downloadBtn.removeAttribute("href");
    
    const debugEl = getElement("debug-log");
    if (debugEl) debugEl.value = "";
    
    updateFileList();
}

// Dynamically update camera movement labels based on stitch direction
function updateOrderLabels() {
    const direction = document.querySelector('input[name="stitch-direction"]:checked').value;
    const label1 = getElement("order-label-1");
    const label2 = getElement("order-label-2");
    if (!label1 || !label2) return;

    if (direction === "horizontal") {
        label1.textContent = "From Right to Left";
        label2.textContent = "From Left to Right";
    } else {
        label1.textContent = "From Bottom to Top";
        label2.textContent = "From Top to Bottom";
    }
}

// Bind Events
function initEvents() {
    const fileInput = getElement("stitch-files");
    const dropZone = getElement("stitch-drop-zone");
    const stitchBtn = getElement("stitch-btn");
    const clearBtn = getElement("clear-btn");
    const copyLogBtn = getElement("copy-log-btn");
    const dirRadios = document.getElementsByName("stitch-direction");

    fileInput.addEventListener("change", (e) => {
        selectedFilesList = Array.from(e.target.files || []);
        updateFileList();
    });

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        selectedFilesList = Array.from(e.dataTransfer.files || []);
        updateFileList();
    });

    stitchBtn.addEventListener("click", processStitch);
    clearBtn.addEventListener("click", clearAll);
    copyLogBtn.addEventListener("click", copyDebugLogs);

    dirRadios.forEach((radio) => {
        radio.addEventListener("change", updateOrderLabels);
    });
}

// Hide debug console on production host (only display on localhost and local network development)
function initDebugVisibility() {
    const debugSection = getElement("debug-section");
    if (debugSection) {
        const hostname = window.location.hostname;
        const isLocal =
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/) ||
            hostname.endsWith(".local");
        debugSection.style.display = isLocal ? "block" : "none";
    }
}

// Run setup
initEvents();
updateOrderLabels();
updateFileList();
initDebugVisibility();
