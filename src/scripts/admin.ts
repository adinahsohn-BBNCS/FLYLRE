import { getSupabase, type EventPhoto, type EventRsvp, type EventSubmission, type FlyoutSubmission, type PilotSubmission } from "../lib/supabase";
import { formatEventTime, parseEventTimeForInput } from "../lib/event-time";

const loginSection = document.getElementById("admin-login");
const dashboard = document.getElementById("admin-dashboard");
const loginForm = document.getElementById("admin-login-form") as HTMLFormElement | null;
const loginError = document.getElementById("admin-login-error");
const logoutBtn = document.getElementById("admin-logout");
const reviewMessage = document.getElementById("admin-review-message");

const pilotPendingList = document.getElementById("pilot-pending-list");
const pilotPendingEmpty = document.getElementById("pilot-pending-empty");
const pilotLiveList = document.getElementById("pilot-live-list");
const pilotLiveEmpty = document.getElementById("pilot-live-empty");

const eventPendingList = document.getElementById("event-pending-list");
const eventPendingEmpty = document.getElementById("event-pending-empty");
const eventRsvpPendingList = document.getElementById("event-rsvp-pending-list");
const eventRsvpPendingEmpty = document.getElementById("event-rsvp-pending-empty");
const eventPhotoPendingList = document.getElementById("event-photo-pending-list");
const eventPhotoPendingEmpty = document.getElementById("event-photo-pending-empty");
const eventLiveList = document.getElementById("event-live-list");
const eventLiveEmpty = document.getElementById("event-live-empty");

let eventTitleById = new Map<string, string>();

const flyoutPendingList = document.getElementById("flyout-pending-list");
const flyoutPendingEmpty = document.getElementById("flyout-pending-empty");
const flyoutLiveList = document.getElementById("flyout-live-list");
const flyoutLiveEmpty = document.getElementById("flyout-live-empty");

const tabButtons = document.querySelectorAll<HTMLButtonElement>(".admin-tab");
const panels = {
  pilots: document.getElementById("admin-panel-pilots"),
  events: document.getElementById("admin-panel-events"),
  flyouts: document.getElementById("admin-panel-flyouts"),
};

function showMessage(message: string) {
  if (!reviewMessage) return;
  reviewMessage.hidden = false;
  reviewMessage.textContent = message;
}

