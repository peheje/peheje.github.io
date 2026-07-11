export function stitchClosedRings(paths) {
  const pending = paths.map((path) => [...path]);
  const rings = [];

  while (pending.length) {
    let ring = pending.pop();
    let joined = true;
    while (joined && !isClosedRing(ring)) {
      joined = false;
      const first = ring[0];
      const last = ring[ring.length - 1];
      const index = pending.findIndex((path) =>
        samePosition(path[0], last) ||
        samePosition(path[path.length - 1], last) ||
        samePosition(path[0], first) ||
        samePosition(path[path.length - 1], first),
      );
      if (index === -1) continue;

      const path = pending.splice(index, 1)[0];
      if (samePosition(path[0], last)) {
        ring.push(...path.slice(1));
      } else if (samePosition(path[path.length - 1], last)) {
        ring.push(...path.slice(0, -1).reverse());
      } else if (samePosition(path[path.length - 1], first)) {
        ring = [...path.slice(0, -1), ...ring];
      } else {
        ring = [...path.slice(1).reverse(), ...ring];
      }
      joined = true;
    }
    if (ring.length >= 4 && isClosedRing(ring)) rings.push(ring);
  }
  return rings;
}

export function buildMultipolygonCoordinates(outerPaths, innerPaths = []) {
  const outerRings = stitchClosedRings(outerPaths);
  const polygons = outerRings.map((outer) => [outer]);

  for (const inner of stitchClosedRings(innerPaths)) {
    const containingOuter = outerRings
      .map((outer, index) => ({ index, area: Math.abs(signedRingArea(outer)), outer }))
      .filter(({ outer }) => positionInRing(inner[0], outer))
      .sort((first, second) => first.area - second.area)[0];
    if (containingOuter) polygons[containingOuter.index].push(inner);
  }

  return polygons;
}

function isClosedRing(coordinates) {
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function samePosition(first, second) {
  return first[0] === second[0] && first[1] === second[1];
}

function positionInRing(position, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const crosses =
      y > position[1] !== previousY > position[1] &&
      position[0] <
        ((previousX - x) * (position[1] - y)) / (previousY - y) + x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function signedRingArea(ring) {
  let area = 0;
  for (let index = 1; index < ring.length; index += 1) {
    const [previousX, previousY] = ring[index - 1];
    const [x, y] = ring[index];
    area += previousX * y - x * previousY;
  }
  return area / 2;
}
