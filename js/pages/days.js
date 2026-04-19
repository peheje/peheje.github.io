import { initNumberSteppers } from "../number-stepper.js";
import { mountSiteShell } from "../site.js";

function formatMonth(monthRatio) {
  return `${monthRatio.toFixed(2)} months`;
}

function formatYear(monthRatio) {
  const years = monthRatio / 12;
  return years <= 1 ? `${years.toFixed(3)} year` : `${years.toFixed(3)} years`;
}

function formatDays(totalDays) {
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const weeksText = weeks === 1 ? "1 week" : `${weeks} weeks`;
  const daysText = days === 1 ? "1 day" : `${days} days`;

  if (weeks === 0 && days === 0) {
    return "None";
  }

  if (weeks === 0) {
    return daysText;
  }

  if (days === 0) {
    return `${totalDays} days (${weeksText})`;
  }

  return `${totalDays} days (${weeksText} and ${daysText})`;
}

function makeDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

function formatDateInputValue(date) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseStoredDate(value) {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return makeDate(year, month - 1, day);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return makeDate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function parseInputDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  return makeDate(year, month - 1, day);
}

function saveDate(key, input) {
  localStorage.setItem(key, input.value);
}

function loadDate(key, input) {
  const saved = parseStoredDate(localStorage.getItem(key) || "");
  const value = saved || makeDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  input.value = formatDateInputValue(value);
}

function addDays(date, amount) {
  return makeDate(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function collectDays(start, stop) {
  const reverse = start > stop;
  const from = reverse ? stop : start;
  const to = reverse ? start : stop;

  let cursor = from;
  let daysCount = 0;
  let weekendCount = 0;
  let monthRatio = 0;

  while (cursor <= to) {
    daysCount += 1;

    if (isWeekend(cursor)) {
      weekendCount += 1;
    }

    monthRatio += 1 / new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    cursor = addDays(cursor, 1);
  }

  return { reverse, daysCount, weekendCount, monthRatio };
}

function addChangeCooldown(input, callback, cooldownMs) {
  let timerId = 0;

  input.addEventListener("change", () => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(callback, cooldownMs);
  });
}

function initDaysPage() {
  mountSiteShell();
  initNumberSteppers();

  const startInput = document.getElementById("start-day");
  const endInput = document.getElementById("end-day");
  const addDaysInput = document.getElementById("add-days-input");
  const addDaysButton = document.getElementById("add-days-btn");
  const errorElement = document.getElementById("error");
  const totalDurationElement = document.getElementById("total-duration");
  const weekendDaysElement = document.getElementById("weekend-days");
  const monthsElement = document.getElementById("months");
  const yearsElement = document.getElementById("years");

  loadDate("start-day", startInput);
  loadDate("end-day", endInput);

  function validate() {
    const start = parseInputDate(startInput.value);
    const end = parseInputDate(endInput.value);

    return Boolean(start && end && start.getFullYear() <= 9000 && end.getFullYear() <= 9000);
  }

  function calculate() {
    const start = parseInputDate(startInput.value);
    const end = parseInputDate(endInput.value);

    if (!start || !end || !validate()) {
      errorElement.textContent = "Error in date";
      totalDurationElement.textContent = "-";
      weekendDaysElement.textContent = "-";
      monthsElement.textContent = "-";
      yearsElement.textContent = "-";
      return;
    }

    saveDate("start-day", startInput);
    saveDate("end-day", endInput);

    errorElement.textContent = "";

    const result = collectDays(start, end);
    totalDurationElement.textContent = `${result.reverse ? "-" : ""}${formatDays(result.daysCount)}`;
    weekendDaysElement.textContent = formatDays(result.weekendCount);
    monthsElement.textContent = formatMonth(result.monthRatio);
    yearsElement.textContent = `${result.reverse ? "-" : ""}${formatYear(result.monthRatio)}`;
  }

  function handleAddDays() {
    const end = parseInputDate(endInput.value);

    if (!end) {
      calculate();
      return;
    }

    const nextEnd = addDays(end, addDaysInput.valueAsNumber);
    endInput.value = formatDateInputValue(nextEnd);
    calculate();
  }

  addChangeCooldown(startInput, calculate, 1000);
  addChangeCooldown(endInput, calculate, 1000);
  addDaysButton.addEventListener("click", handleAddDays);

  calculate();
}

initDaysPage();