function showLoginError(message: string) {
  if (!loginError) return;
  loginError.hidden = false;
  loginError.textContent = message;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatEventDate(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function setActiveTab(tab: "pilots" | "events" | "flyouts") {
  tabButtons.forEach((button) => {
    const active = button.dataset.tab === tab;
    button.setAttribute("aria-selected", active ? "true" : "false");
    button.classList.toggle("admin-tab-active", active);
  });

  if (panels.pilots) panels.pilots.hidden = tab !== "pilots";
  if (panels.events) panels.events.hidden = tab !== "events";
  if (panels.flyouts) panels.flyouts.hidden = tab !== "flyouts";

  const hash =
    tab === "events" ? "/admin/#events" : tab === "flyouts" ? "/admin/#flyouts" : "/admin/";
  history.replaceState(null, "", hash);
}

function readTabFromHash(): "pilots" | "events" | "flyouts" {
  if (window.location.hash === "#events") return "events";
  if (window.location.hash === "#flyouts") return "flyouts";
  return "pilots";
}

function renderPilotPending(submission: PilotSubmission) {
  const photo = submission.photo_url
    ? `<a class="admin-photo-link" href="${escapeHtml(submission.photo_url)}" target="_blank" rel="noopener">View plane photo</a>`
    : `<span class="admin-muted">No photo</span>`;

  return `
    <article class="admin-card" data-id="${submission.id}" data-kind="pilot">
      <div class="admin-card-header">
        <h3>${escapeHtml(submission.name)}</h3>
        <time>${formatDate(submission.created_at)}</time>
      </div>
      <p class="admin-meta"><strong>Email:</strong> ${escapeHtml(submission.email)}</p>
      <p class="admin-meta"><strong>Aircraft:</strong> ${escapeHtml(submission.aircraft ?? "—")}</p>
      <p class="admin-meta">${photo}</p>
      <p class="admin-bio">${escapeHtml(submission.bio)}</p>
      <div class="admin-actions">
        <button type="button" class="form-submit admin-approve" data-action="approved">Approve</button>
        <button type="button" class="admin-reject" data-action="rejected">Reject</button>
      </div>
    </article>
  `;
}

function renderPilotLive(submission: PilotSubmission) {
  const photo = submission.photo_url
    ? `<p class="admin-meta"><a class="admin-photo-link" href="${escapeHtml(submission.photo_url)}" target="_blank" rel="noopener">View plane photo</a></p>`
    : "";

  return `
    <article class="admin-card admin-card-edit" data-id="${submission.id}" data-kind="pilot">
      <div class="admin-card-header">
        <h3>${escapeHtml(submission.name)}</h3>
        <time>Approved ${formatDate(submission.reviewed_at ?? submission.created_at)}</time>
      </div>
      ${photo}
      <form class="admin-edit-form" data-kind="pilot">
        <div class="form-field">
          <label>Name</label>
          <input name="name" type="text" required value="${escapeHtml(submission.name)}" />
        </div>
        <div class="form-field">
          <label>Email</label>
          <input name="email" type="email" required value="${escapeHtml(submission.email)}" />
        </div>
        <div class="form-field">
          <label>Aircraft</label>
          <input name="aircraft" type="text" value="${escapeHtml(submission.aircraft ?? "")}" />
        </div>
        <div class="form-field">
          <label>About</label>
          <textarea name="bio" rows="4" required>${escapeHtml(submission.bio)}</textarea>
        </div>
        <div class="admin-actions">
          <button type="submit" class="form-submit">Save changes</button>
          <button type="button" class="admin-reject" data-action="unpublish">Remove from site</button>
        </div>
      </form>
    </article>
  `;
}

function renderEventPending(submission: EventSubmission) {
  return `
    <article class="admin-card" data-id="${submission.id}" data-kind="event">
      <div class="admin-card-header">
        <h3>${escapeHtml(submission.title)}</h3>
        <time>${formatDate(submission.created_at)}</time>
      </div>
      <p class="admin-meta"><strong>Date:</strong> ${formatEventDate(submission.event_date)}${submission.event_time ? ` · ${escapeHtml(formatEventTime(submission.event_time) ?? submission.event_time)}` : ""}</p>
      <p class="admin-meta"><strong>Location:</strong> ${escapeHtml(submission.location ?? "—")}</p>
      <p class="admin-meta"><strong>Submitted by:</strong> ${escapeHtml(submission.submitter_name)} (${escapeHtml(submission.submitter_email)})</p>
      <p class="admin-bio">${escapeHtml(submission.description)}</p>
      <div class="admin-actions">
        <button type="button" class="form-submit admin-approve" data-action="approved">Approve</button>
        <button type="button" class="admin-reject" data-action="rejected">Reject</button>
      </div>
    </article>
  `;
}

function renderEventLive(submission: EventSubmission) {
  return `
    <article class="admin-card admin-card-edit" data-id="${submission.id}" data-kind="event">
      <div class="admin-card-header">
        <h3>${escapeHtml(submission.title)}</h3>
        <time>Approved ${formatDate(submission.reviewed_at ?? submission.created_at)}</time>
      </div>
      <form class="admin-edit-form" data-kind="event">
        <div class="form-field">
          <label>Title</label>
          <input name="title" type="text" required value="${escapeHtml(submission.title)}" />
        </div>
        <div class="form-field">
          <label>Date</label>
          <input name="event_date" type="date" required value="${escapeHtml(submission.event_date)}" />
        </div>
        <div class="form-field">
          <label>Time</label>
          <input name="event_time" type="time" step="900" value="${escapeHtml(parseEventTimeForInput(submission.event_time))}" />
        </div>
        <div class="form-field">
          <label>Location</label>
          <input name="location" type="text" value="${escapeHtml(submission.location ?? "")}" />
        </div>
        <div class="form-field">
          <label>Description</label>
          <textarea name="description" rows="4" required>${escapeHtml(submission.description)}</textarea>
        </div>
        <div class="form-field">
          <label>Submitter name</label>
          <input name="submitter_name" type="text" required value="${escapeHtml(submission.submitter_name)}" />
        </div>
        <div class="form-field">
          <label>Submitter email</label>
          <input name="submitter_email" type="email" required value="${escapeHtml(submission.submitter_email)}" />
        </div>
        <div class="admin-actions">
          <button type="submit" class="form-submit">Save changes</button>
          <button type="button" class="admin-reject" data-action="unpublish">Remove from site</button>
        </div>
      </form>
    </article>
  `;
}

function renderEventRsvpPending(rsvp: EventRsvp) {
  const eventTitle = eventTitleById.get(rsvp.event_id) ?? "Unknown event";
  return `
    <article class="admin-card" data-id="${rsvp.id}" data-kind="event-rsvp">
      <div class="admin-card-header">
        <h3>${escapeHtml(rsvp.name)}</h3>
        <time>${formatDate(rsvp.created_at)}</time>
      </div>
      <p class="admin-meta"><strong>Event:</strong> ${escapeHtml(eventTitle)}</p>
      <p class="admin-meta"><strong>Email:</strong> ${escapeHtml(rsvp.email)}</p>
      <p class="admin-meta"><strong>Guests:</strong> ${rsvp.guests}</p>
      ${rsvp.note ? `<p class="admin-bio">${escapeHtml(rsvp.note)}</p>` : ""}
      <div class="admin-actions">
        <button type="button" class="form-submit admin-approve" data-action="approved">Approve</button>
        <button type="button" class="admin-reject" data-action="rejected">Reject</button>
      </div>
    </article>
  `;
}

function renderEventPhotoPending(photo: EventPhoto) {
  const eventTitle = eventTitleById.get(photo.event_id) ?? "Unknown event";
  return `
    <article class="admin-card" data-id="${photo.id}" data-kind="event-photo">
      <div class="admin-card-header">
        <h3>${escapeHtml(photo.submitter_name)}</h3>
        <time>${formatDate(photo.created_at)}</time>
      </div>
      <p class="admin-meta"><strong>Event:</strong> ${escapeHtml(eventTitle)}</p>
      <p class="admin-meta"><strong>Email:</strong> ${escapeHtml(photo.submitter_email)}</p>
      ${photo.caption ? `<p class="admin-bio">${escapeHtml(photo.caption)}</p>` : ""}
      <p class="admin-meta">
        <a class="admin-photo-link" href="${escapeHtml(photo.photo_url)}" target="_blank" rel="noopener">View photo</a>
      </p>
      <img class="admin-event-photo-preview" src="${escapeHtml(photo.photo_url)}" alt="Submitted event photo" loading="lazy" />
      <div class="admin-actions">
        <button type="button" class="form-submit admin-approve" data-action="approved">Approve</button>
        <button type="button" class="admin-reject" data-action="rejected">Reject</button>
      </div>
    </article>
  `;
}

function renderFlyoutPending(submission: FlyoutSubmission) {
  return `
    <article class="admin-card" data-id="${submission.id}" data-kind="flyout">
      <div class="admin-card-header">
        <h3>${escapeHtml(submission.name)}</h3>
        <time>${formatDate(submission.created_at)}</time>
      </div>
      <p class="admin-meta"><strong>Time / distance:</strong> ${escapeHtml(submission.meta ?? "—")}</p>
      <p class="admin-meta"><strong>Submitted by:</strong> ${escapeHtml(submission.submitter_name)} (${escapeHtml(submission.submitter_email)})</p>
      <p class="admin-bio">${escapeHtml(submission.description)}</p>
      <div class="admin-actions">
        <button type="button" class="form-submit admin-approve" data-action="approved">Approve</button>
        <button type="button" class="admin-reject" data-action="rejected">Reject</button>
      </div>
    </article>
  `;
}

function renderFlyoutLive(submission: FlyoutSubmission) {
  return `
    <article class="admin-card admin-card-edit" data-id="${submission.id}" data-kind="flyout">
      <div class="admin-card-header">
        <h3>${escapeHtml(submission.name)}</h3>
        <time>Approved ${formatDate(submission.reviewed_at ?? submission.created_at)}</time>
      </div>
      <form class="admin-edit-form" data-kind="flyout">
        <div class="form-field">
          <label>Destination</label>
          <input name="name" type="text" required value="${escapeHtml(submission.name)}" />
        </div>
        <div class="form-field">
          <label>Time / distance</label>
          <input name="meta" type="text" value="${escapeHtml(submission.meta ?? "")}" />
        </div>
        <div class="form-field">
          <label>Description</label>
          <textarea name="description" rows="4" required>${escapeHtml(submission.description)}</textarea>
        </div>
        <div class="form-field">
          <label>Submitter name</label>
          <input name="submitter_name" type="text" required value="${escapeHtml(submission.submitter_name)}" />
        </div>
        <div class="form-field">
          <label>Submitter email</label>
          <input name="submitter_email" type="email" required value="${escapeHtml(submission.submitter_email)}" />
        </div>
        <div class="admin-actions">
          <button type="submit" class="form-submit">Save changes</button>
          <button type="button" class="admin-reject" data-action="unpublish">Remove from site</button>
        </div>
      </form>
    </article>
  `;
}

async function loadPilotPending() {
  if (!pilotPendingList) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pilot_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    showMessage(error.message);
    return;
  }

  if (!data?.length) {
    pilotPendingList.innerHTML = "";
    if (pilotPendingEmpty) pilotPendingEmpty.hidden = false;
    return;
  }

  if (pilotPendingEmpty) pilotPendingEmpty.hidden = true;
  pilotPendingList.innerHTML = data.map(renderPilotPending).join("");
}

async function loadPilotLive() {
  if (!pilotLiveList) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pilot_submissions")
    .select("*")
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false });

  if (error) {
    showMessage(error.message);
    return;
  }

  if (!data?.length) {
    pilotLiveList.innerHTML = "";
    if (pilotLiveEmpty) pilotLiveEmpty.hidden = false;
    return;
  }

  if (pilotLiveEmpty) pilotLiveEmpty.hidden = true;
  pilotLiveList.innerHTML = data.map(renderPilotLive).join("");
}

