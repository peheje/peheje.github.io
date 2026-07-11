export function haversineDistance(p1, p2) {
  const radius = 6371000;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function runAStar(
  adjacency,
  nodeCoords,
  startNode,
  endNode,
  traversedEdges = null,
  repetitionPenalty = 50,
  preferences = null,
) {
  const heuristicMultiplier = minimumTraversalCostMultiplier(preferences);
  const openSet = new MinPriorityQueue();
  const cameFrom = new Map();
  const gScore = new Map([[startNode, 0]]);
  const fScore = new Map();
  const startPriority =
    heuristicMultiplier *
    haversineDistance(nodeCoords.get(startNode), nodeCoords.get(endNode));
  fScore.set(startNode, startPriority);
  openSet.enqueue(startNode, startPriority);

  while (!openSet.isEmpty()) {
    const { element: current, priority } = openSet.dequeue();
    if (priority !== fScore.get(current)) continue;
    if (current === endNode) return reconstructPath(cameFrom, current);

    for (const [neighbor, edge] of adjacency.get(current)?.entries() ?? []) {
      let edgeCost = preferenceAdjustedCost(edge, preferences);
      if (traversedEdges?.has(`${current}-${neighbor}`) || traversedEdges?.has(`${neighbor}-${current}`)) {
        edgeCost += edge.distance * repetitionPenalty;
      }

      const tentativeGScore = gScore.get(current) + edgeCost;
      if (tentativeGScore >= (gScore.get(neighbor) ?? Infinity)) continue;

      cameFrom.set(neighbor, current);
      gScore.set(neighbor, tentativeGScore);
      const priorityForNeighbor =
        tentativeGScore +
        heuristicMultiplier *
          haversineDistance(nodeCoords.get(neighbor), nodeCoords.get(endNode));
      fScore.set(neighbor, priorityForNeighbor);
      openSet.enqueue(neighbor, priorityForNeighbor);
    }
  }
  return null;
}

function reconstructPath(cameFrom, current) {
  const path = [];
  for (let node = current; node !== undefined; node = cameFrom.get(node)) {
    path.push(node);
  }
  return path.reverse();
}

function preferenceAdjustedCost(edge, preferences) {
  if (!preferences) return edge.cost;
  return edge.distance * traversalCostMultiplier(edge, preferences);
}

function traversalCostMultiplier(edge, preferences) {
  const highway = edge.highway || "";
  const surface = edge.surface || "";
  const isUnpaved = ["gravel", "ground", "dirt", "unpaved", "grass", "sand", "woodchips", "bark"].includes(surface);
  let weight = 1;

  if (["motorway", "trunk", "motorway_link", "trunk_link"].includes(highway)) {
    weight = 50 + (preferences.avoidHighways ?? 10) * 10;
  } else if (["primary", "secondary", "primary_link", "secondary_link"].includes(highway)) {
    weight = 5 + (preferences.avoidRoads ?? 8) * 1.5;
  } else if (["tertiary", "tertiary_link", "residential", "service", "unclassified", "living_street"].includes(highway)) {
    weight = isUnpaved
      ? 1 - (preferences.trail ?? 8) * 0.05
      : 2 + (preferences.avoidMinorRoads ?? 3) * 0.8;
  } else if (["path", "footway", "track", "pedestrian", "steps"].includes(highway)) {
    weight = isUnpaved
      ? 0.8 - (preferences.trail ?? 8) * 0.05
      : 1 - (preferences.trail ?? 8) * 0.03;
  } else if (highway === "beach") {
    weight =
      0.85 -
      (preferences.water ?? 5) * 0.05 -
      (preferences.trail ?? 8) * 0.015;
  }
  return Math.max(0.1, weight);
}

export function minimumTraversalCostMultiplier(preferences) {
  if (!preferences) return 0.8;

  return Math.min(
    1,
    traversalCostMultiplier(
      { highway: "tertiary", surface: "gravel" },
      preferences,
    ),
    traversalCostMultiplier(
      { highway: "path", surface: "" },
      preferences,
    ),
    traversalCostMultiplier(
      { highway: "path", surface: "gravel" },
      preferences,
    ),
    traversalCostMultiplier(
      { highway: "beach", surface: "sand" },
      preferences,
    ),
  );
}

export class MinPriorityQueue {
  constructor() {
    this.elements = [];
  }

  enqueue(element, priority) {
    const item = { element, priority };
    this.elements.push(item);
    this.bubbleUp(this.elements.length - 1);
  }

  dequeue() {
    if (this.elements.length === 0) return null;
    const first = this.elements[0];
    const last = this.elements.pop();
    if (this.elements.length > 0) {
      this.elements[0] = last;
      this.bubbleDown(0);
    }
    return first;
  }

  isEmpty() {
    return this.elements.length === 0;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.elements[parent].priority <= this.elements[index].priority) break;
      [this.elements[parent], this.elements[index]] = [this.elements[index], this.elements[parent]];
      index = parent;
    }
  }

  bubbleDown(index) {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < this.elements.length && this.elements[left].priority < this.elements[smallest].priority) smallest = left;
      if (right < this.elements.length && this.elements[right].priority < this.elements[smallest].priority) smallest = right;
      if (smallest === index) return;
      [this.elements[index], this.elements[smallest]] = [this.elements[smallest], this.elements[index]];
      index = smallest;
    }
  }
}
