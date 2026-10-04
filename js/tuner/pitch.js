// Pure tuning helpers and YIN pitch detection for the tuner page.

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

// Open strings as MIDI note numbers, in playing order.
export const instruments = {
  guitar: { label: "Guitar", detail: "Standard", strings: [40, 45, 50, 55, 59, 64] }, // E2 A2 D3 G3 B3 E4
  ukulele: { label: "Ukulele", detail: "High G", strings: [67, 60, 64, 69] }, // G4 C4 E4 A4
};

export function frequencyFor(midi, a4 = 440) {
  return a4 * 2 ** ((midi - 69) / 12);
}

export function noteName(midi) {
  return NOTE_NAMES[((midi % 12) + 12) % 12];
}

export function octaveOf(midi) {
  return Math.floor(midi / 12) - 1;
}

export function centsBetween(frequency, reference) {
  return 1200 * Math.log2(frequency / reference);
}

export function nearestString(frequency, strings, a4 = 440) {
  let best = strings[0];
  let bestDistance = Infinity;
  for (const midi of strings) {
    const distance = Math.abs(Math.log2(frequency / frequencyFor(midi, a4)));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = midi;
    }
  }
  return best;
}

// YIN (de Cheveigné & Kawahara, 2002). Returns { frequency, clarity } or null.
export function detectPitch(buffer, sampleRate, { minFrequency = 60, maxFrequency = 1000, threshold = 0.12 } = {}) {
  const minTau = Math.floor(sampleRate / maxFrequency);
  const maxTau = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(buffer.length / 2));
  const windowSize = buffer.length - maxTau;
  const difference = new Float32Array(maxTau + 1);

  for (let tau = 1; tau <= maxTau; tau += 1) {
    let sum = 0;
    for (let index = 0; index < windowSize; index += 1) {
      const delta = buffer[index] - buffer[index + tau];
      sum += delta * delta;
    }
    difference[tau] = sum;
  }

  // Cumulative mean normalized difference
  difference[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau += 1) {
    runningSum += difference[tau];
    difference[tau] = runningSum ? (difference[tau] * tau) / runningSum : 1;
  }

  let tau = -1;
  for (let candidate = minTau; candidate <= maxTau; candidate += 1) {
    if (difference[candidate] < threshold) {
      while (candidate + 1 <= maxTau && difference[candidate + 1] < difference[candidate]) {
        candidate += 1;
      }
      tau = candidate;
      break;
    }
  }
  if (tau < 0) {
    return null;
  }

  // Parabolic interpolation around the dip
  let refinedTau = tau;
  if (tau > 1 && tau < maxTau) {
    const previous = difference[tau - 1];
    const current = difference[tau];
    const next = difference[tau + 1];
    const denominator = previous + next - 2 * current;
    if (denominator) {
      refinedTau = tau + (previous - next) / (2 * denominator);
    }
  }

  return { frequency: sampleRate / refinedTau, clarity: 1 - difference[tau] };
}
