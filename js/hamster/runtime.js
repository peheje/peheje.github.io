import {
  HAMSTER_EVENTS,
  hamsterEncounters,
  hamsterEventPolicies,
} from "./catalog.js";
import { recordHamsterEvent } from "./model.js";
import { createHamsterRepository } from "./storage.js";
import { createHamsterView } from "./view.js";

export { HAMSTER_EVENTS } from "./catalog.js";

export const HAMSTER_EVENT_NAME = "peheje:hamster-event";

export function createHamsterRuntime({
  repository,
  view,
  eventTarget,
  catalog = hamsterEncounters,
  policies = hamsterEventPolicies,
  now = Date.now,
  random = Math.random,
}) {
  let currentPage = "";
  let started = false;

  function record(type, detail = {}) {
    const result = recordHamsterEvent(
      repository.load(),
      { type, page: currentPage, detail },
      { catalog, policies, now: now(), random },
    );
    repository.save(result.state);
    if (result.encounter) view.show(result.encounter, detail);
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
        record(HAMSTER_EVENTS.MANUAL_REVEAL, context);
      });
    }
  }

  function stop() {
    if (!started) return;
    started = false;
    eventTarget.removeEventListener(HAMSTER_EVENT_NAME, receive);
    view.close();
  }

  function getState() {
    return repository.load();
  }

  function saveState(state) {
    repository.save(state);
    return repository.load();
  }

  return {
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

  browserRuntime.start({ page, triggerParent });
  return browserRuntime;
}

export function signalHamsterEvent(type, context = {}) {
  window.dispatchEvent(new CustomEvent(HAMSTER_EVENT_NAME, {
    detail: { type, context },
  }));
}
