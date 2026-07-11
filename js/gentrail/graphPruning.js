export function pruneDeadEnds(adjacency) {
  const undirected = new Map();
  const ensureNode = (node) => {
    if (!undirected.has(node)) undirected.set(node, new Set());
    return undirected.get(node);
  };

  for (const [from, neighbors] of adjacency) {
    ensureNode(from);
    for (const to of neighbors.keys()) {
      ensureNode(from).add(to);
      ensureNode(to).add(from);
    }
  }

  const queue = [];
  for (const [node, neighbors] of undirected) {
    if (neighbors.size <= 1) queue.push(node);
  }

  const removed = new Set();
  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];
    if (removed.has(node)) continue;
    removed.add(node);
    for (const neighbor of undirected.get(node) ?? []) {
      if (removed.has(neighbor)) continue;
      const neighborSet = undirected.get(neighbor);
      neighborSet.delete(node);
      if (neighborSet.size <= 1) queue.push(neighbor);
    }
  }

  const retained = new Set(
    [...undirected.keys()].filter((node) => !removed.has(node)),
  );
  const pruned = new Map();
  for (const node of retained) {
    const neighbors = new Map(
      [...(adjacency.get(node)?.entries() ?? [])].filter(([neighbor]) =>
        retained.has(neighbor),
      ),
    );
    pruned.set(node, neighbors);
  }
  return pruned;
}
