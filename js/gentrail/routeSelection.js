export function routesExactlyMatch(first, second) {
  const firstIdentity = routeIdentity(first);
  return firstIdentity !== null && firstIdentity === routeIdentity(second);
}

export function selectDistinctScoredRoutes(
  scoredRoutes,
  maximumRoutes,
  routesConflict,
) {
  const compatibility = buildCompatibilityMatrix(scoredRoutes, routesConflict);
  let selectedIndexes = [];
  for (let targetSize = Math.min(maximumRoutes, scoredRoutes.length); targetSize > 0; targetSize -= 1) {
    const combination = findCombination(compatibility, targetSize);
    if (combination) {
      selectedIndexes = combination;
      break;
    }
  }

  const selected = selectedIndexes.map((index) => scoredRoutes[index]);
  const selectedSet = new Set(selectedIndexes);
  const rejectedAsDuplicate = scoredRoutes.reduce((count, _item, index) => {
    if (selectedSet.has(index)) return count;
    return count + (selectedIndexes.some((selectedIndex) =>
      !compatibility[selectedIndex][index]) ? 1 : 0);
  }, 0);
  return { selected, rejectedAsDuplicate };
}

function buildCompatibilityMatrix(scoredRoutes, routesConflict) {
  return scoredRoutes.map((item, firstIndex) =>
    scoredRoutes.map((other, secondIndex) => {
      if (firstIndex === secondIndex) return true;
      return !routesExactlyMatch(item.route, other.route) &&
        !routesConflict(item.route, other.route);
    }),
  );
}

function findCombination(compatibility, targetSize) {
  const chosen = [];
  const visit = (startIndex) => {
    if (chosen.length === targetSize) return [...chosen];
    const needed = targetSize - chosen.length;
    for (let index = startIndex; index <= compatibility.length - needed; index += 1) {
      if (!chosen.every((selected) => compatibility[selected][index])) continue;
      chosen.push(index);
      const result = visit(index + 1);
      if (result) return result;
      chosen.pop();
    }
    return null;
  };
  return visit(0);
}

function routeIdentity(route) {
  const values = route.nodePath?.length
    ? route.nodePath.map(String)
    : route.coordinates?.length
      ? route.coordinates.map(({ lat, lng }) => `${lat.toFixed(6)},${lng.toFixed(6)}`)
      : route.geometry?.geometry?.coordinates?.map(([lng, lat]) =>
          `${lat.toFixed(6)},${lng.toFixed(6)}`,
        ) ?? [];
  if (!values.length) return null;
  const forward = JSON.stringify(values);
  const reverse = JSON.stringify([...values].reverse());
  return forward < reverse ? forward : reverse;
}
