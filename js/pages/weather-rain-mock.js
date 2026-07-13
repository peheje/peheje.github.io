// Opt-in weather preview data. This module owns every synthetic value and its
// mandatory warning banner; the weather page only calls the returned hook.
const MOCK_BANNER_TEXT = "MOCK precipitation data — preview only; not a real forecast.";
const UNCERTAINTY_BANNER_TEXT = "MOCK uncertainty-only precipitation — 0 mm expected, possible maximum shown; not a real forecast.";

export function createRainMock(search = window.location.search) {
  const variant = new URLSearchParams(search).get("mockRain");
  if (variant === null) return null;

  const uncertaintyOnly = variant === "uncertainty";
  let banner = null;

  function showRequiredBanner() {
    if (!banner) {
      const card = document.querySelector(".graph-card[data-key='precip']");
      const graphHeader = card?.querySelector(".graph-header");
      if (!card || !graphHeader) {
        throw new Error("Rain mock mode was requested without a place for its required MOCK banner.");
      }

      banner = document.createElement("p");
      banner.role = "status";
      banner.textContent = uncertaintyOnly ? UNCERTAINTY_BANNER_TEXT : MOCK_BANNER_TEXT;
      banner.style.cssText = "margin: 0 0 8px; padding: 8px 10px; border: 1px solid #f59e0b; border-radius: var(--radius-sm); background: color-mix(in srgb, #f59e0b 16%, var(--surface)); color: var(--text); font-size: 0.78rem; font-weight: 700;";
      graphHeader.after(banner);
    }

    if (!banner.isConnected || banner.hidden || banner.style.display === "none") {
      throw new Error("Rain mock mode was blocked because its required MOCK banner is not visible.");
    }
  }

  function applyForecast(points, dayIndex) {
    // Never mutate forecast values until the warning has been created and
    // verified. This keeps every future mock variant visibly labelled.
    showRequiredBanner();
    if (uncertaintyOnly) {
      applyUncertaintyOnlyForecast(points, dayIndex);
    } else {
      applyIntervalForecast(points, dayIndex);
    }
  }

  return { applyForecast, rainScaleMaximum: 3 };
}

function applyIntervalForecast(points, dayIndex) {
  // Today demonstrates hourly totals; later days demonstrate six-hour totals.
  const hourlyAmounts = [0, 0.1, 0.3, 0.7, 0.4, 0.1, 0, 0, 0.2, 0.6, 1.1, 0.5, 0.1, 0, 0, 0.2, 0.5, 0.3, 0, 0, 0.1, 0.4, 0.2, 0];
  const sixHourAmounts = [1.4, 0.3, 2.6, 0.8];

  points.forEach(point => {
    if (dayIndex === 0) {
      point.rain = hourlyAmounts[point.hour];
      point.rainMax = point.rain;
      point.rainMin = point.rain;
      point.rainProb = point.rain > 0 ? 65 : 15;
      point.rainIntervalHours = 1;
      return;
    }

    point.rain = null;
    point.rainMax = null;
    point.rainMin = null;
    point.rainProb = null;
    point.rainIntervalHours = null;
    if (point.hour % 6 === 0) {
      point.rain = sixHourAmounts[point.hour / 6];
      point.rainMax = point.rain + 0.5;
      point.rainMin = Math.max(0, point.rain - 0.3);
      point.rainProb = 70;
      point.rainIntervalHours = 6;
    }
  });
}

function applyUncertaintyOnlyForecast(points, dayIndex) {
  const hourlyMaximums = [0.2, 0.5, 0.8, 0.3, 0.6, 1.1, 0.4, 0.2, 0.7, 0.3, 0.9, 0.4, 0.2, 0.5, 0.8, 0.3, 0.6, 1.0, 0.4, 0.2, 0.5, 0.7, 0.3, 0.2];
  const sixHourMaximums = [1.1, 0.4, 1.8, 0.7];

  points.forEach(point => {
    point.rain = dayIndex === 0 ? 0 : null;
    point.rainMin = 0;
    point.rainMax = null;
    point.rainProb = dayIndex === 0 ? 30 : 45;
    point.rainIntervalHours = dayIndex === 0 ? 1 : null;

    if (dayIndex === 0) {
      point.rainMax = hourlyMaximums[point.hour];
    } else if (point.hour % 6 === 0) {
      point.rain = 0;
      point.rainMax = sixHourMaximums[point.hour / 6];
      point.rainIntervalHours = 6;
    }
  });
}
