import { minimumDistanceToFeatureMeters } from "../geo.js";

export function scoreRoadPenalty(route, features, category, featureDistances) {
  const matches = features.filter((feature) => feature.category === category);
  if (!matches.length) {
    return {
      value: 0,
      weightedPoints: 0,
      explanation: `No ${category === "motorway" ? "motorway/trunk" : "primary/secondary road"} features found nearby.`,
    };
  }
  const threshold = category === "motorway" ? 250 : 80;
  const distances = matches
    .map(
      (feature) =>
        featureDistances?.get(feature) ??
        minimumDistanceToFeatureMeters(route.geometry, feature),
    )
    .sort((a, b) => a - b);
  const nearest = distances[0];
  const closeCount = distances.filter((value) => value <= threshold).length;
  const value = Math.round(
    100 * Math.max(0, 1 - nearest / threshold) * Math.min(1, 0.65 + closeCount * 0.12),
  );
  return {
    value,
    weightedPoints: 0,
    explanation: `Nearest ${category === "motorway" ? "motorway/trunk" : "major road"}: ${Math.round(nearest)} m.`,
  };
}
