import { ADVENT_ORDER, adventKey, adventToday, openAdventDoor } from "../hamster/advent.js";
import { burrowMood, loadBurrowSky } from "../hamster/burrow-weather.js";
import { hamsterKeepsakes } from "../hamster/catalog.js";
import { loadNightly, nightlyNotes } from "../hamster/nightly.js";
import { createHamsterRepository, decodeCarryCode, encodeCarryCode } from "../hamster/storage.js";
import { mountSiteShell } from "../site.js";

const motionSecretId = "shifted-floorboard";

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    // The locked page can still render when browser storage is unavailable.
    return null;
  }
}

function createRepository() {
  return createHamsterRepository({ storage: browserStorage() });
}

function applyMood(mood) {
  const room = document.getElementById("burrow-room");
  room.dataset.light = mood.light;
  room.dataset.sky = mood.sky;
  room.classList.toggle("is-frost", mood.frost);
  room.classList.toggle("is-jul", mood.jul);
}

function renderSky(voice) {
  applyMood(burrowMood(null));
  loadBurrowSky({ storage: browserStorage() }).then(sky => {
    if (!sky) return;
    const mood = burrowMood(sky);
    applyMood(mood);
    // Only add to the idle line; never replace something the visitor asked for.
    if (mood.note && voice.dataset.idle === "true") voice.textContent = `${voice.textContent} ${mood.note}`;
  });
}

function renderAdvent(repository, state, voice) {
  const today = adventToday();
  const section = document.getElementById("burrow-advent");
  if (!today) return;
  section.hidden = false;
  const doors = document.getElementById("burrow-advent-doors");
  doors.replaceChildren(...ADVENT_ORDER.map(day => {
    const door = document.createElement("button");
    door.type = "button";
    door.className = "burrow-advent-door";
    door.textContent = String(day);
    const refresh = () => {
      const opened = Boolean(state.secrets[adventKey(today.year, day)]);
      door.classList.toggle("is-open", opened);
      door.disabled = day > today.openUpTo;
      door.setAttribute("aria-label", door.disabled ? `Door ${day}, not yet` : opened ? `Door ${day}, opened` : `Door ${day}`);
    };
    refresh();
    door.addEventListener("click", () => {
      const line = openAdventDoor(state, day);
      if (!line) return;
      repository.save(state);
      refresh();
      voice.dataset.idle = "false";
      voice.textContent = line;
      if (day === 24) renderShelf(state);
    });
    return door;
  }));
}

function activityForHour(hour) {
  if (hour < 6) return "The hamster is asleep beneath a handkerchief.";
  if (hour < 11) return "The hamster is arranging breakfast.";
  if (hour < 17) return "The hamster is sorting seeds by importance.";
  if (hour < 22) return "The hamster is listening for footsteps on the road.";
  return "The hamster is putting the maps away.";
}

function renderRoom(state, voice) {
  const button = document.getElementById("burrow-button-object");
  const cloak = document.getElementById("burrow-cloak-object");
  const seed = document.getElementById("burrow-seed-object");
  button.hidden = !state.keepsakes["brass-button"];
  const hasWetCloak = Boolean(state.keepsakes["rain-darkened-cloak"]);
  const hasDryCloak = Boolean(state.keepsakes["sun-warmed-cloak"]);
  cloak.hidden = !hasWetCloak && !hasDryCloak;
  cloak.classList.toggle("is-wet", hasWetCloak);
  seed.hidden = !state.keepsakes["black-seed"];

  const inspect = keepsakeId => {
    const keepsake = hamsterKeepsakes[keepsakeId];
    if (!keepsake) return;
    voice.dataset.idle = "false";
    voice.textContent = `${keepsake.name}. ${keepsake.description}`;
  };
  button.addEventListener("click", () => inspect("brass-button"));
  cloak.addEventListener("click", () => inspect(hasWetCloak ? "rain-darkened-cloak" : "sun-warmed-cloak"));
  seed.addEventListener("click", () => inspect("black-seed"));
}

function formatNightDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

function renderNotes(notes) {
  const list = document.getElementById("burrow-notes-list");
  list.replaceChildren(...notes.map(note => {
    const item = document.createElement("li");
    const text = document.createElement("p");
    text.textContent = note.text;
    const meta = document.createElement("small");
    meta.textContent = `${note.source} · ${formatNightDate(note.date)}`;
    item.append(text, meta);
    return item;
  }));
  document.getElementById("burrow-notes").hidden = notes.length === 0;
}

function renderRoad(state) {
  const picks = Object.entries(state.choices)
    .filter(([, pick]) => pick && typeof pick.question === "string" && typeof pick.label === "string")
    .sort(([, a], [, b]) => (b.at || 0) - (a.at || 0))
    .slice(0, 7);
  const list = document.getElementById("burrow-road-list");
  list.replaceChildren(...picks.map(([id, pick]) => {
    const item = document.createElement("li");
    const question = document.createElement("p");
    question.textContent = pick.question;
    const meta = document.createElement("small");
    const date = /^nightly-(\d{4}-\d{2}-\d{2})$/.exec(id)?.[1];
    meta.textContent = date ? `You chose: ${pick.label} · ${formatNightDate(date)}` : `You chose: ${pick.label}`;
    item.append(question, meta);
    return item;
  }));
  document.getElementById("burrow-road").hidden = picks.length === 0;
}

function renderShelf(state) {
  const items = Object.values(state.shelf)
    .filter(item => item && typeof item.name === "string" && typeof item.description === "string")
    .sort((a, b) => (b.at || 0) - (a.at || 0));
  const list = document.getElementById("burrow-shelf-list");
  list.replaceChildren(...items.map(keepsake => {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = keepsake.name;
    item.append(name, `. ${keepsake.description}`);
    return item;
  }));
  document.getElementById("burrow-shelf").hidden = items.length === 0;
}

