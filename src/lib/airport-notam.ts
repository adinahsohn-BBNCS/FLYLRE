export type AirportNotamSchedule = {
  is_active: boolean;
  reason: string | null;
  closes_at: string | null;
  opens_at: string | null;
};

/** True when the NOTAM should appear on the public home page. */
export function isAirportNotamLive(notam: AirportNotamSchedule): boolean {
  if (!notam.is_active) return false;
  if (!notam.closes_at) return true;

  const closesAt = new Date(notam.closes_at);
  if (Number.isNaN(closesAt.getTime())) return true;

  return Date.now() >= closesAt.getTime();
}

/** True when enabled but waiting for the closed-from time. */
export function isAirportNotamScheduled(notam: AirportNotamSchedule): boolean {
  if (!notam.is_active || !notam.closes_at) return false;

  const closesAt = new Date(notam.closes_at);
  if (Number.isNaN(closesAt.getTime())) return false;

  return Date.now() < closesAt.getTime();
}
