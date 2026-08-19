import { autoReopenAt, isAirportNotamLive, isAirportNotamScheduled } from "../lib/airport-notam";
import { formatNotamDateTime } from "../lib/datetime-local";
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

function scheduleAt(when: Date | null) {
  clearAppearanceTimer();
  if (!when) return;

  const delay = when.getTime() - Date.now();
  if (delay <= 0) return;
  if (delay > MAX_TIMEOUT_MS) return;

  appearanceTimer = window.setTimeout(() => {
    void loadAirportNotam();
  }, delay + 500);
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

    if (isAirportNotamScheduled(data)) {
      hideNotam();
      scheduleAt(data.closes_at ? new Date(data.closes_at) : null);
      return;
    }

    if (!isAirportNotamLive(data)) {
      clearAppearanceTimer();
      hideNotam();
      return;
    }

    showNotam(data);
    scheduleAt(autoReopenAt(data.opens_at));
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
