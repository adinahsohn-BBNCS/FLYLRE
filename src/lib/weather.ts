export type PwsObservation = {
  stationID: string;
  obsTimeUtc: string;
  obsTimeLocal: string;
  winddir?: number;
  humidity?: number;
  imperial?: {
    temp?: number;
    heatIndex?: number;
    dewpt?: number;
    windSpeed?: number;
    windGust?: number;
    pressure?: number;
    precipRate?: number;
    precipTotal?: number;
  };
};

export type PwsResponse = {
  observations?: PwsObservation[];
};

export function windDirToCardinal(degrees: number | null | undefined): string {
  if (degrees == null || Number.isNaN(degrees)) return "—";
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(degrees / 22.5) % 16];
}

export function formatValue(value: number | null | undefined, unit = ""): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value}${unit}`;
}

export function formatUpdatedAt(obsTimeLocal: string | undefined): string {
  if (!obsTimeLocal) return "—";
  const parsed = new Date(obsTimeLocal.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return obsTimeLocal;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function fetchPwsObservation(
  stationId: string,
  apiKey: string,
): Promise<PwsObservation | null> {
  const params = new URLSearchParams({
    stationId,
    format: "json",
    units: "e",
    numericPrecision: "decimal",
    apiKey,
  });

  const response = await fetch(
    `https://api.weather.com/v2/pws/observations/current?${params.toString()}`,
  );

  if (response.status === 204) return null;

  if (!response.ok) {
    throw new Error(`Weather API returned ${response.status}`);
  }

  const data = (await response.json()) as PwsResponse;
  return data.observations?.[0] ?? null;
}
