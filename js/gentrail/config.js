export const ROUTE_DIVERSITY_MINIMUM_DIFFERENT_FRACTION = 0.5;

export const SCORING_WEIGHTS = {
  // Positive components (base weight + preference multiplier if applicable)
  positive: {
    distanceMatchScore: 14,
    loopQualityScore: 29,
    forestBase: 4,
    forestMultiplier: 1.4,
    waterBase: 3,
    waterMultiplier: 0.8,
    beachMultiplier: 0.8,
    gravelTrailBase: 4,
    gravelTrailMultiplier: 1.3,
    varietyScore: 8,
  },
  // Negative components (preference multipliers)
  negative: {
    roadMultiplier: 0.95,
    motorwayMultiplier: 1.35,
    minorRoadMultiplier: 0.35,
    repetitionMultiplier: 2.2,
    urbanMultiplier: 2, // multiplied by preference.forest
  },
  // Repetition constraints
  repetitionCap: {
    threshold: 7, // avoidRepetitions preference threshold to trigger capping
    penaltyThreshold: 35, // repetition penalty threshold
    baseMaxScore: 70, // base max score to cap at
    preferenceMultiplier: 2, // subtracted from baseMaxScore per preference level
  },
  // Warning thresholds
  warnings: {
    distanceMatchThreshold: 65,
    loopQualityThreshold: 55,
    roadPenaltyThreshold: 55,
    motorwayPenaltyThreshold: 40,
    repetitionPenaltyThreshold: 35,
    urbanForestThreshold: 6, // forest preference threshold to trigger urban warning
    urbanPenaltyThreshold: 55,
  }
};
