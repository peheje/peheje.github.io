import {
  along,
  bbox,
  bboxPolygon,
  bearing,
  booleanPointInPolygon,
  destination,
  distance,
  lineString,
  point,
  pointToLineDistance,
  polygonToLine,
} from "https://esm.sh/@turf/turf@7.2.0";

export function toPosition(value) {
  return [value.lng, value.lat];
}

export function toLatLng(position) {
  return { lng: position[0], lat: position[1] };
}

export function lineFromLatLng(coordinates) {
  return lineString(coordinates.map(toPosition));
}

export function destinationPoint(
  origin,
  distanceMeters,
  bearingDegrees,
) {
  return toLatLng(
    destination(point(toPosition(origin)), distanceMeters / 1000, bearingDegrees, {
      units: "kilometers",
    }).geometry.coordinates,
  );
}

export function expandedBbox(
  routes,
  paddingKm = 0.3,
) {
  const positions = routes.flatMap((route) => route.geometry.geometry.coordinates);
  const raw = bbox(lineString(positions));
  const centerLat = (raw[1] + raw[3]) / 2;
  const latPadding = paddingKm / 110.574;
  const lngPadding = paddingKm / (111.32 * Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2));
  return [
    raw[0] - lngPadding,
    raw[1] - latPadding,
    raw[2] + lngPadding,
    raw[3] + latPadding,
  ];
}

export function sampleLine(
  route,
  spacingMeters = 60,
) {
  const totalKm = routeLengthKm(route);
  const count = Math.max(2, Math.ceil((totalKm * 1000) / spacingMeters));
  return Array.from({ length: count + 1 }, (_, index) =>
    along(route, (totalKm * index) / count, { units: "kilometers" }),
  );
}

export function routeLengthKm(route) {
  let total = 0;
  const coordinates = route.geometry.coordinates;
  for (let index = 1; index < coordinates.length; index += 1) {
    total += distance(coordinates[index - 1], coordinates[index], {
      units: "kilometers",
    });
  }
  return total;
}

function distanceToBboxMeters(sample, bounds) {
  const [lng, lat] = sample.geometry.coordinates;
  const [minLng, minLat, maxLng, maxLat] = bounds;

  const nearestLng = Math.max(minLng, Math.min(lng, maxLng));
  const nearestLat = Math.max(minLat, Math.min(lat, maxLat));

  return distance(sample, point([nearestLng, nearestLat]), { units: "meters" });
}

export function minimumDistanceToFeatureMeters(
  route,
  osmFeature,
  routeSamples = sampleLine(route, 80),
) {
  const geometry = osmFeature.feature.geometry;
  const bounds = bbox(osmFeature.feature);
  const bboxDistances = routeSamples.map(sample => distanceToBboxMeters(sample, bounds));
  const minBboxDist = Math.min(...bboxDistances);

  // If closest sample is further than 450m from bbox, the actual distance is guaranteed to be > 450m.
  if (minBboxDist > 450) {
    return minBboxDist;
  }

  if (geometry.type === "Point") {
    return Math.min(
      ...routeSamples.map((sample) =>
        distance(sample, osmFeature.feature, {
          units: "meters",
        }),
      ),
    );
  }

  const lines =
    geometry.type === "Polygon" || geometry.type === "MultiPolygon"
      ? polygonLines(osmFeature.feature)
      : geometry.type === "LineString"
        ? [osmFeature.feature]
        : geometry.coordinates.map((coordinates) => lineString(coordinates));

  return Math.min(
    ...routeSamples.map((sample, idx) => {
      if (bboxDistances[idx] > 450) {
        return bboxDistances[idx];
      }

      if (
        (geometry.type === "Polygon" || geometry.type === "MultiPolygon") &&
        booleanPointInPolygon(sample, osmFeature.feature)
      ) {
        return 0;
      }
      return Math.min(
        ...lines.map((line) =>
          pointToLineDistance(sample, line, { units: "meters" }),
        ),
      );
    }),
  );
}

export function pointDistanceToFeatureMeters(
  sample,
  osmFeature,
) {
  const geometry = osmFeature.feature.geometry;
  const bounds = bbox(osmFeature.feature);
  const bboxDist = distanceToBboxMeters(sample, bounds);

  // If the sample is further than 50 meters from the bounding box, it cannot be inside or close
  if (bboxDist > 50) {
    return bboxDist;
  }

  if (geometry.type === "Point") {
    return distance(sample, osmFeature.feature, {
      units: "meters",
    });
  }
  if (
    (geometry.type === "Polygon" || geometry.type === "MultiPolygon") &&
    booleanPointInPolygon(sample, osmFeature.feature)
  ) {
    return 0;
  }

  const lines =
    geometry.type === "Polygon" || geometry.type === "MultiPolygon"
      ? polygonLines(osmFeature.feature)
      : geometry.type === "LineString"
        ? [osmFeature.feature]
        : geometry.coordinates.map((coordinates) => lineString(coordinates));
  return Math.min(
    ...lines.map((line) =>
      pointToLineDistance(sample, line, { units: "meters" }),
    ),
  );
}

