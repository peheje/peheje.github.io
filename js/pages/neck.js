import { initNumberSteppers } from "../number-stepper.js";
import { mountSiteShell } from "../site.js";

const settingsKey = "neck-reminder-settings";
const stateKey = "neck-reminder-state";
const settingsUiKey = "neck-reminder-settings-ui";
const pageTitleBase = "Neck | peheje";
const defaultSettings = {
  intervalValue: 30,
  intervalUnit: "minutes",
  repeatCount: 5,
  repeatSpacingSeconds: 20,
  soundEnabled: true,
  notificationsEnabled: true,
};
const defaultState = {
  phase: "idle",
  dueAt: null,
  pausedRemainingMs: null,
  alertIteration: 0,
  alertSequenceStartedAt: null,
  lastAlertAt: null,
};

function getElement(id) {
  return document.getElementById(id);
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function getIntervalDurationMs(source = defaultSettings) {
  const multiplier = source.intervalUnit === "seconds" ? 1000 : 60000;
  return source.intervalValue * multiplier;
}

function getIntervalLabel(source = defaultSettings) {
  const unit = source.intervalUnit === "seconds" ? "second" : "minute";
  return `${source.intervalValue} ${unit}${source.intervalValue === 1 ? "" : "s"}`;
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

function formatDuration(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatClockTime(timestamp) {
  if (!timestamp) {
    return "-";
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isActivePhase(phase) {
  return phase === "running" || phase === "paused" || phase === "alerting";
}

function createNotifier() {
  let audioContext = null;

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
        // Ignore resume failures; some browsers still require more user interaction.
      });
    }

    return audioContext;
  }

    function playTone(frequency, duration, delay = 0, gainValue = 0.028, type = "sine") {
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

    return {
      unlock() {
        ensureAudioContext();
      },
      chime(iteration) {
      const intensity = Math.min(1, Math.max(0, (iteration - 1) / 5));
      const baseGain = Math.min(0.16, 0.03 + iteration * 0.016);
      const accentGain = Math.min(0.19, baseGain + 0.016);
      const urgentGain = Math.min(0.22, accentGain + 0.02);
      const toneType = iteration >= 4 ? "triangle" : "sine";

      playTone(740, 0.16, 0, baseGain, toneType);
      playTone(988 + intensity * 60, 0.19, 0.16, accentGain, toneType);

      if (iteration >= 2) {
        playTone(784, 0.15, 0.42, accentGain, "triangle");
      }

      if (iteration >= 4) {
        playTone(1108, 0.18, 0.6, urgentGain, "square");
      }

      if (iteration >= 6) {
        playTone(1320, 0.22, 0.8, urgentGain, "square");
      }
      },
    };
}

function initNeckPage() {
  mountSiteShell();
  initNumberSteppers();

  const notifier = createNotifier();
  const intervalInput = getElement("neck-interval");
  const intervalUnitInput = getElement("neck-interval-unit");
  const repeatCountInput = getElement("neck-repeat-count");
  const repeatSpacingInput = getElement("neck-repeat-spacing");
  const soundEnabledInput = getElement("neck-sound-enabled");
  const notificationsEnabledInput = getElement("neck-notifications-enabled");
  const startButton = getElement("neck-start");
  const pauseButton = getElement("neck-pause");
  const resumeButton = getElement("neck-resume");
  const doneButton = getElement("neck-done");
  const snoozeButton = getElement("neck-snooze");
  const resetButton = getElement("neck-reset");
  const testAlertButton = getElement("neck-test-alert");
  const settingsToggleButton = getElement("neck-settings-toggle");
  const settingsSectionsElement = getElement("neck-settings-sections");
  const enableNotificationsButton = getElement("neck-enable-notifications");
  const countdownElement = getElement("neck-countdown");
  const statusElement = getElement("neck-status");
  const nextDueElement = getElement("neck-next-due");
  const repeatProgressElement = getElement("neck-repeat-progress");
  const statePillElement = getElement("neck-state-pill");
  const timerPanelElement = document.querySelector(".neck-timer-panel");
  const notificationStatusElement = getElement("neck-notification-status");

  let settings = {
    ...defaultSettings,
    ...loadJson(settingsKey, defaultSettings),
  };
  let state = {
    ...defaultState,
    ...loadJson(stateKey, defaultState),
  };
  let repeatTimeoutId = 0;
  let renderIntervalId = 0;
  let activeNotification = null;
  let settingsCollapsed = localStorage.getItem(settingsUiKey) === "collapsed";

  function persistSettings() {
    saveJson(settingsKey, settings);
  }

  function persistSettingsUi() {
    localStorage.setItem(settingsUiKey, settingsCollapsed ? "collapsed" : "expanded");
  }

  function persistState() {
    saveJson(stateKey, state);
    window.__neckReminderGuardActive = isActivePhase(state.phase);
    window.__activePageGuardMessage = isActivePhase(state.phase)
      ? "A neck reminder is still active. Leave this page anyway?"
      : "";
  }

  function syncInputsFromSettings() {
    intervalInput.value = String(settings.intervalValue);
    intervalUnitInput.value = settings.intervalUnit;
    repeatCountInput.value = String(settings.repeatCount);
    repeatSpacingInput.value = String(settings.repeatSpacingSeconds);
    soundEnabledInput.checked = settings.soundEnabled;
    notificationsEnabledInput.checked = settings.notificationsEnabled;
  }

  function readSettingsFromInputs() {
    const nextIntervalUnit = intervalUnitInput.value === "seconds" ? "seconds" : "minutes";
    settings = {
      intervalValue: clampNumber(
        intervalInput.valueAsNumber,
        1,
        nextIntervalUnit === "seconds" ? 3600 : 240,
        defaultSettings.intervalValue
      ),
      intervalUnit: nextIntervalUnit,
      repeatCount: clampNumber(repeatCountInput.valueAsNumber, 1, 10, defaultSettings.repeatCount),
      repeatSpacingSeconds: clampNumber(repeatSpacingInput.valueAsNumber, 3, 300, defaultSettings.repeatSpacingSeconds),
      soundEnabled: soundEnabledInput.checked,
      notificationsEnabled: notificationsEnabledInput.checked,
    };
    syncInputsFromSettings();
    persistSettings();
  }

  function updateNotificationStatus() {
    if (!("Notification" in window)) {
      notificationStatusElement.textContent = "Notification permission: this browser does not support notifications.";
      enableNotificationsButton.disabled = true;
      notificationsEnabledInput.disabled = true;
      return;
    }

    const permission = Notification.permission;
    const label = permission === "default" ? "not requested" : permission;
    notificationStatusElement.textContent = `Notification permission: ${label}.`;
    enableNotificationsButton.disabled = permission === "granted";
  }

  async function maybeNotify(title, body) {
    if (!("Notification" in window) || !settings.notificationsEnabled || Notification.permission !== "granted") {
      return;
    }

    try {
      activeNotification?.close();
      activeNotification = new Notification(title, {
        body,
        tag: "neck-reminder",
        renotify: true,
      });
    } catch {
      // Ignore notification errors; sound and on-page state still provide fallback feedback.
    }
  }

  async function ensureNotificationPermission() {
    if (!("Notification" in window) || !settings.notificationsEnabled) {
      return Notification.permission;
    }

    if (Notification.permission !== "default") {
      updateNotificationStatus();
      return Notification.permission;
    }

    try {
      return await Notification.requestPermission();
    } finally {
      updateNotificationStatus();
    }
  }

  function clearRepeatTimeout() {
    window.clearTimeout(repeatTimeoutId);
    repeatTimeoutId = 0;
  }

  function clearNotification() {
    activeNotification?.close();
    activeNotification = null;
  }

  function setState(nextState) {
    state = { ...state, ...nextState };
    persistState();
    render();
  }

  function buildRunningStatus(remainingMs) {
    return `Running. Next neck-roll reminder in ${formatDuration(remainingMs)}. Current interval: ${getIntervalLabel(settings)}.`;
  }

  function buildPausedStatus() {
    return `Paused with ${formatDuration(state.pausedRemainingMs || 0)} remaining. Resume when you are back from lunch or a break.`;
  }

  function buildAlertStatus() {
    const repeats = settings.repeatCount;
    const current = Math.min(repeats, Math.max(1, state.alertIteration || 1));
    return `Neck rolls due now. Alert ${current} of ${repeats} has fired. Press Done after you do them, or snooze for 10 minutes.`;
  }

  function updateTitle() {
    if (state.phase === "alerting") {
      document.title = "Neck rolls now | peheje";
      return;
    }

    if (state.phase === "running") {
      const remainingMs = Math.max(0, (state.dueAt || 0) - Date.now());
      document.title = `${formatDuration(remainingMs)} | Neck | peheje`;
      return;
    }

    if (state.phase === "paused") {
      document.title = `Paused | ${pageTitleBase}`;
      return;
    }

    document.title = pageTitleBase;
  }

  function renderButtons() {
    const isIdle = state.phase === "idle";
    const isRunning = state.phase === "running";
    const isPaused = state.phase === "paused";
    const isAlerting = state.phase === "alerting";

    startButton.classList.toggle("display-none", !isIdle);
    pauseButton.classList.toggle("display-none", !isRunning);
    resumeButton.classList.toggle("display-none", !isPaused);
    doneButton.classList.toggle("display-none", !isAlerting);
    snoozeButton.classList.toggle("display-none", !isAlerting);
    resetButton.classList.toggle("display-none", isIdle);
  }

  function renderSettingsUi() {
    settingsSectionsElement?.classList.toggle("display-none", settingsCollapsed);
    if (settingsToggleButton) {
      settingsToggleButton.textContent = settingsCollapsed ? "Show setup" : "Hide setup";
      settingsToggleButton.setAttribute("aria-expanded", settingsCollapsed ? "false" : "true");
    }
  }

  function render() {
    const now = Date.now();
    let countdownText = formatDuration(getIntervalDurationMs(settings));
    let nextDueText = "Next reminder: -";
    let repeatProgressText = "Alert progress: -";
    let statusText = "Start the timer to get a recurring neck-roll reminder.";
    let pillText = "Idle";

    timerPanelElement?.classList.remove("neck-alerting", "neck-paused", "neck-running");

    if (state.phase === "running") {
      const remainingMs = Math.max(0, (state.dueAt || 0) - now);
      countdownText = formatDuration(remainingMs);
      nextDueText = `Next reminder: ${formatClockTime(state.dueAt)}`;
      statusText = buildRunningStatus(remainingMs);
      pillText = "Running";
      timerPanelElement?.classList.add("neck-running");
    } else if (state.phase === "paused") {
      countdownText = formatDuration(state.pausedRemainingMs || 0);
      statusText = buildPausedStatus();
      pillText = "Paused";
      timerPanelElement?.classList.add("neck-paused");
    } else if (state.phase === "alerting") {
      countdownText = "ROLL";
      nextDueText = "Next reminder: waiting for Done or Snooze";
      repeatProgressText = `Alert progress: ${Math.min(settings.repeatCount, state.alertIteration || 1)} of ${settings.repeatCount}`;
      statusText = buildAlertStatus();
      pillText = "Due now";
      timerPanelElement?.classList.add("neck-alerting");
    }

    countdownElement.textContent = countdownText;
    nextDueElement.textContent = nextDueText;
    repeatProgressElement.textContent = repeatProgressText;
    statusElement.textContent = statusText;
    statePillElement.textContent = pillText;
    renderButtons();
    renderSettingsUi();
    updateNotificationStatus();
    updateTitle();
  }

  function scheduleNextCycle(delayMs = getIntervalDurationMs(settings)) {
    clearRepeatTimeout();
    clearNotification();
    setState({
      phase: "running",
      dueAt: Date.now() + delayMs,
      pausedRemainingMs: null,
      alertIteration: 0,
      alertSequenceStartedAt: null,
      lastAlertAt: null,
    });
  }

  async function runAlert(iteration) {
    if (state.phase !== "alerting") {
      return;
    }

    if (settings.soundEnabled) {
      notifier.chime(iteration);
    }

    await maybeNotify(
      "Neck rolls",
      iteration <= 1
        ? "Time for your neck rolls. Press Done when finished."
        : `Reminder ${iteration} of ${settings.repeatCount}: time for your neck rolls.`
    );
  }

  function scheduleAlertRepeat() {
    clearRepeatTimeout();

    if (state.phase !== "alerting") {
      return;
    }

    if ((state.alertIteration || 0) >= settings.repeatCount) {
      render();
      return;
    }

    repeatTimeoutId = window.setTimeout(async () => {
      if (state.phase !== "alerting") {
        return;
      }

      setState({
        alertIteration: (state.alertIteration || 0) + 1,
        lastAlertAt: Date.now(),
      });
      await runAlert(state.alertIteration || 1);
      scheduleAlertRepeat();
    }, settings.repeatSpacingSeconds * 1000);
  }

  function beginAlerting() {
    const startedAt = state.alertSequenceStartedAt || Date.now();
    clearRepeatTimeout();
    setState({
      phase: "alerting",
      dueAt: null,
      pausedRemainingMs: null,
      alertIteration: 1,
      alertSequenceStartedAt: startedAt,
      lastAlertAt: Date.now(),
    });
    runAlert(1);
    scheduleAlertRepeat();
  }

  function recomputeStateFromTime() {
    if (state.phase === "running" && state.dueAt && Date.now() >= state.dueAt) {
      beginAlerting();
      return;
    }

    if (state.phase === "alerting") {
      const startedAt = state.alertSequenceStartedAt || Date.now();
      const spacingMs = settings.repeatSpacingSeconds * 1000;
      const elapsedMs = Math.max(0, Date.now() - startedAt);
      const computedIteration = Math.min(settings.repeatCount, 1 + Math.floor(elapsedMs / spacingMs));
      const previousIteration = state.alertIteration || 1;

      if (computedIteration !== previousIteration) {
        state = {
          ...state,
          alertIteration: computedIteration,
          lastAlertAt: Date.now(),
        };
        persistState();
        runAlert(computedIteration);
      }

      if (computedIteration < settings.repeatCount) {
        const nextDelay = Math.max(250, spacingMs - (elapsedMs % spacingMs));
        clearRepeatTimeout();
        repeatTimeoutId = window.setTimeout(() => {
          recomputeStateFromTime();
        }, nextDelay);
      } else {
        clearRepeatTimeout();
      }

      render();
    }
  }

  function startRenderLoop() {
    window.clearInterval(renderIntervalId);
    renderIntervalId = window.setInterval(() => {
      recomputeStateFromTime();
      render();
    }, 1000);
  }

  function resetTimer() {
    clearRepeatTimeout();
    clearNotification();
    setState({ ...defaultState });
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      updateNotificationStatus();
      return;
    }

    try {
      await Notification.requestPermission();
    } finally {
      updateNotificationStatus();
    }
  }

  function bindSettingsInput(input, onChange) {
    input.addEventListener("input", () => {
      readSettingsFromInputs();
      onChange?.();
      render();
    });

    input.addEventListener("change", () => {
      readSettingsFromInputs();
      onChange?.();
      render();
    });
  }

  syncInputsFromSettings();
  readSettingsFromInputs();
  persistState();
  render();
  startRenderLoop();
  recomputeStateFromTime();

  bindSettingsInput(intervalInput, () => {
    if (state.phase === "idle") {
      countdownElement.textContent = formatDuration(getIntervalDurationMs(settings));
    }
  });
  bindSettingsInput(intervalUnitInput, () => {
    if (state.phase === "idle") {
      countdownElement.textContent = formatDuration(getIntervalDurationMs(settings));
    }
  });
  bindSettingsInput(repeatCountInput);
  bindSettingsInput(repeatSpacingInput, () => {
    if (state.phase === "alerting") {
      recomputeStateFromTime();
    }
  });
  bindSettingsInput(soundEnabledInput);
  bindSettingsInput(notificationsEnabledInput, updateNotificationStatus);

  startButton.addEventListener("click", () => {
    notifier.unlock();
    readSettingsFromInputs();
    ensureNotificationPermission();
    scheduleNextCycle();
  });

  pauseButton.addEventListener("click", () => {
    if (state.phase !== "running" || !state.dueAt) {
      return;
    }

    setState({
      phase: "paused",
      pausedRemainingMs: Math.max(0, state.dueAt - Date.now()),
      dueAt: null,
    });
  });

  resumeButton.addEventListener("click", () => {
    if (state.phase !== "paused") {
      return;
    }

    scheduleNextCycle(state.pausedRemainingMs || getIntervalDurationMs(settings));
  });

  doneButton.addEventListener("click", () => {
    scheduleNextCycle();
  });

  snoozeButton.addEventListener("click", () => {
    scheduleNextCycle(10 * 60000);
  });

  resetButton.addEventListener("click", () => {
    resetTimer();
  });

  enableNotificationsButton.addEventListener("click", async () => {
    notifier.unlock();
    await requestNotifications();
  });

  testAlertButton.addEventListener("click", async () => {
    notifier.unlock();
    readSettingsFromInputs();
    await ensureNotificationPermission();

    if (settings.soundEnabled) {
      notifier.chime(1);
    }

    await maybeNotify("Neck rolls", "Test alert. If you noticed this, the page can nudge you later too.");
    statusElement.textContent = "Test alert sent. If you heard nothing, your browser may still need user interaction or audio permission.";
  });

  settingsToggleButton?.addEventListener("click", () => {
    settingsCollapsed = !settingsCollapsed;
    persistSettingsUi();
    renderSettingsUi();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      recomputeStateFromTime();
      render();
    }
  });

  window.addEventListener("focus", () => {
    recomputeStateFromTime();
    render();
  });

  window.addEventListener("beforeunload", (event) => {
    if (!isActivePhase(state.phase)) {
      return;
    }

    event.preventDefault();
    event.returnValue = "A neck reminder is still active.";
  });

  window.__neckReminderDebug = {
    getSettings() {
      return settings;
    },
    getState() {
      return state;
    },
    recomputeStateFromTime,
  };
}

initNeckPage();
