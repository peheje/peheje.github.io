import { scoreDistance } from "./distanceScore.js";
import { scoreLoopQuality } from "./loopQualityScore.js";
import { scoreFeatureProximity } from "./natureScore.js";
import { scoreRoadPenalty } from "./roadPenalty.js";
import { scoreTrail } from "./trailScore.js";
import { analyzeFeatureDistances } from "./featureAnalysis.js";
import { scoreRepetitionPenalty } from "./repetitionPenalty.js";
import { scoreUrbanPenalty } from "./urbanPenalty.js";
import { SCORING_WEIGHTS } from "../config.js";
import { countsTowardRouteVariety } from "./varietyScore.js";

export class DefaultRouteScorer {
  async score(route, context) {
    const { osmFeatures, preferences } = context;
    const featureDistances = analyzeFeatureDistances(route, osmFeatures, context.spatialIndex);
    const components = {
      distanceMatchScore: scoreDistance(route.distanceMeters, context.targetDistanceMeters),
      loopQualityScore: scoreLoopQuality(route),
      forestScore: scoreFeatureProximity(
        route,
        osmFeatures,
        "forest",
        "forest",
        250,
        featureDistances,
        0.85,
        context.spatialIndex,
      ),
      waterScore: scoreFeatureProximity(
        route,
        osmFeatures,
        "water",
        "water",
        300,
        featureDistances,
      ),
      beachScore: scoreFeatureProximity(
        route,
        osmFeatures,
        "beach",
        "beach",
        400,
        featureDistances,
        0.75,
        context.spatialIndex,
      ),
      gravelTrailScore: scoreTrail(route, osmFeatures, featureDistances),
      roadPenalty: scoreRoadPenalty(
        route,
        osmFeatures,
        "road",
        featureDistances,
      ),
      motorwayPenalty: scoreRoadPenalty(
        route,
        osmFeatures,
        "motorway",
        featureDistances,
      ),
      minorRoadPenalty: scoreRoadPenalty(
        route,
        osmFeatures,
        "minorRoad",
        featureDistances,
      ),
      repetitionPenalty: scoreRepetitionPenalty(
        route,
        context.repetitionMetrics,
      ),
      urbanPenalty: scoreUrbanPenalty(route, osmFeatures, context.spatialIndex),
      varietyScore: varietyScore(osmFeatures, featureDistances),
    };

    const positiveWeights = {
      distanceMatchScore: SCORING_WEIGHTS.positive.distanceMatchScore,
      loopQualityScore: SCORING_WEIGHTS.positive.loopQualityScore,
      forestScore: SCORING_WEIGHTS.positive.forestBase + preferences.forest * SCORING_WEIGHTS.positive.forestMultiplier,
      waterScore: SCORING_WEIGHTS.positive.waterBase + preferences.water * SCORING_WEIGHTS.positive.waterMultiplier,
      beachScore: preferences.water * SCORING_WEIGHTS.positive.beachMultiplier,
      gravelTrailScore: SCORING_WEIGHTS.positive.gravelTrailBase + preferences.trail * SCORING_WEIGHTS.positive.gravelTrailMultiplier,
      varietyScore: SCORING_WEIGHTS.positive.varietyScore,
    };
    let positive = 0;
    let maximum = 0;
    for (const [key, weight] of Object.entries(positiveWeights)) {
      const component = components[key];
      component.weightedPoints = (component.value / 100) * weight;
      positive += component.weightedPoints;
      maximum += weight;
    }

    const roadWeight = preferences.avoidRoads * SCORING_WEIGHTS.negative.roadMultiplier;
    const motorwayWeight = preferences.avoidHighways * SCORING_WEIGHTS.negative.motorwayMultiplier;
    const minorRoadWeight = preferences.avoidMinorRoads * SCORING_WEIGHTS.negative.minorRoadMultiplier;
    const repetitionWeight = preferences.avoidRepetitions * SCORING_WEIGHTS.negative.repetitionMultiplier;
    const urbanWeight = preferences.forest * SCORING_WEIGHTS.negative.urbanMultiplier;
    components.roadPenalty.weightedPoints =
      -(components.roadPenalty.value / 100) * roadWeight;
    components.motorwayPenalty.weightedPoints =
      -(components.motorwayPenalty.value / 100) * motorwayWeight;
    components.minorRoadPenalty.weightedPoints =
      -(components.minorRoadPenalty.value / 100) * minorRoadWeight;
    components.repetitionPenalty.weightedPoints =
      -(components.repetitionPenalty.value / 100) * repetitionWeight;
    components.urbanPenalty.weightedPoints =
      -(components.urbanPenalty.value / 100) * urbanWeight;
    let total = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          ((positive +
            components.roadPenalty.weightedPoints +
            components.motorwayPenalty.weightedPoints +
            components.minorRoadPenalty.weightedPoints +
            components.repetitionPenalty.weightedPoints +
            components.urbanPenalty.weightedPoints) /
            maximum) *
            100,
        ),
      ),
    );
    if (
      preferences.avoidRepetitions >= SCORING_WEIGHTS.repetitionCap.threshold &&
      components.repetitionPenalty.value > SCORING_WEIGHTS.repetitionCap.penaltyThreshold
    ) {
      total = Math.min(
        total,
        SCORING_WEIGHTS.repetitionCap.baseMaxScore - preferences.avoidRepetitions * SCORING_WEIGHTS.repetitionCap.preferenceMultiplier
      );
    }

    const warnings = [];
    if (components.distanceMatchScore.value < SCORING_WEIGHTS.warnings.distanceMatchThreshold) warnings.push("Distance misses target");
    if (components.loopQualityScore.value < SCORING_WEIGHTS.warnings.loopQualityThreshold) warnings.push("Poor loop shape");
    if (components.roadPenalty.value > SCORING_WEIGHTS.warnings.roadPenaltyThreshold) warnings.push("Close to major roads");
    if (components.motorwayPenalty.value > SCORING_WEIGHTS.warnings.motorwayPenaltyThreshold) warnings.push("Close to motorway or trunk road");
    if (components.repetitionPenalty.value > SCORING_WEIGHTS.warnings.repetitionPenaltyThreshold) {
      warnings.push("Substantial backtracking");
    }
    if (
      preferences.forest >= SCORING_WEIGHTS.warnings.urbanForestThreshold &&
      components.urbanPenalty.value > SCORING_WEIGHTS.warnings.urbanPenaltyThreshold
    ) {
      warnings.push("Mostly urban surroundings");
    }
    if (!context.featureDataAvailable) warnings.push("OSM context unavailable");
    if (!Object.keys(route.metadata.surfaceMeters).length) {
      warnings.push("Limited surface metadata");
    }

    return { total, components, warnings };
  }
}

function varietyScore(features, featureDistances) {
  const present = new Set(
    features
      .filter(
        (feature) =>
          countsTowardRouteVariety(feature.category) &&
          (featureDistances.get(feature) ?? Infinity) < 190,
      )
      .map((feature) => feature.category),
  );
  const value = Math.min(100, present.size * 22);
  return {
    value,
    weightedPoints: 0,
    explanation: `${present.size} nearby feature type${present.size === 1 ? "" : "s"}: ${[...present].join(", ") || "none"}.`,
  };
}
