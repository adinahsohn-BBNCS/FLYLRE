import { getSupabase, type PilotSubmission } from "../lib/supabase";

const sectionEl = document.getElementById("pilot-spotlight");
const loadingEl = document.getElementById("pilot-spotlight-loading");
const cardEl = document.getElementById("pilot-spotlight-card");

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pickRandomPilot(pilots: PilotSubmission[]) {
  return pilots[Math.floor(Math.random() * pilots.length)];
}

function renderSpotlight(pilot: PilotSubmission) {
  const photo = pilot.photo_url
    ? `<img class="pilot-spotlight-photo" src="${escapeHtml(pilot.photo_url)}" alt="" loading="lazy" />`
    : "";
  const aircraft = pilot.aircraft
    ? `<p class="pilot-aircraft">${escapeHtml(pilot.aircraft)}</p>`
    : "";

  return `
    ${photo}
    <div class="pilot-spotlight-body">
      <h3>${escapeHtml(pilot.name)}</h3>
      ${aircraft}
      <p class="pilot-spotlight-bio">${escapeHtml(pilot.bio)}</p>
    </div>
  `;
}

async function loadSpotlight() {
  if (!sectionEl || !cardEl) return;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("pilot_submissions")
      .select("*")
      .eq("status", "approved");

    if (error) throw error;

    if (loadingEl) loadingEl.hidden = true;

    if (!data?.length) {
      sectionEl.hidden = true;
      return;
    }

    const pilot = pickRandomPilot(data);
    cardEl.innerHTML = renderSpotlight(pilot);
    cardEl.hidden = false;
    sectionEl.hidden = false;
  } catch {
    if (loadingEl) loadingEl.hidden = true;
    sectionEl.hidden = true;
  }
}

loadSpotlight();
