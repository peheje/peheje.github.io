import { showInfoDialog } from "../dialog.js";
import { mountSiteShell } from "../site.js";

const newline = "\n";

function area(id) {
  return document.getElementById(id);
}

function input(id) {
  return document.getElementById(id);
}

function readInput(id) {
  const ignoreCase = input("case-insensitive").checked;
  const source = ignoreCase ? area(id).value.toLowerCase() : area(id).value;
  const filtered = [...new Set(source.split(newline).filter((value) => value.trim() !== ""))];
  return {
    list: filtered,
    set: new Set(filtered),
  };
}

function setTextArea(id, countId, values) {
  area(id).value = values.join(newline);
  document.getElementById(countId).textContent = String(values.length);
}

function compareData() {
  const a = readInput("a");
  const b = readInput("b");

  const both = a.list.filter((value) => b.set.has(value));
  const onlyA = a.list.filter((value) => !b.set.has(value));
  const onlyB = b.list.filter((value) => !a.set.has(value));

  return {
    a: a.list,
    b: b.list,
    both,
    onlyA,
    onlyB,
  };
}

function compare() {
  const result = compareData();
  setTextArea("a", "a-count", result.a);
  setTextArea("b", "b-count", result.b);
  setTextArea("both", "both-count", result.both);
  setTextArea("only-a", "only-a-count", result.onlyA);
  setTextArea("only-b", "only-b-count", result.onlyB);
}

function randomGuid() {
  return crypto.randomUUID();
}

function shuffle(values) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function randomize() {
  const shared = Array.from({ length: 100 }, randomGuid);
  const uniqueA = Array.from({ length: 4900 }, randomGuid);
  const uniqueB = Array.from({ length: 4900 }, randomGuid);

  setTextArea("a", "a-count", shuffle([...shared, ...uniqueA]));
  setTextArea("b", "b-count", shuffle([...shared, ...uniqueB]));
  compare();
}

function getValidSeparator() {
  const source = area("a").value + area("b").value;
  return ["|", ";", ","].find((separator) => !source.includes(separator));
}

async function download(event) {
  const separator = getValidSeparator();

  if (!separator) {
    event.preventDefault();
    await showInfoDialog("Download failed. Input already includes separator values | ; ,");
    return;
  }

  const result = compareData();
  const columns = [result.a, result.b, result.both, result.onlyA, result.onlyB];
  const rows = Math.max(result.a.length, result.b.length);
  const header = `Left${separator}Right${separator}In both${separator}Only in left${separator}Only in right\n`;
  const body = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    body.push(
      columns
        .map((column, columnIndex) => `${column[rowIndex] || ""}${columnIndex < columns.length - 1 ? separator : ""}`)
        .join("")
    );
  }

  const csv = `${header}${body.join("\n")}`;
  event.currentTarget.href = `data:text/plain;charset=UTF-8,${encodeURIComponent(csv)}`;
}

function initComparePage() {
  mountSiteShell();
  document.getElementById("compare-btn").addEventListener("click", compare);
  document.getElementById("random-btn").addEventListener("click", randomize);
  document.getElementById("download-btn").addEventListener("click", download);
}

initComparePage();
