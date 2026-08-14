export function getHourPosition({ hour, minute = 0, second = 0 }) {
  const fraction = minute / 60 + second / 3600;
  return {
    hour,
    fraction,
    decimalHour: hour + fraction
  };
}

export function interpolateHourlyValue(currentValue, nextValue, fraction) {
  if (!Number.isFinite(currentValue)) return null;
  if (!Number.isFinite(nextValue)) return currentValue;
  return currentValue + fraction * (nextValue - currentValue);
}

export function getSummaryWeatherValues(currentDetails, nextDetails, fraction) {
  return {
    uv: interpolateHourlyValue(
      currentDetails?.ultraviolet_index ?? 0,
      nextDetails?.ultraviolet_index ?? null,
      fraction
    ) ?? 0,
    temp: interpolateHourlyValue(
      currentDetails?.air_temperature,
      nextDetails?.air_temperature,
      fraction
    ),
    windSpeed: interpolateHourlyValue(
      currentDetails?.wind_speed,
      nextDetails?.wind_speed,
      fraction
    ),
    windGust: interpolateHourlyValue(
      currentDetails?.wind_speed_of_gust,
      nextDetails?.wind_speed_of_gust,
      fraction
    )
  };
}

export function getPinnedGraphWeatherValues(currentPoint, nextPoint, fraction) {
  return {
    value: interpolateHourlyValue(currentPoint?.val, nextPoint?.val, fraction),
    uv: interpolateHourlyValue(currentPoint?.uv, nextPoint?.uv, fraction),
    uvClearSky: interpolateHourlyValue(currentPoint?.uvClearSky, nextPoint?.uvClearSky, fraction),
    temp: interpolateHourlyValue(currentPoint?.temp, nextPoint?.temp, fraction),
    windSpeed: interpolateHourlyValue(currentPoint?.windSpeed, nextPoint?.windSpeed, fraction),
    windGust: interpolateHourlyValue(currentPoint?.windGust, nextPoint?.windGust, fraction)
  };
}
