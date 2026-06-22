import { initNumberSteppers } from "../number-stepper.js";
import { mountSiteShell } from "../site.js";

const settingsKey = "kid-timer-settings";
const stateKey = "kid-timer-state";
const pageTitleBase = "Timer | peheje";
const navigationGuardMessage = "A timer is still active. Leave this page anyway?";
const defaultSettings = {
  customMinutes: 10,
  lastDurationMinutes: 10,
  soundType: "escalating",
  isMuted: false,
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
  return state.phase === "running" || state.phase === "paused";
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

// WAV generation helpers
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function generateWavBlob(tones, sampleRate = 11025) {
  let totalDuration = 0;
  for (const tone of tones) {
    totalDuration += tone.duration + (tone.gap || 0);
  }
  
  const numSamples = Math.floor(totalDuration * sampleRate);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, numSamples * 2, true);
  
  let currentSample = 0;
  for (const tone of tones) {
    const toneSamples = Math.floor(tone.duration * sampleRate);
    const omega = 2 * Math.PI * tone.frequency / sampleRate;
    
    for (let i = 0; i < toneSamples; i++) {
      let sampleVal;
      if (tone.type === "square") {
        sampleVal = Math.sin(omega * i) >= 0 ? 1 : -1;
      } else if (tone.type === "triangle") {
        sampleVal = Math.abs((i * tone.frequency / sampleRate) % 1 - 0.5) * 4 - 1;
      } else if (tone.type === "sawtooth") {
        sampleVal = ((i * tone.frequency / sampleRate) % 1) * 2 - 1;
      } else { // sine
        sampleVal = Math.sin(omega * i);
      }
      
      let volume = Math.min(tone.gain * 12, 1);
      
      const fadeInSamples = Math.floor(0.005 * sampleRate);
      const fadeOutSamples = Math.floor(0.02 * sampleRate);
      if (i < fadeInSamples) {
        volume *= (i / fadeInSamples);
      } else if (i > toneSamples - fadeOutSamples) {
        volume *= ((toneSamples - i) / fadeOutSamples);
      }
      
      const val = Math.floor(sampleVal * volume * 32767);
      view.setInt16(44 + currentSample * 2, val, true);
      currentSample++;
    }
    
    const gapSamples = Math.floor((tone.gap || 0) * sampleRate);
    for (let i = 0; i < gapSamples; i++) {
      view.setInt16(44 + currentSample * 2, 0, true);
      currentSample++;
    }
  }
  
  return new Blob([buffer], { type: "audio/wav" });
}

