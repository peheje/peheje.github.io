import { initNumberSteppers } from "../number-stepper.js";
import { mountSiteShell } from "../site.js";

const monthlyLimitKey = "poe-monthly-limit";
const resetDayKey = "poe-reset-day";
const requiredHeaders = ["Timestamp", "Provider/Model", "App", "Points", "Dollars"];

function getElement(id) {
  return document.getElementById(id);
}

function formatInteger(value) {
  return new Intl.NumberFormat().format(Math.round(value));
}

function formatDecimal(value, digits = 2) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCurrency(value) {
  return `$${formatDecimal(value, 2)}`;
}

function formatPercent(value) {
  return `${formatDecimal(value * 100, 1)}%`;
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date) {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getNiceTickStep(maxValue) {
  if (maxValue <= 0) {
    return 1000;
  }

  const roughStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;

  if (normalized <= 1) {
    return magnitude;
  }

  if (normalized <= 2) {
    return 2 * magnitude;
  }

  if (normalized <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
}

function formatDateKey(date) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clampResetDay(value) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(31, Math.max(1, Math.round(value)));
}

function readStoredNumber(key, fallback) {
  const value = Number.parseInt(localStorage.getItem(key) || "", 10);
  return Number.isFinite(value) ? value : fallback;
}

function saveSettings(limitInput, resetDayInput) {
  const limit = Math.max(1, Math.round(limitInput.valueAsNumber || 1000000));
  const resetDay = clampResetDay(resetDayInput.valueAsNumber || 1);
  limitInput.value = String(limit);
  resetDayInput.value = String(resetDay);
  localStorage.setItem(monthlyLimitKey, String(limit));
  localStorage.setItem(resetDayKey, String(resetDay));
  return { limit, resetDay };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === "," && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current);
  return values;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    throw new Error("CSV file is empty.");
  }

  const headers = parseCsvLine(lines[0]);

  if (!requiredHeaders.every((header) => headers.includes(header))) {
    throw new Error("CSV is missing one or more required Poe headers.");
  }

  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const rows = [];

  lines.slice(1).forEach((line) => {
    const values = parseCsvLine(line);
    const timestampValue = values[indexes.Timestamp] || "";
    const model = values[indexes["Provider/Model"]] || "";
    const app = values[indexes.App] || "";
    const points = Number.parseFloat(values[indexes.Points] || "0");
    const dollars = Number.parseFloat(values[indexes.Dollars] || "0");
    const timestamp = new Date(timestampValue);

    if (!timestampValue || Number.isNaN(timestamp.getTime()) || !model || !app || !Number.isFinite(points) || !Number.isFinite(dollars)) {
      return;
    }

    rows.push({
      timestamp,
      model,
      app,
      points,
      dollars,
      dateKey: formatDateKey(timestamp),
    });
  });

  if (rows.length === 0) {
    throw new Error("CSV contained no readable usage rows.");
  }

  rows.sort((left, right) => left.timestamp - right.timestamp);
  return rows;
}

function getCycleStart(referenceDate, resetDay) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const currentMonthDay = Math.min(resetDay, new Date(year, month + 1, 0).getDate());

  if (referenceDate.getDate() >= currentMonthDay) {
    return new Date(year, month, currentMonthDay, 0, 0, 0, 0);
  }

  const previousMonth = month === 0 ? 11 : month - 1;
  const previousYear = month === 0 ? year - 1 : year;
  const previousMonthDay = Math.min(resetDay, new Date(previousYear, previousMonth + 1, 0).getDate());
  return new Date(previousYear, previousMonth, previousMonthDay, 0, 0, 0, 0);
}

function getNextCycleStart(cycleStart, resetDay) {
  const nextMonth = cycleStart.getMonth() === 11 ? 0 : cycleStart.getMonth() + 1;
  const nextYear = cycleStart.getMonth() === 11 ? cycleStart.getFullYear() + 1 : cycleStart.getFullYear();
  const nextDay = Math.min(resetDay, new Date(nextYear, nextMonth + 1, 0).getDate());
  return new Date(nextYear, nextMonth, nextDay, 0, 0, 0, 0);
}

function groupTotals(rows, property) {
  const totals = new Map();

  rows.forEach((row) => {
    const key = row[property];
    const current = totals.get(key) || { key, points: 0, dollars: 0, count: 0 };
    current.points += row.points;
    current.dollars += row.dollars;
    current.count += 1;
    totals.set(key, current);
  });

  return [...totals.values()].sort((left, right) => right.points - left.points);
}

function groupByDay(rows) {
  const totals = new Map();

  rows.forEach((row) => {
    const current = totals.get(row.dateKey) || { key: row.dateKey, date: new Date(row.timestamp.getFullYear(), row.timestamp.getMonth(), row.timestamp.getDate()), points: 0, dollars: 0, count: 0 };
    current.points += row.points;
    current.dollars += row.dollars;
    current.count += 1;
    totals.set(row.dateKey, current);
  });

  return [...totals.values()].sort((left, right) => left.date - right.date);
}

