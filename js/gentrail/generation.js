import { destinationPoint } from "./geo.js";

export function generateCandidateLoops(
  start,
  targetDistanceMeters,
  count = 20,
  seed = Date.now(),
) {
  const random = mulberry32(seed);
  const baseRadius = targetDistanceMeters / 3.55;

  return Array.from({ length: count }, (_, index) => {
    const quadrilateral = index % 4 === 3;
    const baseBearing = random() * 360;
    const radius = baseRadius * (0.82 + random() * 0.28);
    const direction = random() > 0.5 ? 1 : -1;
    const angle = 82 + random() * 44;
    const points = quadrilateral
      ? buildQuadrilateral(start, radius * 0.78, baseBearing, direction, angle)
      : buildTriangle(start, radius, baseBearing, direction, angle);

    return {
      id: `candidate-${seed}-${index}`,
      seed: seed + index,
      points,
    };
  });
}

function buildTriangle(
  start,
  radius,
  baseBearing,
  direction,
  angle,
) {
  return [
    start,
    destinationPoint(start, radius, baseBearing),
    destinationPoint(start, radius * 0.9, baseBearing + direction * angle),
    start,
  ];
}

function buildQuadrilateral(
  start,
  radius,
  baseBearing,
  direction,
  angle,
) {
  return [
    start,
    destinationPoint(start, radius, baseBearing),
    destinationPoint(start, radius * 1.3, baseBearing + direction * angle * 0.7),
    destinationPoint(start, radius, baseBearing + direction * angle * 1.45),
    start,
  ];
}

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
