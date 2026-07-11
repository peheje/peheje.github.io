import { scoreFeatureProximity } from "./natureScore.js";
import { trailMetadataMetrics } from "../trailMetadata.js";

export function scoreTrail(route, features, featureDistances) {
  const { ratio: metadataRatio, trailWayMeters, unpavedMeters } =
    trailMetadataMetrics(route);
  const proximity = scoreFeatureProximity(
    route,
    features,
    "trail",
    "trail",
    120,
    featureDistances,
  );
  const value = Math.round(metadataRatio * 65 + proximity.value * 0.35);
  return {
    value,
    weightedPoints: 0,
    explanation:
      trailWayMeters + unpavedMeters > 0
        ? `${Math.round(metadataRatio * 100)}% trail/unpaved signal from the route network, plus nearby OSM paths.`
        : `Route metadata had no recognized trail surface; ${proximity.explanation}`,
  };
}