export function repetitionMetrics(route) {
  const sampleSpacingMeters = 25;
  const samples = sampleLine(route, sampleSpacingMeters);
  const routeMeters = routeLengthKm(route) * 1000;
  const trailheadStemRadiusMeters = Math.min(250, routeMeters * 0.08);
  const start = samples[0];
  const centerLat =
    route.geometry.coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) /
    route.geometry.coordinates.length;
  const latCell = sampleSpacingMeters / 110574;
  const lngCell =
    sampleSpacingMeters /
    (111320 * Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2));
  const cells = samples.map(({ geometry }) => {
    const [lng, lat] = geometry.coordinates;
    return `${Math.round(lat / latCell)}:${Math.round(lng / lngCell)}`;
  });
  const edges = new Map();

  for (let index = 1; index < cells.length; index += 1) {
    if (cells[index - 1] === cells[index]) continue;
    const edge = [cells[index - 1], cells[index]].sort().join("|");
    const edgeDistance = Math.min(
      distance(start, samples[index - 1], { units: "meters" }),
      distance(start, samples[index], { units: "meters" }),
    );
    const existing = edges.get(edge);
    edges.set(edge, {
      count: (existing?.count ?? 0) + 1,
      distanceFromStartMeters: Math.min(
        existing?.distanceFromStartMeters ?? Infinity,
        edgeDistance,
      ),
    });
  }

  const traversals = [...edges.values()].reduce(
    (total, edge) => total + edge.count,
    0,
  );
  const repeatedTraversals = [...edges.values()].reduce(
    (total, edge) => total + Math.max(0, edge.count - 1),
    0,
  );
  const toleratedStemTraversals = [...edges.values()].reduce(
    (total, edge) =>
      total +
      (edge.distanceFromStartMeters <= trailheadStemRadiusMeters
        ? Math.max(0, edge.count - 1)
        : 0),
    0,
  );
  const penalizedRepeatedTraversals = Math.max(
    0,
    repeatedTraversals - toleratedStemTraversals,
  );
  const repeatedEdgeRatio =
    traversals > 0 ? penalizedRepeatedTraversals / traversals : 0;

  return {
    repeatedEdgeRatio,
    repeatedMeters: penalizedRepeatedTraversals * sampleSpacingMeters,
    toleratedTrailheadStemMeters:
      toleratedStemTraversals * sampleSpacingMeters,
    totalRepeatedMeters: repeatedTraversals * sampleSpacingMeters,
    traversals,
  };
}

function polygonLines(feature) {
  const converted = polygonToLine(feature);
  if (converted.type === "FeatureCollection") {
    return converted.features.flatMap((item) =>
      item.geometry.type === "MultiLineString"
        ? item.geometry.coordinates.map((coordinates) => lineString(coordinates))
        : [item],
    );
  }
  return converted.geometry.type === "MultiLineString"
    ? converted.geometry.coordinates.map((coordinates) => lineString(coordinates))
    : [converted];
}

export function routeShapeMetrics(route) {
  const samples = sampleLine(route, 50);
  const cells = samples.map(({ geometry }) => {
    const [lng, lat] = geometry.coordinates;
    return `${lat.toFixed(4)}:${lng.toFixed(4)}`;
  });
  const uniqueRatio = new Set(cells).size / cells.length;
  const bounds = bbox(route);
  const diagonalKm = distance(
    [bounds[0], bounds[1]],
    [bounds[2], bounds[3]],
    { units: "kilometers" },
  );
  const routeKm = routeLengthKm(route);
  const spreadRatio = Math.min(1, diagonalKm / Math.max(routeKm * 0.38, 0.01));
  const start = route.geometry.coordinates[0];
  const quarter = route.geometry.coordinates[Math.floor(route.geometry.coordinates.length / 4)];
  const threeQuarter =
    route.geometry.coordinates[Math.floor((route.geometry.coordinates.length * 3) / 4)];
  const directionalSeparation = Math.min(
    1,
    Math.abs(normalizeBearing(bearing(start, quarter) - bearing(start, threeQuarter))) / 120,
  );

  return { uniqueRatio, spreadRatio, directionalSeparation };
}

export function bboxAsFeature(value) {
  return bboxPolygon(value);
}

function normalizeBearing(value) {
  return ((value + 540) % 360) - 180;
}
