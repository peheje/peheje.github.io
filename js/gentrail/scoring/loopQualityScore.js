import { routeShapeMetrics } from "../geo.js";

export function scoreLoopQuality(route) {
  const metrics = routeShapeMetrics(route.geometry);
  const value = Math.round(
    100 *
      (metrics.uniqueRatio * 0.5 +
        metrics.spreadRatio * 0.3 +
        metrics.directionalSeparation * 0.2),
  );
  return {
    value,
    weightedPoints: 0,
    explanation: `${Math.round(metrics.uniqueRatio * 100)}% unique sampled geometry; ${Math.round(metrics.spreadRatio * 100)}% spatial spread.`,
  };
}
