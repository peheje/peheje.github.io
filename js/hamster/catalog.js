export const HAMSTER_EVENTS = Object.freeze({
  PAGE_VIEWED: "page.viewed",
  MANUAL_REVEAL: "hamster.revealed",
  TIMER_COMPLETED: "timer.completed",
});

export const hamsterEventPolicies = Object.freeze({
  [HAMSTER_EVENTS.MANUAL_REVEAL]: {
    displayCooldownMs: 0,
    relationshipCooldownMs: 20 * 60 * 60 * 1000,
    stickyEncounterMs: 20 * 60 * 60 * 1000,
  },
  [HAMSTER_EVENTS.TIMER_COMPLETED]: {
    displayCooldownMs: 30 * 60 * 1000,
    relationshipCooldownMs: 30 * 60 * 1000,
  },
});

// Dialogue is data on purpose: adding or removing a line should not require
// changing relationship, persistence, or rendering code.
export const hamsterEncounters = Object.freeze([
  {
    id: "ambient-no-useful-thing",
    event: HAMSTER_EVENTS.MANUAL_REVEAL,
    stage: 0,
    maxRelationshipCount: 0,
    text: "The hamster has no useful thing to say.",
  },
  {
    id: "ambient-nothing-to-add",
    event: HAMSTER_EVENTS.MANUAL_REVEAL,
    stage: 0,
    minRelationshipCount: 1,
    maxRelationshipCount: 3,
    text: "The hamster has nothing to add.",
  },
  {
    id: "ambient-machinery",
    event: HAMSTER_EVENTS.MANUAL_REVEAL,
    stage: 1,
    minRelationshipCount: 4,
    text: "I was only checking the machinery.",
  },
  {
    id: "ambient-silence",
    event: HAMSTER_EVENTS.MANUAL_REVEAL,
    stage: 1,
    minRelationshipCount: 4,
    text: "You may stay. I was not using the silence.",
  },
  {
    id: "ambient-returned",
    event: HAMSTER_EVENTS.MANUAL_REVEAL,
    stage: 2,
    minRelationshipCount: 10,
    text: "You came back.",
  },
  {
    id: "ambient-seed",
    event: HAMSTER_EVENTS.MANUAL_REVEAL,
    stage: 2,
    minRelationshipCount: 10,
    text: "I left this seed where you would find it.",
  },
  {
    id: "ambient-wheel-arrangement",
    event: HAMSTER_EVENTS.MANUAL_REVEAL,
    stage: 2,
    minRelationshipCount: 10,
    text: "The wheel and I have reached an arrangement. Neither of us will discuss it.",
  },
  {
    id: "ambient-infinite-lunch",
    event: HAMSTER_EVENTS.MANUAL_REVEAL,
    stage: 2,
    minRelationshipCount: 10,
    text: "I considered the infinite today. It interfered with lunch.",
  },
  {
    id: "timer-first-ending",
    event: HAMSTER_EVENTS.TIMER_COMPLETED,
    stage: 1,
    minRelationshipCount: 4,
    once: true,
    presentation: "cameo",
    text: "The timer is empty. You are still here.",
  },
  {
    id: "timer-final-second",
    event: HAMSTER_EVENTS.TIMER_COMPLETED,
    stage: 2,
    minRelationshipCount: 10,
    minEventCount: 2,
    presentation: "cameo",
    text: "I put the final second beneath the bedding.",
  },
  {
    id: "timer-after-zero",
    event: HAMSTER_EVENTS.TIMER_COMPLETED,
    stage: 2,
    minRelationshipCount: 10,
    minEventCount: 2,
    presentation: "cameo",
    text: "Zero is not an amount of time. It is what the timer does afterward.",
  },
]);
