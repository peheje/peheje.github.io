import {
  maximumRepeatedRatio,
  usesStrictRepetitionFiltering,
} from "./repetitionPolicy.js";
import { destinationPoint, lineFromLatLng } from "./geo.js";
import { fetchOsmFeatures } from "./overpass.js";
import { AnalysisWorkerClient } from "./AnalysisWorkerClient.js";
import { addWalkableWayToGraph } from "./routingGraph.js";
import { haversineDistance, runAStar } from "./pathfinding.js";
import { buildIntersectionCrossoverPaths } from "./crossover.js";
import { pruneDeadEnds } from "./graphPruning.js";
import { addBeachWalkingToGraph } from "./beachRouting.js";
import { removeImmediateBacktracks } from "./pathCleanup.js";
import { findNearestRoutingNode } from "./routingSnap.js";
import { yieldToBrowser } from "./cooperativeYield.js";

const ROUTE_COLORS = ["#ef6c3e", "#35a878", "#4c7fe8", "#b66de0", "#e5aa2f"];

export async function generateHikes(
  settings,
  onProgress,
  signal,
) {
  const worker = new AnalysisWorkerClient();
  const abortWorker = () => worker.terminate();
  signal?.addEventListener("abort", abortWorker, { once: true });
  try {
    return await generateHikesWithWorker(
      settings,
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
  worker,
  onProgress,
  signal,
) {
  const startedAt = performance.now();
  const elapsed = () => ((performance.now() - startedAt) / 1000).toFixed(1);
  const reportProgress = (status, percent, phase) => {
    onProgress?.(status, {
      percent: Math.max(0, Math.min(100, Math.round(percent))),
      phase,
    });
  };
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
  const lngPadding =
    searchRadius /
    (111320 * Math.max(Math.cos((start.lat * Math.PI) / 180), 0.2));
  const bbox = [
    start.lng - lngPadding,
    start.lat - latPadding,
    start.lng + lngPadding,
    start.lat + latPadding,
  ];

  reportProgress("Fetching local map network from OpenStreetMap...", 4, "fetch");
  const overpassStartedAt = performance.now();
  let osmResult;
  try {
    osmResult = await fetchOsmFeatures(bbox, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(`Failed to fetch map data from OpenStreetMap Overpass API: ${error.message}`, { cause: error });
  }
  const overpassElapsedMs = Math.round(performance.now() - overpassStartedAt);

  const osmFeatures = osmResult.features;
  const elements = osmResult.raw.elements ?? [];

  reportProgress("Building trail network graph...", 12, "graph");
  const graphBuildStartedAt = performance.now();
  const adjacency = new Map();
  const nodeCoords = new Map();

  for (let elementIndex = 0; elementIndex < elements.length; elementIndex += 1) {
    const el = elements[elementIndex];
    if (el.type === "way") {
      addWalkableWayToGraph(adjacency, nodeCoords, el, haversineDistance);
    }
    if (elementIndex > 0 && elementIndex % 250 === 0) {
      reportProgress(
        `Building trail network graph... ${elementIndex}/${elements.length}`,
        12 + (elementIndex / Math.max(elements.length, 1)) * 13,
        "graph",
      );
      await yieldToBrowser(signal);
    }
  }
  const beachRouting = settings.preferences.beachWalking
    ? addBeachWalkingToGraph(
        adjacency,
        nodeCoords,
        elements,
        haversineDistance,
      )
    : { beachCorridorCount: 0, connectorCount: 0 };
  await yieldToBrowser(signal);

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

  const startSnap = findNearestRoutingNode(
    nodeCoords,
    start,
    adjacency,
    haversineDistance,
  );
  const startNodeId = startSnap?.nodeId;
  if (startNodeId === undefined || startNodeId === null) {
    throw new Error("Could not find a walkable path near this trailhead.");
  }

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
  const graphBuildElapsedMs = Math.round(performance.now() - graphBuildStartedAt);

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
      reportProgress(
        `Routing initial candidate ${count}/${totalInitial}... (${elapsed()}s)`,
        27 + ((count - 1) / totalInitial) * 28,
        "routing",
      );
      await yieldToBrowser(signal);

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

  reportProgress(`Analyzing initial candidates... (${elapsed()}s)`, 55, "analysis");
  const initialAnalysisStartedAt = performance.now();
  const initialAnalysis = await worker.analyzeRoutes({
    routes: candidateRoutes,
    existingRoutes: [],
    targetMeters,
    repetitionLimit,
  }, ({ completed, total }) => {
    reportProgress(
      `Analyzing initial candidates ${completed}/${total}... (${elapsed()}s)`,
      55 + (completed / Math.max(total, 1)) * 5,
      "analysis",
    );
  });
  let analysisElapsedMs = Math.round(performance.now() - initialAnalysisStartedAt);

  const initialPool = [...initialAnalysis.accepted, ...initialAnalysis.fallback];
  const initialScoringStartedAt = performance.now();
  const scoredInitial = await worker.scoreRoutes({
    routes: initialPool,
    osmFeatures,
    featureDataAvailable: true,
    settings,
    repetitionByRoute: initialAnalysis.repetitionByRoute,
  }, ({ completed, total }) => {
    reportProgress(
      `Scoring initial candidates ${completed}/${total}... (${elapsed()}s)`,
      60 + (completed / Math.max(total, 1)) * 10,
      "scoring",
    );
  });
  let scoringElapsedMs = Math.round(performance.now() - initialScoringStartedAt);

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
      reportProgress(
        `Evolving candidate ${evCount}/${totalEvolved}... (${elapsed()}s)`,
        70 + ((evCount - 1) / Math.max(totalEvolved, 1)) * 12,
        "evolution",
      );
      await yieldToBrowser(signal);

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
      await yieldToBrowser(signal);
      
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
          reportProgress(
            `Evolving candidate ${evCount}/${totalEvolved}... (${elapsed()}s)`,
            70 + (evCount / Math.max(totalEvolved, 1)) * 12,
            "evolution",
          );
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
        reportProgress(
          `Evolving candidate ${evCount}/${totalEvolved}... (${elapsed()}s)`,
          70 + (evCount / Math.max(totalEvolved, 1)) * 12,
          "evolution",
        );

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
        reportProgress(
          `Evolving candidate ${evCount}/${totalEvolved}... (${elapsed()}s)`,
          70 + (evCount / Math.max(totalEvolved, 1)) * 12,
          "evolution",
        );

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

  reportProgress(`Filtering final loops... (${elapsed()}s)`, 82, "analysis");
  const finalAnalysisStartedAt = performance.now();
  const finalAnalysis = await worker.analyzeRoutes({
    routes: allCandidates,
    existingRoutes: [],
    targetMeters,
    repetitionLimit,
    filterSimilar: false,
  }, ({ completed, total }) => {
    reportProgress(
      `Filtering final loops ${completed}/${total}... (${elapsed()}s)`,
      82 + (completed / Math.max(total, 1)) * 5,
      "analysis",
    );
  });
  analysisElapsedMs += Math.round(performance.now() - finalAnalysisStartedAt);

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

  const finalScoringStartedAt = performance.now();
  const scored = await worker.scoreRoutes({
    routes: usableRoutes,
    osmFeatures,
    featureDataAvailable: true,
    settings,
    repetitionByRoute,
  }, ({ completed, total }) => {
    reportProgress(
      `Scoring final loops ${completed}/${total}... (${elapsed()}s)`,
      87 + (completed / Math.max(total, 1)) * 11,
      "scoring",
    );
  });
  scoringElapsedMs += Math.round(performance.now() - finalScoringStartedAt);

  const rejectedByDistance = finalAnalysis.rejectedByDistance;
  const rejectedByRepetition = finalAnalysis.rejectedByRepetition;
  const rejectedAsDuplicate = finalAnalysis.rejectedAsDuplicate + scored.rejectedAsDuplicate;
  const acceptedRouteIds = new Set(acceptedRoutes.map(({ candidateId }) => candidateId));
  const fallbackSelectedCount = scored.selected.filter(
    ({ route }) => !acceptedRouteIds.has(route.candidateId),
  ).length;
  const elapsedMs = Math.round(performance.now() - startedAt);
  reportProgress("Finalizing route options...", 100, "complete");

  return {
    routes: scored.selected.map((item, index) => ({
      ...item,
      color: ROUTE_COLORS[index % ROUTE_COLORS.length],
    })),
    trailhead: {
      requested: { ...start },
      snapped: { ...startSnap.coordinate },
      snapDistanceMeters: startSnap.distanceMeters,
    },
    debug: {
      attempted: allCandidates.length,
      routed: allCandidates.length,
      rejectedByDistance,
      rejectedByRepetition,
      rejectedAsDuplicate,
      searchBatches: 1,
      cleanCandidateCount: acceptedRoutes.length,
      fallbackSelectedCount,
      searchExhausted: true,
      overpassFeatureCount: osmFeatures.length,
      overpassError: null,
      routingErrors: [],
      initialRoutingElapsedMs,
      evolvedRoutingElapsedMs,
      routingElapsedMs: initialRoutingElapsedMs + evolvedRoutingElapsedMs,
      overpassElapsedMs,
      graphBuildElapsedMs,
      beachCorridorCount: beachRouting.beachCorridorCount,
      beachConnectorCount: beachRouting.connectorCount,
      analysisElapsedMs,
      scoringElapsedMs,
      elapsedMs,
      requestedTrailhead: { ...start },
      snappedTrailhead: { ...startSnap.coordinate },
      trailheadSnapDistanceMeters: Math.round(startSnap.distanceMeters),
    },
  };
}

function snapToNearestNode(nodeCoords, targetCoords, adjacency) {
  return findNearestRoutingNode(
    nodeCoords,
    targetCoords,
    adjacency,
    haversineDistance,
  )?.nodeId ?? null;
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
  const cleanedNodePath = removeImmediateBacktracks(nodePath);
  if (cleanedNodePath.length < 2) return null;
  const coords = cleanedNodePath.map((id) => nodeCoords.get(id));
  if (coords.some((coordinate) => !coordinate)) return null;

  let distanceMeters = 0;
  const surfaceMeters = {};
  const wayTypeMeters = {};

  for (let i = 1; i < cleanedNodePath.length; i++) {
    const u = cleanedNodePath[i - 1];
    const v = cleanedNodePath[i];
    const dist = haversineDistance(nodeCoords.get(u), nodeCoords.get(v));
    distanceMeters += dist;

    const edge = adjacency.get(u)?.get(v);
    if (!edge) return null;
    const highway = edge.highway || "unknown";
    const surface = edge.surface || "unknown";
    wayTypeMeters[highway] = (wayTypeMeters[highway] ?? 0) + dist;
    surfaceMeters[surface] = (surfaceMeters[surface] ?? 0) + dist;
  }

  const durationSeconds = distanceMeters / 1.25;
  const geometry = lineFromLatLng(coords);

  return {
    nodePath: cleanedNodePath,
    coordinates: coords,
    geometry,
    distanceMeters,
    durationSeconds,
    metadata: {
      surfaceMeters,
      wayTypeMeters,
    }
  };
}

function performIntersectionCrossover(routeA, routeB, adjacency, nodeCoords, startNodeId) {
  if (!routeA.nodePath || !routeB.nodePath) return [];

  const offspring = [];
  const childPaths = buildIntersectionCrossoverPaths(
    routeA.nodePath,
    routeB.nodePath,
    startNodeId,
  );
  for (const childPath of childPaths) {
    const route = buildRouteFromNodePath(childPath, adjacency, nodeCoords);
    if (route?.distanceMeters > 0) offspring.push(route);
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
