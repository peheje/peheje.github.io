export function isSimilarToAcceptedRoute(
  route,
  existingRoutes,
  acceptedRoutes,
  filterSimilar,
  routesConflict,
) {
  if (filterSimilar === false) return false;
  return [...existingRoutes, ...acceptedRoutes].some((existing) =>
    routesConflict(existing, route),
  );
}
