import {
  maximumRepeatedRatio,
  usesStrictRepetitionFiltering,
} from "./repetitionPolicy.js";
import { destinationPoint, lineFromLatLng } from "./geo.js";
import { fetchOsmFeatures } from "./overpass.js";
import { AnalysisWorkerClient } from "./AnalysisWorkerClient.js";

const ROUTE_COLORS = ["#ef6c3e", "#35a878", "#4c7fe8", "#b66de0", "#e5aa2f"];

export async function generateHikes(
  settings,
  routingProvider,
  onProgress,
  signal,
) {
  const worker = new AnalysisWorkerClient();
  const abortWorker = () => worker.terminate();
  signal?.addEventListener("abort", abortWorker, { once: true });
  try {
    return await generateHikesWithWorker(
      settings,
      routingProvider,
      worker,
      onProgress,
      signal,
    );
  } finally {
    signal?.removeEventListener("abort", abortWorker);
    worker.terminate("Generation finished");
  }
}

async function generateHikesWithWorker(
  settings,
  routingProvider,
  worker,
  onProgress,
  signal,
) {
  const startedAt = performance.now();
  const elapsed = () => ((performance.now() - startedAt) / 1000).toFixed(1);
  const targetMeters = settings.targetDistanceKm * 1000;
  const strictRepetitionFiltering = usesStrictRepetitionFiltering(
    settings.preferences.avoidRepetitions,
  );
  const targetPoolSize = strictRepetitionFiltering
    ? settings.candidateCount + 2
    : settings.candidateCount;
  const repetitionLimit = maximumRepeatedRatio(
    settings.preferences.avoidRepetitions,
  );

  const start = settings.start;
  // Bounding box centered on the start point with padding covering target distance
  const searchRadius = Math.max(1000, targetMeters * 0.45);
  const latPadding = searchRadius / 111320;
  const lngPadding = searchRadius / (111320 * Math.cos((start.lat * Math.PI) / 180));
  const bbox = [
    start.lng - lngPadding,
    start.lat - latPadding,
    start.lng + lngPadding,
    start.lat + latPadding,
  ];

  onProgress?.("Fetching local map network from OpenStreetMap...");
  let osmResult;
  try {
    osmResult = await fetchOsmFeatures(bbox, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(`Failed to fetch map data from OpenStreetMap Overpass API: ${error.message}`, { cause: error });
  }

  const osmFeatures = osmResult.features;
  const elements = osmResult.raw.elements ?? [];

  onProgress?.("Building trail network graph...");
  const adjacency = new Map();
  const nodeCoords = new Map();

  for (const el of elements) {
    if (el.type !== "way" || !el.tags || !el.tags.highway) continue;
    const nodes = el.nodes;
    const geometry = el.geometry;
    if (!nodes || !geometry || nodes.length < 2) continue;

    const highway = el.tags.highway;
    const surface = el.tags.surface;

    // Weight selection based on walkable types
    let weight = 1.0;
    if (["motorway", "trunk", "motorway_link", "trunk_link"].includes(highway)) {
      weight = 50.0;
    } else if (["primary", "secondary", "primary_link", "secondary_link"].includes(highway)) {
      weight = 5.0;
    } else if (["tertiary", "tertiary_link"].includes(highway)) {
      weight = 3.0;
    } else if (["residential", "service", "unclassified", "living_street"].includes(highway)) {
      weight = 2.0;
    } else if (["path", "footway", "track", "pedestrian", "steps"].includes(highway)) {
      weight = 1.0;
      if (["gravel", "ground", "dirt", "unpaved", "grass"].includes(surface)) {
        weight = 0.8;
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      nodeCoords.set(nodes[i], { lat: geometry[i].lat, lng: geometry[i].lon });
    }

    for (let i = 1; i < nodes.length; i++) {
      const u = nodes[i - 1];
      const v = nodes[i];
      const coordU = nodeCoords.get(u);
      const coordV = nodeCoords.get(v);
      const dist = haversineDistance(coordU, coordV);

      addEdge(adjacency, u, v, dist, weight, highway, surface);
      addEdge(adjacency, v, u, dist, weight, highway, surface);
    }
  }

  if (nodeCoords.size === 0) {
    throw new Error("No streets or trails found in this area. Please select another trailhead.");
  }

  const prunedAdjacency = pruneDeadEnds(adjacency);
  const prunedNodeCoords = new Map();
  for (const nodeId of prunedAdjacency.keys()) {
    const coords = nodeCoords.get(nodeId);
    if (coords) {
      prunedNodeCoords.set(nodeId, coords);
    }
  }

  const snapGraph = prunedNodeCoords.size > 0 ? prunedNodeCoords : nodeCoords;
  const snapAdjacency = prunedNodeCoords.size > 0 ? prunedAdjacency : adjacency;

  const startNodeId = snapToNearestNode(nodeCoords, start, adjacency);

  const reachableAdjacency = getReachableSubGraph(snapAdjacency, startNodeId);
  const reachableNodeCoords = new Map();
  for (const nodeId of reachableAdjacency.keys()) {
    const coords = nodeCoords.get(nodeId);
    if (coords) {
      reachableNodeCoords.set(nodeId, coords);
    }
  }

  const finalSnapGraph = reachableNodeCoords.size > 0 ? reachableNodeCoords : snapGraph;
  const finalSnapAdjacency = reachableAdjacency.size > 0 ? reachableAdjacency : snapAdjacency;

  // Define 8 directions around the compass
  const directions = [0, 45, 90, 135, 180, 225, 270, 315];
  const candidateRoutes = [];

  // Radius for check points (triangle loop: Start -> C1 -> C2 -> Start)
  // We divide by 3.8 instead of 3.0 to account for network tortuosity (winding path factor ~1.26)
  const baseR = targetMeters / 3.8;

  const totalInitial = directions.length * 3;
  let count = 0;

  const initialRoutingStartedAt = performance.now();
  for (const dir of directions) {
    // Generate 3 loops in each direction with a wider range of sizes (0.7 to 1.4 target size)
    const iterations = [
      { rMult: 0.7, spread: 45 },
      { rMult: 1.0, spread: 30 },
      { rMult: 1.4, spread: 20 }
    ];

    for (let iter = 0; iter < iterations.length; iter++) {
      signal?.throwIfAborted();
      count++;
      onProgress?.(`Routing initial candidate ${count}/${totalInitial}... (${elapsed()}s)`);

      const { rMult, spread } = iterations[iter];
      const R = baseR * rMult;

      const c1 = destinationPoint(start, R, dir - spread);
      const c2 = destinationPoint(start, R, dir + spread);

      const route = routeLoop(startNodeId, c1, c2, finalSnapGraph, finalSnapAdjacency, nodeCoords, adjacency, settings.preferences);
      if (route) {
        candidateRoutes.push({
          ...route,
          candidateId: `candidate-${dir}-${iter}-${Date.now()}`,
          c1,
          c2
        });
      }
    }
  }
  const initialRoutingElapsedMs = Math.round(performance.now() - initialRoutingStartedAt);

  if (candidateRoutes.length === 0) {
    throw new Error("Could not find any traversable loops. Try moving the starting point closer to roads/trails.");
  }

  onProgress?.(`Pruning and scoring initial candidates... (${elapsed()}s)`);
  const initialAnalysis = await worker.analyzeRoutes({
    routes: candidateRoutes,
    existingRoutes: [],
    targetMeters,
    repetitionLimit,
  });

  const initialPool = [...initialAnalysis.accepted, ...initialAnalysis.fallback];
  const scoredInitial = await worker.scoreRoutes({
    routes: initialPool,
    osmFeatures,
    featureDataAvailable: true,
    settings,
    repetitionByRoute: initialAnalysis.repetitionByRoute,
  });

  // Sort initial candidates by score descending
  const sortedInitial = scoredInitial.selected.sort((a, b) => b.score.total - a.score.total);
  
  // Evolve top 4 seeds
  const topSeeds = sortedInitial.slice(0, 4);
  const evolvedCandidates = [];

  const totalEvolved = topSeeds.length * 2 + (topSeeds.length * (topSeeds.length - 1));
  let evCount = 0;

  const evolvedRoutingStartedAt = performance.now();
  for (let i = 0; i < topSeeds.length; i++) {
    const seed = topSeeds[i].route;
    if (!seed.c1 || !seed.c2) continue;

    // Mutation: generate 2 mutated variations for each seed
    for (let m = 0; m < 2; m++) {
      signal?.throwIfAborted();
      evCount++;
      onProgress?.(`Evolving candidate ${evCount}/${totalEvolved}... (${elapsed()}s)`);

      const mutC1 = mutatePoint(seed.c1, 250);
      const mutC2 = mutatePoint(seed.c2, 250);
      const route = routeLoop(startNodeId, mutC1, mutC2, finalSnapGraph, finalSnapAdjacency, nodeCoords, adjacency, settings.preferences);
      if (route) {
        evolvedCandidates.push({
          ...route,
          candidateId: `evolved-mut-${i}-${m}-${Date.now()}`,
          c1: mutC1,
          c2: mutC2
        });
      }
    }

    // Crossover: pair with other seeds using Intersection Crossover
    for (let j = i + 1; j < topSeeds.length; j++) {
      const partner = topSeeds[j].route;
      if (!partner.c1 || !partner.c2) continue;

      signal?.throwIfAborted();
      
      const intersectionOffspring = performIntersectionCrossover(
        seed,
        partner,
        finalSnapAdjacency,
        nodeCoords,
        startNodeId
      );

      if (intersectionOffspring.length > 0) {
        intersectionOffspring.forEach((crossRoute, idx) => {
          evCount++;
          onProgress?.(`Evolving candidate (intersection) ${evCount}... (${elapsed()}s)`);
          evolvedCandidates.push({
            ...crossRoute,
            candidateId: `evolved-cross-intersection-${i}-${j}-${idx}-${Date.now()}`,
            c1: seed.c1,
            c2: partner.c2
          });
        });
      } else {
        // Fallback to geometry-based crossover if no intersection found
        // Crossover 1: seed C1 + partner C2
        evCount++;
        onProgress?.(`Evolving candidate (geom fallback 1) ${evCount}... (${elapsed()}s)`);

        const crossRoute1 = routeLoop(startNodeId, seed.c1, partner.c2, finalSnapGraph, finalSnapAdjacency, nodeCoords, adjacency, settings.preferences);
        if (crossRoute1) {
          evolvedCandidates.push({
            ...crossRoute1,
            candidateId: `evolved-cross1-fallback-${i}-${j}-${Date.now()}`,
            c1: seed.c1,
            c2: partner.c2
          });
        }

        // Crossover 2: partner C1 + seed C2
        evCount++;
        onProgress?.(`Evolving candidate (geom fallback 2) ${evCount}... (${elapsed()}s)`);

        const crossRoute2 = routeLoop(startNodeId, partner.c1, seed.c2, finalSnapGraph, finalSnapAdjacency, nodeCoords, adjacency, settings.preferences);
        if (crossRoute2) {
          evolvedCandidates.push({
            ...crossRoute2,
            candidateId: `evolved-cross2-fallback-${i}-${j}-${Date.now()}`,
            c1: partner.c1,
            c2: seed.c2
          });
        }
      }
    }
  }
  const evolvedRoutingElapsedMs = Math.round(performance.now() - evolvedRoutingStartedAt);

  // Combine and run final selection
  const allCandidates = [...candidateRoutes, ...evolvedCandidates];

  onProgress?.(`Filtering and scoring final loops... (${elapsed()}s)`);
  const finalAnalysis = await worker.analyzeRoutes({
    routes: allCandidates,
    existingRoutes: [],
    targetMeters,
    repetitionLimit,
  });

  const acceptedRoutes = finalAnalysis.accepted;
  const fallbackRoutes = finalAnalysis.fallback;
  const repetitionByRoute = finalAnalysis.repetitionByRoute;

  const usableRoutes = [...acceptedRoutes];
  if (usableRoutes.length < targetPoolSize) {
    const remainingCount = targetPoolSize - usableRoutes.length;
    const sortedFallbacks = fallbackRoutes
      .filter(r => !usableRoutes.some(ur => ur.candidateId === r.candidateId))
      .sort((first, second) => {
        const distErr1 = Math.abs(first.distanceMeters - targetMeters) / targetMeters;
        const distErr2 = Math.abs(second.distanceMeters - targetMeters) / targetMeters;
        const rep1 = repetitionByRoute[first.candidateId]?.repeatedEdgeRatio ?? 0;
        const rep2 = repetitionByRoute[second.candidateId]?.repeatedEdgeRatio ?? 0;
        const score1 = distErr1 + rep1 * 1.5;
        const score2 = distErr2 + rep2 * 1.5;
        return score1 - score2;
      });
    usableRoutes.push(...sortedFallbacks.slice(0, remainingCount));
  }

  const scored = await worker.scoreRoutes({
    routes: usableRoutes,
    osmFeatures,
    featureDataAvailable: true,
    settings,
    repetitionByRoute,
  });

  let rejectedByDistance = finalAnalysis.rejectedByDistance;
  let rejectedByRepetition = finalAnalysis.rejectedByRepetition;
  let rejectedAsDuplicate = finalAnalysis.rejectedAsDuplicate + scored.rejectedAsDuplicate;

  return {
    routes: scored.selected.map((item, index) => ({
      ...item,
      color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    })),
    debug: {
      attempted: allCandidates.length,
      routed: allCandidates.length,
      rejectedByDistance,
      rejectedByRepetition,
      rejectedAsDuplicate,
      searchBatches: 1,
      cleanCandidateCount: acceptedRoutes.length,
      searchExhausted: true,
      overpassFeatureCount: osmFeatures.length,
      overpassError: null,
      routingErrors: [],
      initialRoutingElapsedMs,
      evolvedRoutingElapsedMs,
      routingElapsedMs: Math.round(performance.now() - startedAt),
      overpassElapsedMs: 0,
      scoringElapsedMs: Math.round(performance.now() - startedAt),
      elapsedMs: Math.round(performance.now() - startedAt),
    },
  };
}

function addEdge(adjacency, u, v, distance, weight, highway, surface) {
  if (!adjacency.has(u)) {
    adjacency.set(u, new Map());
  }
  const neighbors = adjacency.get(u);
  const cost = distance * weight;
  const existing = neighbors.get(v);
  if (!existing || cost < existing.cost) {
    neighbors.set(v, { distance, weight, cost, highway, surface });
  }
}

function snapToNearestNode(nodeCoords, targetCoords, adjacency) {
  let nearestNodeId = null;
  let minDistance = Infinity;

  // First pass: try to snap to nodes with degree >= 2 (junctions or continuous paths) to avoid dead-ends
  if (adjacency) {
    for (const [nodeId, coords] of nodeCoords.entries()) {
      const degree = adjacency.get(nodeId)?.size ?? 0;
      if (degree < 2) continue; // Skip dead-ends

      const dist = haversineDistance(coords, targetCoords);
      if (dist < minDistance) {
        minDistance = dist;
        nearestNodeId = nodeId;
      }
    }
  }

  // Second pass: if no junction node is close, fallback to absolute nearest node
  if (nearestNodeId === null) {
    minDistance = Infinity;
    for (const [nodeId, coords] of nodeCoords.entries()) {
      const dist = haversineDistance(coords, targetCoords);
      if (dist < minDistance) {
        minDistance = dist;
        nearestNodeId = nodeId;
      }
    }
  }

  return nearestNodeId;
}

function haversineDistance(p1, p2) {
  const R = 6371000; // Radius of the earth in m
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function runAStar(adjacency, nodeCoords, startNode, endNode, traversedEdges = null, repetitionPenalty = 50.0, preferences = null) {
  const openSet = new PriorityQueue();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  gScore.set(startNode, 0);
  fScore.set(startNode, haversineDistance(nodeCoords.get(startNode), nodeCoords.get(endNode)));
  openSet.enqueue(startNode, fScore.get(startNode));

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();
    if (current === endNode) {
      const path = [];
      let curr = current;
      while (curr !== undefined) {
        path.push(curr);
        curr = cameFrom.get(curr);
      }
      return path.reverse();
    }

    const neighbors = adjacency.get(current);
    if (!neighbors) continue;

    for (const [neighbor, edge] of neighbors.entries()) {
      let edgeCost = edge.cost;
      
      if (preferences) {
        let weight = 1.0;
        const highway = edge.highway || "";
        const surface = edge.surface || "";
        
        if (["motorway", "trunk", "motorway_link", "trunk_link"].includes(highway)) {
          weight = 50.0 + (preferences.avoidHighways ?? 10) * 10.0;
        } else if (["primary", "secondary", "primary_link", "secondary_link"].includes(highway)) {
          weight = 5.0 + (preferences.avoidRoads ?? 8) * 1.5;
        } else if (["tertiary", "tertiary_link", "residential", "service", "unclassified", "living_street"].includes(highway)) {
          const isUnpaved = ["gravel", "ground", "dirt", "unpaved", "grass", "sand", "woodchips", "bark"].includes(surface);
          if (isUnpaved) {
            weight = 1.0 - (preferences.trail ?? 8) * 0.05;
          } else {
            weight = 2.0 + (preferences.avoidMinorRoads ?? 3) * 0.8;
          }
        } else if (["path", "footway", "track", "pedestrian", "steps"].includes(highway)) {
          const isUnpaved = ["gravel", "ground", "dirt", "unpaved", "grass", "sand", "woodchips", "bark"].includes(surface);
          if (isUnpaved) {
            weight = 0.8 - (preferences.trail ?? 8) * 0.05;
          } else {
            weight = 1.0 - (preferences.trail ?? 8) * 0.03;
          }
        }
        
        weight = Math.max(0.1, weight);
        edgeCost = edge.distance * weight;
      }

      if (traversedEdges) {
        const edgeKey1 = `${current}-${neighbor}`;
        const edgeKey2 = `${neighbor}-${current}`;
        if (traversedEdges.has(edgeKey1) || traversedEdges.has(edgeKey2)) {
          edgeCost += edge.distance * repetitionPenalty;
        }
      }

      const tentativeGScore = gScore.get(current) + edgeCost;
      if (!gScore.has(neighbor) || tentativeGScore < gScore.get(neighbor)) {
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentativeGScore);
        const h = haversineDistance(nodeCoords.get(neighbor), nodeCoords.get(endNode));
        fScore.set(neighbor, tentativeGScore + h);
        if (!openSet.contains(neighbor)) {
          openSet.enqueue(neighbor, fScore.get(neighbor));
        }
      }
    }
  }
  return null;
}

function pruneDeadEnds(adjacency) {
  const pruned = new Map();
  for (const [u, neighbors] of adjacency.entries()) {
    pruned.set(u, new Map(neighbors));
  }

  const queue = [];
  for (const [u, neighbors] of pruned.entries()) {
    if (neighbors.size <= 1) {
      queue.push(u);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    const neighbors = pruned.get(u);
    if (!neighbors) continue;

    for (const v of neighbors.keys()) {
      const neighborMap = pruned.get(v);
      if (neighborMap) {
        neighborMap.delete(u);
        if (neighborMap.size <= 1) {
          queue.push(v);
        }
      }
    }
    pruned.delete(u);
  }

  return pruned;
}

class PriorityQueue {
  constructor() {
    this.elements = [];
    this.elementSet = new Set();
  }
  enqueue(element, priority) {
    this.elementSet.add(element);
    const item = { element, priority };
    let low = 0;
    let high = this.elements.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.elements[mid].priority < priority) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    this.elements.splice(low, 0, item);
  }
  dequeue() {
    const item = this.elements.shift();
    if (item) {
      this.elementSet.delete(item.element);
      return item.element;
    }
    return null;
  }
  isEmpty() {
    return this.elements.length === 0;
  }
  contains(element) {
    return this.elementSet.has(element);
  }
}

function mutatePoint(point, maxOffsetMeters) {
  const distance = Math.random() * maxOffsetMeters;
  const bearing = Math.random() * 360;
  return destinationPoint(point, distance, bearing);
}

function routeLoop(startNodeId, c1, c2, snapGraph, snapAdjacency, nodeCoords, adjacency, preferences) {
  const n1 = snapToNearestNode(snapGraph, c1, snapAdjacency);
  const n2 = snapToNearestNode(snapGraph, c2, snapAdjacency);

  if (!n1 || !n2 || n1 === startNodeId || n2 === startNodeId || n1 === n2) {
    return null;
  }

  const p1 = runAStar(adjacency, nodeCoords, startNodeId, n1, null, 50.0, preferences);
  if (!p1) return null;

  const traversedEdges = new Set();
  for (let i = 1; i < p1.length; i++) {
    traversedEdges.add(`${p1[i-1]}-${p1[i]}`);
    traversedEdges.add(`${p1[i]}-${p1[i-1]}`);
  }

  const p2 = runAStar(adjacency, nodeCoords, n1, n2, traversedEdges, 50.0, preferences);
  if (!p2) return null;

  for (let i = 1; i < p2.length; i++) {
    traversedEdges.add(`${p2[i-1]}-${p2[i]}`);
    traversedEdges.add(`${p2[i]}-${p2[i-1]}`);
  }

  const p3 = runAStar(adjacency, nodeCoords, n2, startNodeId, traversedEdges, 50.0, preferences);
  if (!p3) return null;

  const nodePath = [...p1, ...p2.slice(1), ...p3.slice(1)];
  return buildRouteFromNodePath(nodePath, adjacency, nodeCoords);
}

function buildRouteFromNodePath(nodePath, adjacency, nodeCoords) {
  const coords = nodePath.map((id) => nodeCoords.get(id));

  let distanceMeters = 0;
  const surfaceMeters = {};
  const wayTypeMeters = {};

  for (let i = 1; i < nodePath.length; i++) {
    const u = nodePath[i - 1];
    const v = nodePath[i];
    const dist = haversineDistance(nodeCoords.get(u), nodeCoords.get(v));
    distanceMeters += dist;

    const edge = adjacency.get(u)?.get(v);
    if (edge) {
      const highway = edge.highway || "unknown";
      const surface = edge.surface || "unknown";
      wayTypeMeters[highway] = (wayTypeMeters[highway] ?? 0) + dist;
      surfaceMeters[surface] = (surfaceMeters[surface] ?? 0) + dist;
    }
  }

  const durationSeconds = distanceMeters / 1.25;
  const geometry = lineFromLatLng(coords);

  return {
    nodePath,
    coordinates: coords,
    geometry,
    distanceMeters,
    durationSeconds,
    metadata: {
      surfaceMeters,
      wayTypeMeters,
      ascentMeters: null,
      descentMeters: null
    }
  };
}

function performIntersectionCrossover(routeA, routeB, adjacency, nodeCoords, startNodeId) {
  if (!routeA.nodePath || !routeB.nodePath) return [];

  const pathA = routeA.nodePath;
  const pathB = routeB.nodePath;

  // Find all shared nodes, excluding the trailhead
  const setA = new Set(pathA);
  const sharedNodes = [];
  
  for (let idxB = 0; idxB < pathB.length; idxB++) {
    const node = pathB[idxB];
    if (node !== startNodeId && setA.has(node)) {
      const idxA = pathA.indexOf(node);
      // Ensure the node occurs at valid positions in both (excluding the very ends)
      if (idxA > 0 && idxA < pathA.length - 1 && idxB > 0 && idxB < pathB.length - 1) {
        sharedNodes.push({ node, idxA, idxB });
      }
    }
  }

  if (sharedNodes.length === 0) return [];

  // Sort by proximity to midpoints of both paths
  sharedNodes.sort((x, y) => {
    const midA = pathA.length / 2;
    const midB = pathB.length / 2;
    const distX = Math.abs(x.idxA - midA) + Math.abs(x.idxB - midB);
    const distY = Math.abs(y.idxA - midA) + Math.abs(y.idxB - midB);
    return distX - distY;
  });

  const offspring = [];
  // Use the best 2 intersection points to avoid generating too many similar routes
  const pointsToUse = sharedNodes.slice(0, 2);

  for (const { idxA, idxB } of pointsToUse) {
    // Child 1: Route A first half + Route B second half
    const pathChild1 = [...pathA.slice(0, idxA), ...pathB.slice(idxB)];
    // Child 2: Route B first half + Route A second half
    const pathChild2 = [...pathB.slice(0, idxB), ...pathA.slice(idxA)];

    const r1 = buildRouteFromNodePath(pathChild1, adjacency, nodeCoords);
    const r2 = buildRouteFromNodePath(pathChild2, adjacency, nodeCoords);

    if (r1 && r1.distanceMeters > 0) offspring.push(r1);
    if (r2 && r2.distanceMeters > 0) offspring.push(r2);
  }

  return offspring;
}

function getReachableSubGraph(adjacency, startNodeId) {
  const reachable = new Set();
  const queue = [startNodeId];
  reachable.add(startNodeId);

  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    const neighbors = adjacency.get(u);
    if (!neighbors) continue;
    for (const v of neighbors.keys()) {
      if (!reachable.has(v)) {
        reachable.add(v);
        queue.push(v);
      }
    }
  }

  const subGraph = new Map();
  for (const nodeId of reachable) {
    const neighbors = adjacency.get(nodeId);
    if (neighbors) {
      subGraph.set(nodeId, new Map(neighbors));
    }
  }
  return subGraph;
}
