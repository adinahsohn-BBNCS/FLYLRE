export type AirportNotamSchedule = {
  is_active: boolean;
  reason: string | null;
  closes_at: string | null;
  opens_at: string | null;
};

/** Safety buffer after expected reopening before the home page notice hides automatically. */
export const AUTO_REOPEN_MS = 2 * 60 * 60 * 1000;

export function autoReopenAt(opensAt: string | null | undefined): Date | null {
  if (!opensAt) return null;

  const opens = new Date(opensAt);
  if (Number.isNaN(opens.getTime())) return null;

  return new Date(opens.getTime() + AUTO_REOPEN_MS);
}

/** True when the expected reopening time plus the 2-hour buffer has passed. */
export function isAirportNotamExpired(notam: AirportNotamSchedule): boolean {
  const reopen = autoReopenAt(notam.opens_at);
  if (!reopen) return false;

  return Date.now() >= reopen.getTime();
}

/** True when the NOTAM should appear on the public home page. */
export function isAirportNotamLive(notam: AirportNotamSchedule): boolean {
  if (!notam.is_active) return false;
  if (isAirportNotamExpired(notam)) return false;
  if (!notam.closes_at) return true;

  const closesAt = new Date(notam.closes_at);
  if (Number.isNaN(closesAt.getTime())) return true;

  return Date.now() >= closesAt.getTime();
}

/** True when enabled but waiting for the closed-from time. */
export function isAirportNotamScheduled(notam: AirportNotamSchedule): boolean {
  if (!notam.is_active || !notam.closes_at) return false;
  if (isAirportNotamExpired(notam)) return false;

  const closesAt = new Date(notam.closes_at);
  if (Number.isNaN(closesAt.getTime())) return false;

  return Date.now() < closesAt.getTime();
}
