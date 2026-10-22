export const RTSP_ME_EMBED_PATTERN = /^https:\/\/rtsp\.me\/embed\/[A-Za-z0-9]+\/$/;

/** Accepts an rtsp.me embed link or the full iframe code and returns the canonical embed link. */
export function normalizeRtspMeEmbed(input: string): string | null {
  const match = input.match(/https:\/\/rtsp\.me\/embed\/([A-Za-z0-9]+)\/?/);
  return match ? `https://rtsp.me/embed/${match[1]}/` : null;
}

export function isRtspMeEmbed(url: string | null | undefined): url is string {
  return typeof url === "string" && RTSP_ME_EMBED_PATTERN.test(url);
}

/** First day of the current month in UTC, matching runway_camera_views.month. */
export function currentCameraMonth(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/** e.g. "November 1" — when the monthly view count resets. */
export function nextCameraResetLabel(now = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString(undefined, { month: "long", day: "numeric", timeZone: "UTC" });
}
