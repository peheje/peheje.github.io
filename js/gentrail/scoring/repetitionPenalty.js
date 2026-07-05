import { repetitionMetrics } from "../geo.js";

export function scoreRepetitionPenalty(route, precomputedMetrics) {
  const metrics = precomputedMetrics ?? repetitionMetrics(route.geometry);
  const value = Math.min(
    100,
    Math.round((metrics.repeatedEdgeRatio / 0.45) * 100),
  );
  return {
    value,
    weightedPoints: 0,
    explanation: `${Math.round(metrics.repeatedEdgeRatio * 100)}% repetition beyond the trailhead stem (${Math.round(metrics.repeatedMeters)} m penalized; ${Math.round(metrics.toleratedTrailheadStemMeters)} m near start tolerated).`,
  };
}
