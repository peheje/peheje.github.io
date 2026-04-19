import { mountSiteShell } from "../site.js";

const newline = "\n";

function area(id) {
  return document.getElementById(id);
}

function input(id) {
  return document.getElementById(id);
}

function readInput(id, ignoreCase) {
  const source = ignoreCase ? area(id).value.toLowerCase() : area(id).value;
  return source.split(newline).filter((value) => value.trim() !== "");
}

function setTextArea(id, countId, values) {
  area(id).value = values.join(newline);
  document.getElementById(countId).textContent = String(values.length);
}

function getDuplicates(values) {
  const counts = new Map();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return values.filter((value, index) => {
    if ((counts.get(value) || 0) < 2) {
      return false;
    }

    return values.indexOf(value) !== index;
  });
}

function findDuplicates() {
  const ignoreCase = input("case-insensitive").checked;
  const original = readInput("original", ignoreCase);

  setTextArea("original", "original-count", original);
  setTextArea("unique", "unique-count", [...new Set(original)]);
  setTextArea("duplicates", "duplicates-count", getDuplicates(original));
}

function initUniquePage() {
  mountSiteShell();
  document.getElementById("find-duplicates-btn").addEventListener("click", findDuplicates);
}

initUniquePage();