async function refreshEventTitles() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("event_submissions")
    .select("id, title")
    .eq("status", "approved");

  if (error) {
    showMessage(error.message);
    return;
  }

  eventTitleById = new Map((data ?? []).map((event) => [event.id, event.title]));
}

async function loadEventPending() {
  if (!eventPendingList) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("event_submissions")
    .select("*")
    .eq("status", "pending")
    .order("event_date", { ascending: true });

  if (error) {
    showMessage(error.message);
    return;
  }

  if (!data?.length) {
    eventPendingList.innerHTML = "";
    if (eventPendingEmpty) eventPendingEmpty.hidden = false;
    return;
  }

  if (eventPendingEmpty) eventPendingEmpty.hidden = true;
  eventPendingList.innerHTML = data.map(renderEventPending).join("");
}

async function loadEventLive() {
  if (!eventLiveList) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("event_submissions")
    .select("*")
    .eq("status", "approved")
    .order("event_date", { ascending: false });

  if (error) {
    showMessage(error.message);
    return;
  }

  if (!data?.length) {
    eventLiveList.innerHTML = "";
    if (eventLiveEmpty) eventLiveEmpty.hidden = false;
    return;
  }

  if (eventLiveEmpty) eventLiveEmpty.hidden = true;
  eventLiveList.innerHTML = data.map(renderEventLive).join("");
}