function createNotifier(getSettings) {
  let alarmTimeoutId = null;
  let alarmLevel = 0;
  let alarmAudio = null;
  let currentAlarmUrl = null;
  let clickAudio = null;

  try {
    const blob = generateWavBlob([{ frequency: 1000, duration: 0.015, type: "sine", gain: 0.005 }]);
    const clickUrl = URL.createObjectURL(blob);
    clickAudio = new Audio(clickUrl);
  } catch {
    console.warn("Click sound pre-generation failed:");
  }

  const escalatingConfigs = [
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

  const chimeConfigs = [
    {
      tones: [
        { frequency: 523.25, duration: 0.5, gain: 0.06, type: "sine", gap: 0.1 },
        { frequency: 659.25, duration: 0.5, gain: 0.06, type: "sine", gap: 0.1 },
        { frequency: 783.99, duration: 0.8, gain: 0.06, type: "sine" },
      ],
    },
  ];

  const beepsConfigs = [
    {
      tones: [
        { frequency: 987.77, duration: 0.08, gain: 0.05, type: "square", gap: 0.08 },
        { frequency: 987.77, duration: 0.08, gain: 0.05, type: "square", gap: 0.08 },
        { frequency: 1318.51, duration: 0.15, gain: 0.07, type: "square" },
      ],
    },
  ];

  function playSequence(tones) {
    const s = getSettings();
    if (s.isMuted) return;
    try {
      if (alarmAudio) {
        alarmAudio.pause();
      }
      if (currentAlarmUrl) {
        URL.revokeObjectURL(currentAlarmUrl);
      }
      
      const blob = generateWavBlob(tones);
      currentAlarmUrl = URL.createObjectURL(blob);
      alarmAudio = new Audio(currentAlarmUrl);
      alarmAudio.play().catch(e => console.warn("HTML5 audio playback failed:", e));
    } catch (err) {
      console.warn("WAV generation/playback failed:", err);
    }
  }

  function scheduleNextAlarm() {
    const s = getSettings();
    if (s.isMuted) {
      alarmTimeoutId = setTimeout(scheduleNextAlarm, 3000);
      return;
    }

    let currentConfigs = escalatingConfigs;
    if (s.soundType === "chime") {
      currentConfigs = chimeConfigs;
    } else if (s.soundType === "beeps") {
      currentConfigs = beepsConfigs;
    }

    const config = currentConfigs[Math.min(alarmLevel, currentConfigs.length - 1)];
    playSequence(config.tones);

    alarmLevel += 1;
    alarmTimeoutId = setTimeout(scheduleNextAlarm, 3000);
  }

  function stopAlarm() {
    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      alarmTimeoutId = null;
    }
    if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio = null;
    }
    if (currentAlarmUrl) {
      URL.revokeObjectURL(currentAlarmUrl);
      currentAlarmUrl = null;
    }
    alarmLevel = 0;
  }

  return {
    unlock() {
      try {
        if (clickAudio) {
          clickAudio.currentTime = 0;
          clickAudio.play().catch(() => {});
        }
      } catch {
        /* ignore */
      }
    },
    done() {
      stopAlarm();
      scheduleNextAlarm();
    },
    stop() {
      stopAlarm();
    },
    test() {
      stopAlarm();
      const s = getSettings();
      let currentConfigs = escalatingConfigs;
      if (s.soundType === "chime") {
        currentConfigs = chimeConfigs;
      } else if (s.soundType === "beeps") {
        currentConfigs = beepsConfigs;
      }
      playSequence(currentConfigs[0].tones);
    },
    playClick() {
      if (getSettings().isMuted || !clickAudio) return;
      try {
        clickAudio.currentTime = 0;
        clickAudio.play().catch(() => {});
      } catch {
        /* ignore */
      }
    }
  };
}

