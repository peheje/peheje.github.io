import { ROUTE_DIVERSITY_MINIMUM_DIFFERENT_FRACTION } from "./config.js";

const edgeCache = new WeakMap();

export function sharedRouteEdgeRatio(first, second) {
  const firstEdges = routeEdges(first);
  const secondEdges = routeEdges(second);
  if (!firstEdges.size || !secondEdges.size) return 0;

  let sharedMeters = 0;
  for (const [edge, firstMeters] of firstEdges) {
    const secondMeters = secondEdges.get(edge);
    if (secondMeters !== undefined) {
      sharedMeters += Math.min(firstMeters, secondMeters);
    }
  }

  const firstMeters = sum(firstEdges.values());
  const secondMeters = sum(secondEdges.values());
  return sharedMeters / Math.min(firstMeters, secondMeters);
}

export function routesAreTooSimilar(first, second) {
  const maximumSharedFraction =
    1 - ROUTE_DIVERSITY_MINIMUM_DIFFERENT_FRACTION;
  return sharedRouteEdgeRatio(first, second) > maximumSharedFraction + 1e-9;
}

function routeEdges(route) {
  const cached = edgeCache.get(route);
  if (cached) return cached;
  const positions = route.coordinates?.length
    ? route.coordinates
    : route.geometry?.geometry?.coordinates?.map(([lng, lat]) => ({ lat, lng })) ?? [];
  const nodes = route.nodePath?.length === positions.length
    ? route.nodePath.map(String)
    : positions.map(({ lat, lng }) => `${lat.toFixed(6)},${lng.toFixed(6)}`);
  const edges = new Map();

  for (let index = 1; index < nodes.length; index += 1) {
    const key = [nodes[index - 1], nodes[index]].sort().join("|");
    const meters = haversineMeters(positions[index - 1], positions[index]);
    edges.set(key, Math.max(edges.get(key) ?? 0, meters));
  }
  edgeCache.set(route, edges);
  return edges;
}

function haversineMeters(first, second) {
  const radians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = radians(second.lat - first.lat);
  const longitudeDelta = radians(second.lng - first.lng);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.lat)) *
      Math.cos(radians(second.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function sum(values) {
  let result = 0;
  for (const value of values) result += value;
  return result;
}
