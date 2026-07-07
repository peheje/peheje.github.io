import { minimumDistanceToFeatureMeters } from "../geo.js";

export function scoreRoadPenalty(route, features, category, featureDistances) {
  const matches = features.filter((feature) => feature.category === category);
  if (!matches.length) {
    let typeName = "primary/secondary road";
    if (category === "motorway") typeName = "motorway/trunk";
    else if (category === "minorRoad") typeName = "minor road/street";

    return {
      value: 0,
      weightedPoints: 0,
      explanation: `No ${typeName} features found nearby.`,
    };
  }

  let threshold = 80;
  if (category === "motorway") {
    threshold = 250;
  } else if (category === "minorRoad") {
    threshold = 50;
  }

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

  let explanationLabel = "major road";
  if (category === "motorway") explanationLabel = "motorway/trunk";
  else if (category === "minorRoad") explanationLabel = "minor road/street";

  return {
    value,
    weightedPoints: 0,
    explanation: `Nearest ${explanationLabel}: ${Math.round(nearest)} m.`,
  };
}
