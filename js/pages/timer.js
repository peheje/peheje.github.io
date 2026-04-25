import { initNumberSteppers } from "../number-stepper.js";
import { mountSiteShell } from "../site.js";

const settingsKey = "kid-timer-settings";
const stateKey = "kid-timer-state";
const pageTitleBase = "Timer | peheje";
const navigationGuardMessage = "A timer is still active. Leave this page anyway?";
const defaultSettings = {
  customMinutes: 10,
  lastDurationMinutes: 10,
};
const defaultState = {
  phase: "idle",
  durationMs: 10 * 60000,
  endsAt: null,
  finishedAt: null,
};
const wedgeCenter = 50;
const wedgeRadius = 46;

function getElement(id) {
  return document.getElementById(id);
}

function loadJson(key, fallback) {
  const raw = localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function formatDuration(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isTimerActive(state) {
  return state.phase === "running";
}

function polarToCartesian(centerX, centerY, radius, angleDegrees) {
  const angleRadians = (angleDegrees - 90) * (Math.PI / 180);
  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  };
}

function describePieWedge(progress) {
  const safeProgress = Math.min(1, Math.max(0, progress));

  if (safeProgress <= 0) {
    return "";
  }

  if (safeProgress >= 0.9999) {
    return [
      `M ${wedgeCenter} ${wedgeCenter}`,
      `m 0 -${wedgeRadius}`,
      `a ${wedgeRadius} ${wedgeRadius} 0 1 1 0 ${wedgeRadius * 2}`,
      `a ${wedgeRadius} ${wedgeRadius} 0 1 1 0 -${wedgeRadius * 2}`,
    ].join(" ");
  }

  const endAngle = safeProgress * 360;
  const arcEnd = polarToCartesian(wedgeCenter, wedgeCenter, wedgeRadius, endAngle);
  const largeArcFlag = safeProgress > 0.5 ? 1 : 0;

  return [
    `M ${wedgeCenter} ${wedgeCenter}`,
    `L ${wedgeCenter} ${wedgeCenter - wedgeRadius}`,
    `A ${wedgeRadius} ${wedgeRadius} 0 ${largeArcFlag} 1 ${arcEnd.x} ${arcEnd.y}`,
    "Z",
  ].join(" ");
}

function createWakeLockManager() {
  let wakeLock = null;

  async function request() {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
        return true;
      }
    } catch (err) {
      console.warn("Could not keep screen awake:", err);
      return false;
    }
    return undefined;
  }

  function release() {
    if (wakeLock) {
      wakeLock.release();
      wakeLock = null;
    }
  }

  return { request, release };
}

