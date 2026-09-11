export const HAMSTER_STATE_VERSION = 5;

const stageThresholds = [0, 4, 10];

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
    activeQuestId: null,
    completedQuestIds: {},
    keepsakes: {},
    secrets: {},
    eventCounts: {},
    lastEventAtByEvent: {},
    pageVisits: {},
    seenEncounterIds: {},
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
    activeQuestId: typeof source.activeQuestId === "string" ? source.activeQuestId : null,
    completedQuestIds: { ...safeRecord(source.completedQuestIds) },
    keepsakes: { ...safeRecord(source.keepsakes) },
    secrets: { ...safeRecord(source.secrets) },
    eventCounts: { ...safeRecord(source.eventCounts) },
    lastEventAtByEvent: { ...safeRecord(source.lastEventAtByEvent) },
    pageVisits: { ...safeRecord(source.pageVisits) },
    seenEncounterIds: { ...safeRecord(source.seenEncounterIds) },
    lastEncounterAtByEvent: { ...safeRecord(source.lastEncounterAtByEvent) },
    lastRelationshipAtByEvent: { ...safeRecord(source.lastRelationshipAtByEvent) },
  };
}

function cooldownElapsed(lastAt, cooldownMs, now) {
  return !Number.isFinite(lastAt) || now - lastAt >= cooldownMs;
}

function chooseCandidate(candidates, state, random) {
  // A line is a discovery, not a deck to cycle through. Old saved history counts.
  const unseen = candidates.filter((candidate) => !state.seenEncounterIds[candidate.id]);
  if (unseen.length === 0) return null;
  const highestPriority = Math.max(...unseen.map((candidate) => safeCount(candidate.priority)));
  const pool = unseen.filter((candidate) => safeCount(candidate.priority) === highestPriority);
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
  const detail = safeRecord(event?.detail);
  const eventCount = safeCount(state.eventCounts[type]) + 1;

  state.updatedAt = now;
  state.lastSeenAt = now;
  state.eventCounts[type] = eventCount;
  state.lastEventAtByEvent[type] = now;

  if (type === "page.viewed" && page) {
    state.pageVisits[page] = safeCount(state.pageVisits[page]) + 1;
  }

  const policy = policies[type] || {};
  const displayCooldownMs = safeCount(policy.displayCooldownMs);
  const cooldownEvents = policy.sharedCooldownEvents || [type];
  const bypassDisplayCooldown = policy.bypassCooldownWithActiveQuest && state.activeQuestId;
  if (!bypassDisplayCooldown && cooldownEvents.some((key) => !cooldownElapsed(state.lastEncounterAtByEvent[key], displayCooldownMs, now))) {
    return { state, encounter: null };
  }

  const stage = relationshipStage(state.relationshipCount);
  const candidates = catalog.filter((candidate) => {
    if (candidate.event !== type || safeCount(candidate.stage) > stage) return false;
    if (candidate.page && candidate.page !== page) return false;
    if (safeCount(candidate.minAgeMs) > now - state.createdAt) return false;
    if (safeCount(candidate.minDistinctPages) > Object.keys(state.pageVisits).length) return false;
    if (candidate.requiresEvent) {
      const requiredCount = safeCount(state.eventCounts[candidate.requiresEvent]);
      const requiredAt = state.lastEventAtByEvent[candidate.requiresEvent];
      if (requiredCount < Math.max(1, safeCount(candidate.minRequiredEventCount))) return false;
      if (!Number.isFinite(requiredAt)) return false;
      if (now - requiredAt < safeCount(candidate.minTimeSinceRequiredEventMs)) return false;
    }
    if (candidate.requiresCompletedQuest) {
      const completedAt = state.completedQuestIds[candidate.requiresCompletedQuest];
      if (!Number.isFinite(completedAt)) return false;
      if (now - completedAt < safeCount(candidate.minTimeSinceCompletedQuestMs)) return false;
    }
    if (candidate.requiresKeepsake && !state.keepsakes[candidate.requiresKeepsake]) return false;
    if (candidate.startsQuest) {
      if (state.activeQuestId) return false;
      if (state.completedQuestIds[candidate.startsQuest]) return false;
    }
    if (candidate.requiresActiveQuest && state.activeQuestId !== candidate.requiresActiveQuest) return false;
    if (safeCount(candidate.minDurationMs) > safeCount(detail.durationMs)) return false;
    if (candidate.detailEquals && Object.entries(candidate.detailEquals).some(([key, value]) => detail[key] !== value)) return false;
    if (safeCount(candidate.minRelationshipCount) > state.relationshipCount) return false;
    if (Number.isFinite(candidate.maxRelationshipCount) && state.relationshipCount > candidate.maxRelationshipCount) return false;
    if (safeCount(candidate.minEventCount) > eventCount) return false;
    if (Number.isFinite(candidate.maxEventCount) && eventCount > candidate.maxEventCount) return false;
    return true;
  });

  if (candidates.length === 0) {
    return { state, encounter: null };
  }

  const encounter = chooseCandidate(candidates, state, random);
  if (!encounter) return { state, encounter: null };
  state.encounterCount += 1;
  state.seenEncounterIds[encounter.id] = safeCount(state.seenEncounterIds[encounter.id]) + 1;
  state.lastEncounterAtByEvent[type] = now;

  if (encounter.startsQuest) state.activeQuestId = encounter.startsQuest;
  if (encounter.completesQuest) {
    state.completedQuestIds[encounter.completesQuest] = now;
    if (state.activeQuestId === encounter.completesQuest) state.activeQuestId = null;
    if (encounter.awardsKeepsake) state.keepsakes[encounter.awardsKeepsake] = now;
  }

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
