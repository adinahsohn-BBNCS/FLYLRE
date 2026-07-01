import { getSupabase, type FlyoutSubmission } from "../lib/supabase";

const listEl = document.getElementById("flyout-list");
const emptyEl = document.getElementById("flyout-list-empty");
const loadingEl = document.getElementById("flyout-list-loading");
const sectionEl = document.getElementById("community-flyouts");

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderFlyout(flyout: FlyoutSubmission) {
  const meta = flyout.meta
    ? `<span class="flyout-meta">${escapeHtml(flyout.meta)}</span>`
    : "";

  return `
    <article class="flyout">
      <div class="flyout-header">
        <h3>${escapeHtml(flyout.name)}</h3>
        ${meta}
      </div>
      <p>${escapeHtml(flyout.description)}</p>
    </article>
  `;
}

async function loadApprovedFlyouts() {
  if (!listEl) return;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("flyout_submissions")
      .select("*")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false });

    if (error) throw error;

    if (loadingEl) loadingEl.hidden = true;

    if (!data?.length) {
      if (sectionEl) sectionEl.hidden = true;
      return;
    }

    if (sectionEl) sectionEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
    listEl.innerHTML = data.map(renderFlyout).join("");
  } catch {
    if (loadingEl) loadingEl.hidden = true;
    if (sectionEl) sectionEl.hidden = false;
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.textContent =
        "Unable to load fly-outs from local pilots right now. Please try again later or email info@flylre.com.";
    }
  }
}

loadApprovedFlyouts();