function setupMotionSecret(repository, initialState, voice) {
  const scene = document.getElementById("burrow-scene");
  const trigger = document.getElementById("burrow-motion-trigger");
  let state = initialState;
  let listening = false;
  let armed = false;
  let dragging = false;
  let dragStart = null;

  if (state.secrets["tilted-hearth"] && !state.secrets[motionSecretId]) {
    state.secrets[motionSecretId] = state.secrets["tilted-hearth"];
    delete state.secrets["tilted-hearth"];
    repository.save(state);
  }

  function armSecret() {
    if (state.secrets[motionSecretId]) return;
    armed = true;
    scene.classList.add("is-armed");
    voice.dataset.idle = "false";
    voice.textContent = "What sleeps below will not wake while the room stands straight.";
  }

  function revealSecret() {
    if (state.secrets[motionSecretId]) return;
    state.secrets[motionSecretId] = Date.now();
    state.keepsakes["black-seed"] = Date.now();
    repository.save(state);
    scene.classList.add("is-discovered");
    scene.classList.remove("is-armed");
    voice.dataset.idle = "false";
    voice.textContent = "A loose board sighs. Beneath it, a seed black as old rain.";
    document.getElementById("burrow-seed-object").hidden = false;
    if (typeof navigator.vibrate === "function") navigator.vibrate(35);
  }

  function moveScene(horizontal, vertical) {
    const x = Math.max(-1, Math.min(1, horizontal));
    const y = Math.max(-1, Math.min(1, vertical));
    scene.style.setProperty("--burrow-hamster-x", `${(x * 5).toFixed(2)}px`);
    scene.style.setProperty("--burrow-hamster-y", `${(y * 3).toFixed(2)}px`);
    scene.style.setProperty("--burrow-button-x", `${(x * 11).toFixed(2)}px`);
    scene.style.setProperty("--burrow-button-turn", `${(x * 12).toFixed(2)}deg`);
    scene.style.setProperty("--burrow-cloak-turn", `${(x * 3).toFixed(2)}deg`);
    const pressure = Math.max(Math.abs(x), Math.abs(y));
    scene.style.setProperty("--burrow-board-lift", `${(pressure * -7).toFixed(2)}px`);
    scene.style.setProperty("--burrow-board-turn", `${(x * 4).toFixed(2)}deg`);
    if (armed && pressure > 0.7) revealSecret();
  }

  function listenForTilt() {
    if (listening) return;
    listening = true;
    window.addEventListener("deviceorientation", event => {
      moveScene((event.gamma || 0) / 38, (event.beta || 0) / 55);
    }, { passive: true });
  }

  trigger.addEventListener("click", () => {
    armSecret();
    const orientation = window.DeviceOrientationEvent;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!orientation || reducedMotion) return;
    if (typeof orientation.requestPermission === "function") return;
    listenForTilt();
  });

  scene.addEventListener("pointerdown", event => {
    if (!armed || state.secrets[motionSecretId]) return;
    dragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    scene.setPointerCapture?.(event.pointerId);
  });

  scene.addEventListener("pointermove", event => {
    if (!dragging || !dragStart) return;
    moveScene((event.clientX - dragStart.x) / 75, (event.clientY - dragStart.y) / 75);
  });

  const stopDragging = event => {
    dragging = false;
    dragStart = null;
    scene.releasePointerCapture?.(event.pointerId);
    if (!state.secrets[motionSecretId]) moveScene(0, 0);
  };
  scene.addEventListener("pointerup", stopDragging);
  scene.addEventListener("pointercancel", stopDragging);

  trigger.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    armSecret();
    moveScene(1, 0);
  });

  if (state.secrets[motionSecretId]) {
    scene.classList.add("is-discovered");
  }
}

// Opening burrow.html#carry=... offers to bring that hamster into this browser.
function receiveCarriedHamster(repository) {
  const match = /^#carry=(.+)$/.exec(window.location.hash);
  if (!match) return;
  window.history.replaceState(null, "", window.location.pathname);
  const carried = decodeCarryCode(match[1]);
  if (!carried) {
    window.alert("That link does not carry a hamster.");
    return;
  }
  if (window.confirm("Bring this hamster here? It replaces the hamster in this browser.")) repository.save(carried);
}

function setupCarryLink(repository, voice) {
  document.getElementById("burrow-carry").addEventListener("click", async () => {
    const url = `${window.location.origin}/burrow.html#carry=${encodeCarryCode(repository.load())}`;
    try {
      if (navigator.share) await navigator.share({ title: "The hamster", url });
      else await navigator.clipboard.writeText(url);
      voice.dataset.idle = "false";
      voice.textContent = "Open the link in your other browser. The hamster will follow.";
    } catch (error) {
      if (error?.name !== "AbortError") window.prompt("Copy this link to your other browser:", url);
    }
  });
}

function renderBurrow() {
  mountSiteShell();
  const repository = createRepository();
  receiveCarriedHamster(repository);
  const state = repository.load();
  const unlocked = Boolean(state.completedQuestIds["wake-in-three"]);
  document.getElementById("burrow-locked").hidden = unlocked;
  document.getElementById("burrow-home").hidden = !unlocked;
  if (!unlocked) return;

  const voice = document.getElementById("burrow-voice");
  voice.textContent = activityForHour(new Date().getHours());
  voice.dataset.idle = "true";
  renderSky(voice);
  renderRoom(state, voice);
  renderAdvent(repository, state, voice);
  renderRoad(state);
  renderShelf(state);
  setupCarryLink(repository, voice);
  setupMotionSecret(repository, state, voice);
  loadNightly().then(doc => {
    if (doc) renderNotes(nightlyNotes(doc));
  });
}

renderBurrow();
