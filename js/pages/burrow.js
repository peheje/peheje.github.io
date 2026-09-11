import { hamsterKeepsakes } from "../hamster/catalog.js";
import { createHamsterRepository } from "../hamster/storage.js";
import { mountSiteShell } from "../site.js";

const motionSecretId = "shifted-floorboard";

function createRepository() {
  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    // The locked page can still render when browser storage is unavailable.
  }
  return createHamsterRepository({ storage });
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
    voice.textContent = `${keepsake.name}. ${keepsake.description}`;
  };
  button.addEventListener("click", () => inspect("brass-button"));
  cloak.addEventListener("click", () => inspect(hasWetCloak ? "rain-darkened-cloak" : "sun-warmed-cloak"));
  seed.addEventListener("click", () => inspect("black-seed"));
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
    voice.textContent = "What sleeps below will not wake while the room stands straight.";
  }

  function revealSecret() {
    if (state.secrets[motionSecretId]) return;
    state.secrets[motionSecretId] = Date.now();
    state.keepsakes["black-seed"] = Date.now();
    repository.save(state);
    scene.classList.add("is-discovered");
    scene.classList.remove("is-armed");
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

function renderBurrow() {
  mountSiteShell();
  const repository = createRepository();
  const state = repository.load();
  const unlocked = Boolean(state.completedQuestIds["wake-in-three"]);
  document.getElementById("burrow-locked").hidden = unlocked;
  document.getElementById("burrow-home").hidden = !unlocked;
  if (!unlocked) return;

  const voice = document.getElementById("burrow-voice");
  voice.textContent = activityForHour(new Date().getHours());
  renderRoom(state, voice);
  setupMotionSecret(repository, state, voice);
}

renderBurrow();
