import { formatNotamDateTime } from "../lib/datetime-local";
import { isAirportNotamLive } from "../lib/airport-notam";
import { getSupabase } from "../lib/supabase";

const banner = document.getElementById("airport-notam");
const reasonEl = document.getElementById("airport-notam-reason");
const closesEl = document.getElementById("airport-notam-closes");
const opensEl = document.getElementById("airport-notam-opens");

const NOTAM_POLL_MS = 60_000;

type PublicNotam = {
  reason: string | null;
  closes_at: string | null;
  opens_at: string | null;
};

function showNotam(data: PublicNotam) {
  if (!banner) return;

  if (reasonEl) {
    reasonEl.textContent = data.reason?.trim() || "The airport is temporarily closed.";
  }
  if (closesEl) closesEl.textContent = formatNotamDateTime(data.closes_at);
  if (opensEl) opensEl.textContent = formatNotamDateTime(data.opens_at);

  banner.hidden = false;
}

async function loadAirportNotamFallback() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("airport_notam")
    .select("reason, closes_at, opens_at, is_active")
    .eq("id", 1)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data || !isAirportNotamLive(data)) {
    if (banner) banner.hidden = true;
    return;
  }

  showNotam(data);
}

async function loadAirportNotam() {
  if (!banner) return;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("public_airport_notam").maybeSingle();

    if (error) {
      const missingRpc =
        error.code === "PGRST202" ||
        error.message.toLowerCase().includes("public_airport_notam");
      if (missingRpc) {
        await loadAirportNotamFallback();
        return;
      }
      throw error;
    }

    if (!data) {
      banner.hidden = true;
      return;
    }

    showNotam(data);
  } catch {
    /* Leave banner hidden if NOTAM cannot be loaded */
  }
}

loadAirportNotam();
window.setInterval(loadAirportNotam, NOTAM_POLL_MS);
