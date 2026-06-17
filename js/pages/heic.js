import { mountSiteShell } from "../site.js";

// Browser HEIC conversion uses heic2any, MIT licensed: https://github.com/alexcorvi/heic2any
const heic2anyUrl = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";

let heic2anyLoadPromise;
let activeResults = [];

function getElement(id) {
  return document.getElementById(id);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(value)} ${units[unitIndex]}`;
}

function getJpegName(fileName) {
  const baseName = fileName.replace(/\.[^.]+$/, "") || "converted-image";
  return `${baseName}.jpg`;
}

function setStatus(message) {
  getElement("heic-status").textContent = message;
}

function getSelectedFiles() {
  return Array.from(getElement("heic-files").files || []);
}

function getQuality() {
  return Number.parseInt(getElement("jpeg-quality").value, 10) / 100;
}

function syncControls({ preserveStatus = false } = {}) {
  const selectedCount = getSelectedFiles().length;
  getElement("convert-btn").disabled = selectedCount === 0;
  getElement("clear-btn").disabled = selectedCount === 0 && activeResults.length === 0;

  if (preserveStatus) {
    return;
  }

  if (selectedCount === 0 && activeResults.length === 0) {
    setStatus("Choose one or more HEIC files to begin.");
  } else if (selectedCount > 0) {
    setStatus(`${selectedCount} file${selectedCount === 1 ? "" : "s"} ready to convert.`);
  }
}

function syncQualityLabel() {
  getElement("jpeg-quality-value").textContent = `${Math.round(getQuality() * 100)}%`;
}

function clearResults() {
  activeResults.forEach((result) => URL.revokeObjectURL(result.url));
  activeResults = [];
  getElement("heic-results").replaceChildren();
}

function clearAll() {
  getElement("heic-files").value = "";
  clearResults();
  syncControls();
}

function loadHeic2Any() {
  if (window.heic2any) {
    return Promise.resolve(window.heic2any);
  }

  if (!heic2anyLoadPromise) {
    heic2anyLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = heic2anyUrl;
      script.async = true;
      script.onload = () => {
        if (window.heic2any) {
          resolve(window.heic2any);
        } else {
          reject(new Error("HEIC converter loaded without exposing heic2any."));
        }
      };
      script.onerror = () => reject(new Error("Could not load the HEIC converter library."));
      document.head.append(script);
    });
  }

  return heic2anyLoadPromise;
}

function createResultRow(result) {
  const row = document.createElement("article");
  row.className = `heic-result heic-result-${result.status}`;

  const details = document.createElement("div");
  details.className = "heic-result-details";

  const title = document.createElement("p");
  title.className = "heic-result-title";
  title.textContent = result.status === "done" ? result.outputName : result.sourceName;

  const meta = document.createElement("p");
  meta.className = "heic-result-meta";

  if (result.status === "done") {
    meta.textContent = `${result.sourceName} - ${formatBytes(result.sourceSize)} -> ${formatBytes(result.outputSize)}`;
  } else {
    meta.textContent = result.message;
  }

  details.append(title, meta);
  row.append(details);

  if (result.status === "done") {
    const preview = document.createElement("img");
    preview.className = "heic-preview";
    preview.src = result.url;
    preview.alt = "";

    const download = document.createElement("a");
    download.className = "heic-download";
    download.href = result.url;
    download.download = result.outputName;
    download.textContent = "Download";

    row.append(preview, download);
  }

  return row;
}

function renderResults(results) {
  getElement("heic-results").replaceChildren(...results.map(createResultRow));
}

async function convertFile(heic2any, file, quality) {
  try {
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;

    if (!(blob instanceof Blob)) {
      throw new Error("The converter did not return a JPEG blob.");
    }

    return {
      status: "done",
      sourceName: file.name,
      sourceSize: file.size,
      outputName: getJpegName(file.name),
      outputSize: blob.size,
      url: URL.createObjectURL(blob),
    };
  } catch (error) {
    return {
      status: "error",
      sourceName: file.name,
      sourceSize: file.size,
      message: error instanceof Error ? error.message : "Conversion failed.",
    };
  }
}

async function convertFiles() {
  const files = getSelectedFiles();

  if (files.length === 0) {
    return;
  }

  const convertButton = getElement("convert-btn");
  const clearButton = getElement("clear-btn");
  convertButton.disabled = true;
  clearButton.disabled = true;
  clearResults();
  setStatus("Loading HEIC converter...");

  try {
    const heic2any = await loadHeic2Any();
    const quality = getQuality();
    const results = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setStatus(`Converting ${index + 1} of ${files.length}: ${file.name}`);
      const result = await convertFile(heic2any, file, quality);
      results.push(result);

      if (result.status === "done") {
        activeResults.push(result);
      }

      renderResults(results);
    }

    const successfulCount = results.filter((result) => result.status === "done").length;
    const failedCount = results.length - successfulCount;
    setStatus(`${successfulCount} converted${failedCount ? `, ${failedCount} failed` : ""}. Metadata is not preserved in the JPEG output.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not start conversion.");
  } finally {
    syncControls({ preserveStatus: true });
  }
}

function handleDrop(event) {
  event.preventDefault();
  getElement("heic-drop-zone").classList.remove("heic-drop-zone-active");

  if (!event.dataTransfer?.files?.length) {
    return;
  }

  getElement("heic-files").files = event.dataTransfer.files;
  syncControls();
}

function initDropZone() {
  const dropZone = getElement("heic-drop-zone");

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("heic-drop-zone-active");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("heic-drop-zone-active");
  });
  dropZone.addEventListener("drop", handleDrop);
}

function initHeicPage() {
  mountSiteShell();
  syncQualityLabel();
  initDropZone();
  getElement("heic-files").addEventListener("change", syncControls);
  getElement("jpeg-quality").addEventListener("input", syncQualityLabel);
  getElement("convert-btn").addEventListener("click", convertFiles);
  getElement("clear-btn").addEventListener("click", clearAll);
  window.addEventListener("pagehide", clearResults);
}

initHeicPage();
