import { HAMSTER_EVENTS, hamsterEncounters } from "./catalog.js";

// Nightly entries are written by a scheduled Claude routine into
// public/hamster/nightly.json. This module is the single gatekeeper for that
// file: the browser, the unit tests, and both merge Actions use validateNightly.

export const NIGHTLY_PATH = "/hamster/nightly.json";
export const NIGHTLY_MAX_NIGHTS = 60;

const dayMs = 24 * 60 * 60 * 1000;
const lineDays = 3;
const laterDays = 14;
const extraDays = 7;
const maxExtras = 5;
const questHours = 48;
const timeBands = ["morning", "day", "evening", "night"];
const questKinds = ["timer", "weather", "memory"];
const builtInLines = new Set(hamsterEncounters.map((line) => line.text).filter(Boolean));

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function checkKeys(value, allowed, where, errors) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${where}: unknown field "${key}"`);
  }
}

function checkText(value, min, max, where, errors) {
  if (typeof value !== "string") {
    errors.push(`${where}: must be a string`);
    return;
  }
  if (value.trim() !== value) errors.push(`${where}: has leading or trailing space`);
  if (value.length < min || value.length > max) errors.push(`${where}: length ${value.length}, expected ${min}-${max}`);
  // Plain text only: no markup, no control characters.
  if (/[<>]/.test(value) || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) errors.push(`${where}: contains markup or control characters`);
}

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function validateChoice(choice, where, errors) {
  if (!isRecord(choice)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  checkKeys(choice, ["options"], where, errors);
  if (!Array.isArray(choice.options) || choice.options.length !== 2) {
    errors.push(`${where}.options: expected exactly two options`);
    return;
  }
  choice.options.forEach((option, index) => {
    const at = `${where}.options[${index}]`;
    if (!isRecord(option)) {
      errors.push(`${at}: must be an object`);
      return;
    }
    checkKeys(option, ["label", "reply", "later"], at, errors);
    checkText(option.label, 2, 28, `${at}.label`, errors);
    checkText(option.reply, 8, 160, `${at}.reply`, errors);
    if (option.later !== undefined) checkText(option.later, 8, 160, `${at}.later`, errors);
  });
  if (choice.options.every(isRecord) && choice.options[0].label === choice.options[1].label) {
    errors.push(`${where}.options: the two labels must differ`);
  }
}

function validateQuest(quest, where, errors) {
  if (!isRecord(quest)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  checkKeys(quest, ["kind", "minutes", "wet", "timeBand", "done", "keepsake"], where, errors);
  if (!questKinds.includes(quest.kind)) errors.push(`${where}.kind: expected one of ${questKinds.join(", ")}`);
  if (quest.kind === "timer") {
    if (!Number.isInteger(quest.minutes) || quest.minutes < 1 || quest.minutes > 90) errors.push(`${where}.minutes: expected an integer 1-90`);
  } else if (quest.minutes !== undefined) {
    errors.push(`${where}.minutes: only allowed for timer quests`);
  }
  if (quest.wet !== undefined && (quest.kind !== "weather" || typeof quest.wet !== "boolean")) {
    errors.push(`${where}.wet: only a boolean on weather quests`);
  }
  if (quest.timeBand !== undefined && (quest.kind === "memory" || !timeBands.includes(quest.timeBand))) {
    errors.push(`${where}.timeBand: expected one of ${timeBands.join(", ")} on timer or weather quests`);
  }
  checkText(quest.done, 8, 160, `${where}.done`, errors);
  if (quest.keepsake !== undefined) {
    if (!isRecord(quest.keepsake)) {
      errors.push(`${where}.keepsake: must be an object`);
    } else {
      checkKeys(quest.keepsake, ["name", "description"], `${where}.keepsake`, errors);
      checkText(quest.keepsake.name, 3, 40, `${where}.keepsake.name`, errors);
      checkText(quest.keepsake.description, 8, 120, `${where}.keepsake.description`, errors);
    }
  }
}

export function validateNightly(doc) {
  const errors = [];
  if (!isRecord(doc)) return ["root: must be an object"];
  checkKeys(doc, ["version", "nights"], "root", errors);
  if (doc.version !== 1) errors.push("version: must be 1");
  if (!Array.isArray(doc.nights)) return [...errors, "nights: must be an array"];
  if (doc.nights.length > NIGHTLY_MAX_NIGHTS) errors.push(`nights: at most ${NIGHTLY_MAX_NIGHTS} entries`);

  const seen = new Set();
  doc.nights.forEach((night, index) => {
    const where = `nights[${index}]`;
    if (!isRecord(night)) {
      errors.push(`${where}: must be an object`);
      return;
    }
    checkKeys(night, ["date", "text", "note", "quest", "choice", "extras"], where, errors);
    if (!parseDate(night.date)) errors.push(`${where}.date: expected a real YYYY-MM-DD date`);
    else if (seen.has(night.date)) errors.push(`${where}.date: duplicate ${night.date}`);
    seen.add(night.date);
    checkText(night.text, 8, 160, `${where}.text`, errors);
    for (const [at, line] of [["text", night.text], ...(Array.isArray(night.extras) ? night.extras.map((extra, i) => [`extras[${i}]`, extra]) : [])]) {
      if (builtInLines.has(line)) errors.push(`${where}.${at}: repeats a built-in line`);
    }
    if (night.note !== undefined) {
      if (!isRecord(night.note)) {
        errors.push(`${where}.note: must be an object`);
      } else {
        checkKeys(night.note, ["text", "source"], `${where}.note`, errors);
        checkText(night.note.text, 8, 280, `${where}.note.text`, errors);
        checkText(night.note.source, 2, 80, `${where}.note.source`, errors);
      }
    }
    if (night.extras !== undefined) {
      if (!Array.isArray(night.extras) || night.extras.length < 1 || night.extras.length > maxExtras) {
        errors.push(`${where}.extras: expected an array of 1-${maxExtras} lines`);
      } else {
        night.extras.forEach((extra, i) => checkText(extra, 8, 160, `${where}.extras[${i}]`, errors));
        if (new Set([night.text, ...night.extras]).size !== night.extras.length + 1) errors.push(`${where}.extras: lines must differ from each other and from text`);
      }
    }
    if (night.quest !== undefined) validateQuest(night.quest, `${where}.quest`, errors);
    if (night.choice !== undefined) validateChoice(night.choice, `${where}.choice`, errors);
    if (night.quest !== undefined && night.choice !== undefined) errors.push(`${where}: a night has a quest or a choice, not both`);
  });
  return errors;
}

function nightStart(date) {
  return parseDate(date).getTime();
}

// Turns a validated file into catalog encounters. Invalid files give nothing,
// so a bad night can never break the companion.
export function nightlyEncounters(doc) {
  if (validateNightly(doc).length) return [];
  return doc.nights.flatMap((night) => {
    const id = `nightly-${night.date}`;
    const availableFrom = nightStart(night.date);
    // Small extra lines stay around for a week, alongside newer nights.
    const extras = (night.extras || []).map((text, index) => ({
      id: `${id}-extra-${index}`,
      event: HAMSTER_EVENTS.MANUAL_REVEAL,
      stage: 0,
      weight: 3,
      minRelationshipCount: 1,
      availableFrom,
      availableUntil: availableFrom + extraDays * dayMs,
      allowBacklog: true,
      text,
    }));
    return [...nightLines(night, id, availableFrom), ...extras];
  });
}

function nightLines(night, id, availableFrom) {
  const line = {
    id,
    event: HAMSTER_EVENTS.MANUAL_REVEAL,
    stage: 0,
    priority: 4,
    weight: 30,
    minRelationshipCount: 1,
    availableFrom,
    availableUntil: availableFrom + lineDays * dayMs,
    text: night.text,
  };
  if (night.choice) {
    line.choice = { options: night.choice.options.map(({ label, reply }) => ({ label, reply })) };
    // A follow-up, a day later, about whichever answer was picked.
    const later = night.choice.options.flatMap((option, index) => option.later ? [{
      id: `${id}-later-${index}`,
      event: HAMSTER_EVENTS.MANUAL_REVEAL,
      stage: 0,
      priority: 5,
      weight: 40,
      requiresChoice: { id, option: index },
      minTimeSinceChoiceMs: 20 * 60 * 60 * 1000,
      availableUntil: availableFrom + laterDays * dayMs,
      text: option.later,
    }] : []);
    return [line, ...later];
  }
  if (!night.quest) return [line];

  const { quest } = night;
  line.startsQuest = id;
  line.questExpiresAfterMs = questHours * 60 * 60 * 1000;
  const done = {
    id: `${id}-done`,
    stage: 0,
    priority: 9,
    requiresActiveQuest: id,
    completesQuest: id,
    presentation: "cameo",
    text: quest.done,
  };
  if (quest.kind === "timer") {
    done.event = HAMSTER_EVENTS.TIMER_COMPLETED;
    done.minDurationMs = quest.minutes * 60 * 1000;
  } else if (quest.kind === "weather") {
    done.event = HAMSTER_EVENTS.WEATHER_CHECKED;
  } else {
    done.event = HAMSTER_EVENTS.MEMORY_CORRECT;
  }
  const detailEquals = {};
  if (quest.timeBand) detailEquals.timeBand = quest.timeBand;
  if (typeof quest.wet === "boolean") detailEquals.wet = quest.wet;
  if (Object.keys(detailEquals).length) done.detailEquals = detailEquals;
  if (quest.keepsake) {
    done.awardsKeepsake = id;
    done.keepsakeDetails = { ...quest.keepsake };
  }
  return [line, done];
}

function localDayKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// A visitor only finds notes that arrived on or after the day they first came.
// The nightly file is shared, so without this a fresh browser inherits a backlog
// addressed to someone else.
export function notesArrivedSince(notes, since) {
  if (!Number.isFinite(since)) return notes;
  const firstDay = localDayKey(since);
  return notes.filter((note) => note.date >= firstDay);
}

// Notes found under the burrow door, newest first, never from the future.
export function nightlyNotes(doc, now = Date.now(), limit = 7) {
  if (validateNightly(doc).length) return [];
  return doc.nights
    .filter((night) => night.note && nightStart(night.date) <= now)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((night) => ({ date: night.date, ...night.note }));
}

export async function loadNightly(fetchImpl = globalThis.fetch) {
  try {
    const response = await fetchImpl(NIGHTLY_PATH, { cache: "no-cache" });
    if (!response.ok) return null;
    const doc = await response.json();
    return validateNightly(doc).length ? null : doc;
  } catch {
    return null;
  }
}
