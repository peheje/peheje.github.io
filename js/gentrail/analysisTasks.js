import { repetitionMetrics } from "./geo.js";
import { DefaultRouteScorer } from "./scoring/scoreRoute.js";
import { buildSpatialIndex } from "./scoring/featureAnalysis.js";
import {
  routesExactlyMatch,
  selectDistinctScoredRoutes,
} from "./routeSelection.js";
import { routesAreTooSimilar } from "./routeDiversity.js";
import { isSimilarToAcceptedRoute } from "./routeAnalysisPolicy.js";

export function analyzeRoutes(request) {
  console.log(`[Worker] analyzeRoutes: starting analysis for ${request.routes.length} routes...`);
  const accepted = [];
  const fallback = [];
  const repetitionByRoute = {};
  let rejectedByDistance = 0;
  let rejectedByRepetition = 0;
  let rejectedAsDuplicate = 0;

  for (let idx = 0; idx < request.routes.length; idx++) {
    const route = request.routes[idx];
    const t0 = performance.now();
    const metrics = repetitionMetrics(route.geometry);
    repetitionByRoute[route.candidateId] = metrics;
    const dt = Math.round(performance.now() - t0);
    if (dt > 100) {
      console.warn(`[Worker] analyzeRoutes: repetitionMetrics for route ${idx} took ${dt}ms`);
    }

    if (
      route.distanceMeters < request.targetMeters * 0.45 ||
      route.distanceMeters > request.targetMeters * 1.75
    ) {
      rejectedByDistance += 1;
      fallback.push(route);
      continue;
    }
    if (metrics.repeatedEdgeRatio > request.repetitionLimit) {
      rejectedByRepetition += 1;
      fallback.push(route);
      continue;
    }

    if (request.filterSimilar !== false) {
      const tSim0 = performance.now();
      const isDuplicate = isSimilarToAcceptedRoute(
        route,
        request.existingRoutes,
        accepted,
        request.filterSimilar,
        (existing, candidate) =>
          routesExactlyMatch(existing, candidate) ||
          routesAreTooSimilar(existing, candidate),
      );
      const dtSim = Math.round(performance.now() - tSim0);
      if (dtSim > 100) {
        console.warn(`[Worker] analyzeRoutes: route diversity check for route ${idx} took ${dtSim}ms`);
      }

      if (isDuplicate) {
        rejectedAsDuplicate += 1;
        fallback.push(route);
        continue;
      }
    }
    accepted.push(route);
  }

  console.log(`[Worker] analyzeRoutes: finished. Accepted: ${accepted.length}, Fallback: ${fallback.length}, Rejected distance: ${rejectedByDistance}, repetition: ${rejectedByRepetition}, duplicate: ${rejectedAsDuplicate}`);
  return {
    accepted,
    fallback,
    repetitionByRoute,
    rejectedByDistance,
    rejectedByRepetition,
    rejectedAsDuplicate,
  };
}

export async function scoreRoutes(request) {
  console.log(`[Worker] scoreRoutes: starting scoring for ${request.routes.length} routes...`);
  const scorer = new DefaultRouteScorer();
  
  const tIdx0 = performance.now();
  const spatialIndex = buildSpatialIndex(request.osmFeatures);
  console.log(`[Worker] scoreRoutes: spatial index built in ${Math.round(performance.now() - tIdx0)}ms`);

  const scored = [];
  for (let idx = 0; idx < request.routes.length; idx++) {
    const route = request.routes[idx];
    const tRoute0 = performance.now();
    const score = await scorer.score(route, {
      targetDistanceMeters: request.settings.targetDistanceKm * 1000,
      preferences: request.settings.preferences,
      osmFeatures: request.osmFeatures,
      featureDataAvailable: request.featureDataAvailable,
      repetitionMetrics: request.repetitionByRoute[route.candidateId],
      spatialIndex,
    });
    const dtRoute = Math.round(performance.now() - tRoute0);
    console.log(`[Worker] scoreRoutes: scored route ${idx + 1}/${request.routes.length} in ${dtRoute}ms (candidateId: ${route.candidateId})`);
    scored.push({ route, score });
  }

  scored.sort((first, second) => {
    const firstTier = rankingTier(
      first.score.components.repetitionPenalty.value,
      request.settings.preferences.avoidRepetitions,
    );
    const secondTier = rankingTier(
      second.score.components.repetitionPenalty.value,
      request.settings.preferences.avoidRepetitions,
    );
    return firstTier - secondTier || second.score.total - first.score.total;
  });

  const { selected, rejectedAsDuplicate } = selectDistinctScoredRoutes(
    scored,
    request.settings.candidateCount,
    routesAreTooSimilar,
  );
  console.log(`[Worker] scoreRoutes: finished. Selected: ${selected.length}, Rejected duplicate: ${rejectedAsDuplicate}`);
  return { selected, rejectedAsDuplicate };
}

function rankingTier(repetitionPenalty, avoidRepetitions) {
  return avoidRepetitions >= 7 && repetitionPenalty > 35 ? 1 : 0;
}
