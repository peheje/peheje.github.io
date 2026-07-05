import { scoreFeatureProximity } from "./natureScore.js";

// ORS IDs: path=4, track=5, footway=7, steps=8.
const TRAIL_WAY_TYPES = new Set(["4", "5", "7", "8"]);
// ORS IDs: unpaved=2, compacted gravel=8, gravel=10, dirt=11, ground=12.
const UNPAVED_SURFACES = new Set(["2", "8", "10", "11", "12"]);

export function scoreTrail(route, features, featureDistances) {
  const trailWayMeters = sumMatching(route.metadata.wayTypeMeters, TRAIL_WAY_TYPES);
  const unpavedMeters = sumMatching(route.metadata.surfaceMeters, UNPAVED_SURFACES);
  const metadataRatio = Math.min(
    1,
    (trailWayMeters * 0.65 + unpavedMeters * 0.35) /
      Math.max(route.distanceMeters, 1),
  );
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
        ? `${Math.round(metadataRatio * 100)}% trail/unpaved signal from ORS metadata, plus nearby OSM paths.`
        : `ORS metadata had no recognized trail surface; ${proximity.explanation}`,
  };
}

function sumMatching(values, accepted) {
  return Object.entries(values).reduce(
    (total, [key, meters]) => total + (accepted.has(key) ? meters : 0),
    0,
  );
}
