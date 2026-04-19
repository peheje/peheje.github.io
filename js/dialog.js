let dialog;
let titleElement;
let messageElement;
let phraseWrapElement;
let phraseLabelElement;
let phraseInputElement;
let cancelButtonElement;
let confirmButtonElement;
let cardElement;
let resolveCurrent;
let confirmCurrent;
let requiredPhrase = null;

function updateConfirmState() {
  if (!confirmButtonElement) {
    return;
  }

  if (!requiredPhrase) {
    confirmButtonElement.disabled = false;
    return;
  }

  confirmButtonElement.disabled =
    phraseInputElement.value.trim().toLowerCase() !== requiredPhrase.trim().toLowerCase();
}

function closeDialog(result) {
  if (!dialog?.open) {
    return;
  }

  dialog.close();

  if (resolveCurrent) {
    resolveCurrent(result);
  }

  resolveCurrent = null;
  confirmCurrent = null;
  requiredPhrase = null;
  phraseInputElement.value = "";
  updateConfirmState();
}

function ensureDialog() {
  if (dialog) {
    return;
  }

  dialog = document.createElement("dialog");
  dialog.className = "modal-backdrop";
  dialog.innerHTML = `
    <div class="modal-card">
      <h2 id="app-modal-title" class="name-prompt">Confirm action</h2>
      <p id="app-modal-message" class="result-line">Are you sure?</p>
      <div id="app-modal-phrase-wrap" class="inline-block display-none">
        <label id="app-modal-phrase-label" for="app-modal-phrase-input">Type delete all to continue:</label>
        <input id="app-modal-phrase-input" type="text" autocomplete="off">
      </div>
      <div class="actions">
        <button id="app-modal-confirm" type="button" class="red">Yes</button>
        <button id="app-modal-cancel" type="button">No</button>
      </div>
    </div>
  `;

  document.body.append(dialog);

  titleElement = dialog.querySelector("#app-modal-title");
  messageElement = dialog.querySelector("#app-modal-message");
  phraseWrapElement = dialog.querySelector("#app-modal-phrase-wrap");
  phraseLabelElement = dialog.querySelector("#app-modal-phrase-label");
  phraseInputElement = dialog.querySelector("#app-modal-phrase-input");
  cancelButtonElement = dialog.querySelector("#app-modal-cancel");
  confirmButtonElement = dialog.querySelector("#app-modal-confirm");
  cardElement = dialog.querySelector(".modal-card");

  phraseInputElement.addEventListener("input", updateConfirmState);
  cancelButtonElement.addEventListener("click", () => closeDialog(false));
  confirmButtonElement.addEventListener("click", () => {
    if (confirmCurrent) {
      confirmCurrent();
    }
    closeDialog(true);
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog(false);
  });

  dialog.addEventListener("click", (event) => {
    const rect = cardElement.getBoundingClientRect();
    const inside =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;

    if (!inside) {
      closeDialog(false);
    }
  });
}

function openDialog({ title, message, confirmText, cancelText, phrase, onConfirm }) {
  ensureDialog();

  titleElement.textContent = title;
  messageElement.textContent = message;
  confirmButtonElement.textContent = confirmText;
  confirmCurrent = onConfirm || null;
  requiredPhrase = phrase || null;
  phraseInputElement.value = "";

  if (requiredPhrase) {
    phraseWrapElement.classList.remove("display-none");
    phraseLabelElement.textContent = `Type '${requiredPhrase}' to continue:`;
  } else {
    phraseWrapElement.classList.add("display-none");
  }

  if (cancelText) {
    cancelButtonElement.textContent = cancelText;
    cancelButtonElement.classList.remove("display-none");
  } else {
    cancelButtonElement.classList.add("display-none");
  }

  updateConfirmState();

  return new Promise((resolve) => {
    resolveCurrent = resolve;
    dialog.showModal();

    if (requiredPhrase) {
      phraseInputElement.focus();
    } else if (cancelText) {
      cancelButtonElement.focus();
    } else {
      confirmButtonElement.focus();
    }
  });
}

export function showInfoDialog(message) {
  return openDialog({
    title: "Notice",
    message,
    confirmText: "OK",
    cancelText: null,
    phrase: null,
    onConfirm: null,
  });
}

export function showConfirmDialog(message, onConfirm) {
  return openDialog({
    title: "Confirm action",
    message,
    confirmText: "Yes",
    cancelText: "No",
    phrase: null,
    onConfirm,
  });
}

export function showPhraseConfirmDialog(message, phrase, onConfirm) {
  return openDialog({
    title: "Confirm action",
    message,
    confirmText: "Yes",
    cancelText: "No",
    phrase,
    onConfirm,
  });
}
