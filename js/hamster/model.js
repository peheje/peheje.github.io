export const HAMSTER_STATE_VERSION = 1;
export const recentEncounterLimit = 3;

const stageThresholds = [0, 4, 10, 20];

function safeCount(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function safeRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function relationshipStage(relationshipCount) {
  const count = safeCount(relationshipCount);
  let stage = 0;

  stageThresholds.forEach((threshold, index) => {
    if (count >= threshold) stage = index;
  });

  return stage;
}

export function createHamsterState(now = Date.now()) {
  return {
    version: HAMSTER_STATE_VERSION,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: null,
    encounterCount: 0,
    relationshipCount: 0,
    eventCounts: {},
    pageVisits: {},
    seenEncounterIds: {},
    recentEncounterIds: [],
    lastEncounterIdByEvent: {},
    lastEncounterAtByEvent: {},
    lastRelationshipAtByEvent: {},
  };
}

export function normalizeHamsterState(value, now = Date.now()) {
  const source = safeRecord(value);
  const initial = createHamsterState(now);

  return {
    ...initial,
    createdAt: Number.isFinite(source.createdAt) ? source.createdAt : now,
    updatedAt: Number.isFinite(source.updatedAt) ? source.updatedAt : now,
    lastSeenAt: Number.isFinite(source.lastSeenAt) ? source.lastSeenAt : null,
    encounterCount: safeCount(source.encounterCount),
    relationshipCount: safeCount(source.relationshipCount),
    eventCounts: { ...safeRecord(source.eventCounts) },
    pageVisits: { ...safeRecord(source.pageVisits) },
    seenEncounterIds: { ...safeRecord(source.seenEncounterIds) },
    recentEncounterIds: Array.isArray(source.recentEncounterIds)
      ? source.recentEncounterIds.filter((id) => typeof id === "string").slice(-recentEncounterLimit)
      : [],
    lastEncounterIdByEvent: { ...safeRecord(source.lastEncounterIdByEvent) },
    lastEncounterAtByEvent: { ...safeRecord(source.lastEncounterAtByEvent) },
    lastRelationshipAtByEvent: { ...safeRecord(source.lastRelationshipAtByEvent) },
  };
}

function cooldownElapsed(lastAt, cooldownMs, now) {
  return !Number.isFinite(lastAt) || now - lastAt >= cooldownMs;
}

function chooseCandidate(candidates, recentIds, random) {
  const fresh = candidates.filter((candidate) => !recentIds.includes(candidate.id));
  const pool = fresh.length > 0 ? fresh : candidates;
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length));
  return pool[index] || null;
}

export function recordHamsterEvent(stateValue, event, options) {
  const {
    catalog,
    policies = {},
    now = Date.now(),
    random = Math.random,
  } = options;
  const state = normalizeHamsterState(stateValue, now);
  const type = typeof event?.type === "string" ? event.type : "unknown";
  const page = typeof event?.page === "string" ? event.page : "";
  const eventCount = safeCount(state.eventCounts[type]) + 1;

  state.updatedAt = now;
  state.lastSeenAt = now;
  state.eventCounts[type] = eventCount;

  if (type === "page.viewed" && page) {
    state.pageVisits[page] = safeCount(state.pageVisits[page]) + 1;
  }

  const policy = policies[type] || {};
  const displayCooldownMs = safeCount(policy.displayCooldownMs);
  if (!cooldownElapsed(state.lastEncounterAtByEvent[type], displayCooldownMs, now)) {
    return { state, encounter: null };
  }

  const stickyEncounterMs = safeCount(policy.stickyEncounterMs);
  if (!cooldownElapsed(state.lastEncounterAtByEvent[type], stickyEncounterMs, now)) {
    const previousId = state.lastEncounterIdByEvent[type];
    const previous = catalog.find((candidate) => candidate.id === previousId);
    if (previous) {
      state.encounterCount += 1;
      return {
        state,
        encounter: {
          ...previous,
          event: type,
          eventCount,
          relationshipStage: relationshipStage(state.relationshipCount),
          repeated: true,
        },
      };
    }
  }

  const stage = relationshipStage(state.relationshipCount);
  const candidates = catalog.filter((candidate) => {
    if (candidate.event !== type || safeCount(candidate.stage) > stage) return false;
    if (candidate.page && candidate.page !== page) return false;
    if (safeCount(candidate.minRelationshipCount) > state.relationshipCount) return false;
    if (Number.isFinite(candidate.maxRelationshipCount) && state.relationshipCount > candidate.maxRelationshipCount) return false;
    if (candidate.once && state.seenEncounterIds[candidate.id]) return false;
    if (safeCount(candidate.minEventCount) > eventCount) return false;
    if (Number.isFinite(candidate.maxEventCount) && eventCount > candidate.maxEventCount) return false;
    return true;
  });

  if (candidates.length === 0) {
    return { state, encounter: null };
  }

  const encounter = chooseCandidate(candidates, state.recentEncounterIds, random);
  state.encounterCount += 1;
  state.seenEncounterIds[encounter.id] = safeCount(state.seenEncounterIds[encounter.id]) + 1;
  state.recentEncounterIds = [...state.recentEncounterIds, encounter.id].slice(-recentEncounterLimit);
  state.lastEncounterIdByEvent[type] = encounter.id;
  state.lastEncounterAtByEvent[type] = now;

  const relationshipCooldownMs = safeCount(policy.relationshipCooldownMs);
  if (cooldownElapsed(state.lastRelationshipAtByEvent[type], relationshipCooldownMs, now)) {
    state.relationshipCount += 1;
    state.lastRelationshipAtByEvent[type] = now;
  }

  return {
    state,
    encounter: {
      ...encounter,
      event: type,
      eventCount,
      relationshipStage: relationshipStage(state.relationshipCount),
    },
  };
}
