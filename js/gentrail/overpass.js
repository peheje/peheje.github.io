import { lineString, multiPolygon, point, polygon } from "https://esm.sh/@turf/turf@7.2.0";
import {
  buildMultipolygonCoordinates,
  stitchClosedRings,
} from "./osmGeometry.js";
import { buildFeatureQuery, categoriesFor } from "./osmQuery.js";
import { runWithTimeout } from "./timedOperation.js";

const OVERPASS_ENDPOINTS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const ENDPOINT_TIMEOUT_MS = 30000;

export async function fetchOsmFeatures(bounds, signal, onEndpointAttempt) {
  const query = buildFeatureQuery(bounds);
  let lastError = null;

  for (let endpointIndex = 0; endpointIndex < OVERPASS_ENDPOINTS.length; endpointIndex += 1) {
    const endpoint = OVERPASS_ENDPOINTS[endpointIndex];
    try {
      signal?.throwIfAborted();
      onEndpointAttempt?.({
        attempt: endpointIndex + 1,
        total: OVERPASS_ENDPOINTS.length,
        endpoint,
      });
      const raw = await runWithTimeout(async (requestSignal) => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: requestSignal,
        });

        const contentType = response.headers.get("content-type") || "";
        let responseBody;
        if (contentType.includes("application/json")) {
          responseBody = await response.json();
        } else {
          const text = await response.text();
          throw new Error(`Overpass failed with HTTP ${response.status}: ${text.slice(0, 200)}`);
        }

        if (!response.ok) {
          throw new Error(responseBody.remark ?? `Overpass failed with HTTP ${response.status}`);
        }
        return responseBody;
      }, signal, ENDPOINT_TIMEOUT_MS, "Map server did not respond within 30 seconds");

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

  const feature = featureForElement(element, categories);
  if (!feature) return [];

  return categories.map((category) => ({
    id: `${element.type}/${element.id}/${category}`,
    category,
    tags,
    feature,
  }));
}

function featureForElement(element, categories) {
  const relationFeature = featureForRelation(element, categories);
  if (relationFeature) return relationFeature;

  const coordinates = element.geometry?.map((value) => [value.lon, value.lat]) ?? [];
  if (coordinates.length < 2) return null;
  const isClosed =
    coordinates.length >= 4 &&
    coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
    coordinates[0][1] === coordinates[coordinates.length - 1][1];
  const usePolygon =
    isClosed &&
    categories.some((category) =>
      ["forest", "water", "beach", "urban"].includes(category),
    );

  return usePolygon ? polygon([coordinates]) : lineString(coordinates);
}

function featureForRelation(element, categories) {
  if (element.type !== "relation") return null;
  const members = (element.members ?? []).filter((member) => member.type === "way");
  const pathsForRole = (role) =>
    members
      .filter((member) =>
        role === "inner" ? member.role === "inner" : member.role !== "inner",
      )
      .map((member) => member.geometry?.map((value) => [value.lon, value.lat]) ?? [])
      .filter((coordinates) => coordinates.length >= 2);
  const outerPaths = pathsForRole("outer");

  const isArea = categories.some((category) =>
    ["forest", "water", "beach", "urban"].includes(category),
  );
  if (!isArea) {
    const rings = stitchClosedRings(outerPaths);
    return rings.length ? lineString(rings[0]) : null;
  }

  const polygons = buildMultipolygonCoordinates(
    outerPaths,
    pathsForRole("inner"),
  );
  return polygons.length ? multiPolygon(polygons) : null;
}
