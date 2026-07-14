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

function formatHoursBetween(durationMs) {
  const totalMinutes = Math.round(Math.abs(durationMs) / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (days) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes || parts.length === 0) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);

  return `${(durationMs / 3600000).toFixed(2)} hours (${parts.join(", ")})`;
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

function parseInputTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours <= 23 && minutes <= 59 ? { hours, minutes } : null;
}

function parseInputTimestamp(dateValue, timeValue) {
  const date = parseInputDate(dateValue);
  const time = parseInputTime(timeValue);

  if (!date || !time) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.hours,
    time.minutes,
    0,
    0,
  );
}

function saveDate(key, input) {
  localStorage.setItem(key, input.value);
}

function loadDate(key, input) {
  const saved = parseStoredDate(localStorage.getItem(key) || "");
  const value = saved || makeDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  input.value = formatDateInputValue(value);
}

function loadTime(key, input) {
  const saved = localStorage.getItem(key) || "";
  input.value = parseInputTime(saved) ? saved : "00:00";
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
  const startTimeInput = document.getElementById("start-time");
  const endTimeInput = document.getElementById("end-time");
  const includeTimesInput = document.getElementById("include-times");
  const startTimeField = document.getElementById("start-time-field");
  const endTimeField = document.getElementById("end-time-field");
  const addDaysInput = document.getElementById("add-days-input");
  const addDaysButton = document.getElementById("add-days-btn");
  const errorElement = document.getElementById("error");
  const totalDurationElement = document.getElementById("total-duration");
  const hoursBetweenRow = document.getElementById("hours-between-row");
  const hoursBetweenElement = document.getElementById("hours-between");
  const weekendDaysElement = document.getElementById("weekend-days");
  const monthsElement = document.getElementById("months");
  const yearsElement = document.getElementById("years");

  loadDate("start-day", startInput);
  loadDate("end-day", endInput);
  loadTime("start-time", startTimeInput);
  loadTime("end-time", endTimeInput);
  includeTimesInput.checked = localStorage.getItem("include-times") === "true";

  function updateTimeFields() {
    const includeTimes = includeTimesInput.checked;
    startTimeField.hidden = !includeTimes;
    endTimeField.hidden = !includeTimes;
    hoursBetweenRow.hidden = !includeTimes;
  }

  updateTimeFields();

  function validate() {
    const start = parseInputDate(startInput.value);
    const end = parseInputDate(endInput.value);

    if (includeTimesInput.checked) {
      const startTimestamp = parseInputTimestamp(startInput.value, startTimeInput.value);
      const endTimestamp = parseInputTimestamp(endInput.value, endTimeInput.value);
      return Boolean(
        start && end && startTimestamp && endTimestamp
        && start.getFullYear() <= 9000 && end.getFullYear() <= 9000,
      );
    }

    return Boolean(start && end && start.getFullYear() <= 9000 && end.getFullYear() <= 9000);
  }

  function calculate() {
    const start = parseInputDate(startInput.value);
    const end = parseInputDate(endInput.value);
    const startTimestamp = includeTimesInput.checked
      ? parseInputTimestamp(startInput.value, startTimeInput.value)
      : null;
    const endTimestamp = includeTimesInput.checked
      ? parseInputTimestamp(endInput.value, endTimeInput.value)
      : null;

    if (!start || !end || !validate()) {
      errorElement.textContent = includeTimesInput.checked ? "Error in date or time" : "Error in date";
      totalDurationElement.textContent = "-";
      hoursBetweenElement.textContent = "-";
      weekendDaysElement.textContent = "-";
      monthsElement.textContent = "-";
      yearsElement.textContent = "-";
      return;
    }

    saveDate("start-day", startInput);
    saveDate("end-day", endInput);
    saveDate("start-time", startTimeInput);
    saveDate("end-time", endTimeInput);

    errorElement.textContent = "";

    const result = collectDays(start, end);
    totalDurationElement.textContent = `${result.reverse ? "-" : ""}${formatDays(result.daysCount)}`;
    if (startTimestamp && endTimestamp) {
      hoursBetweenElement.textContent = formatHoursBetween(endTimestamp - startTimestamp);
    }
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
  addChangeCooldown(startTimeInput, calculate, 1000);
  addChangeCooldown(endTimeInput, calculate, 1000);
  includeTimesInput.addEventListener("change", () => {
    localStorage.setItem("include-times", String(includeTimesInput.checked));
    updateTimeFields();
    calculate();
  });
  addDaysButton.addEventListener("click", handleAddDays);

  calculate();
}

initDaysPage();
