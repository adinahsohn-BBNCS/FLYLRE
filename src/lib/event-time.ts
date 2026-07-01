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
