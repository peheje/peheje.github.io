import { routeCoverageNearCategory } from "./featureAnalysis.js";

export function scoreUrbanPenalty(route, features, spatialIndex) {
  const coverage = routeCoverageNearCategory(route, features, "urban", 0, spatialIndex);
  return {
    value: Math.round(coverage * 100),
    weightedPoints: 0,
    explanation: `${Math.round(coverage * 100)}% of sampled route lies inside residential, commercial, retail, or industrial land.`,
  };
}
