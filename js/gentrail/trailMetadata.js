const TRAIL_WAY_TYPES = new Set([
  "path",
  "track",
  "footway",
  "steps",
  "pedestrian",
  "beach",
]);

const UNPAVED_SURFACES = new Set([
  "unpaved",
  "compacted",
  "fine_gravel",
  "gravel",
  "pebblestone",
  "dirt",
  "earth",
  "ground",
  "grass",
  "sand",
  "woodchips",
  "bark",
]);

export function trailMetadataMetrics(route) {
  const trailWayMeters = sumMatching(
    route.metadata.wayTypeMeters,
    TRAIL_WAY_TYPES,
  );
  const unpavedMeters = sumMatching(
    route.metadata.surfaceMeters,
    UNPAVED_SURFACES,
  );
  const ratio = Math.min(
    1,
    (trailWayMeters * 0.65 + unpavedMeters * 0.35) /
      Math.max(route.distanceMeters, 1),
  );
  return { ratio, trailWayMeters, unpavedMeters };
}

function sumMatching(values, accepted) {
  return Object.entries(values).reduce(
    (total, [key, meters]) => total + (accepted.has(key) ? meters : 0),
    0,
  );
}