function createNotifier() {
  let audioContext = null;
  let alarmTimeoutId = null;
  let alarmLevel = 0;

  function ensureAudioContext() {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        return null;
      }

      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {
        // Ignore resume failures. Browsers can require more direct user interaction.
      });
    }

    return audioContext;
  }

  function playTone(frequency, duration, delay = 0, gainValue = 0.05, type = "sine") {
    const context = ensureAudioContext();

    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + delay;
    const stopAt = startAt + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.02);
  }

  function playSequence(tones) {
    let accumulatedDelay = 0;

    for (const tone of tones) {
      playTone(tone.frequency, tone.duration, accumulatedDelay, tone.gain, tone.type);
      accumulatedDelay += tone.duration + (tone.gap || 0);
    }
  }

  function scheduleNextAlarm() {
    const configs = [
      {
        tones: [
          { frequency: 523.25, duration: 0.16, gain: 0.045, type: "sine", gap: 0 },
          { frequency: 659.25, duration: 0.2, gain: 0.05, type: "triangle", gap: 0 },
          { frequency: 783.99, duration: 0.24, gain: 0.055, type: "triangle", gap: 0 },
        ],
      },
      {
        tones: [
          { frequency: 659.25, duration: 0.18, gain: 0.08, type: "sine", gap: 0.2 },
          { frequency: 783.99, duration: 0.18, gain: 0.08, type: "sine", gap: 0 },
        ],
      },
      {
        tones: [
          { frequency: 783.99, duration: 0.15, gain: 0.12, type: "triangle", gap: 0.15 },
          { frequency: 880, duration: 0.15, gain: 0.12, type: "triangle", gap: 0.15 },
          { frequency: 783.99, duration: 0.15, gain: 0.12, type: "triangle", gap: 0 },
        ],
      },
      {
        tones: [
          { frequency: 880, duration: 0.12, gain: 0.18, type: "square", gap: 0.12 },
          { frequency: 880, duration: 0.12, gain: 0.18, type: "square", gap: 0.12 },
          { frequency: 880, duration: 0.12, gain: 0.18, type: "square", gap: 0.12 },
          { frequency: 880, duration: 0.12, gain: 0.18, type: "square", gap: 0 },
        ],
      },
      {
        tones: [
          { frequency: 1047, duration: 0.1, gain: 0.25, type: "square", gap: 0.1 },
          { frequency: 1175, duration: 0.1, gain: 0.25, type: "square", gap: 0.1 },
          { frequency: 1047, duration: 0.1, gain: 0.25, type: "square", gap: 0.1 },
          { frequency: 1175, duration: 0.1, gain: 0.25, type: "square", gap: 0.1 },
          { frequency: 1047, duration: 0.1, gain: 0.25, type: "square", gap: 0.1 },
          { frequency: 1175, duration: 0.1, gain: 0.25, type: "square", gap: 0 },
        ],
      },
      {
        tones: [
          { frequency: 1175, duration: 0.08, gain: 0.35, type: "sawtooth", gap: 0.08 },
          { frequency: 1319, duration: 0.08, gain: 0.35, type: "sawtooth", gap: 0.08 },
          { frequency: 1175, duration: 0.08, gain: 0.35, type: "sawtooth", gap: 0.08 },
          { frequency: 1319, duration: 0.08, gain: 0.35, type: "sawtooth", gap: 0.08 },
          { frequency: 1175, duration: 0.08, gain: 0.35, type: "sawtooth", gap: 0.08 },
          { frequency: 1319, duration: 0.08, gain: 0.35, type: "sawtooth", gap: 0.08 },
          { frequency: 1175, duration: 0.08, gain: 0.35, type: "sawtooth", gap: 0.08 },
          { frequency: 1319, duration: 0.08, gain: 0.35, type: "sawtooth", gap: 0 },
        ],
      },
    ];

    const config = configs[Math.min(alarmLevel, configs.length - 1)];
    playSequence(config.tones);

    alarmLevel += 1;
    alarmTimeoutId = setTimeout(scheduleNextAlarm, 3000);
  }

  function stopAlarm() {
    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      alarmTimeoutId = null;
    }
    alarmLevel = 0;
  }

  return {
    unlock() {
      ensureAudioContext();
    },
    done() {
      stopAlarm();
      alarmLevel = 0;
      scheduleNextAlarm();
    },
    stop() {
      stopAlarm();
    },
  };
}

