export function buildFeatureQuery(bounds) {
  const [west, south, east, north] = bounds;
  const bbox = `${south},${west},${north},${east}`;
  return `
[out:json][timeout:25];
(
  way["landuse"~"forest|grass|meadow"](${bbox});
  way["landuse"~"residential|commercial|retail|industrial"](${bbox});
  way["natural"~"wood|water|beach"](${bbox});
  way["natural"="coastline"](${bbox});
  way["leisure"~"nature_reserve|park|garden|recreation_ground"](${bbox});
  way["waterway"~"river|stream"](${bbox});
  node["natural"="beach"](${bbox});
  way["highway"~"motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|service|unclassified|living_street|path|footway|track|steps|pedestrian"](${bbox});
  relation["type"~"multipolygon|boundary"]["landuse"~"forest|grass|meadow|residential|commercial|retail|industrial"](${bbox});
  relation["type"~"multipolygon|boundary"]["natural"~"wood|water|beach"](${bbox});
  relation["type"~"multipolygon|boundary"]["leisure"~"nature_reserve|park|garden|recreation_ground"](${bbox});
);
out geom;
`.trim();
}

export function categoriesFor(tags) {
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
  if (["motorway", "motorway_link", "trunk", "trunk_link"].includes(tags.highway)) {
    result.add("motorway");
  }
  if (["primary", "primary_link", "secondary", "secondary_link"].includes(tags.highway)) {
    result.add("road");
  }

  const isUnpaved = ["gravel", "ground", "dirt", "unpaved", "grass", "sand", "woodchips", "bark"].includes(tags.surface);
  if (
    ["tertiary", "tertiary_link", "residential", "service", "unclassified", "living_street"].includes(tags.highway) &&
    !isUnpaved
  ) {
    result.add("minorRoad");
  }
  if (["path", "footway", "track"].includes(tags.highway) || isUnpaved) {
    result.add("trail");
  }
  if (["residential", "commercial", "retail", "industrial"].includes(tags.landuse)) {
    result.add("urban");
  }
  return [...result];
}
