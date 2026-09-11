import { HAMSTER_EVENTS } from "./catalog.js";
import { createHamsterState, relationshipStage } from "./model.js";

const debugParameter = "hamster-debug";
const debugSessionKey = "peheje-hamster-debug";
const stageCounts = [0, 4, 10];
const historyLabels = ["new", "met", "familiar"];

function safeSessionGet(window, key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(window, key, value) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Debug mode still works on the current page if session storage is denied.
  }
}

export function isHamsterDebugEnabled(window) {
  const parameter = new URL(window.location.href).searchParams.get(debugParameter);
  if (parameter === "1") {
    safeSessionSet(window, debugSessionKey, "1");
    return true;
  }
  if (parameter === "0") {
    safeSessionSet(window, debugSessionKey, null);
    return false;
  }
  return safeSessionGet(window, debugSessionKey) === "1";
}

function debugHref(path) {
  return `${path}?${debugParameter}=1`;
}

export function mountHamsterDebug({ runtime, document, window }) {
  if (!isHamsterDebugEnabled(window) || document.querySelector(".hamster-debug")) return null;

  const panel = document.createElement("details");
  panel.className = "hamster-debug";
  panel.open = true;
  panel.innerHTML = `
    <summary>Hamster debug</summary>
    <div class="hamster-debug-body">
      <output class="hamster-debug-state" aria-live="polite"></output>
      <div class="hamster-debug-actions">
        <button type="button" data-action="ambient">Ambient quote</button>
        <button type="button" data-action="timer-first">First timer</button>
        <button type="button" data-action="timer-later">Later timer</button>
        <button type="button" data-action="recall-timer">Recall timer</button>
        <button type="button" data-action="recall-memory">Recall memory</button>
        <button type="button" data-action="quest-offer">Offer errand</button>
        <button type="button" data-action="quest-complete">Finish errand</button>
        <button type="button" data-action="weather-offer">Offer cloak</button>
        <button type="button" data-action="weather-wet">Bring rain</button>
        <button type="button" data-action="weather-dry">Bring clear sky</button>
        <button type="button" data-action="relationship">+ Relationship</button>
        <button type="button" data-action="reset">Reset memory</button>
      </div>
      <div class="hamster-debug-stages" aria-label="Set relationship history">
        <span>History</span>
        ${stageCounts.map((_count, stage) => `<button type="button" data-stage="${stage}">${historyLabels[stage]}</button>`).join("")}
      </div>
      <nav class="hamster-debug-nav" aria-label="Hamster debug pages">
        <a href="${debugHref("/compare.html")}">Compare</a>
        <a href="${debugHref("/timer.html")}">Timer</a>
        <a href="${debugHref("/weather.html")}">Weather</a>
        <a href="${debugHref("/burrow.html")}">Burrow</a>
        <button type="button" data-action="exit">Exit debug</button>
      </nav>
      <small>Memory belongs to this browser only.</small>
    </div>
  `;

  const stateOutput = panel.querySelector(".hamster-debug-state");

  function refresh() {
    const state = runtime.getState();
    const stage = relationshipStage(state.relationshipCount);
    const timerCount = state.eventCounts[HAMSTER_EVENTS.TIMER_COMPLETED] || 0;
    stateOutput.textContent = `${historyLabels[stage]} · history ${state.relationshipCount} · encounters ${state.encounterCount} · timers ${timerCount}`;
    panel.querySelectorAll("[data-stage]").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.stage) === stage));
    });
  }

  function updateState(change) {
    const state = runtime.getState();
    change(state);
    runtime.saveState(state);
    refresh();
  }

  function prepareTimer({ first }) {
    runtime.closeEncounter();
    updateState((state) => {
      state.activeQuestId = null;
      state.relationshipCount = Math.max(state.relationshipCount, first ? 4 : 10);
      state.eventCounts[HAMSTER_EVENTS.TIMER_COMPLETED] = first ? 0 : 1;
      delete state.lastEncounterAtByEvent[HAMSTER_EVENTS.TIMER_COMPLETED];
      if (first) delete state.seenEncounterIds["timer-first-ending"];
      else state.seenEncounterIds["timer-first-ending"] = Math.max(1, state.seenEncounterIds["timer-first-ending"] || 0);
    });
    runtime.record(HAMSTER_EVENTS.TIMER_COMPLETED, { debug: true });
    refresh();
  }

  function prepareMemoryRecall(event, encounterIds) {
    runtime.closeEncounter();
    updateState((state) => {
      const yesterday = Date.now() - 21 * 60 * 60 * 1000;
      state.eventCounts[event] = 1;
      state.lastEventAtByEvent[event] = yesterday;
      delete state.lastEncounterAtByEvent[HAMSTER_EVENTS.MANUAL_REVEAL];
      delete state.lastEncounterAtByEvent[HAMSTER_EVENTS.PAGE_VIEWED];
      encounterIds.forEach((encounterId) => delete state.seenEncounterIds[encounterId]);
    });
    runtime.record(HAMSTER_EVENTS.MANUAL_REVEAL, { debug: true });
    refresh();
  }

  panel.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.stage !== undefined) {
      const stage = Number(button.dataset.stage);
      updateState((state) => { state.relationshipCount = stageCounts[stage]; });
      return;
    }

    switch (button.dataset.action) {
      case "ambient":
        runtime.record(HAMSTER_EVENTS.MANUAL_REVEAL, { sourceElement: button, debug: true });
        refresh();
        break;
      case "timer-first":
        prepareTimer({ first: true });
        break;
      case "timer-later":
        prepareTimer({ first: false });
        break;
      case "recall-timer":
        prepareMemoryRecall(HAMSTER_EVENTS.TIMER_COMPLETED, ["remembered-first-timer", "remembered-five-timers"]);
        break;
      case "recall-memory":
        prepareMemoryRecall(HAMSTER_EVENTS.MEMORY_CORRECT, ["remembered-memory-round", "remembered-ten-answers"]);
        break;
      case "quest-offer":
        runtime.closeEncounter();
        updateState((state) => {
          state.activeQuestId = null;
          delete state.completedQuestIds["wake-in-three"];
          delete state.keepsakes["brass-button"];
          delete state.seenEncounterIds["quest-wake-offer"];
          delete state.seenEncounterIds["quest-wake-complete"];
          delete state.lastEncounterAtByEvent[HAMSTER_EVENTS.MANUAL_REVEAL];
          delete state.lastEncounterAtByEvent[HAMSTER_EVENTS.PAGE_VIEWED];
        });
        runtime.record(HAMSTER_EVENTS.MANUAL_REVEAL, { sourceElement: button, debug: true });
        refresh();
        break;
      case "quest-complete":
        updateState((state) => { state.activeQuestId = "wake-in-three"; });
        runtime.record(HAMSTER_EVENTS.TIMER_COMPLETED, { durationMs: 3 * 60 * 1000, timeBand: "day", debug: true });
        refresh();
        break;
      case "weather-offer":
        runtime.closeEncounter();
        updateState((state) => {
          state.activeQuestId = null;
          state.completedQuestIds["wake-in-three"] = Date.now() - 21 * 60 * 60 * 1000;
          delete state.completedQuestIds["fetch-the-weather"];
          delete state.seenEncounterIds["quest-weather-offer"];
          delete state.lastEncounterAtByEvent[HAMSTER_EVENTS.MANUAL_REVEAL];
          delete state.lastEncounterAtByEvent[HAMSTER_EVENTS.PAGE_VIEWED];
        });
        runtime.record(HAMSTER_EVENTS.MANUAL_REVEAL, { sourceElement: button, debug: true });
        refresh();
        break;
      case "weather-wet":
      case "weather-dry":
        updateState((state) => {
          state.activeQuestId = "fetch-the-weather";
          ["quest-weather-wet-night", "quest-weather-wet", "quest-weather-dry"].forEach(id => delete state.seenEncounterIds[id]);
        });
        runtime.record(HAMSTER_EVENTS.WEATHER_CHECKED, {
          wet: button.dataset.action === "weather-wet",
          timeBand: "day",
          debug: true,
        });
        refresh();
        break;
      case "relationship":
        updateState((state) => { state.relationshipCount += 1; });
        break;
      case "reset":
        runtime.closeEncounter();
        runtime.saveState(createHamsterState(Date.now()));
        refresh();
        break;
      case "exit": {
        safeSessionSet(window, debugSessionKey, null);
        const url = new URL(window.location.href);
        url.searchParams.delete(debugParameter);
        window.location.href = url.href;
        break;
      }
    }
  });

  document.body.append(panel);
  refresh();
  return panel;
}
