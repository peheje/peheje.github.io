import { mountSiteShell } from "../site.js";

// Browser HEIC conversion uses heic2any, MIT licensed: https://github.com/alexcorvi/heic2any
const heic2anyUrl = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
// Metadata reading uses exifr, MIT licensed: https://github.com/MikeKovarik/exifr
const exifrUrl = "https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js";
// Optional JPEG EXIF writing uses piexifjs, MIT licensed: https://github.com/hMatoba/piexifjs
const piexifUrl = "https://cdn.jsdelivr.net/npm/piexifjs@1.0.6/piexif.min.js";

let heic2anyLoadPromise;
let exifrLoadPromise;
let piexifLoadPromise;
let activeResults = [];
let metadataByFileKey = new Map();
const metadataTags = [
  "Make",
  "Model",
  "LensModel",
  "Software",
  "DateTimeOriginal",
  "CreateDate",
  "ModifyDate",
  "DateTime",
  "ISO",
  "ISOSpeedRatings",
  "FNumber",
  "ExposureTime",
  "FocalLength",
  "latitude",
  "longitude",
  "ExifImageWidth",
  "ExifImageHeight",
  "PixelXDimension",
  "PixelYDimension",
  "ImageWidth",
  "ImageHeight",
];
const cleanableTypes = new Set(["jpeg", "png", "webp", "gif"]);

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

function getCleanName(fileName) {
  const extensionMatch = fileName.match(/(\.[^.]+)$/);
  const extension = extensionMatch ? extensionMatch[1] : "";
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName || "cleaned-image";
  return `${baseName}.clean${extension || ".img"}`;
}

function setStatus(message) {
  getElement("heic-status").textContent = message;
}

function getSelectedFiles() {
  return Array.from(getElement("heic-files").files || []);
}

function getFileKey(file) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

function getQuality() {
  return Number.parseInt(getElement("jpeg-quality").value, 10) / 100;
}

function getMetadataMode() {
  return document.querySelector('input[name="metadata-mode"]:checked')?.value || "strip";
}

function getOutputAction() {
  return document.querySelector('input[name="output-action"]:checked')?.value || "jpeg";
}

function getImageType(file) {
  const name = file.name.toLowerCase();

  if (file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "jpeg";
  }

  if (file.type === "image/png" || name.endsWith(".png")) {
    return "png";
  }

  if (file.type === "image/webp" || name.endsWith(".webp")) {
    return "webp";
  }

  if (file.type === "image/gif" || name.endsWith(".gif")) {
    return "gif";
  }

  if (file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif")) {
    return "heic";
  }

  return "unknown";
}

function syncControls({ preserveStatus = false } = {}) {
  const selectedCount = getSelectedFiles().length;
  const outputAction = getOutputAction();
  getElement("convert-btn").disabled = selectedCount === 0;
  getElement("clear-btn").disabled = selectedCount === 0 && activeResults.length === 0;
  getElement("convert-btn").textContent = outputAction === "clean" ? "Clean" : "Convert";
  getElement("jpeg-quality-panel").classList.toggle("display-none", outputAction !== "jpeg");

  if (preserveStatus) {
    return;
  }

  if (selectedCount === 0 && activeResults.length === 0) {
    setStatus("Choose one or more images to begin.");
  } else if (selectedCount > 0) {
    setStatus(`${selectedCount} file${selectedCount === 1 ? "" : "s"} ready to ${outputAction === "clean" ? "clean" : "convert"}.`);
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
  metadataByFileKey = new Map();
  clearResults();
  renderMetadataList([]);
  syncControls();
}

function concatUint8Arrays(parts) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function bytesStartWith(bytes, values, offset = 0) {
  return values.every((value, index) => bytes[offset + index] === value);
}

function getAscii(bytes, start, length) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function readUint32LittleEndian(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

function writeUint32LittleEndian(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function readUint32BigEndian(bytes, offset) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function isJpegMetadataSegment(marker, payload) {
  if (marker === 0xfe) {
    return true;
  }

  if (marker === 0xe1) {
    return bytesStartWith(payload, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]) || getAscii(payload, 0, 29).startsWith("http://ns.adobe.com/xap/");
  }

  return marker === 0xed;
}

function stripJpegMetadata(bytes) {
  if (!bytesStartWith(bytes, [0xff, 0xd8])) {
    throw new Error("JPEG signature not found.");
  }

  const parts = [bytes.slice(0, 2)];
  let offset = 2;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      parts.push(bytes.slice(offset));
      break;
    }

    while (bytes[offset] === 0xff) {
      offset += 1;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xda) {
      parts.push(bytes.slice(offset - 2));
      break;
    }

    if (marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      parts.push(bytes.slice(offset - 2, offset));
      continue;
    }

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    const segmentStart = offset - 2;
    const segmentEnd = offset + segmentLength;
    const payload = bytes.slice(offset + 2, segmentEnd);

    if (!isJpegMetadataSegment(marker, payload)) {
      parts.push(bytes.slice(segmentStart, segmentEnd));
    }

    offset = segmentEnd;
  }

  return concatUint8Arrays(parts);
}

