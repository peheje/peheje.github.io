export function maximumRepeatedRatio(avoidRepetitions) {
  if (avoidRepetitions >= 10) return 0.025;
  if (avoidRepetitions >= 9) return 0.045;
  if (avoidRepetitions >= 8) return 0.07;
  return 0.28 - avoidRepetitions * 0.022;
}

export function usesStrictRepetitionFiltering(avoidRepetitions) {
  return avoidRepetitions >= 8;
}
