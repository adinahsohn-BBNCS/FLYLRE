/** Format an ISO timestamp for `<input type="datetime-local">` in local time. */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

/** Parse `<input type="datetime-local">` value to ISO, or null if empty. */
export function fromDatetimeLocalValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Human-readable date/time for NOTAM display. */
export function formatNotamDateTime(iso: string | null | undefined): string {
  if (!iso) return "Not specified";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
