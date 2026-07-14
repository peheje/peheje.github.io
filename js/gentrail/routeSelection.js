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
    const combination = findBestCombination(
      compatibility,
      scoredRoutes,
      targetSize,
    );
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

function findBestCombination(compatibility, scoredRoutes, targetSize) {
  const chosen = [];
  const scores = scoredRoutes.map(({ score }) =>
    Number.isFinite(score?.total) ? score.total : 0,
  );
  const optimisticScores = buildOptimisticScores(scores, targetSize);
  let bestCombination = null;
  let bestScore = -Infinity;

  const visit = (startIndex, currentScore) => {
    if (chosen.length === targetSize) {
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestCombination = [...chosen];
      }
      return;
    }
    const needed = targetSize - chosen.length;
    const optimisticRemainder = optimisticScores[startIndex]?.[needed] ?? -Infinity;
    if (currentScore + optimisticRemainder <= bestScore) return;

    for (let index = startIndex; index <= compatibility.length - needed; index += 1) {
      if (!chosen.every((selected) => compatibility[selected][index])) continue;
      chosen.push(index);
      visit(index + 1, currentScore + scores[index]);
      chosen.pop();
    }
  };
  visit(0, 0);
  return bestCombination;
}

function buildOptimisticScores(scores, maximumCount) {
  const result = Array.from({ length: scores.length + 1 }, () =>
    Array(maximumCount + 1).fill(-Infinity),
  );
  result[scores.length][0] = 0;
  for (let index = scores.length - 1; index >= 0; index -= 1) {
    result[index][0] = 0;
    for (let count = 1; count <= maximumCount; count += 1) {
      result[index][count] = Math.max(
        result[index + 1][count],
        scores[index] + result[index + 1][count - 1],
      );
    }
  }
  return result;
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
