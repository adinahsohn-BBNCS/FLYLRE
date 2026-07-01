import { getSupabase, type PilotSubmission } from "../lib/supabase";

const listEl = document.getElementById("pilot-list");
const emptyEl = document.getElementById("pilot-list-empty");
const loadingEl = document.getElementById("pilot-list-loading");

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderPilot(pilot: PilotSubmission) {
  const photo = pilot.photo_url
    ? `<img class="pilot-photo" src="${escapeHtml(pilot.photo_url)}" alt="" loading="lazy" />`
    : "";
  const aircraft = pilot.aircraft
    ? `<p class="pilot-aircraft">${escapeHtml(pilot.aircraft)}</p>`
    : "";

  return `
    <article class="pilot-card">
      ${photo}
      <h3>${escapeHtml(pilot.name)}</h3>
      ${aircraft}
      <p>${escapeHtml(pilot.bio)}</p>
    </article>
  `;
}

async function loadApprovedPilots() {
  if (!listEl) return;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("pilot_submissions")
      .select("*")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false });

    if (error) throw error;

    if (loadingEl) loadingEl.hidden = true;

    if (!data?.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    listEl.innerHTML = data.map(renderPilot).join("");
  } catch {
    if (loadingEl) loadingEl.hidden = true;
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.textContent =
        "Unable to load pilot profiles right now. Please try again later or email info@flylre.com.";
    }
  }
}

loadApprovedPilots();
