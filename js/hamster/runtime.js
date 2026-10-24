import {
  HAMSTER_EVENTS,
  hamsterEncounters,
  hamsterEventPolicies,
} from "./catalog.js";
import { recordHamsterChoice, recordHamsterEvent } from "./model.js";
import { loadNightly, nightlyEncounters } from "./nightly.js";
import { createHamsterRepository } from "./storage.js";
import { createHamsterView } from "./view.js";

export { HAMSTER_EVENTS } from "./catalog.js";

export const HAMSTER_EVENT_NAME = "peheje:hamster-event";

function getTimeBand(date = new Date()) {
  const hour = date.getHours();
  if (hour < 6 || hour >= 22) return "night";
  if (hour < 11) return "morning";
  if (hour < 17) return "day";
  return "evening";
}

export function createHamsterRuntime({
  repository,
  view,
  eventTarget,
  catalog: baseCatalog = hamsterEncounters,
  policies = hamsterEventPolicies,
  now = Date.now,
  random = Math.random,
}) {
  let currentPage = "";
  let started = false;
  let catalog = baseCatalog;
  // "Go on" can ask for a couple more lines in one sitting.
  const extraLinesPerVisit = 2;
  let extraLines = 0;

  // Nightly lines arrive after start; ids already in the catalog win.
  function addEncounters(encounters) {
    const known = new Set(catalog.map(line => line.id));
    const fresh = encounters.filter(line => !known.has(line.id));
    if (fresh.length) catalog = [...catalog, ...fresh];
  }

  function markRead(id) {
    const state = repository.load();
    if (state.lastEncounterId !== id || !state.lastEncounterUnread) return;
    state.lastEncounterUnread = false;
    repository.save(state);
  }

  function choose(id, optionIndex) {
    const encounter = catalog.find(line => line.id === id);
    if (!encounter?.choice) return null;
    const state = recordHamsterChoice(repository.load(), encounter, optionIndex, now());
    repository.save(state);
    return state.choices[id] || null;
  }

  function choiceFor(encounter, state) {
    if (!encounter?.choice) return null;
    return {
      options: encounter.choice.options.map(option => option.label),
      chosen: state.choices[encounter.id] || null,
      onChoose: index => choose(encounter.id, index),
    };
  }

  function recall(context = {}) {
    const state = repository.load();
    const encounter = catalog.find(line => line.id === state.lastEncounterId);
    if (!encounter) return false;
    markRead(encounter.id);
    view.show({ ...encounter, presentation: "dialog" }, { ...context, keepsakes: state.keepsakes, choice: choiceFor(encounter, state) });
    return true;
  }

  function goOn(context) {
    if (extraLines >= extraLinesPerVisit) return;
    extraLines += 1;
    const result = record(HAMSTER_EVENTS.MANUAL_REVEAL, context, { more: true });
    if (!result.encounter) view.showQuiet({ ...context, timeBand: "done", random, keepsakes: result.state.keepsakes });
  }

  function visit(context) {
    extraLines = 0;
    const state = repository.load();
    if (state.lastEncounterUnread && recall(context)) return;
    const result = record(HAMSTER_EVENTS.MANUAL_REVEAL, context);
    if (result.encounter) return;
    view.showQuiet({
      ...context,
      timeBand: getTimeBand(new Date(now())),
      random,
      keepsakes: result.state.keepsakes,
      onRecall: result.state.lastEncounterId ? () => recall(context) : null,
    });
  }

  function record(type, detail = {}, { more = false } = {}) {
    const timestamp = now();
    const context = {
      localHour: new Date(timestamp).getHours(),
      timeBand: getTimeBand(new Date(timestamp)),
      ...detail,
    };
    const result = recordHamsterEvent(
      repository.load(),
      { type, page: currentPage, detail: context },
      { catalog, policies, now: timestamp, random, ignoreDisplayCooldown: more },
    );
    repository.save(result.state);
    if (result.encounter) view.show(result.encounter, {
      ...context,
      keepsakes: result.state.keepsakes,
      choice: choiceFor(result.encounter, result.state),
      onRead: () => markRead(result.encounter.id),
      onMore: type === HAMSTER_EVENTS.MANUAL_REVEAL && extraLines < extraLinesPerVisit ? () => goOn(detail) : null,
    });
    return result;
  }

  function receive(event) {
    const type = event?.detail?.type;
    if (typeof type !== "string") return;
    record(type, event.detail.context || {});
  }

  function start({ page, triggerParent = null }) {
    if (started) return;
    started = true;
    currentPage = page;
    eventTarget.addEventListener(HAMSTER_EVENT_NAME, receive);
    record(HAMSTER_EVENTS.PAGE_VIEWED);

    if (triggerParent) {
      view.mountTrigger(triggerParent, (context) => {
        visit(context);
      });
    }
  }

  function stop() {
    if (!started) return;
    started = false;
    eventTarget.removeEventListener(HAMSTER_EVENT_NAME, receive);
    if (view.destroy) view.destroy();
    else view.close();
  }

  function getState() {
    return repository.load();
  }

  function saveState(state) {
    repository.save(state);
    return repository.load();
  }

  return {
    addEncounters,
    choose,
    closeEncounter: view.close,
    getState,
    record,
    saveState,
    start,
    stop,
  };
}

let browserRuntime = null;

export function startHamster({ page, triggerParent = null }) {
  if (!browserRuntime) {
    let storage = null;
    try {
      storage = window.localStorage;
    } catch {
      // The relationship can live for this page even when storage is denied.
    }

    browserRuntime = createHamsterRuntime({
      repository: createHamsterRepository({ storage }),
      view: createHamsterView({ document, window }),
      eventTarget: window,
    });
  }

  const runtime = browserRuntime;
  runtime.start({ page, triggerParent });
  loadNightly().then(doc => {
    if (doc) runtime.addEncounters(nightlyEncounters(doc));
  });
  return runtime;
}

export function signalHamsterEvent(type, context = {}) {
  window.dispatchEvent(new CustomEvent(HAMSTER_EVENT_NAME, {
    detail: { type, context },
  }));
}
