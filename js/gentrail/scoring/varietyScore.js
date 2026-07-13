const EXCLUDED_VARIETY_CATEGORIES = new Set([
  "urban",
  "road",
  "motorway",
  "minorRoad",
]);

export function countsTowardRouteVariety(category) {
  return !EXCLUDED_VARIETY_CATEGORIES.has(category);
}