function initTimerPage() {
  mountSiteShell();
  initNumberSteppers();

  const notifier = createNotifier();
  const wakeLockManager = createWakeLockManager();
  const customMinutesInput = getElement("timer-custom-minutes");
  const startCustomButton = getElement("timer-start-custom");
  const resetButton = getElement("timer-reset");
  const countdownElement = getElement("timer-countdown");
  const statusElement = getElement("timer-status");
  const helperElement = getElement("timer-helper");
  const statePillElement = getElement("timer-state-pill");
  const visualElement = getElement("timer-visual");
  const visualLabelElement = getElement("timer-visual-label");
  const progressShapeElement = getElement("timer-progress-shape");
  const presetButtons = Array.from(document.querySelectorAll("[id^='timer-preset-']"));

  let settings = {
    ...defaultSettings,
    ...loadJson(settingsKey, defaultSettings),
  };
  let state = {
    ...defaultState,
    ...loadJson(stateKey, defaultState),
  };
  let animationFrameId = 0;
  let completedChimeForFinishAt = null;
  let wakeLockNotice = "";
  let lastRenderedCountdown = "";
  let lastRenderedTitle = "";
  let lastRenderedProgressPath = "";

  function persistSettings() {
    saveJson(settingsKey, settings);
  }

  function persistState() {
    saveJson(stateKey, state);
    window.__activePageGuardMessage = isTimerActive(state) ? navigationGuardMessage : "";
  }

  function syncCustomMinutesInput() {
    customMinutesInput.value = String(settings.customMinutes);
  }

  function readSettingsFromInput() {
    settings = {
      ...settings,
      customMinutes: clampNumber(customMinutesInput.valueAsNumber, 1, 180, defaultSettings.customMinutes),
    };
    syncCustomMinutesInput();
    persistSettings();
  }

  function getIdleDurationMs() {
    return Math.max(60000, (settings.lastDurationMinutes || defaultSettings.lastDurationMinutes) * 60000);
  }

  function getRemainingMs(now = Date.now()) {
    if (state.phase !== "running" || !state.endsAt) {
      return 0;
    }

    return Math.max(0, state.endsAt - now);
  }

  function updateTitle(now = Date.now()) {
    let nextTitle = pageTitleBase;

    if (state.phase === "running") {
      nextTitle = `${formatDuration(getRemainingMs(now))} | Timer | peheje`;
    } else if (state.phase === "finished") {
      nextTitle = `Time is up | ${pageTitleBase}`;
    }

    if (nextTitle !== lastRenderedTitle) {
      document.title = nextTitle;
      lastRenderedTitle = nextTitle;
    }
  }

  function updatePresetSelection() {
    const selectedMinutes = Math.round((state.phase === "running" ? state.durationMs : getIdleDurationMs()) / 60000);

    presetButtons.forEach((button) => {
      const matches = button.id === `timer-preset-${selectedMinutes}`;
      button.classList.toggle("btn-small", !matches);
      button.setAttribute("aria-pressed", matches ? "true" : "false");
    });
  }

  function render(now = Date.now()) {
    const idleDurationMs = getIdleDurationMs();
    let countdownText = formatDuration(idleDurationMs);
    let statusText = "When the circle is gone, it is time to eat.";
    let helperText = "Pick a quick start or choose your own minutes.";
    let pillText = "Ready";
    let visualLabel = "Time left";
    let progress = 1;

    visualElement.classList.remove("kid-timer-running", "kid-timer-finished");

    if (state.phase === "running") {
      const remainingMs = getRemainingMs(now);
      const durationMs = Math.max(1000, state.durationMs || idleDurationMs);

      countdownText = formatDuration(remainingMs);
      statusText = wakeLockNotice || "";
      helperText = "";
      pillText = "";
      progress = remainingMs / durationMs;
      visualElement.classList.add("kid-timer-running");
    } else if (state.phase === "finished") {
      countdownText = "DONE";
      statusText = "Time is up.";
      helperText = "Start again with the same time or pick a new one.";
      pillText = "Done";
      visualLabel = "Time";
      progress = 0;
      visualElement.classList.add("kid-timer-finished");
    }

    if (countdownText !== lastRenderedCountdown) {
      countdownElement.textContent = countdownText;
      lastRenderedCountdown = countdownText;
    }

    statusElement.textContent = statusText;
    helperElement.textContent = helperText;
    statePillElement.textContent = pillText;
    statusElement.classList.toggle("display-none", !statusText);
    helperElement.classList.toggle("display-none", !helperText);
    statePillElement.classList.toggle("display-none", !pillText);
    visualLabelElement.textContent = visualLabel;

    const progressPath = describePieWedge(progress);
    if (progressPath !== lastRenderedProgressPath) {
      progressShapeElement.setAttribute("d", progressPath);
      lastRenderedProgressPath = progressPath;
    }

    resetButton.classList.toggle("display-none", state.phase === "idle");
    updatePresetSelection();
    updateTitle(now);
  }

  function setState(nextState) {
    state = { ...state, ...nextState };
    persistState();
    render();
  }

  function completeTimer() {
    if (state.phase === "finished") {
      render();
      return;
    }

    const finishedAt = Date.now();

    state = {
      phase: "finished",
      durationMs: state.durationMs || getIdleDurationMs(),
      endsAt: null,
      finishedAt,
    };
    persistState();
    wakeLockManager.release();
    wakeLockNotice = "";

    if (completedChimeForFinishAt !== finishedAt) {
      completedChimeForFinishAt = finishedAt;
      notifier.done();
    }

    render();
  }

  function reconcileStateWithTime() {
    if (state.phase === "running" && state.endsAt && Date.now() >= state.endsAt) {
      completeTimer();
    }
  }

  function startTimer(durationMinutes) {
    notifier.stop();

    const safeMinutes = clampNumber(durationMinutes, 1, 180, defaultSettings.lastDurationMinutes);
    const durationMs = safeMinutes * 60000;

    notifier.unlock();
    wakeLockManager.request().then((granted) => {
      if (granted === false) {
        wakeLockNotice = "Screen may turn off while running";
        render();
        setTimeout(() => {
          wakeLockNotice = "";
          render();
        }, 5000);
      }
    });
    settings = {
      ...settings,
      customMinutes: safeMinutes,
      lastDurationMinutes: safeMinutes,
    };
    syncCustomMinutesInput();
    persistSettings();
    completedChimeForFinishAt = null;

    setState({
      phase: "running",
      durationMs,
      endsAt: Date.now() + durationMs,
      finishedAt: null,
    });
    scheduleRenderLoop();
  }

  function resetTimer() {
    completedChimeForFinishAt = null;
    notifier.stop();
    wakeLockManager.release();
    wakeLockNotice = "";
    setState({
      phase: "idle",
      durationMs: getIdleDurationMs(),
      endsAt: null,
      finishedAt: null,
    });
  }

  function stopRenderLoop() {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }

  function scheduleRenderLoop() {
    stopRenderLoop();

    const tick = () => {
      const now = Date.now();
      reconcileStateWithTime();
      render(now);

      if (state.phase === "running") {
        animationFrameId = window.requestAnimationFrame(tick);
      } else {
        animationFrameId = 0;
      }
    };

    tick();
  }

  syncCustomMinutesInput();
  readSettingsFromInput();

  if (!state.durationMs) {
    state.durationMs = getIdleDurationMs();
  }

  persistState();
  reconcileStateWithTime();
  render();
  scheduleRenderLoop();

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const minutes = Number.parseInt(button.id.split("-").at(-1) || "", 10);
      startTimer(minutes);
    });
  });

  customMinutesInput.addEventListener("input", () => {
    readSettingsFromInput();

    if (state.phase === "idle") {
      settings = { ...settings, lastDurationMinutes: settings.customMinutes };
      persistSettings();
      state = { ...state, durationMs: getIdleDurationMs() };
      persistState();
      render();
    }
  });

  customMinutesInput.addEventListener("change", () => {
    readSettingsFromInput();

    if (state.phase === "idle") {
      settings = { ...settings, lastDurationMinutes: settings.customMinutes };
      persistSettings();
      state = { ...state, durationMs: getIdleDurationMs() };
      persistState();
      render();
    }
  });

  startCustomButton.addEventListener("click", () => {
    readSettingsFromInput();
    startTimer(settings.customMinutes);
  });

  resetButton.addEventListener("click", () => {
    resetTimer();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      reconcileStateWithTime();
      render();
      scheduleRenderLoop();
      if (state.phase === "running") {
        wakeLockManager.request();
      }
    } else {
      stopRenderLoop();
    }
  });

  window.addEventListener("focus", () => {
    reconcileStateWithTime();
    render();
    scheduleRenderLoop();
  });

  window.addEventListener("beforeunload", (event) => {
    if (!isTimerActive(state) || window.__suppressActivePageBeforeUnload) {
      return;
    }

    event.preventDefault();
    event.returnValue = navigationGuardMessage;
  });

  window.__kidTimerDebug = {
    getSettings() {
      return settings;
    },
    getState() {
      return state;
    },
    reconcileStateWithTime,
  };
}

initTimerPage();
