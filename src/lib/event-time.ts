/** Format HH:MM (24h) or legacy free text for display. */
export function formatEventTime(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  const match24 = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = Number(match24[1]);
    const minutes = match24[2];
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  }

  return value.trim();
}

/** Parse stored time for `<input type="time">` (HH:MM). */
export function parseEventTimeForInput(value: string | null | undefined): string {
  if (!value?.trim()) return "";

  const match24 = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return `${match24[1].padStart(2, "0")}:${match24[2]}`;
  }

  const match12 = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = match12[2];
    const isPm = match12[3].toUpperCase() === "PM";
    if (isPm && hours !== 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  return "";
}

/** Minutes since midnight from stored event time, or null if not parseable. */
export function eventTimeMinutes(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;

  const match24 = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return Number(match24[1]) * 60 + Number(match24[2]);
  }

  const match12 = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = Number(match12[2]);
    const isPm = match12[3].toUpperCase() === "PM";
    if (isPm && hours !== 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  return null;
}

function todayDateStringLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True when an event belongs in the Past section (date before today, or start time has passed today). */
export function isEventPast(event: { event_date: string; event_time: string | null }): boolean {
  const today = todayDateStringLocal();
  if (event.event_date < today) return true;
  if (event.event_date > today) return false;

  const startMinutes = eventTimeMinutes(event.event_time);
  if (startMinutes === null) return false;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= startMinutes;
}
