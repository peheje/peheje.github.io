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

const ROAD_TYPES_BY_CATEGORY = {
  motorway: new Set(["motorway", "motorway_link", "trunk", "trunk_link"]),
  road: new Set(["primary", "primary_link", "secondary", "secondary_link"]),
  minorRoad: new Set([
    "tertiary",
    "tertiary_link",
    "residential",
    "service",
    "unclassified",
    "living_street",
  ]),
};

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

export function roadMetadataMeters(route, category) {
  return sumMatching(
    route.metadata?.wayTypeMeters ?? {},
    ROAD_TYPES_BY_CATEGORY[category] ?? new Set(),
  );
}

function sumMatching(values, accepted) {
  return Object.entries(values).reduce(
    (total, [key, meters]) => total + (accepted.has(key) ? meters : 0),
    0,
  );
}
