import { minimumDistanceToFeatureMeters } from "../geo.js";
import { roadMetadataMeters } from "../trailMetadata.js";

export function scoreRoadPenalty(route, features, category, featureDistances) {
  const matches = features.filter((feature) => feature.category === category);
  const onRoadMeters = roadMetadataMeters(route, category);
  const onRoadRatio = onRoadMeters / Math.max(route.distanceMeters, 1);
  const onRoadPenalty = onRoadMeters > 0
    ? Math.min(100, 55 + onRoadRatio * 45)
    : 0;
  if (!matches.length) {
    let typeName = "primary/secondary road";
    if (category === "motorway") typeName = "motorway/trunk";
    else if (category === "minorRoad") typeName = "minor road/street";

    return {
      value: Math.round(onRoadPenalty),
      weightedPoints: 0,
      explanation: onRoadMeters > 0
        ? `Route uses ${formatDistance(onRoadMeters)} of ${typeName}, based on its OSM way tags.`
        : `No ${typeName} features found nearby.`,
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
  const proximityPenalty = Math.round(
    100 * Math.max(0, 1 - nearest / threshold) * Math.min(1, 0.65 + closeCount * 0.12),
  );
  const value = Math.round(Math.max(proximityPenalty, onRoadPenalty));

  let explanationLabel = "major road";
  if (category === "motorway") explanationLabel = "motorway/trunk";
  else if (category === "minorRoad") explanationLabel = "minor road/street";

  return {
    value,
    weightedPoints: 0,
    explanation: onRoadMeters > 0
      ? `Route uses ${formatDistance(onRoadMeters)} of ${explanationLabel}; nearest mapped segment: ${Math.round(nearest)} m.`
      : `Nearest ${explanationLabel}: ${Math.round(nearest)} m.`,
  };
}

function formatDistance(meters) {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
}
