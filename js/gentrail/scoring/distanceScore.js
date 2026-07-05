export function scoreDistance(routeMeters, targetMeters) {
  const diffRatio = Math.abs(routeMeters - targetMeters) / Math.max(targetMeters, 1);
  const value = Math.max(0, Math.round(100 - diffRatio * 180));
  const diffKm = (routeMeters - targetMeters) / 1000;
  const sign = diffKm > 0 ? "+" : "";
  return {
    value,
    weightedPoints: 0,
    explanation: `${(routeMeters / 1000).toFixed(1)} km (${sign}${diffKm.toFixed(1)} km vs ${targetMeters / 1000} km target).`,
  };
}
