import {
  HAMSTER_EVENTS,
  hamsterEncounters,
  hamsterEventPolicies,
} from "./catalog.js";
import { recordHamsterEvent } from "./model.js";
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

  function recall(context = {}) {
    const state = repository.load();
    const encounter = catalog.find(line => line.id === state.lastEncounterId);
    if (!encounter) return false;
    markRead(encounter.id);
    view.show({ ...encounter, presentation: "dialog" }, { ...context, keepsakes: state.keepsakes });
    return true;
  }

  function visit(context) {
    const state = repository.load();
    if (state.lastEncounterUnread && recall(context)) return;
    const result = record(HAMSTER_EVENTS.MANUAL_REVEAL, context);
    if (result.encounter) return;
    view.showQuiet({
      ...context,
      timeBand: getTimeBand(new Date(now())),
      keepsakes: result.state.keepsakes,
      onRecall: result.state.lastEncounterId ? () => recall(context) : null,
    });
  }

  function record(type, detail = {}) {
    const timestamp = now();
    const context = {
      localHour: new Date(timestamp).getHours(),
      timeBand: getTimeBand(new Date(timestamp)),
      ...detail,
    };
    const result = recordHamsterEvent(
      repository.load(),
      { type, page: currentPage, detail: context },
      { catalog, policies, now: timestamp, random },
    );
    repository.save(result.state);
    if (result.encounter) view.show(result.encounter, {
      ...context,
      keepsakes: result.state.keepsakes,
      onRead: () => markRead(result.encounter.id),
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
