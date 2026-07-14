import { lineString, multiPolygon, point, polygon } from "https://esm.sh/@turf/turf@7.2.0";
import {
  buildMultipolygonCoordinates,
  stitchClosedRings,
} from "./osmGeometry.js";
import { buildFeatureQuery, categoriesFor } from "./osmQuery.js";

const OVERPASS_ENDPOINTS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
// A server that has not started responding quickly is unlikely to be useful for
// an interactive request. Once it sends headers, though, let it finish sending
// the (potentially large) map response.
const RESPONSE_TIMEOUT_MS = 10000;

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
      const raw = await fetchOsmJson(endpoint, query, signal, () => {
        onEndpointAttempt?.({
          attempt: endpointIndex + 1,
          total: OVERPASS_ENDPOINTS.length,
          endpoint,
          responded: true,
        });
      });

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

async function fetchOsmJson(endpoint, query, sourceSignal, onResponse) {
  sourceSignal?.throwIfAborted();
  const controller = new AbortController();
  const abortFromSource = () => controller.abort(
    sourceSignal?.reason ?? new DOMException("Generation cancelled", "AbortError"),
  );
  sourceSignal?.addEventListener("abort", abortFromSource, { once: true });
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Map server did not start responding within 10 seconds", "TimeoutError"));
  }, RESPONSE_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    onResponse?.();

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`Overpass failed with HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    const raw = await response.json();
    if (!response.ok) {
      throw new Error(raw.remark ?? `Overpass failed with HTTP ${response.status}`);
    }
    return raw;
  } catch (error) {
    if (timedOut) {
      throw new DOMException("Map server did not start responding within 10 seconds", "TimeoutError");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    sourceSignal?.removeEventListener("abort", abortFromSource);
  }
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
