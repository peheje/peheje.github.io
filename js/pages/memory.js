import { showInfoDialog } from "../dialog.js";
import { initNumberSteppers } from "../number-stepper.js";
import { mountSiteShell } from "../site.js";

function show(id) {
  const element = document.getElementById(id);
  element.classList.add("inline-block");
  element.classList.remove("display-none");
}

function hide(id) {
  const element = document.getElementById(id);
  element.classList.remove("inline-block");
  element.classList.add("display-none");
}

function randomDigits(length) {
  return Array.from({ length }, () => String(Math.floor(Math.random() * 10))).join("");
}

function initMemoryPage() {
  mountSiteShell();
  initNumberSteppers();

  const submitButton = document.getElementById("submit");
  const restartButton = document.getElementById("restart-btn");
  const ioInput = document.getElementById("io");
  const intervalInput = document.getElementById("interval");
  const lengthInput = document.getElementById("length");

  let state = "stopped";
  let number = "";

  function peek() {
    state = "peek";
    show("io-input");
    hide("length-input");
    hide("interval-input");
    ioInput.readOnly = true;
    submitButton.disabled = true;
    submitButton.innerText = "Peeking..";
    number = randomDigits(Number.parseInt(lengthInput.value, 10));
    ioInput.value = number;
  }

  function stopPeek() {
    state = "guess";
    ioInput.value = "";
    ioInput.focus();
    ioInput.readOnly = false;
    submitButton.disabled = false;
    submitButton.innerText = "Guess";
  }

  submitButton.addEventListener("click", async () => {
    show("restart-wrap");

    if (state === "guess") {
      if (ioInput.value === number) {
        await showInfoDialog("Correct");
      } else {
        await showInfoDialog(`Not correct, number was: ${number}`);
      }

      state = "stopped";
    }

    if (state === "stopped") {
      peek();
      window.setTimeout(() => {
        stopPeek();
      }, Math.trunc(intervalInput.valueAsNumber * 1000));
    }
  });

  restartButton.addEventListener("click", () => {
    window.location.reload();
  });

  document.addEventListener("keypress", (event) => {
    if (event.key === "Enter" && state === "guess" && ioInput.value.length !== 0) {
      submitButton.click();
    }
  });
}

initMemoryPage();
