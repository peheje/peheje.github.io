import { mountSiteShell } from "../site.js";
import { initNumberSteppers } from "../number-stepper.js";
import {
  centsBetween,
  detectPitch,
  frequencyFor,
  instruments,
  nearestString,
  noteName,
  octaveOf,
} from "../tuner/pitch.js";

const settingsKey = "tuner-settings";
const inTuneCents = 5;
const closeCents = 20;
const minRms = 0.008;
const minClarity = 0.85;
const silentFramesBeforeClear = 30;

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(settingsKey) || "{}");
    return {
      instrument: instruments[parsed.instrument] ? parsed.instrument : "guitar",
      a4: Number.isFinite(parsed.a4) ? Math.min(450, Math.max(430, parsed.a4)) : 440,
    };
  } catch {
    return { instrument: "guitar", a4: 440 };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  } catch {
    // storage disabled; settings last for this visit only
  }
}

function initTunerPage() {
  mountSiteShell();

  const settings = loadSettings();
  let lockedMidi = null;
  let audioContext = null;
  let stream = null;
  let analyser = null;
  let sampleBuffer = null;
  let frameRequest = 0;
  let wakeLock = null;
  let recentFrequencies = [];
  let silentFrames = 0;

  const noteElement = document.getElementById("tuner-note");
  const octaveElement = document.getElementById("tuner-octave");
  const frequencyElement = document.getElementById("tuner-frequency");
  const directionElement = document.getElementById("tuner-direction");
  const needleElement = document.getElementById("tuner-needle");
  const modeElement = document.getElementById("tuner-mode");
  const stringsElement = document.getElementById("tuner-strings");
  const statusElement = document.getElementById("tuner-status");
  const startButton = document.getElementById("tuner-start");
  const stopButton = document.getElementById("tuner-stop");
  const a4Input = document.getElementById("tuner-a4");
  const panelElement = document.querySelector(".tuner-panel");
  const instrumentButtons = document.querySelectorAll("[data-instrument]");

  const ticksElement = document.getElementById("tuner-ticks");
  for (let index = 0; index <= 20; index += 1) {
    const tick = document.createElement("i");
    if (index === 10) {
      tick.className = "tuner-tick-center";
    }
    ticksElement.appendChild(tick);
  }

  function renderStrings() {
    const strings = instruments[settings.instrument].strings;
    stringsElement.style.gridTemplateColumns = `repeat(${strings.length}, minmax(0, 1fr))`;
    stringsElement.replaceChildren(
      ...strings.map((midi) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.midi = String(midi);
        button.setAttribute("aria-pressed", "false");
        const name = document.createElement("span");
        name.textContent = noteName(midi);
        const detail = document.createElement("small");
        detail.textContent = `${noteName(midi)}${octaveOf(midi)} · ${frequencyFor(midi, settings.a4).toFixed(1)}`;
        button.append(name, detail);
        button.addEventListener("click", () => {
          lockedMidi = lockedMidi === midi ? null : midi;
          updateStrings(null, false);
        });
        return button;
      }),
    );
    instrumentButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.instrument === settings.instrument));
    });
    updateStrings(null, false);
  }

  function updateStrings(activeMidi, inTune) {
    stringsElement.querySelectorAll("button").forEach((button) => {
      const midi = Number(button.dataset.midi);
      button.setAttribute("aria-pressed", String(midi === lockedMidi));
      button.classList.toggle("tuner-string-active", midi === activeMidi);
      button.classList.toggle("tuner-string-in-tune", midi === activeMidi && inTune);
    });
    const instrument = instruments[settings.instrument];
    modeElement.textContent = lockedMidi === null
      ? `${instrument.label} (${instrument.detail}) · auto`
      : `${instrument.label} (${instrument.detail}) · locked to ${noteName(lockedMidi)}${octaveOf(lockedMidi)}`;
  }

  function setTuningState(state) {
    panelElement.classList.remove("tuner-state-good", "tuner-state-close", "tuner-state-off");
    if (state) {
      panelElement.classList.add(`tuner-state-${state}`);
    }
  }

  function clearReading() {
    noteElement.textContent = "–";
    octaveElement.textContent = "";
    frequencyElement.textContent = stream ? "Listening…" : "Play one open string";
    directionElement.textContent = stream ? "Pluck a string" : "Ready when you are";
    needleElement.style.left = "50%";
    setTuningState(null);
    updateStrings(null, false);
  }

  function showReading(frequency) {
    const target = lockedMidi ?? nearestString(frequency, instruments[settings.instrument].strings, settings.a4);
    const targetFrequency = frequencyFor(target, settings.a4);
    const cents = centsBetween(frequency, targetFrequency);
    const distance = Math.abs(cents);
    const inTune = distance <= inTuneCents;

    noteElement.textContent = noteName(target);
    octaveElement.textContent = String(octaveOf(target));
    frequencyElement.textContent = `${frequency.toFixed(1)} Hz → ${targetFrequency.toFixed(1)} Hz`;
    needleElement.style.left = `${50 + Math.max(-50, Math.min(50, cents))}%`;
    setTuningState(inTune ? "good" : distance <= closeCents ? "close" : "off");

    if (inTune) {
      directionElement.textContent = "In tune ✓";
    } else if (distance > 50) {
      directionElement.textContent = cents < 0 ? "Way flat · tighten ↑" : "Way sharp · loosen ↓";
    } else {
      const sign = cents > 0 ? "+" : "";
      directionElement.textContent = `${sign}${cents.toFixed(0)}¢ · ${cents < 0 ? "tighten ↑" : "loosen ↓"}`;
    }
    updateStrings(target, inTune);
  }

  // ---- Audio ----
  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
      }
    } catch {
      // wake lock refused; tuning still works
    }
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      statusElement.textContent = "Microphone access needs a secure page (https or localhost) and a browser that supports it.";
      return;
    }
    startButton.disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      // Gentle low-pass to tame hiss and upper harmonics
      const lowpass = audioContext.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 1500;
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096; // long enough for E2 (~82 Hz) at 48 kHz
      source.connect(lowpass);
      lowpass.connect(analyser);
      sampleBuffer = new Float32Array(analyser.fftSize);

      startButton.classList.add("display-none");
      stopButton.classList.remove("display-none");
      statusElement.textContent = "Listening. Audio is analysed on this device and never uploaded.";
      requestWakeLock();
      clearReading();
      frameRequest = requestAnimationFrame(listen);
    } catch (error) {
      stop();
      statusElement.textContent = `Could not access the microphone: ${error.message}`;
    } finally {
      startButton.disabled = false;
    }
  }

  function stop() {
    cancelAnimationFrame(frameRequest);
    stream?.getTracks().forEach((track) => track.stop());
    audioContext?.close();
    wakeLock?.release();
    stream = null;
    audioContext = null;
    analyser = null;
    recentFrequencies = [];
    startButton.classList.remove("display-none");
    stopButton.classList.add("display-none");
    statusElement.textContent = "Microphone off. Tap Start to tune again.";
    clearReading();
  }

  function listen() {
    analyser.getFloatTimeDomainData(sampleBuffer);
    let sumOfSquares = 0;
    for (const sample of sampleBuffer) {
      sumOfSquares += sample * sample;
    }
    const rms = Math.sqrt(sumOfSquares / sampleBuffer.length);
    const result = rms > minRms ? detectPitch(sampleBuffer, audioContext.sampleRate) : null;

    if (result && result.clarity > minClarity) {
      silentFrames = 0;
      recentFrequencies.push(result.frequency);
      if (recentFrequencies.length > 5) {
        recentFrequencies.shift();
      }
      // Median of recent readings smooths octave glitches
      const sorted = [...recentFrequencies].sort((a, b) => a - b);
      showReading(sorted[Math.floor(sorted.length / 2)]);
    } else {
      silentFrames += 1;
      if (silentFrames === silentFramesBeforeClear) {
        recentFrequencies = [];
        clearReading();
      }
    }
    frameRequest = requestAnimationFrame(listen);
  }

  // ---- Controls ----
  instrumentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      settings.instrument = button.dataset.instrument;
      lockedMidi = null;
      saveSettings(settings);
      renderStrings();
      clearReading();
    });
  });

  a4Input.value = String(settings.a4);
  a4Input.addEventListener("change", () => {
    const value = Number.parseInt(a4Input.value, 10);
    settings.a4 = Number.isFinite(value) ? Math.min(450, Math.max(430, value)) : 440;
    a4Input.value = String(settings.a4);
    saveSettings(settings);
    renderStrings();
  });

  startButton.addEventListener("click", start);
  stopButton.addEventListener("click", stop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && stream) {
      stop();
    }
  });

  initNumberSteppers();
  renderStrings();
  clearReading();
}

initTunerPage();
