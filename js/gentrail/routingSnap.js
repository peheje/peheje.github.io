export function findNearestRoutingNode(
  nodeCoords,
  targetCoords,
  adjacency,
  distanceBetween,
) {
  let nearestNodeId = null;
  let minDistance = Infinity;

  // Prefer a junction or continuous path so a loop does not begin at a dead end.
  if (adjacency) {
    for (const [nodeId, coords] of nodeCoords.entries()) {
      const degree = adjacency.get(nodeId)?.size ?? 0;
      if (degree < 2) continue;

      const distance = distanceBetween(coords, targetCoords);
      if (distance < minDistance) {
        minDistance = distance;
        nearestNodeId = nodeId;
      }
    }
  }

  if (nearestNodeId === null) {
    for (const [nodeId, coords] of nodeCoords.entries()) {
      const distance = distanceBetween(coords, targetCoords);
      if (distance < minDistance) {
        minDistance = distance;
        nearestNodeId = nodeId;
      }
    }
  }

  if (nearestNodeId === null) return null;
  return {
    nodeId: nearestNodeId,
    coordinate: nodeCoords.get(nearestNodeId),
    distanceMeters: minDistance,
  };
}
