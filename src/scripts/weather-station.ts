import {
  fetchPwsObservation,
  formatUpdatedAt,
  formatValue,
  windDirToCardinal,
} from "../lib/weather";

const root = document.getElementById("weather-station");
const loadingEl = document.getElementById("weather-loading");
const contentEl = document.getElementById("weather-content");
const errorEl = document.getElementById("weather-error");
const updatedEl = document.getElementById("weather-updated");

const stationId = root?.dataset.stationId ?? "KCAAGUAN61";
const apiKey = root?.dataset.apiKey ?? "";
const dashboardUrl =
  root?.dataset.dashboardUrl ??
  `https://www.wunderground.com/dashboard/pws/${stationId}`;

function setMetric(id: string, value: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showError(message: string) {
  if (loadingEl) loadingEl.hidden = true;
  if (contentEl) contentEl.hidden = true;
  if (errorEl) {
    errorEl.hidden = false;
    errorEl.textContent = message;
  }
}

function renderObservation(obs: NonNullable<Awaited<ReturnType<typeof fetchPwsObservation>>>) {
  const imperial = obs.imperial ?? {};
  const windDir = windDirToCardinal(obs.winddir);
  const windSpeed = formatValue(imperial.windSpeed, " mph");
  const windGust = formatValue(imperial.windGust, " mph");
  const wind =
    imperial.windSpeed != null
      ? `${windDir} @ ${windSpeed}${imperial.windGust != null ? ` (gust ${windGust})` : ""}`
      : "—";

  setMetric("weather-temp", formatValue(imperial.temp, "°F"));
  setMetric("weather-wind", wind);
  setMetric("weather-pressure", formatValue(imperial.pressure, " in"));
  setMetric("weather-dewpt", formatValue(imperial.dewpt, "°F"));
  setMetric("weather-humidity", formatValue(obs.humidity, "%"));
  setMetric(
    "weather-precip",
    imperial.precipRate != null && imperial.precipRate > 0
      ? `${imperial.precipRate} in/hr`
      : "None",
  );

  if (updatedEl) {
    updatedEl.textContent = `Updated ${formatUpdatedAt(obs.obsTimeLocal)} · Elev 3,410 ft MSL`;
  }

  if (loadingEl) loadingEl.hidden = true;
  if (errorEl) errorEl.hidden = true;
  if (contentEl) contentEl.hidden = false;
}

async function loadWeather() {
  if (!root) return;

  if (!apiKey) {
    showError(
      "Live weather is not configured yet. View current conditions on Weather Underground.",
    );
    return;
  }

  try {
    const observation = await fetchPwsObservation(stationId, apiKey);

    if (!observation) {
      showError(
        "The onsite station has not reported recently. It may be offline — check Weather Underground for the latest history.",
      );
      return;
    }

    renderObservation(observation);
  } catch {
    showError(
      "Unable to load live weather right now. Try again shortly or view the station on Weather Underground.",
    );
  }
}

const dashboardLink = document.getElementById("weather-dashboard-link") as HTMLAnchorElement | null;
if (dashboardLink) dashboardLink.href = dashboardUrl;

loadWeather();