function isPngMetadataChunk(type) {
  return ["eXIf", "tEXt", "zTXt", "iTXt", "tIME"].includes(type);
}

function stripPngMetadata(bytes) {
  if (!bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    throw new Error("PNG signature not found.");
  }

  const parts = [bytes.slice(0, 8)];
  let offset = 8;

  while (offset + 12 <= bytes.length) {
    const length = readUint32BigEndian(bytes, offset);
    const type = getAscii(bytes, offset + 4, 4);
    const chunkEnd = offset + 12 + length;

    if (chunkEnd > bytes.length) {
      throw new Error("PNG chunk length is invalid.");
    }

    if (!isPngMetadataChunk(type)) {
      parts.push(bytes.slice(offset, chunkEnd));
    }

    offset = chunkEnd;

    if (type === "IEND") {
      break;
    }
  }

  return concatUint8Arrays(parts);
}

function isWebpMetadataChunk(type) {
  return type === "EXIF" || type === "XMP ";
}

function stripWebpMetadata(bytes) {
  if (!bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) || getAscii(bytes, 8, 4) !== "WEBP") {
    throw new Error("WebP signature not found.");
  }

  const parts = [bytes.slice(0, 12)];
  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const type = getAscii(bytes, offset, 4);
    const length = readUint32LittleEndian(bytes, offset + 4);
    const paddedLength = length + (length % 2);
    const chunkEnd = offset + 8 + paddedLength;

    if (chunkEnd > bytes.length) {
      throw new Error("WebP chunk length is invalid.");
    }

    if (!isWebpMetadataChunk(type)) {
      parts.push(bytes.slice(offset, chunkEnd));
    }

    offset = chunkEnd;
  }

  const output = concatUint8Arrays(parts);
  writeUint32LittleEndian(output, 4, output.length - 8);
  return output;
}

function isGifXmpApplicationExtension(bytes, offset) {
  const blockSize = bytes[offset + 2];

  if (blockSize !== 11) {
    return false;
  }

  const identifier = getAscii(bytes, offset + 3, 11);
  return identifier.startsWith("XMP Data");
}

function getGifExtensionEnd(bytes, offset) {
  let cursor = offset + 2;

  if (cursor >= bytes.length) {
    return bytes.length;
  }

  const label = bytes[offset + 1];

  if (label === 0xf9) {
    const blockSize = bytes[cursor];
    return Math.min(cursor + blockSize + 2, bytes.length);
  }

  cursor += 1 + bytes[cursor];

  while (cursor < bytes.length) {
    const blockSize = bytes[cursor];
    cursor += 1;

    if (blockSize === 0) {
      break;
    }

    cursor += blockSize;
  }

  return Math.min(cursor, bytes.length);
}

function stripGifMetadata(bytes) {
  if (getAscii(bytes, 0, 3) !== "GIF") {
    throw new Error("GIF signature not found.");
  }

  const parts = [];
  let offset = 0;

  while (offset < bytes.length) {
    if (bytes[offset] === 0x21 && (bytes[offset + 1] === 0xfe || isGifXmpApplicationExtension(bytes, offset))) {
      offset = getGifExtensionEnd(bytes, offset);
      continue;
    }

    parts.push(bytes.slice(offset, offset + 1));
    offset += 1;
  }

  return concatUint8Arrays(parts);
}