function sumRows(rows) {
  return rows.reduce(
    (summary, row) => ({
      points: summary.points + row.points,
      dollars: summary.dollars + row.dollars,
      count: summary.count + 1,
    }),
    { points: 0, dollars: 0, count: 0 }
  );
}

function estimateExhaustionDate(cycleRows, limit, cycleStart, nextCycleStart) {
  const cycleTotal = sumRows(cycleRows);
  const remaining = Math.max(0, limit - cycleTotal.points);
  const today = new Date();
  const elapsedDays = Math.max(1, Math.ceil((today - cycleStart) / 86400000));
  const pointsPerDay = cycleTotal.points / elapsedDays;

  if (cycleTotal.points <= 0 || pointsPerDay <= 0) {
    return {
      label: "-",
      note: "Not enough current-cycle data to estimate.",
    };
  }

  const daysToExhaust = remaining / pointsPerDay;
  const exhaustionDate = new Date(today.getTime() + daysToExhaust * 86400000);
  const resetsBeforeExhaustion = exhaustionDate >= nextCycleStart;

  if (resetsBeforeExhaustion) {
    return {
      label: "After reset",
      note: `At the current pace, you should reach the next reset on ${formatDate(nextCycleStart)} first.`,
    };
  }

  return {
    label: formatDate(exhaustionDate),
    note: `${formatDecimal(daysToExhaust, 1)} days left at the current cycle pace.`,
  };
}

function renderDailyChart(element, dailyRows) {
  const tooltipElement = getElement("poe-daily-tooltip");

  if (dailyRows.length === 0) {
    element.innerHTML = "";
    tooltipElement.classList.add("display-none");
    return;
  }

  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 12, bottom: 46, left: 58 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxPoints = Math.max(...dailyRows.map((row) => row.points), 1);
  const tickStep = getNiceTickStep(maxPoints);
  const roundedMaxPoints = Math.max(tickStep, Math.ceil(maxPoints / tickStep) * tickStep);
  const barWidth = Math.max(10, chartWidth / dailyRows.length - 8);
  const gap = dailyRows.length > 1 ? (chartWidth - barWidth * dailyRows.length) / (dailyRows.length - 1) : 0;
  const yTicks = [];

  for (let value = 0; value <= roundedMaxPoints; value += tickStep) {
    const ratio = value / roundedMaxPoints;
    yTicks.push({
      value,
      y: padding.top + chartHeight - chartHeight * ratio,
    });
  }

  const axisMarkup = yTicks.map((tick) => `
      <g>
        <line x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}" class="chart-grid"></line>
        <text x="${padding.left - 8}" y="${tick.y + 4}" text-anchor="end" class="chart-axis chart-axis-y">${formatInteger(tick.value)}</text>
      </g>
    `).join("");

  const bars = dailyRows.map((row, index) => {
    const barHeight = (row.points / roundedMaxPoints) * chartHeight;
    const x = padding.left + index * (barWidth + gap);
    const y = padding.top + chartHeight - barHeight;
    const label = row.date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const title = `${label}: ${formatInteger(row.points)} points across ${formatInteger(row.count)} requests (${formatCurrency(row.dollars)})`;
    const hitX = dailyRows.length === 1 ? padding.left : x - gap / 2;
    const hitWidth = dailyRows.length === 1 ? chartWidth : barWidth + gap;

    return `
      <g>
        <rect x="${hitX}" y="${padding.top}" width="${hitWidth}" height="${chartHeight}" class="chart-hitbox" tabindex="0" aria-label="${escapeHtml(title)}" data-title="${escapeHtml(title)}"></rect>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="3" ry="3" class="chart-bar" tabindex="0" aria-label="${escapeHtml(title)}" data-title="${escapeHtml(title)}"></rect>
        <text x="${x + barWidth / 2}" y="${height - 18}" text-anchor="middle" class="chart-axis">${label}</text>
      </g>
    `;
  }).join("");

  element.innerHTML = `
    ${axisMarkup}
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" class="chart-grid"></line>
    ${bars}
  `;

  const wrapElement = getElement("poe-daily-chart-wrap");

  function hideTooltip() {
    tooltipElement.classList.add("display-none");
  }

  function showTooltip(target) {
    const title = target.dataset.title || "";

    if (title === "") {
      hideTooltip();
      return;
    }

    const wrapRect = wrapElement.getBoundingClientRect();
    const barRect = target.getBoundingClientRect();
    tooltipElement.textContent = title;
    tooltipElement.classList.remove("display-none");

    const preferredLeft = barRect.left - wrapRect.left + barRect.width / 2;
    const top = barRect.top - wrapRect.top;
    const tooltipWidth = tooltipElement.offsetWidth;
    const clampedLeft = Math.min(
      wrapRect.width - tooltipWidth / 2 - 8,
      Math.max(tooltipWidth / 2 + 8, preferredLeft)
    );

    tooltipElement.style.left = `${clampedLeft}px`;
    tooltipElement.style.top = `${Math.max(8, top - 10)}px`;
  }

  element.querySelectorAll(".chart-hitbox, .chart-bar").forEach((target) => {
    target.addEventListener("pointerenter", () => showTooltip(target));
    target.addEventListener("pointermove", () => showTooltip(target));
    target.addEventListener("pointerleave", hideTooltip);
    target.addEventListener("focus", () => showTooltip(target));
    target.addEventListener("blur", hideTooltip);
  });
}

