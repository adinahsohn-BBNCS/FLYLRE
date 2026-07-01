import { getSupabase, type EventSubmission } from "../lib/supabase";
import { formatEventTime } from "../lib/event-time";

const upcomingList = document.getElementById("event-list-upcoming");
const pastList = document.getElementById("event-list-past");
const upcomingEmpty = document.getElementById("event-list-upcoming-empty");
const pastEmpty = document.getElementById("event-list-past-empty");
const pastSection = document.getElementById("event-past-section");
const loadingEl = document.getElementById("event-list-loading");

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateRail(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    weekday: date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
    long: date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

function renderEvent(event: EventSubmission, isPast = false) {
  const rail = formatDateRail(event.event_date);
  const timeLabel = formatEventTime(event.event_time);
  const time = timeLabel ? `<span class="event-meta">${escapeHtml(timeLabel)}</span>` : "";
  const location = event.location
    ? `<span class="event-meta">${escapeHtml(event.location)}</span>`
    : "";

  return `
    <article class="event-card${isPast ? " event-card--past" : ""}" id="event-${escapeHtml(event.id)}" data-event-date="${escapeHtml(event.event_date)}">
      <div class="event-date-rail" aria-hidden="true">
        <time datetime="${escapeHtml(event.event_date)}">
          <span class="event-date-rail-day">${escapeHtml(rail.day)}</span>
          <span class="event-date-rail-month">${escapeHtml(rail.month)}</span>
          <span class="event-date-rail-weekday">${escapeHtml(rail.weekday)}</span>
        </time>
      </div>
      <div class="event-card-body">
        <h3>${escapeHtml(event.title)}</h3>
        <p class="visually-hidden">
          <time datetime="${escapeHtml(event.event_date)}">${escapeHtml(rail.long)}</time>
        </p>
        <div class="event-meta-row">
          ${time}
          ${location}
        </div>
        <p>${escapeHtml(event.description)}</p>
      </div>
    </article>
  `;
}

function renderEventLists(events: EventSubmission[]) {
  const today = todayDateString();
  const upcoming = events.filter((event) => event.event_date >= today);
  const past = events.filter((event) => event.event_date < today).reverse();

  if (!upcoming.length) {
    if (upcomingEmpty) upcomingEmpty.hidden = false;
  } else {
    if (upcomingEmpty) upcomingEmpty.hidden = true;
    if (upcomingList) upcomingList.innerHTML = upcoming.map((event) => renderEvent(event)).join("");
  }

  if (!past.length) {
    if (pastSection) pastSection.hidden = true;
  } else {
    if (pastSection) pastSection.hidden = false;
    if (pastEmpty) pastEmpty.hidden = true;
    if (pastList) pastList.innerHTML = past.map((event) => renderEvent(event, true)).join("");
  }
}

async function loadEvents() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("event_submissions")
      .select("*")
      .eq("status", "approved")
      .order("event_date", { ascending: true });

    if (error) throw error;

    if (loadingEl) loadingEl.hidden = true;
    renderEventLists(data ?? []);
  } catch {
    if (loadingEl) loadingEl.hidden = true;
    if (upcomingEmpty) {
      upcomingEmpty.hidden = false;
      upcomingEmpty.textContent =
        "Unable to load events right now. Please try again later or email info@flylre.com.";
    }
  }
}

loadEvents();
