import RBush from "https://esm.sh/rbush@4.0.1";
import { bbox } from "https://esm.sh/@turf/turf@7.2.0";
import {
  minimumDistanceToFeatureMeters,
  pointDistanceToFeatureMeters,
  sampleLine,
} from "../geo.js";

export function buildSpatialIndex(features) {
  const tree = new RBush();
  const items = features.map((feature) => {
    const [minLng, minLat, maxLng, maxLat] = bbox(feature.feature);
    return {
      minX: minLng,
      minY: minLat,
      maxX: maxLng,
      maxY: maxLat,
      feature,
    };
  });
  tree.load(items);
  return tree;
}

export function analyzeFeatureDistances(route, features, spatialIndex) {
  const samples = sampleLine(route.geometry, 500);
  const result = new Map();

  // Initialize all features with Infinity distance
  for (const feature of features) {
    result.set(feature, Infinity);
  }

  if (spatialIndex) {
    const closeFeatures = new Set();
    const maxSearchDistance = 400; // Beach Proximity Limit

    for (const sample of samples) {
      const [lng, lat] = sample.geometry.coordinates;
      const latBuffer = maxSearchDistance / 110574;
      const lngBuffer = maxSearchDistance / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));

      const queryBox = {
        minX: lng - lngBuffer,
        minY: lat - latBuffer,
        maxX: lng + lngBuffer,
        maxY: lat + latBuffer,
      };

      const found = spatialIndex.search(queryBox);
      for (const item of found) {
        closeFeatures.add(item.feature);
      }
    }

    for (const feature of closeFeatures) {
      result.set(
        feature,
        minimumDistanceToFeatureMeters(route.geometry, feature, samples),
      );
    }
  } else {
    for (const feature of features) {
      result.set(
        feature,
        minimumDistanceToFeatureMeters(route.geometry, feature, samples),
      );
    }
  }

  return result;
}

export function routeCoverageNearCategory(
  route,
  features,
  category,
  thresholdMeters,
  spatialIndex,
) {
  const matches = features.filter((feature) => feature.category === category);
  if (!matches.length) return 0;
  const samples = sampleLine(route.geometry, 400);

  let coveredCount = 0;

  if (spatialIndex) {
    for (const sample of samples) {
      const [lng, lat] = sample.geometry.coordinates;
      const searchRadius = Math.max(5, thresholdMeters);
      const latBuffer = searchRadius / 110574;
      const lngBuffer = searchRadius / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));

      const queryBox = {
        minX: lng - lngBuffer,
        minY: lat - latBuffer,
        maxX: lng + lngBuffer,
        maxY: lat + latBuffer,
      };

      const found = spatialIndex.search(queryBox)
        .map((item) => item.feature)
        .filter((feature) => feature.category === category);

      const isCovered = found.some(
        (feature) =>
          pointDistanceToFeatureMeters(sample, feature) <= thresholdMeters,
      );

      if (isCovered) {
        coveredCount += 1;
      }
    }
  } else {
    const covered = samples.filter((sample) =>
      matches.some(
        (feature) =>
          pointDistanceToFeatureMeters(sample, feature) <= thresholdMeters,
      ),
    ).length;
    coveredCount = covered;
  }

  return coveredCount / samples.length;
}
