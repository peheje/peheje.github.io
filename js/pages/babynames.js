import { showPhraseConfirmDialog } from "../dialog.js";
import { girlNames, boyNames } from "../names.js";
import { mountSiteShell } from "../site.js";

function readStoredList(key) {
  const value = localStorage.getItem(key) || "";
  return value === "" ? [] : value.split(";").filter((entry) => entry !== "");
}

function appendToStoredList(key, value) {
  const current = localStorage.getItem(key) || "";

  if (current === "") {
    localStorage.setItem(key, value);
  } else {
    localStorage.setItem(key, `${current};${value}`);
  }
}

function setLikedText(element, liked) {
  element.value = [...liked].reverse().join("\n");
}

function initGenderSelector() {
  const girl = document.getElementById("girl");
  const boy = document.getElementById("boy");

  [girl, boy].forEach((element) => {
    element.addEventListener("click", () => {
      localStorage.setItem("gender", element.value);
      window.location.reload();
    });
  });

  if ((localStorage.getItem("gender") || "") === "boy") {
    boy.checked = true;
    return boyNames;
  }

  girl.checked = true;
  return girlNames;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Keep the existing page simple if the browser disallows clipboard access.
  }
}

function initBabyNamesPage() {
  mountSiteShell();

  const liked = readStoredList("liked");
  const disliked = readStoredList("disliked");
  const nameElement = document.getElementById("name");
  const likedElement = document.getElementById("liked");
  const yesButton = document.getElementById("yes");
  const noButton = document.getElementById("no");
  const copyButton = document.getElementById("copy");
  const clearButton = document.getElementById("clear");

  let index = -1;
  let likedNames = [...liked];

  const excluded = new Set([...liked, ...disliked]);
  const unprocessedNames = initGenderSelector().filter((name) => !excluded.has(name));

  function setFinishedState() {
    nameElement.textContent = "No more names to review.";
    yesButton.disabled = true;
    noButton.disabled = true;
  }

  function askNext() {
    index += 1;

    if (index >= unprocessedNames.length) {
      setFinishedState();
      return;
    }

    nameElement.textContent = `Do you like ${unprocessedNames[index]}?`;
  }

  function like() {
    const name = unprocessedNames[index];
    appendToStoredList("liked", name);
    likedNames.push(name);
    setLikedText(likedElement, likedNames);
  }

  function dislike() {
    appendToStoredList("disliked", unprocessedNames[index]);
  }

  setLikedText(likedElement, likedNames);

  yesButton.addEventListener("click", () => {
    like();
    askNext();
  });

  noButton.addEventListener("click", () => {
    dislike();
    askNext();
  });

  clearButton.addEventListener("click", async () => {
    await showPhraseConfirmDialog("Clear all saved baby names?", "delete all", () => {
      localStorage.removeItem("liked");
      localStorage.removeItem("disliked");
      localStorage.removeItem("gender");
      window.location.reload();
    });
  });

  copyButton.addEventListener("click", async () => {
    await copyToClipboard(likedElement.value);
  });

  askNext();
}

initBabyNamesPage();