async function loadEventRsvpPending() {
  if (!eventRsvpPendingList) return;

  await refreshEventTitles();

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    showMessage(error.message);
    return;
  }

  if (!data?.length) {
    eventRsvpPendingList.innerHTML = "";
    if (eventRsvpPendingEmpty) eventRsvpPendingEmpty.hidden = false;
    return;
  }

  if (eventRsvpPendingEmpty) eventRsvpPendingEmpty.hidden = true;
  eventRsvpPendingList.innerHTML = data.map(renderEventRsvpPending).join("");
}

async function loadEventPhotoPending() {
  if (!eventPhotoPendingList) return;

  await refreshEventTitles();

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("event_photos")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    showMessage(error.message);
    return;
  }

  if (!data?.length) {
    eventPhotoPendingList.innerHTML = "";
    if (eventPhotoPendingEmpty) eventPhotoPendingEmpty.hidden = false;
    return;
  }

  if (eventPhotoPendingEmpty) eventPhotoPendingEmpty.hidden = true;
  eventPhotoPendingList.innerHTML = data.map(renderEventPhotoPending).join("");
}

async function loadFlyoutPending() {
  if (!flyoutPendingList) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("flyout_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    showMessage(error.message);
    return;
  }

  if (!data?.length) {
    flyoutPendingList.innerHTML = "";
    if (flyoutPendingEmpty) flyoutPendingEmpty.hidden = false;
    return;
  }

  if (flyoutPendingEmpty) flyoutPendingEmpty.hidden = true;
  flyoutPendingList.innerHTML = data.map(renderFlyoutPending).join("");
}

async function loadFlyoutLive() {
  if (!flyoutLiveList) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("flyout_submissions")
    .select("*")
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false });

  if (error) {
    showMessage(error.message);
    return;
  }

  if (!data?.length) {
    flyoutLiveList.innerHTML = "";
    if (flyoutLiveEmpty) flyoutLiveEmpty.hidden = false;
    return;
  }

  if (flyoutLiveEmpty) flyoutLiveEmpty.hidden = true;
  flyoutLiveList.innerHTML = data.map(renderFlyoutLive).join("");
}

