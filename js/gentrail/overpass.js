import { point, polygon, lineString } from "https://esm.sh/@turf/turf@7.2.0";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

export async function fetchOsmFeatures(bounds, signal) {
  const query = buildFeatureQuery(bounds);
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      signal?.throwIfAborted();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal,
      });

      let raw;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        raw = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Overpass failed with HTTP ${response.status}: ${text.slice(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(raw.remark ?? `Overpass failed with HTTP ${response.status}`);
      }

      return {
        features: (raw.elements ?? []).flatMap(toOsmFeatures),
        raw,
      };
    } catch (err) {
      if (signal?.aborted) throw err;
      console.warn(`Fetch from Overpass endpoint ${endpoint} failed, trying next. Error:`, err.message || err);
      lastError = err;
    }
  }

  throw new Error(`Failed to fetch map data from all public Overpass API instances. Last error: ${lastError ? lastError.message : "Unknown"}`);
}

function buildFeatureQuery(bounds) {
  const [west, south, east, north] = bounds;
  const bboxStr = `${south},${west},${north},${east}`;
  return `
[out:json][timeout:25];
(
  way["landuse"~"forest|grass|meadow"](${bboxStr});
  way["natural"~"wood|water|beach"](${bboxStr});
  way["leisure"~"nature_reserve|park|garden"](${bboxStr});
  way["waterway"~"river|stream"](${bboxStr});
  node["natural"="beach"](${bboxStr});
  way["highway"~"primary|secondary|tertiary|residential|service|unclassified|living_street|path|footway|track|steps|pedestrian"](${bboxStr});
);
out geom;
`.trim();
}

function toOsmFeatures(element) {
  const tags = element.tags ?? {};
  const categories = categoriesFor(tags);
  if (!categories.length) return [];

  if (element.type === "node" && element.lat != null && element.lon != null) {
    return categories.map((category) => ({
      id: `${element.type}/${element.id}/${category}`,
      category,
      tags,
      feature: point([element.lon, element.lat]),
    }));
  }

  const coordinates = element.geometry?.map((value) => [value.lon, value.lat]) ?? [];
  if (coordinates.length < 2) return [];
  const isClosed =
    coordinates.length >= 4 &&
    coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
    coordinates[0][1] === coordinates[coordinates.length - 1][1];
  const usePolygon =
    isClosed &&
    categories.some((category) =>
      ["forest", "water", "beach", "urban"].includes(category),
    );

  return categories.map((category) => ({
    id: `${element.type}/${element.id}/${category}`,
    category,
    tags,
    feature: usePolygon ? polygon([coordinates]) : lineString(coordinates),
  }));
}

function categoriesFor(tags) {
  const result = new Set();
  if (
    tags.landuse === "forest" ||
    tags.natural === "wood" ||
    ["nature_reserve", "park", "garden", "recreation_ground"].includes(tags.leisure) ||
    ["grass", "meadow", "recreation_ground"].includes(tags.landuse)
  ) {
    result.add("forest");
  }
  if (
    tags.natural === "water" ||
    tags.natural === "coastline" ||
    ["lake", "pond"].includes(tags.water) ||
    ["river", "stream"].includes(tags.waterway)
  ) {
    result.add("water");
  }
  if (tags.natural === "beach") result.add("beach");
  if (["motorway", "trunk"].includes(tags.highway)) result.add("motorway");
  if (["primary", "secondary"].includes(tags.highway)) result.add("road");
  
  const isUnpaved = ["gravel", "ground", "dirt", "unpaved", "grass", "sand", "woodchips", "bark"].includes(tags.surface);
  if (
    ["tertiary", "residential", "service", "unclassified", "living_street"].includes(tags.highway) &&
    !isUnpaved
  ) {
    result.add("minorRoad");
  }
  if (
    ["path", "footway", "track"].includes(tags.highway) ||
    isUnpaved
  ) {
    result.add("trail");
  }
  if (
    ["residential", "commercial", "retail", "industrial"].includes(tags.landuse)
  ) {
    result.add("urban");
  }
  return [...result];
}