async function stripMetadataKeepFormat(file) {
  const type = getImageType(file);

  if (!cleanableTypes.has(type)) {
    throw new Error("Keep-format metadata cleaning supports JPEG, PNG, WebP, and GIF files.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const cleanedBytesByType = {
    jpeg: stripJpegMetadata,
    png: stripPngMetadata,
    webp: stripWebpMetadata,
    gif: stripGifMetadata,
  };
  const cleaned = cleanedBytesByType[type](bytes);

  return new Blob([cleaned], { type: file.type || `image/${type}` });
}

function loadScript(url, globalName, errorMessage) {
  if (window[globalName]) {
    return Promise.resolve(window[globalName]);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => {
      if (window[globalName]) {
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

function loadExifr() {
  exifrLoadPromise ||= loadScript(exifrUrl, "exifr", "Could not load the metadata reader.");
  return exifrLoadPromise;
}

function loadPiexif() {
  piexifLoadPromise ||= loadScript(piexifUrl, "piexif", "Could not load the JPEG metadata writer.");
  return piexifLoadPromise;
}

function formatDateTimeValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString();
  }

  return value ? String(value) : "";
}

function formatExifDate(value) {
  const date = value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;

  if (!date) {
    return typeof value === "string" ? value.replace(/-/g, ":").slice(0, 19) : "";
  }

  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function normalizeMetadata(raw = {}) {
  const date = raw.DateTimeOriginal || raw.CreateDate || raw.ModifyDate || raw.DateTime;

  return {
    raw,
    make: raw.Make || "",
    model: raw.Model || "",
    lens: raw.LensModel || "",
    software: raw.Software || "",
    date,
    dateLabel: formatDateTimeValue(date),
    iso: raw.ISO || raw.ISOSpeedRatings || "",
    fNumber: raw.FNumber || "",
    exposureTime: raw.ExposureTime || "",
    focalLength: raw.FocalLength || "",
    latitude: Number.isFinite(raw.latitude) ? raw.latitude : null,
    longitude: Number.isFinite(raw.longitude) ? raw.longitude : null,
    width: raw.ExifImageWidth || raw.PixelXDimension || raw.ImageWidth || "",
    height: raw.ExifImageHeight || raw.PixelYDimension || raw.ImageHeight || "",
  };
}

function getMetadataChips(metadata) {
  if (!metadata) {
    return ["No readable metadata"];
  }

  const chips = [];
  const camera = [metadata.make, metadata.model].filter(Boolean).join(" ");

  if (camera) {
    chips.push(camera);
  }

  if (metadata.dateLabel) {
    chips.push(metadata.dateLabel);
  }

  if (metadata.width && metadata.height) {
    chips.push(`${metadata.width}x${metadata.height}`);
  }

  if (metadata.iso) {
    chips.push(`ISO ${metadata.iso}`);
  }

  if (metadata.fNumber) {
    chips.push(`f/${metadata.fNumber}`);
  }

  if (metadata.exposureTime) {
    chips.push(`${metadata.exposureTime}s`);
  }

  if (metadata.latitude !== null && metadata.longitude !== null) {
    chips.push(`GPS ${metadata.latitude.toFixed(5)}, ${metadata.longitude.toFixed(5)}`);
  }

  return chips.length ? chips : ["No readable metadata"];
}

function renderMetadataList(files) {
  const metadataElement = getElement("heic-metadata");

  if (files.length === 0) {
    metadataElement.replaceChildren(Object.assign(document.createElement("p"), {
      className: "result-line",
      textContent: "Select files to inspect embedded metadata.",
    }));
    return;
  }

  const rows = files.map((file) => {
    const row = document.createElement("article");
    row.className = "heic-metadata-row";

    const title = document.createElement("p");
    title.className = "heic-result-title";
    title.textContent = file.name;

    const chipWrap = document.createElement("div");
    chipWrap.className = "heic-metadata-chips";
    getMetadataChips(metadataByFileKey.get(getFileKey(file))).forEach((label) => {
      const chip = document.createElement("span");
      chip.className = "notice";
      chip.textContent = label;
      chipWrap.append(chip);
    });

    row.append(title, chipWrap);
    return row;
  });

  metadataElement.replaceChildren(...rows);
}

async function readSelectedMetadata() {
  const files = getSelectedFiles();
  metadataByFileKey = new Map();
  renderMetadataList(files);

  if (files.length === 0) {
    return;
  }

  setStatus("Reading source metadata...");

  try {
    const exifr = await loadExifr();

    for (const file of files) {
      try {
        const raw = await exifr.parse(file, metadataTags);
        metadataByFileKey.set(getFileKey(file), normalizeMetadata(raw || {}));
      } catch {
        metadataByFileKey.set(getFileKey(file), null);
      }
    }

    renderMetadataList(files);
    syncControls();
  } catch (error) {
    metadataByFileKey = new Map(files.map((file) => [getFileKey(file), null]));
    renderMetadataList(files);
    setStatus(error instanceof Error ? error.message : "Could not read metadata.");
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read converted JPEG."));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

function decimalToGpsRationals(value) {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return [[degrees, 1], [minutes, 1], [Math.round(seconds * 10000), 10000]];
}

function numberToRational(value, precision = 10000) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return [Math.round(number * precision), precision];
}

async function addExifToJpeg(blob, metadata, mode) {
  if (!metadata || mode === "strip") {
    return blob;
  }

  const piexif = await loadPiexif();
  const exif = { "0th": {}, Exif: {}, GPS: {}, "1st": {}, thumbnail: null };
  const date = formatExifDate(metadata.date);

  if (metadata.make) {
    exif["0th"][piexif.ImageIFD.Make] = metadata.make;
  }

  if (metadata.model) {
    exif["0th"][piexif.ImageIFD.Model] = metadata.model;
  }

  if (metadata.software) {
    exif["0th"][piexif.ImageIFD.Software] = metadata.software;
  }

  if (date) {
    exif["0th"][piexif.ImageIFD.DateTime] = date;
    exif.Exif[piexif.ExifIFD.DateTimeOriginal] = date;
    exif.Exif[piexif.ExifIFD.DateTimeDigitized] = date;
  }

  if (metadata.lens) {
    exif.Exif[piexif.ExifIFD.LensModel] = metadata.lens;
  }

  if (metadata.iso) {
    exif.Exif[piexif.ExifIFD.ISOSpeedRatings] = Number(metadata.iso);
  }

  const fNumber = numberToRational(metadata.fNumber, 100);
  const exposureTime = numberToRational(metadata.exposureTime, 1000000);
  const focalLength = numberToRational(metadata.focalLength, 100);

  if (fNumber) {
    exif.Exif[piexif.ExifIFD.FNumber] = fNumber;
  }

  if (exposureTime) {
    exif.Exif[piexif.ExifIFD.ExposureTime] = exposureTime;
  }

  if (focalLength) {
    exif.Exif[piexif.ExifIFD.FocalLength] = focalLength;
  }

  if (mode === "location" && metadata.latitude !== null && metadata.longitude !== null) {
    exif.GPS[piexif.GPSIFD.GPSVersionID] = [2, 3, 0, 0];
    exif.GPS[piexif.GPSIFD.GPSLatitudeRef] = metadata.latitude >= 0 ? "N" : "S";
    exif.GPS[piexif.GPSIFD.GPSLatitude] = decimalToGpsRationals(metadata.latitude);
    exif.GPS[piexif.GPSIFD.GPSLongitudeRef] = metadata.longitude >= 0 ? "E" : "W";
    exif.GPS[piexif.GPSIFD.GPSLongitude] = decimalToGpsRationals(metadata.longitude);
  }

  const jpegDataUrl = await blobToDataUrl(blob);
  const withExif = piexif.insert(piexif.dump(exif), jpegDataUrl);
  return dataUrlToBlob(withExif);
}

function getMetadataModeLabel(mode, metadata) {
  if (mode === "basic") {
    return metadata ? "kept camera/date metadata" : "no source metadata to keep";
  }

  if (mode === "location") {
    if (!metadata) {
      return "no source metadata to keep";
    }

    if (metadata.latitude === null || metadata.longitude === null) {
      return "kept camera/date metadata; no location found";
    }

    return "kept camera/date/location metadata";
  }

  return "stripped metadata";
}

async function applyJpegMetadataPreset(blob, metadata, mode) {
  let metadataNote = getMetadataModeLabel(mode, metadata);

  if (mode === "strip") {
    return { blob, metadataNote };
  }

  try {
    return {
      blob: await addExifToJpeg(blob, metadata, mode),
      metadataNote,
    };
  } catch {
    return {
      blob,
      metadataNote: "metadata copy failed",
    };
  }
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
    meta.textContent = `${result.sourceName} - ${formatBytes(result.sourceSize)} -> ${formatBytes(result.outputSize)} - ${result.metadataNote}`;
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

async function convertFile(heic2any, file, quality, metadataMode) {
  try {
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality,
    });
    let blob = Array.isArray(converted) ? converted[0] : converted;

    if (!(blob instanceof Blob)) {
      throw new Error("The converter did not return a JPEG blob.");
    }

    const metadata = metadataByFileKey.get(getFileKey(file));
    const result = await applyJpegMetadataPreset(blob, metadata, metadataMode);
    blob = result.blob;

    return {
      status: "done",
      sourceName: file.name,
      sourceSize: file.size,
      outputName: getJpegName(file.name),
      outputSize: blob.size,
      metadataNote: result.metadataNote,
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

async function cleanFile(file, metadataMode) {
  try {
    const type = getImageType(file);
    let blob = await stripMetadataKeepFormat(file);
    let metadataNote = "cleaned metadata; kept original format";

    if (type === "jpeg") {
      const metadata = metadataByFileKey.get(getFileKey(file));
      const result = await applyJpegMetadataPreset(blob, metadata, metadataMode);
      blob = result.blob;
      metadataNote = metadataMode === "strip" ? "stripped metadata; kept original format" : `${result.metadataNote}; kept original format`;
    } else if (metadataMode !== "strip") {
      metadataNote = "stripped metadata; keeping selected fields is only supported for JPEG";
    }

    return {
      status: "done",
      sourceName: file.name,
      sourceSize: file.size,
      outputName: getCleanName(file.name),
      outputSize: blob.size,
      metadataNote,
      url: URL.createObjectURL(blob),
    };
  } catch (error) {
    return {
      status: "error",
      sourceName: file.name,
      sourceSize: file.size,
      message: error instanceof Error ? error.message : "Metadata cleaning failed.",
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
  const outputAction = getOutputAction();
  setStatus(outputAction === "clean" ? "Cleaning metadata..." : "Loading HEIC converter...");

  try {
    const heic2any = outputAction === "jpeg" ? await loadHeic2Any() : null;
    const quality = getQuality();
    const metadataMode = getMetadataMode();
    const results = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setStatus(`${outputAction === "clean" ? "Cleaning" : "Converting"} ${index + 1} of ${files.length}: ${file.name}`);
      const result = outputAction === "clean"
        ? await cleanFile(file, metadataMode)
        : await convertFile(heic2any, file, quality, metadataMode);
      results.push(result);

      if (result.status === "done") {
        activeResults.push(result);
      }

      renderResults(results);
    }

    const successfulCount = results.filter((result) => result.status === "done").length;
    const failedCount = results.length - successfulCount;
    setStatus(`${successfulCount} ${outputAction === "clean" ? "cleaned" : "converted"}${failedCount ? `, ${failedCount} failed` : ""}.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not start processing.");
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
  readSelectedMetadata();
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
  getElement("heic-files").addEventListener("change", () => {
    clearResults();
    syncControls();
    readSelectedMetadata();
  });
  getElement("jpeg-quality").addEventListener("input", syncQualityLabel);
  document.querySelectorAll('input[name="output-action"]').forEach((input) => {
    input.addEventListener("change", () => syncControls());
  });
  getElement("convert-btn").addEventListener("click", convertFiles);
  getElement("clear-btn").addEventListener("click", clearAll);
  window.addEventListener("pagehide", clearResults);
}

initHeicPage();