async function showDashboard() {
  if (loginSection) loginSection.hidden = true;
  if (dashboard) dashboard.hidden = false;
  setActiveTab(readTabFromHash());
  await Promise.all([
    loadPilotPending(),
    loadPilotLive(),
    loadEventPending(),
    loadEventRsvpPending(),
    loadEventPhotoPending(),
    loadEventLive(),
    loadFlyoutPending(),
    loadFlyoutLive(),
  ]);
}

async function showLoginPanel() {
  if (loginSection) loginSection.hidden = false;
  if (dashboard) dashboard.hidden = true;
}

async function updatePilotStatus(id: string, status: "approved" | "rejected") {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("pilot_submissions")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function updateEventStatus(id: string, status: "approved" | "rejected") {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("event_submissions")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function updateEventRsvpStatus(id: string, status: "approved" | "rejected") {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("event_rsvps")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function updateEventPhotoStatus(id: string, status: "approved" | "rejected") {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("event_photos")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function updateFlyoutStatus(id: string, status: "approved" | "rejected") {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("flyout_submissions")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab as "pilots" | "events" | "flyouts" | undefined;
    if (tab) setActiveTab(tab);
  });
});

window.addEventListener("hashchange", () => {
  if (dashboard && !dashboard.hidden) {
    setActiveTab(readTabFromHash());
  }
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (loginError) loginError.hidden = true;

    const data = new FormData(loginForm);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showLoginError("Sign in failed. Check your email and password.");
      return;
    }

    await showDashboard();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    await showLoginPanel();
  });
}

document.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest("button[data-action]") as HTMLButtonElement | null;
  if (!button || button.dataset.action === "unpublish") return;

  const card = button.closest(".admin-card") as HTMLElement | null;
  if (!card) return;

  const id = card.dataset.id;
  const kind = card.dataset.kind;
  const status = button.dataset.action as "approved" | "rejected";
  if (!id || !kind || !status) return;

  button.disabled = true;

  try {
    if (kind === "pilot") {
      await updatePilotStatus(id, status);
      card.remove();
      if (pilotPendingList?.children.length === 0 && pilotPendingEmpty) {
        pilotPendingEmpty.hidden = false;
      }
      if (status === "approved") await loadPilotLive();
      showMessage(
        status === "approved"
          ? "Approved — profile is now live on Meet the Planes."
          : "Rejected — pilot submission removed from the pending queue.",
      );
    } else if (kind === "event") {
      await updateEventStatus(id, status);
      card.remove();
      if (eventPendingList?.children.length === 0 && eventPendingEmpty) {
        eventPendingEmpty.hidden = false;
      }
      if (status === "approved") {
        await loadEventLive();
        await refreshEventTitles();
      }
      showMessage(
        status === "approved"
          ? "Approved — event is now live on the Events page."
          : "Rejected — event submission removed from the pending queue.",
      );
    } else if (kind === "event-rsvp") {
      await updateEventRsvpStatus(id, status);
      card.remove();
      if (eventRsvpPendingList?.children.length === 0 && eventRsvpPendingEmpty) {
        eventRsvpPendingEmpty.hidden = false;
      }
      showMessage(
        status === "approved"
          ? "Approved — RSVP is now counted on the Events page."
          : "Rejected — RSVP removed from the pending queue.",
      );
    } else if (kind === "event-photo") {
      await updateEventPhotoStatus(id, status);
      card.remove();
      if (eventPhotoPendingList?.children.length === 0 && eventPhotoPendingEmpty) {
        eventPhotoPendingEmpty.hidden = false;
      }
      showMessage(
        status === "approved"
          ? "Approved — photo is now live on the Events page."
          : "Rejected — photo removed from the pending queue.",
      );
    } else {
      await updateFlyoutStatus(id, status);
      card.remove();
      if (flyoutPendingList?.children.length === 0 && flyoutPendingEmpty) {
        flyoutPendingEmpty.hidden = false;
      }
      if (status === "approved") await loadFlyoutLive();
      showMessage(
        status === "approved"
          ? "Approved — fly-out is now live on Plan Your Next Adventure."
          : "Rejected — fly-out submission removed from the pending queue.",
      );
    }
  } catch (err) {
    showMessage(err instanceof Error ? err.message : "Update failed. Please try again.");
    button.disabled = false;
  }
});