function renderRankingList(element, items, formatter) {
  element.replaceChildren();

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "result-line";
    empty.textContent = "No data yet.";
    element.append(empty);
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "ranking-row";

    const label = document.createElement("div");
    label.className = "ranking-main";
    label.textContent = `${index + 1}. ${formatter.title(item)}`;

    const meta = document.createElement("p");
    meta.className = "ranking-meta";
    meta.textContent = formatter.meta(item);

    row.append(label, meta);
    element.append(row);
  });
}

function renderInsights(element, insights) {
  element.replaceChildren();

  insights.forEach((text) => {
    const item = document.createElement("p");
    item.className = "result-line";
    item.textContent = text;
    element.append(item);
  });
}

function buildInsights(rows, cycleRows, dailyRows, modelRows, appRows, limit, cycleStart, nextCycleStart) {
  const total = sumRows(rows);
  const cycleTotal = sumRows(cycleRows);
  const biggest = [...rows].sort((left, right) => right.points - left.points)[0];
  const mostExpensiveDay = [...dailyRows].sort((left, right) => right.points - left.points)[0];
  const topModel = modelRows[0];
  const topApp = appRows[0];
  const cycleLengthDays = Math.max(1, Math.ceil((nextCycleStart - cycleStart) / 86400000));
  const cycleElapsedDays = Math.max(1, Math.ceil((Date.now() - cycleStart.getTime()) / 86400000));
  const expectedByNow = (limit * cycleElapsedDays) / cycleLengthDays;
  const paceDifference = cycleTotal.points - expectedByNow;

  return [
    `Current cycle usage is ${formatPercent(cycleTotal.points / limit)} of your ${formatInteger(limit)} point budget.`,
    paceDifference > 0
      ? `${formatInteger(paceDifference)} points ahead of an even monthly pace.`
      : `${formatInteger(Math.abs(paceDifference))} points behind an even monthly pace.`,
    biggest
      ? `Largest single request: ${formatInteger(biggest.points)} points on ${biggest.model} in ${biggest.app}.`
      : "Largest single request unavailable.",
    mostExpensiveDay
      ? `Heaviest local day: ${formatDate(mostExpensiveDay.date)} with ${formatInteger(mostExpensiveDay.points)} points over ${formatInteger(mostExpensiveDay.count)} requests.`
      : "No daily totals available.",
    topModel
      ? `Top model: ${topModel.key} used ${formatInteger(topModel.points)} points (${formatPercent(topModel.points / total.points)} of all usage).`
      : "No model breakdown available.",
    topApp
      ? `Top app: ${topApp.key} consumed ${formatInteger(topApp.points)} points across ${formatInteger(topApp.count)} requests.`
      : "No app breakdown available.",
  ];
}

