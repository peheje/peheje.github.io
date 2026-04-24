import { showConfirmDialog, showPhraseConfirmDialog } from "../dialog.js";
import { initNumberSteppers } from "../number-stepper.js";
import { mountSiteShell } from "../site.js";

const storageKey = "alcohol-drinks";

function isDrink(value) {
  return Boolean(
    value &&
      Number.isFinite(value.Millilitres) &&
      Number.isFinite(value.Percentage) &&
      Number.isFinite(value.Units)
  );
}

function formatUnits(units) {
  return units.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function calculateUnits(millilitres, percentage) {
  return (millilitres * (percentage / 100)) / 15;
}

function loadDrinks() {
  const source = localStorage.getItem(storageKey) || "";

  if (source === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(source);
    return Array.isArray(parsed) ? parsed.filter(isDrink) : [];
  } catch {
    return [];
  }
}

function persistDrinks(drinks) {
  localStorage.setItem(storageKey, JSON.stringify(drinks));
}

function initAlcoholPage() {
  mountSiteShell();
  initNumberSteppers();

  const millilitresInput = document.getElementById("millilitres");
  const percentageInput = document.getElementById("percentage");
  const saveDrinkButton = document.getElementById("save-drink");
  const clearDrinksButton = document.getElementById("clear-drinks");
  const drinkLogElement = document.getElementById("drink-log");
  const drinkEditStateElement = document.getElementById("drink-edit-state");
  const drinkTotalUnitsElement = document.getElementById("drink-total-units");
  const unitsElement = document.getElementById("dk-units");

  let drinks = loadDrinks();
  let editingIndex = null;

  function getInputNumber(input, fallback) {
    return Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : fallback;
  }

  function sanitizeInputs() {
    const millilitres = Math.max(0, getInputNumber(millilitresInput, 0));
    const percentage = Math.min(100, Math.max(0, getInputNumber(percentageInput, 0)));

    millilitresInput.valueAsNumber = millilitres;
    percentageInput.valueAsNumber = percentage;
  }

  function calculateAndShowUnits() {
    unitsElement.textContent = formatUnits(calculateUnits(getInputNumber(millilitresInput, 0), getInputNumber(percentageInput, 0)));
  }

  function updateButtons() {
    if (editingIndex === null) {
      saveDrinkButton.textContent = "Add drink";
      drinkEditStateElement.classList.add("display-none");
    } else {
      saveDrinkButton.textContent = "Save edit";
      drinkEditStateElement.classList.remove("display-none");
    }
  }

  function refreshSummary() {
    const total = drinks.reduce((sum, drink) => sum + drink.Units, 0);
    drinkTotalUnitsElement.textContent = formatUnits(total);
  }

  function removeDrink(index) {
    drinks = drinks.filter((_, currentIndex) => currentIndex !== index);

    if (editingIndex === index) {
      editingIndex = null;
    } else if (editingIndex !== null && editingIndex > index) {
      editingIndex -= 1;
    }
  }

  function renderDrinkRow(index, drink) {
    const row = document.createElement("div");
    row.className = "drink-row";

    const description = document.createElement("p");
    description.className = "drink-row-text";
    description.textContent = `${drink.Millilitres.toFixed(2)} ml @ ${drink.Percentage.toFixed(2)}% = ${formatUnits(drink.Units)} units`;

    const actions = document.createElement("div");
    actions.className = "drink-row-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn-small";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      millilitresInput.valueAsNumber = drink.Millilitres;
      percentageInput.valueAsNumber = drink.Percentage;
      editingIndex = index;
      sanitizeInputs();
      calculateAndShowUnits();
      updateButtons();
      millilitresInput.focus();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn-small";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      await showConfirmDialog("Delete this drink?", () => {
        removeDrink(index);
        persistDrinks(drinks);
        refreshSummary();
        updateButtons();
        renderDrinks();
      });
    });

    actions.append(editButton, deleteButton);
    row.append(description, actions);
    return row;
  }

  function renderDrinks() {
    drinkLogElement.replaceChildren();

    if (drinks.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "result-line";
      emptyState.textContent = "No drinks tracked yet.";
      drinkLogElement.append(emptyState);
      return;
    }

    drinks.forEach((drink, index) => {
      drinkLogElement.append(renderDrinkRow(index, drink));
    });
  }

  millilitresInput.addEventListener("input", () => {
    sanitizeInputs();
    calculateAndShowUnits();
  });

  percentageInput.addEventListener("input", () => {
    sanitizeInputs();
    calculateAndShowUnits();
  });

  saveDrinkButton.addEventListener("click", () => {
    sanitizeInputs();
    const millilitres = getInputNumber(millilitresInput, 0);
    const percentage = getInputNumber(percentageInput, 0);

    const drink = {
      Millilitres: millilitres,
      Percentage: percentage,
      Units: calculateUnits(millilitres, percentage),
    };

    if (editingIndex !== null && editingIndex >= 0 && editingIndex < drinks.length) {
      drinks[editingIndex] = drink;
      editingIndex = null;
    } else {
      drinks = [...drinks, drink];
    }

    persistDrinks(drinks);
    refreshSummary();
    updateButtons();
    renderDrinks();
  });

  clearDrinksButton.addEventListener("click", async () => {
    await showPhraseConfirmDialog("Clear all tracked drinks?", "delete all", () => {
      localStorage.removeItem(storageKey);
      drinks = [];
      editingIndex = null;
      refreshSummary();
      updateButtons();
      renderDrinks();
    });
  });

  calculateAndShowUnits();
  refreshSummary();
  updateButtons();
  renderDrinks();
}

initAlcoholPage();
