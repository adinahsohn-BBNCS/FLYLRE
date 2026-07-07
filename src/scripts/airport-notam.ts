import { formatNotamDateTime } from "../lib/datetime-local";
import { isAirportNotamLive } from "../lib/airport-notam";
import { getSupabase } from "../lib/supabase";

const banner = document.getElementById("airport-notam");
const reasonEl = document.getElementById("airport-notam-reason");
const closesEl = document.getElementById("airport-notam-closes");
const opensEl = document.getElementById("airport-notam-opens");

const NOTAM_POLL_MS = 30_000;
const MAX_TIMEOUT_MS = 2_147_483_647;

type PublicNotam = {
  is_active: boolean;
  reason: string | null;
  closes_at: string | null;
  opens_at: string | null;
};

let appearanceTimer: number | undefined;
let pollTimer: number | undefined;

function clearAppearanceTimer() {
  if (appearanceTimer !== undefined) {
    window.clearTimeout(appearanceTimer);
    appearanceTimer = undefined;
  }
}

function showNotam(data: PublicNotam) {
  if (!banner) return;

  if (reasonEl) {
    reasonEl.textContent = data.reason?.trim() || "The airport is temporarily closed.";
  }
  if (closesEl) closesEl.textContent = formatNotamDateTime(data.closes_at);
  if (opensEl) opensEl.textContent = formatNotamDateTime(data.opens_at);

  banner.hidden = false;
}

function hideNotam() {
  if (banner) banner.hidden = true;
}

function scheduleAppearance(closesAt: string | null) {
  clearAppearanceTimer();
  if (!closesAt) return;

  const closesMs = new Date(closesAt).getTime();
  if (Number.isNaN(closesMs)) return;

  const delay = closesMs - Date.now();
  if (delay <= 0) return;
  if (delay > MAX_TIMEOUT_MS) return;

  appearanceTimer = window.setTimeout(() => {
    void loadAirportNotam();
  }, delay + 500);
}

async function loadAirportNotam() {
  if (!banner) return;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("airport_notam")
      .select("reason, closes_at, opens_at, is_active")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    if (!data?.is_active) {
      clearAppearanceTimer();
      hideNotam();
      return;
    }

    if (!isAirportNotamLive(data)) {
      hideNotam();
      scheduleAppearance(data.closes_at);
      return;
    }

    clearAppearanceTimer();
    showNotam(data);
  } catch {
    /* Leave banner hidden if NOTAM cannot be loaded */
  }
}

function startPolling() {
  if (pollTimer !== undefined) return;
  pollTimer = window.setInterval(() => {
    void loadAirportNotam();
  }, NOTAM_POLL_MS);
}

void loadAirportNotam();
startPolling();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void loadAirportNotam();
  }
});
