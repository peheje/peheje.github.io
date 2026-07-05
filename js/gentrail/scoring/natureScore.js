import { minimumDistanceToFeatureMeters } from "../geo.js";
import { routeCoverageNearCategory } from "./featureAnalysis.js";

export function scoreFeatureProximity(
  route,
  features,
  category,
  label,
  rewardDistanceMeters,
  featureDistances,
  coverageWeight = 0,
) {
  const matches = features.filter((feature) => feature.category === category);
  if (!matches.length) {
    return {
      value: 0,
      weightedPoints: 0,
      explanation: `No nearby ${label} features were returned by Overpass.`,
    };
  }
  const distances = matches
    .map(
      (feature) =>
        featureDistances?.get(feature) ??
        minimumDistanceToFeatureMeters(route.geometry, feature),
    )
    .sort((a, b) => a - b);
  const nearest = distances[0];
  const nearbyCount = distances.filter((value) => value <= rewardDistanceMeters).length;
  const proximity = Math.max(0, 1 - nearest / rewardDistanceMeters);
  const variety = Math.min(1, nearbyCount / 3);
  const coverage =
    coverageWeight > 0
      ? routeCoverageNearCategory(
          route,
          features,
          category,
          Math.min(100, rewardDistanceMeters),
        )
      : 0;
  const value = Math.round(
    100 *
      (proximity * (0.75 - coverageWeight * 0.55) +
        variety * (0.25 - coverageWeight * 0.15) +
        coverage * coverageWeight * 0.7),
  );
  return {
    value,
    weightedPoints: 0,
    explanation:
      coverageWeight > 0
        ? `${Math.round(coverage * 100)}% of route near ${label}; nearest ${formatDistance(nearest)}.`
        : `Nearest ${label}: ${formatDistance(nearest)}; ${nearbyCount} feature${nearbyCount === 1 ? "" : "s"} within ${rewardDistanceMeters} m.`,
  };
}

function formatDistance(value) {
  return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`;
}