document.addEventListener("submit", async (event) => {
  const form = (event.target as HTMLElement).closest("form.admin-edit-form") as HTMLFormElement | null;
  if (!form) return;

  event.preventDefault();

  const card = form.closest(".admin-card") as HTMLElement | null;
  if (!card) return;

  const id = card.dataset.id;
  const kind = form.dataset.kind;
  if (!id || !kind) return;

  const data = new FormData(form);
  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
  if (submitBtn) submitBtn.disabled = true;

  try {
    const supabase = getSupabase();

    if (kind === "pilot") {
      const name = String(data.get("name") ?? "").trim();
      const email = String(data.get("email") ?? "").trim();
      const aircraft = String(data.get("aircraft") ?? "").trim();
      const bio = String(data.get("bio") ?? "").trim();

      const { error } = await supabase
        .from("pilot_submissions")
        .update({ name, email, aircraft: aircraft || null, bio })
        .eq("id", id)
        .eq("status", "approved");

      if (error) throw error;
      showMessage(`Saved changes for ${name}.`);
      await loadPilotLive();
    } else if (kind === "event") {
      const title = String(data.get("title") ?? "").trim();
      const event_date = String(data.get("event_date") ?? "").trim();
      const event_time = String(data.get("event_time") ?? "").trim();
      const location = String(data.get("location") ?? "").trim();
      const description = String(data.get("description") ?? "").trim();
      const submitter_name = String(data.get("submitter_name") ?? "").trim();
      const submitter_email = String(data.get("submitter_email") ?? "").trim();

      const { error } = await supabase
        .from("event_submissions")
        .update({
          title,
          event_date,
          event_time: event_time || null,
          location: location || null,
          description,
          submitter_name,
          submitter_email,
        })
        .eq("id", id)
        .eq("status", "approved");

      if (error) throw error;
      showMessage(`Saved changes for ${title}.`);
      await loadEventLive();
    } else {
      const name = String(data.get("name") ?? "").trim();
      const meta = String(data.get("meta") ?? "").trim();
      const description = String(data.get("description") ?? "").trim();
      const submitter_name = String(data.get("submitter_name") ?? "").trim();
      const submitter_email = String(data.get("submitter_email") ?? "").trim();

      const { error } = await supabase
        .from("flyout_submissions")
        .update({
          name,
          meta: meta || null,
          description,
          submitter_name,
          submitter_email,
        })
        .eq("id", id)
        .eq("status", "approved");

      if (error) throw error;
      showMessage(`Saved changes for ${name}.`);
      await loadFlyoutLive();
    }
  } catch (err) {
    showMessage(err instanceof Error ? err.message : "Save failed. Please try again.");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

document.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest('button[data-action="unpublish"]') as HTMLButtonElement | null;
  if (!button) return;

  const card = button.closest(".admin-card") as HTMLElement | null;
  if (!card) return;

  const id = card.dataset.id;
  const kind = card.dataset.kind;
  if (!id || !kind) return;

  const label =
    kind === "pilot"
      ? ((card.querySelector('input[name="name"]') as HTMLInputElement | null)?.value ?? "this pilot")
      : kind === "event"
        ? ((card.querySelector('input[name="title"]') as HTMLInputElement | null)?.value ?? "this event")
        : ((card.querySelector('input[name="name"]') as HTMLInputElement | null)?.value ?? "this fly-out");

  const page =
    kind === "pilot"
      ? "Meet the Planes"
      : kind === "event"
        ? "Events"
        : "Plan Your Next Adventure";
  if (!confirm(`Remove ${label} from the public ${page} page?`)) return;

  button.disabled = true;

  try {
    if (kind === "pilot") {
      await updatePilotStatus(id, "rejected");
      card.remove();
      if (pilotLiveList?.children.length === 0 && pilotLiveEmpty) {
        pilotLiveEmpty.hidden = false;
      }
    } else if (kind === "event") {
      await updateEventStatus(id, "rejected");
      card.remove();
      if (eventLiveList?.children.length === 0 && eventLiveEmpty) {
        eventLiveEmpty.hidden = false;
      }
    } else {
      await updateFlyoutStatus(id, "rejected");
      card.remove();
      if (flyoutLiveList?.children.length === 0 && flyoutLiveEmpty) {
        flyoutLiveEmpty.hidden = false;
      }
    }
    showMessage(`${label} was removed from the public page.`);
  } catch (err) {
    showMessage(err instanceof Error ? err.message : "Remove failed. Please try again.");
    button.disabled = false;
  }
});

(async () => {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await showDashboard();
  }
})();