function initTimerPage() {
  mountSiteShell();
  initNumberSteppers();

  const notifier = createNotifier(() => settings);
  const wakeLockManager = createWakeLockManager();
  const customMinutesInput = getElement("timer-custom-minutes");
  const startCustomButton = getElement("timer-start-custom");
  const pauseResumeButton = getElement("timer-pause-resume");
  const resetButton = getElement("timer-reset");
  const countdownElement = getElement("timer-countdown");
  const statusElement = getElement("timer-status");
  const helperElement = getElement("timer-helper");
  const statePillElement = getElement("timer-state-pill");
  const visualElement = getElement("timer-visual");
  const visualLabelElement = getElement("timer-visual-label");
  const progressShapeElement = getElement("timer-progress-shape");
  const presetButtons = Array.from(document.querySelectorAll("[id^='timer-preset-']"));

  const soundSelect = getElement("timer-sound-select");
  const muteCheckbox = getElement("timer-mute-checkbox");
  const testSoundButton = getElement("timer-test-sound");

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

  // Set up Dial Ticks
  const ticksGroup = getElement("timer-ticks");
  if (ticksGroup) {
    let ticksHtml = "";
    for (let i = 0; i < 60; i++) {
      const angle = i * 6; // 360 / 60 = 6 degrees per minute
      const isMajor = i % 5 === 0;
      const r1 = wedgeRadius;
      const r2 = isMajor ? wedgeRadius - 3.5 : wedgeRadius - 1.8;
      const p1 = polarToCartesian(wedgeCenter, wedgeCenter, r1, angle);
      const p2 = polarToCartesian(wedgeCenter, wedgeCenter, r2, angle);
      ticksHtml += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" class="${isMajor ? 'major' : 'minor'}"></line>`;
    }
    ticksGroup.innerHTML = ticksHtml;
  }

  // Dial Dragging Interaction
  let isDragging = false;

  function handleDialInteraction(e) {
    if (state.phase !== "idle") {
      return;
    }

    const rect = visualElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) {
      angle += 360;
    }

    let minutes = Math.round((angle / 360) * 60);
    if (minutes < 1) {
      minutes = 1;
    }
    if (minutes > 60) {
      minutes = 60;
    }

    if (settings.customMinutes !== minutes) {
      notifier.playClick();

      settings.customMinutes = minutes;
      settings.lastDurationMinutes = minutes;
      syncCustomMinutesInput();
      persistSettings();

      state.durationMs = minutes * 60000;
      persistState();
      render();
    }
  }

  visualElement.addEventListener("mousedown", (e) => {
    if (state.phase === "idle") {
      isDragging = true;
      handleDialInteraction(e);
      document.body.style.userSelect = "none";
      visualElement.classList.add("grabbing");
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (isDragging) {
      handleDialInteraction(e);
    }
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = "";
      visualElement.classList.remove("grabbing");
    }
  });

  visualElement.addEventListener("touchstart", (e) => {
    if (state.phase === "idle") {
      isDragging = true;
      handleDialInteraction(e);
      visualElement.classList.add("grabbing");
    }
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (isDragging) {
      handleDialInteraction(e);
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  }, { passive: false });

  window.addEventListener("touchend", () => {
    if (isDragging) {
      isDragging = false;
      visualElement.classList.remove("grabbing");
    }
  });

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
    if (state.phase === "paused") {
      return state.remainingMs || 0;
    }
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
    let statusText = "";
    let helperText = "";
    let pillText = "";
    let visualLabel = "Time left";
    let progress = 1;

    visualElement.classList.remove("kid-timer-running", "kid-timer-finished", "kid-timer-paused", "grabbable");

    if (state.phase === "idle") {
      visualElement.classList.add("grabbable");
    }

    if (state.phase === "running") {
      const remainingMs = getRemainingMs(now);
      const durationMs = Math.max(1000, state.durationMs || idleDurationMs);

      countdownText = formatDuration(remainingMs);
      statusText = wakeLockNotice || "";
      helperText = "";
      pillText = "";
      progress = remainingMs / durationMs;
      visualElement.classList.add("kid-timer-running");
    } else if (state.phase === "paused") {
      const remainingMs = getRemainingMs(now);
      const durationMs = Math.max(1000, state.durationMs || idleDurationMs);

      countdownText = formatDuration(remainingMs);
      statusText = "Paused";
      helperText = "";
      pillText = "Paused";
      progress = remainingMs / durationMs;
      visualElement.classList.add("kid-timer-paused");
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

    if (state.phase === "running") {
      startCustomButton.classList.add("display-none");
      pauseResumeButton.classList.remove("display-none");
      pauseResumeButton.textContent = "Pause";
    } else if (state.phase === "paused") {
      startCustomButton.classList.add("display-none");
      pauseResumeButton.classList.remove("display-none");
      pauseResumeButton.textContent = "Resume";
    } else {
      startCustomButton.classList.remove("display-none");
      pauseResumeButton.classList.add("display-none");
    }

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

  // Populate Sound settings inputs from settings
  soundSelect.value = settings.soundType || "escalating";
  muteCheckbox.checked = settings.isMuted || false;

  soundSelect.addEventListener("change", () => {
    settings.soundType = soundSelect.value;
    persistSettings();
  });

  muteCheckbox.addEventListener("change", () => {
    settings.isMuted = muteCheckbox.checked;
    persistSettings();
  });

  testSoundButton.addEventListener("click", () => {
    notifier.test();
  });

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

  pauseResumeButton.addEventListener("click", () => {
    if (state.phase === "running") {
      stopRenderLoop();
      const remainingMs = getRemainingMs();
      setState({
        phase: "paused",
        remainingMs: remainingMs,
      });
      notifier.stop();
      wakeLockManager.release();
    } else if (state.phase === "paused") {
      notifier.unlock();
      wakeLockManager.request();
      setState({
        phase: "running",
        endsAt: Date.now() + (state.remainingMs || 0),
      });
      scheduleRenderLoop();
    }
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

  // Play a click on first user gesture to unblock audio on iOS/Safari
  const handleUserGestureAudioUnlock = () => {
    notifier.unlock();
    document.removeEventListener("click", handleUserGestureAudioUnlock);
    document.removeEventListener("touchstart", handleUserGestureAudioUnlock);
  };
  document.addEventListener("click", handleUserGestureAudioUnlock);
  document.addEventListener("touchstart", handleUserGestureAudioUnlock);

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