function updateDashboard(rows, limit, resetDay) {
  const statusElement = getElement("poe-status");
  const total = sumRows(rows);
  const now = new Date();
  const latestTimestamp = rows[rows.length - 1].timestamp;
  const cycleStart = getCycleStart(now, resetDay);
  const nextCycleStart = getNextCycleStart(cycleStart, resetDay);
  const cycleRows = rows.filter((row) => row.timestamp >= cycleStart && row.timestamp < nextCycleStart);
  const cycleTotal = sumRows(cycleRows);
  const dailyRows = groupByDay(rows);
  const modelRows = groupTotals(rows, "model");
  const appRows = groupTotals(rows, "app");
  const remainingPoints = Math.max(0, limit - cycleTotal.points);
  const exhaustion = estimateExhaustionDate(cycleRows, limit, cycleStart, nextCycleStart);

  const ageMs = now.getTime() - latestTimestamp.getTime();
  const latestAgeHours = ageMs / 3600000;
  const freshnessNote = latestAgeHours > 1
    ? ` CSV data ends at ${formatDateTime(latestTimestamp)}, so live Poe totals may now be higher.`
    : "";

  statusElement.textContent = `Loaded ${formatInteger(rows.length)} rows from ${formatDate(rows[0].timestamp)} to ${formatDate(latestTimestamp)}.${freshnessNote}`;
  getElement("poe-total-requests").textContent = formatInteger(total.count);
  getElement("poe-total-points").textContent = formatInteger(total.points);
  getElement("poe-total-dollars").textContent = formatCurrency(total.dollars);
  getElement("poe-average-points").textContent = total.count === 0 ? "0" : formatInteger(total.points / total.count);
  getElement("poe-cycle-points").textContent = formatInteger(cycleTotal.points);
  getElement("poe-cycle-dollars").textContent = formatCurrency(cycleTotal.dollars);
  getElement("poe-remaining-points").textContent = formatInteger(remainingPoints);
  getElement("poe-cycle-range").textContent = `${formatDate(cycleStart)} to ${formatDate(new Date(nextCycleStart.getTime() - 86400000))}`;
  getElement("poe-cycle-share").textContent = `${formatPercent(cycleTotal.points / limit)} of your point budget used`;
  getElement("poe-exhaustion-date").textContent = exhaustion.label;
  getElement("poe-days-left-note").textContent = exhaustion.note;

  const cycleLengthDays = Math.max(1, Math.ceil((nextCycleStart - cycleStart) / 86400000));
  const cycleElapsedDays = Math.max(1, Math.ceil((now.getTime() - cycleStart.getTime()) / 86400000));
  const pacePoints = cycleTotal.points / cycleElapsedDays;
  getElement("poe-pace-note").textContent = `${formatInteger(pacePoints)} points/day in the current cycle. ${formatInteger(cycleLengthDays - cycleElapsedDays)} days until reset.`;

  renderDailyChart(getElement("poe-daily-chart"), dailyRows);
  getElement("poe-daily-summary").replaceChildren();
  dailyRows.slice(-7).reverse().forEach((row) => {
    const item = document.createElement("p");
    item.className = "result-line";
    item.textContent = `${formatDate(row.date)}: ${formatInteger(row.points)} points, ${formatInteger(row.count)} requests, ${formatCurrency(row.dollars)}`;
    getElement("poe-daily-summary").append(item);
  });

  renderRankingList(getElement("poe-model-breakdown"), modelRows.slice(0, 8), {
    title: (item) => item.key,
    meta: (item) => `${formatInteger(item.points)} points, ${formatCurrency(item.dollars)}, ${formatInteger(item.count)} requests`,
  });

  renderRankingList(getElement("poe-app-breakdown"), appRows.slice(0, 8), {
    title: (item) => item.key,
    meta: (item) => `${formatInteger(item.points)} points, ${formatCurrency(item.dollars)}, ${formatInteger(item.count)} requests`,
  });

  renderRankingList(getElement("poe-outliers"), [...rows].sort((left, right) => right.points - left.points).slice(0, 10), {
    title: (item) => `${formatInteger(item.points)} points on ${item.model}`,
    meta: (item) => `${formatDate(item.timestamp)} in ${item.app} for ${formatCurrency(item.dollars)}`,
  });

  renderInsights(
    getElement("poe-insights"),
    buildInsights(rows, cycleRows, dailyRows, modelRows, appRows, limit, cycleStart, nextCycleStart)
  );
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsText(file);
  });
}

function initPoePage() {
  mountSiteShell();
  initNumberSteppers();

  const fileInput = getElement("poe-file");
  const limitInput = getElement("poe-limit");
  const resetDayInput = getElement("poe-reset-day");
  const statusElement = getElement("poe-status");

  limitInput.value = String(Math.max(1, readStoredNumber(monthlyLimitKey, 1000000)));
  resetDayInput.value = String(clampResetDay(readStoredNumber(resetDayKey, 1)));

  let parsedRows = [];

  function refreshFromState() {
    const { limit, resetDay } = saveSettings(limitInput, resetDayInput);

    if (parsedRows.length > 0) {
      updateDashboard(parsedRows, limit, resetDay);
    }
  }

  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files || [];

    if (!file) {
      return;
    }

    try {
      const { limit, resetDay } = saveSettings(limitInput, resetDayInput);
      const text = await readFileAsText(file);
      parsedRows = parseCsv(text);
      updateDashboard(parsedRows, limit, resetDay);
    } catch (error) {
      parsedRows = [];
      statusElement.textContent = error instanceof Error ? error.message : "Could not parse the selected file.";
    }
  });

  limitInput.addEventListener("input", refreshFromState);
  limitInput.addEventListener("change", refreshFromState);
  resetDayInput.addEventListener("input", refreshFromState);
  resetDayInput.addEventListener("change", refreshFromState);
  saveSettings(limitInput, resetDayInput);
}

initPoePage();
