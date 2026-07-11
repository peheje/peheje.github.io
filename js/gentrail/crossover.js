export function buildIntersectionCrossoverPaths(
  pathA,
  pathB,
  startNodeId,
  maximumIntersections = 2,
) {
  if (!Array.isArray(pathA) || !Array.isArray(pathB)) return [];

  const occurrencesA = occurrenceIndexes(pathA);
  const occurrencesB = occurrenceIndexes(pathB);
  const midpointA = pathA.length / 2;
  const midpointB = pathB.length / 2;
  const intersections = [];

  for (const [node, indexesA] of occurrencesA) {
    const indexesB = occurrencesB.get(node);
    if (
      node === startNodeId ||
      indexesA.length !== 1 ||
      indexesB?.length !== 1
    ) {
      continue;
    }

    const [indexA] = indexesA;
    const [indexB] = indexesB;
    if (
      indexA === 0 ||
      indexA === pathA.length - 1 ||
      indexB === 0 ||
      indexB === pathB.length - 1
    ) {
      continue;
    }

    intersections.push({
      indexA,
      indexB,
      midpointDistance:
        Math.abs(indexA - midpointA) + Math.abs(indexB - midpointB),
    });
  }

  intersections.sort(
    (first, second) => first.midpointDistance - second.midpointDistance,
  );

  const children = [];
  const seen = new Set();
  for (const { indexA, indexB } of intersections.slice(0, maximumIntersections)) {
    addLoop(
      children,
      seen,
      [...pathA.slice(0, indexA), ...pathB.slice(indexB)],
      startNodeId,
    );
    addLoop(
      children,
      seen,
      [...pathB.slice(0, indexB), ...pathA.slice(indexA)],
      startNodeId,
    );
  }
  return children;
}

function occurrenceIndexes(path) {
  const result = new Map();
  for (let index = 0; index < path.length; index += 1) {
    const node = path[index];
    if (!result.has(node)) result.set(node, []);
    result.get(node).push(index);
  }
  return result;
}

function addLoop(children, seen, path, startNodeId) {
  if (path[0] !== startNodeId || path.at(-1) !== startNodeId) return;
  const signature = JSON.stringify(path);
  if (seen.has(signature)) return;
  seen.add(signature);
  children.push(path);
}
