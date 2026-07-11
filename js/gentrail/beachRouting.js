import { stitchClosedRings } from "./osmGeometry.js";
import {
  addRoutingEdge,
  isWalkable,
} from "./routingGraph.js";

const MAX_BEACH_SEGMENT_METERS = 40;
const MAX_ACCESS_DISTANCE_METERS = 35;
const MINIMUM_ACCESS_SPAN_METERS = 80;

export function addBeachWalkingToGraph(
  adjacency,
  nodeCoords,
  elements,
  distanceBetween,
) {
  const networkNodes = [...nodeCoords.entries()];
  let beachCorridorCount = 0;
  let connectorCount = 0;

  for (const element of elements) {
    if (element.tags?.natural !== "beach" || !isWalkable(element.tags)) continue;
    const rings = beachOuterRings(element);
    for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
      const points = densifyRing(rings[ringIndex], distanceBetween);
      if (points.length < 3) continue;

      const bounds = coordinateBounds(points);
      const connections = nearestNetworkConnections(
        networkNodes,
        points,
        bounds,
        distanceBetween,
      );
      if (!hasUsefulAccessSpan(connections, points, distanceBetween)) continue;

      const nodeIds = points.map(beachNodeId);
      for (let index = 0; index < points.length; index += 1) {
        nodeCoords.set(nodeIds[index], points[index]);
      }
      for (let index = 0; index < points.length; index += 1) {
        const next = (index + 1) % points.length;
        if (nodeIds[index] === nodeIds[next]) continue;
        const distance = distanceBetween(points[index], points[next]);
        addBeachEdge(adjacency, nodeIds[index], nodeIds[next], distance);
        addBeachEdge(adjacency, nodeIds[next], nodeIds[index], distance);
      }
      for (const connection of connections) {
        const beachNode = nodeIds[connection.beachIndex];
        addBeachEdge(
          adjacency,
          connection.networkNode,
          beachNode,
          connection.distance,
        );
        addBeachEdge(
          adjacency,
          beachNode,
          connection.networkNode,
          connection.distance,
        );
      }
      beachCorridorCount += 1;
      connectorCount += connections.length;
    }
  }

  return { beachCorridorCount, connectorCount };
}

function beachOuterRings(element) {
  if (element.type === "way") {
    const coordinates = geometryToCoordinates(element.geometry);
    return isClosed(coordinates) ? [coordinates] : [];
  }
  if (element.type !== "relation") return [];
  const paths = (element.members ?? [])
    .filter((member) => member.type === "way" && member.role !== "inner")
    .map((member) => geometryToCoordinates(member.geometry))
    .filter((coordinates) => coordinates.length >= 2);
  return stitchClosedRings(
    paths.map((path) => path.map(({ lng, lat }) => [lng, lat])),
  ).map((ring) => ring.map(([lng, lat]) => ({ lat, lng })));
}

function geometryToCoordinates(geometry) {
  return (geometry ?? []).map(({ lat, lon }) => ({ lat, lng: lon }));
}

function densifyRing(ring, distanceBetween) {
  const coordinates = isClosed(ring) ? ring.slice(0, -1) : ring;
  const result = [];
  for (let index = 0; index < coordinates.length; index += 1) {
    const from = coordinates[index];
    const to = coordinates[(index + 1) % coordinates.length];
    const steps = Math.max(
      1,
      Math.ceil(distanceBetween(from, to) / MAX_BEACH_SEGMENT_METERS),
    );
    for (let step = 0; step < steps; step += 1) {
      const fraction = step / steps;
      result.push({
        lat: from.lat + (to.lat - from.lat) * fraction,
        lng: from.lng + (to.lng - from.lng) * fraction,
      });
    }
  }
  return result;
}

function nearestNetworkConnections(
  networkNodes,
  beachPoints,
  bounds,
  distanceBetween,
) {
  const latitudePadding = MAX_ACCESS_DISTANCE_METERS / 110574;
  const longitudePadding =
    MAX_ACCESS_DISTANCE_METERS /
    (111320 * Math.max(Math.cos((bounds.centerLat * Math.PI) / 180), 0.2));
  const bestByBeachIndex = new Map();

  for (const [networkNode, coordinate] of networkNodes) {
    if (
      coordinate.lat < bounds.minLat - latitudePadding ||
      coordinate.lat > bounds.maxLat + latitudePadding ||
      coordinate.lng < bounds.minLng - longitudePadding ||
      coordinate.lng > bounds.maxLng + longitudePadding
    ) {
      continue;
    }

    let beachIndex = -1;
    let distance = Infinity;
    for (let index = 0; index < beachPoints.length; index += 1) {
      const candidateDistance = distanceBetween(coordinate, beachPoints[index]);
      if (candidateDistance < distance) {
        beachIndex = index;
        distance = candidateDistance;
      }
    }
    if (distance > MAX_ACCESS_DISTANCE_METERS) continue;
    const existing = bestByBeachIndex.get(beachIndex);
    if (!existing || distance < existing.distance) {
      bestByBeachIndex.set(beachIndex, { networkNode, beachIndex, distance });
    }
  }
  return [...bestByBeachIndex.values()];
}

function hasUsefulAccessSpan(connections, beachPoints, distanceBetween) {
  for (let first = 0; first < connections.length; first += 1) {
    for (let second = first + 1; second < connections.length; second += 1) {
      if (
        distanceBetween(
          beachPoints[connections[first].beachIndex],
          beachPoints[connections[second].beachIndex],
        ) >= MINIMUM_ACCESS_SPAN_METERS
      ) {
        return true;
      }
    }
  }
  return false;
}

function coordinateBounds(points) {
  const latitudes = points.map(({ lat }) => lat);
  const longitudes = points.map(({ lng }) => lng);
  return {
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
    minLng: Math.min(...longitudes),
    maxLng: Math.max(...longitudes),
    centerLat: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  };
}

function isClosed(coordinates) {
  if (coordinates.length < 4) return false;
  const first = coordinates[0];
  const last = coordinates.at(-1);
  return first.lat === last.lat && first.lng === last.lng;
}

function addBeachEdge(adjacency, from, to, distance) {
  addRoutingEdge(adjacency, from, to, distance, 0.8, "beach", "sand");
}

function beachNodeId({ lat, lng }) {
  return `beach:${lat.toFixed(7)}:${lng.toFixed(7)}`;
}
