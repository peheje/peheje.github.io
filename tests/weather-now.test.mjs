import test from "node:test";
import assert from "node:assert/strict";

import {
  getHourPosition,
  getPinnedGraphWeatherValues,
  getSummaryWeatherValues
} from "../js/pages/weather-now.js";

test("top temperature matches the graph temperature after clicking Now", () => {
  const currentDetails = {
    air_temperature: 10,
    ultraviolet_index: 2,
    wind_speed: 4,
    wind_speed_of_gust: 7
  };
  const nextDetails = {
    air_temperature: 14,
    ultraviolet_index: 4,
    wind_speed: 6,
    wind_speed_of_gust: 9
  };
  const currentGraphPoint = {
    val: 10,
    temp: 10,
    uv: 2,
    windSpeed: 4,
    windGust: 7
  };
  const nextGraphPoint = {
    val: 14,
    temp: 14,
    uv: 4,
    windSpeed: 6,
    windGust: 9
  };
  const { fraction } = getHourPosition({ hour: 10, minute: 30, second: 0 });

  const summary = getSummaryWeatherValues(currentDetails, nextDetails, fraction);
  const pinnedGraph = getPinnedGraphWeatherValues(currentGraphPoint, nextGraphPoint, fraction);

  assert.equal(summary.temp, 12);
  assert.equal(pinnedGraph.temp, 12);
  assert.equal(summary.temp.toFixed(1), pinnedGraph.temp.toFixed(1));
});

test("top and clicked Now values both hold the 23:00 forecast after 23:00", () => {
  const finalDetails = {
    air_temperature: 7.4,
    ultraviolet_index: 0,
    wind_speed: 3.1,
    wind_speed_of_gust: 5.2
  };
  const finalGraphPoint = {
    val: 7.4,
    temp: 7.4,
    uv: 0,
    windSpeed: 3.1,
    windGust: 5.2
  };
  const { fraction } = getHourPosition({ hour: 23, minute: 45, second: 0 });

  const summary = getSummaryWeatherValues(finalDetails, null, fraction);
  const pinnedGraph = getPinnedGraphWeatherValues(finalGraphPoint, finalGraphPoint, fraction);

  assert.equal(summary.temp, 7.4);
  assert.equal(summary.temp.toFixed(1), pinnedGraph.temp.toFixed(1));
});
