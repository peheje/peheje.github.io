const RESTRICTED_ACCESS_VALUES = new Set([
  "no",
  "private",
  "destination",
  "customers",
  "delivery",
  "permit",
  "military",
  "agricultural",
  "forestry",
]);

const WALKABLE_FOOT_VALUES = new Set(["yes", "designated", "permissive"]);

function normalizedTag(tags, key) {
  const value = tags?.[key];
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isWalkable(tags) {
  if (["motorway", "motorway_link", "trunk", "trunk_link"].includes(normalizedTag(tags, "highway"))) {
    return false;
  }

  const foot = normalizedTag(tags, "foot");
  if (foot) {
    if (RESTRICTED_ACCESS_VALUES.has(foot) || foot === "use_sidepath") {
      return false;
    }
    if (WALKABLE_FOOT_VALUES.has(foot)) return true;
  }

  return !RESTRICTED_ACCESS_VALUES.has(normalizedTag(tags, "access"));
}

export function getPedestrianDirection(tags) {
  const direction = normalizedTag(tags, "oneway:foot");
  if (["yes", "1", "true"].includes(direction)) return "forward";
  if (["-1", "reverse"].includes(direction)) return "reverse";

  // Generic oneway normally regulates vehicle traffic. Pedestrians may use
  // both directions unless OSM explicitly provides an oneway:foot tag.
  return "both";
}

export function addWalkableWayToGraph(adjacency, nodeCoords, element, distanceBetween) {
  if (!element?.tags?.highway || !isWalkable(element.tags)) return;
  if (!element.nodes || !element.geometry || element.nodes.length < 2) return;

  const { highway, surface } = element.tags;
  const weight = routeWeight(highway, surface);
  const direction = getPedestrianDirection(element.tags);

  for (let index = 0; index < element.nodes.length; index += 1) {
    const coordinate = element.geometry[index];
    if (!coordinate) return;
    nodeCoords.set(element.nodes[index], {
      lat: coordinate.lat,
      lng: coordinate.lon,
    });
  }

  for (let index = 1; index < element.nodes.length; index += 1) {
    const u = element.nodes[index - 1];
    const v = element.nodes[index];
    const distance = distanceBetween(nodeCoords.get(u), nodeCoords.get(v));

    if (direction === "forward" || direction === "both") {
      addRoutingEdge(adjacency, u, v, distance, weight, highway, surface);
    }
    if (direction === "reverse" || direction === "both") {
      addRoutingEdge(adjacency, v, u, distance, weight, highway, surface);
    }
  }
}

function routeWeight(highway, surface) {
  if (["motorway", "trunk", "motorway_link", "trunk_link"].includes(highway)) {
    return 50;
  }
  if (["primary", "secondary", "primary_link", "secondary_link"].includes(highway)) {
    return 5;
  }
  if (["tertiary", "tertiary_link"].includes(highway)) return 3;
  if (["residential", "service", "unclassified", "living_street"].includes(highway)) {
    return 2;
  }
  if (["path", "footway", "track", "pedestrian", "steps"].includes(highway)) {
    return ["gravel", "ground", "dirt", "unpaved", "grass"].includes(surface)
      ? 0.8
      : 1;
  }
  return 1;
}

export function addRoutingEdge(adjacency, u, v, distance, weight, highway, surface) {
  if (!adjacency.has(u)) adjacency.set(u, new Map());
  const neighbors = adjacency.get(u);
  const cost = distance * weight;
  const existing = neighbors.get(v);
  if (!existing || cost < existing.cost) {
    neighbors.set(v, { distance, weight, cost, highway, surface });
  }
}
