import { lineFromLatLng, toLatLng } from "./geo.js";

export class OpenRouteServiceProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async getRoute(points, candidateId, signal) {
    if (!this.apiKey) {
      throw new Error("OpenRouteService API key is missing. Please set it in the sidebar.");
    }

    const hostname = window.location.hostname;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/) ||
      hostname.endsWith(".local");

    const url = isLocal
      ? "/api/ors/v2/directions/foot-hiking/geojson"
      : "https://api.heigit.org/openrouteservice/v2/directions/foot-hiking/geojson";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": this.apiKey,
      },
      body: JSON.stringify({
        coordinates: points.map((value) => [value.lng, value.lat]),
        elevation: true,
        extra_info: ["surface", "waytype"],
        instructions: false,
        preference: "recommended",
      }),
      signal,
    });

    let raw;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      raw = await response.json();
    } else {
      const text = await response.text();
      const err = new Error(`Routing failed with HTTP ${response.status}: ${text.slice(0, 200)}`);
      err.status = response.status;
      throw err;
    }

    if (!response.ok) {
      const detail = typeof raw.error === "string" ? raw.error : raw.error?.message;
      const err = new Error(detail ?? `Routing failed with HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const feature = raw.features?.[0];
    if (!feature) throw new Error("Routing provider returned no route");
    const coordinates = feature.geometry.coordinates.map(toLatLng);
    const metadata = {
      surfaceMeters: decodeExtras(
        feature.properties.extras?.surface?.values ??
          feature.properties.extras?.surfaces?.values,
        feature.geometry.coordinates,
      ),
      wayTypeMeters: decodeExtras(
        feature.properties.extras?.waytype?.values ??
          feature.properties.extras?.waytypes?.values,
        feature.geometry.coordinates,
      ),
      ascentMeters: feature.properties.ascent,
      descentMeters: feature.properties.descent,
    };

    return {
      candidateId,
      coordinates,
      geometry: lineFromLatLng(coordinates),
      distanceMeters: feature.properties.summary.distance,
      durationSeconds: feature.properties.summary.duration,
      metadata,
      rawProviderResponse: raw,
    };
  }
}

function decodeExtras(values, coordinates) {
  if (!values) return {};
  const result = {};
  for (const [from, to, category] of values) {
    let meters = 0;
    for (let index = from + 1; index <= Math.min(to, coordinates.length - 1); index += 1) {
      meters += haversineMeters(coordinates[index - 1], coordinates[index]);
    }
    result[String(category)] = (result[String(category)] ?? 0) + meters;
  }
  return result;
}

function haversineMeters(first, second) {
  const radians = (value) => (value * Math.PI) / 180;
  const deltaLat = radians(second[1] - first[1]);
  const deltaLng = radians(second[0] - first[0]);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(first[1])) *
      Math.cos(radians(second[1])) *
      Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
