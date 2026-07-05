import { getSupabase, type EventPhoto, type EventSubmission } from "../lib/supabase";
import { formatEventTime, isEventPast } from "../lib/event-time";

const upcomingList = document.getElementById("event-list-upcoming");
const pastList = document.getElementById("event-list-past");
const upcomingEmpty = document.getElementById("event-list-upcoming-empty");
const pastEmpty = document.getElementById("event-list-past-empty");
const pastSection = document.getElementById("event-past-section");
const loadingEl = document.getElementById("event-list-loading");

type PublicRsvpRow = { event_id: string; name: string; guests: number };

let photosByEvent = new Map<string, EventPhoto[]>();
let rsvpsByEvent = new Map<string, PublicRsvpRow[]>();

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function renderRsvpList(eventId: string) {
  const rsvps = rsvpsByEvent.get(eventId) ?? [];
  if (!rsvps.length) {
    return `<p class="event-rsvp-empty">No confirmed RSVPs yet.</p>`;
  }

  const totalGuests = rsvps.reduce((sum, rsvp) => sum + rsvp.guests, 0);
  const rsvpWord = rsvps.length === 1 ? "RSVP" : "RSVPs";
  const guestWord = totalGuests === 1 ? "guest" : "guests";

  return `
    <div class="event-rsvp-list-wrap">
      <p class="event-rsvp-summary">${rsvps.length} ${rsvpWord} · ${totalGuests} ${guestWord} total</p>
      <ul class="event-rsvp-list">
        ${rsvps
          .map((rsvp) => {
            const guestsLabel = rsvp.guests === 1 ? "1 guest" : `${rsvp.guests} guests`;
            return `<li><span class="event-rsvp-name">${escapeHtml(rsvp.name)}</span> <span class="event-rsvp-guests">${guestsLabel}</span></li>`;
          })
          .join("")}
      </ul>
    </div>
  `;
}

function renderPhotoGallery(eventId: string) {
  const photos = photosByEvent.get(eventId) ?? [];
  if (!photos.length) {
    return `<p class="event-photos-empty">No photos yet — be the first to share one from this event.</p>`;
  }

  return `
    <div class="event-photo-grid">
      ${photos
        .map(
          (photo) => `
        <figure class="event-photo-item">
          <a href="${escapeHtml(photo.photo_url)}" target="_blank" rel="noopener">
            <img src="${escapeHtml(photo.photo_url)}" alt="${escapeHtml(photo.caption ?? "Event photo")}" loading="lazy" />
          </a>
          ${photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ""}
        </figure>
      `,
        )
        .join("")}
    </div>
  `;
}

function renderRsvpSection(event: EventSubmission) {
  return `
    <div class="event-engage event-rsvp">
      <h4>RSVP</h4>
      ${renderRsvpList(event.id)}
      <p class="form-note">Let us know you're coming. Your name appears in the guest list after admin approval.</p>
      <p class="form-error event-rsvp-error" hidden></p>
      <form class="event-rsvp-form" data-event-id="${escapeHtml(event.id)}">
        <div class="form-honey" aria-hidden="true">
          <label for="rsvp-website-${escapeHtml(event.id)}">Website</label>
          <input id="rsvp-website-${escapeHtml(event.id)}" type="text" name="website" tabindex="-1" autocomplete="off" />
        </div>
        <div class="form-field">
          <label for="rsvp-name-${escapeHtml(event.id)}">Your name</label>
          <input id="rsvp-name-${escapeHtml(event.id)}" name="name" type="text" required autocomplete="name" />
        </div>
        <div class="form-field">
          <label for="rsvp-email-${escapeHtml(event.id)}">Email</label>
          <input id="rsvp-email-${escapeHtml(event.id)}" name="email" type="email" required autocomplete="email" />
        </div>
        <div class="form-field">
          <label for="rsvp-guests-${escapeHtml(event.id)}">Guests (including you)</label>
          <input id="rsvp-guests-${escapeHtml(event.id)}" name="guests" type="number" min="1" max="20" value="1" required />
        </div>
        <div class="form-field">
          <label for="rsvp-note-${escapeHtml(event.id)}">Note <span class="form-optional">(optional)</span></label>
          <textarea id="rsvp-note-${escapeHtml(event.id)}" name="note" rows="2" placeholder="Aircraft type, arrival time, etc."></textarea>
        </div>
        <button type="submit" class="form-submit">Submit RSVP</button>
      </form>
      <div class="form-success event-rsvp-success" hidden>
        <p><strong>RSVP received.</strong> You'll appear in the guest list after admin approval.</p>
      </div>
    </div>
  `;
}

function renderPhotoSection(event: EventSubmission, isPast: boolean) {
  if (!isPast) return "";

  return `
    <div class="event-engage event-photos">
      <h4>Event photos</h4>
      ${renderPhotoGallery(event.id)}
      <p class="form-note">Share a photo you took at this event. Photos appear after admin approval.</p>
      <p class="form-error event-photo-error" hidden></p>
      <form class="event-photo-form" data-event-id="${escapeHtml(event.id)}">
        <div class="form-honey" aria-hidden="true">
          <label for="photo-website-${escapeHtml(event.id)}">Website</label>
          <input id="photo-website-${escapeHtml(event.id)}" type="text" name="website" tabindex="-1" autocomplete="off" />
        </div>
        <div class="form-field">
          <label for="photo-name-${escapeHtml(event.id)}">Your name</label>
          <input id="photo-name-${escapeHtml(event.id)}" name="name" type="text" required autocomplete="name" />
        </div>
        <div class="form-field">
          <label for="photo-email-${escapeHtml(event.id)}">Email</label>
          <input id="photo-email-${escapeHtml(event.id)}" name="email" type="email" required autocomplete="email" />
        </div>
        <div class="form-field">
          <label for="photo-file-${escapeHtml(event.id)}">Photo</label>
          <input id="photo-file-${escapeHtml(event.id)}" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
          <p class="form-hint">JPEG, PNG, or WebP · 5 MB max</p>
        </div>
        <div class="form-field">
          <label for="photo-caption-${escapeHtml(event.id)}">Caption <span class="form-optional">(optional)</span></label>
          <input id="photo-caption-${escapeHtml(event.id)}" name="caption" type="text" maxlength="200" />
        </div>
        <button type="submit" class="form-submit">Submit photo</button>
      </form>
      <div class="form-success event-photo-success" hidden>
        <p><strong>Photo received.</strong> It will appear here after admin approval.</p>
      </div>
    </div>
  `;
}

function renderEvent(event: EventSubmission, isPast = false) {
  const rail = formatDateRail(event.event_date);
  const timeLabel = formatEventTime(event.event_time);
  const time = timeLabel ? `<span class="event-meta">${escapeHtml(timeLabel)}</span>` : "";
  const location = event.location
    ? `<span class="event-meta">${escapeHtml(event.location)}</span>`
    : "";

  const rsvpBlock = isPast ? "" : renderRsvpSection(event);
  const photoBlock = renderPhotoSection(event, isPast);

  return `
    <article class="event-card${isPast ? " event-card--past" : ""}" id="event-${escapeHtml(event.id)}" data-event-id="${escapeHtml(event.id)}" data-event-date="${escapeHtml(event.event_date)}">
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
        ${rsvpBlock}
        ${photoBlock}
      </div>
    </article>
  `;
}

function renderEventLists(events: EventSubmission[]) {
  const upcoming = events.filter((event) => !isEventPast(event));
  const past = events.filter((event) => isEventPast(event)).reverse();

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

async function notifyAdmin(subject: string, fields: Record<string, string>) {
  const notifyEmail = import.meta.env.PUBLIC_NOTIFY_EMAIL ?? "info@flylre.com";
  const adminUrl = `${window.location.origin}/admin/#events`;

  try {
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(notifyEmail)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: subject,
        _template: "table",
        "Review at": adminUrl,
        ...fields,
      }),
    });
  } catch {
    /* saved in Supabase already */
  }
}

async function handleRsvpSubmit(form: HTMLFormElement) {
  const eventId = form.dataset.eventId;
  if (!eventId) return;

  const card = form.closest(".event-card");
  const errorEl = card?.querySelector(".event-rsvp-error") as HTMLElement | null;
  const successEl = card?.querySelector(".event-rsvp-success") as HTMLElement | null;
  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;

  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
  }

  try {
    const data = new FormData(form);
    if (String(data.get("website") ?? "").trim()) return;

    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const guests = Number(data.get("guests") ?? 1);
    const note = String(data.get("note") ?? "").trim();

    if (!name || !email) throw new Error("Please fill in your name and email.");
    if (!Number.isFinite(guests) || guests < 1 || guests > 20) {
      throw new Error("Guests must be between 1 and 20.");
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("event_rsvps").insert({
      event_id: eventId,
      name,
      email,
      guests,
      note: note || null,
      status: "pending",
    });

    if (error) throw error;

    const eventTitle =
      card?.querySelector(".event-card-body h3")?.textContent?.trim() ?? "Event";

    await notifyAdmin("Fly LRE - New event RSVP to review", {
      event: eventTitle,
      name,
      email,
      guests: String(guests),
      note: note || "—",
    });

    form.hidden = true;
    if (successEl) successEl.hidden = false;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit RSVP";
    }
  }
}

async function handlePhotoSubmit(form: HTMLFormElement) {
  const eventId = form.dataset.eventId;
  if (!eventId) return;

  const card = form.closest(".event-card");
  const errorEl = card?.querySelector(".event-photo-error") as HTMLElement | null;
  const successEl = card?.querySelector(".event-photo-success") as HTMLElement | null;
  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;

  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading…";
  }

  try {
    if (!card?.classList.contains("event-card--past")) {
      throw new Error("Photos can be shared after the event has passed.");
    }

    const data = new FormData(form);
    if (String(data.get("website") ?? "").trim()) return;

    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const caption = String(data.get("caption") ?? "").trim();
    const photo = data.get("photo");

    if (!name || !email) throw new Error("Please fill in your name and email.");
    if (!(photo instanceof File) || photo.size === 0) throw new Error("Please choose a photo.");
    if (photo.size > 5 * 1024 * 1024) throw new Error("Photo must be 5 MB or smaller.");

    const supabase = getSupabase();
    const ext = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${eventId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("event-photos")
      .upload(path, photo, { upsert: false, contentType: photo.type });

    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage.from("event-photos").getPublicUrl(path);

    const { error: insertError } = await supabase.from("event_photos").insert({
      event_id: eventId,
      submitter_name: name,
      submitter_email: email,
      photo_url: publicUrl.publicUrl,
      caption: caption || null,
      status: "pending",
    });

    if (insertError) throw insertError;

    const eventTitle =
      card?.querySelector(".event-card-body h3")?.textContent?.trim() ?? "Event";

    await notifyAdmin("Fly LRE - New event photo to review", {
      event: eventTitle,
      name,
      email,
      caption: caption || "—",
      photo: publicUrl.publicUrl,
    });

    form.hidden = true;
    if (successEl) successEl.hidden = false;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit photo";
    }
  }
}

document.addEventListener("submit", (event) => {
  const form = (event.target as HTMLElement).closest("form") as HTMLFormElement | null;
  if (!form) return;

  if (form.classList.contains("event-rsvp-form")) {
    event.preventDefault();
    void handleRsvpSubmit(form);
  } else if (form.classList.contains("event-photo-form")) {
    event.preventDefault();
    void handlePhotoSubmit(form);
  }
});

async function loadEvents() {
  try {
    const supabase = getSupabase();

    const [eventsResult, photosResult, rsvpsResult] = await Promise.all([
      supabase
        .from("event_submissions")
        .select("*")
        .eq("status", "approved")
        .order("event_date", { ascending: true }),
      supabase.from("event_photos").select("*").eq("status", "approved").order("created_at", {
        ascending: false,
      }),
      supabase.rpc("approved_event_rsvps_public"),
    ]);

    if (eventsResult.error) throw eventsResult.error;

    photosByEvent = new Map();
    for (const photo of (photosResult.data ?? []) as EventPhoto[]) {
      const list = photosByEvent.get(photo.event_id) ?? [];
      list.push(photo);
      photosByEvent.set(photo.event_id, list);
    }

    rsvpsByEvent = new Map();
    for (const row of (rsvpsResult.data ?? []) as PublicRsvpRow[]) {
      const list = rsvpsByEvent.get(row.event_id) ?? [];
      list.push(row);
      rsvpsByEvent.set(row.event_id, list);
    }

    if (loadingEl) loadingEl.hidden = true;
    renderEventLists(eventsResult.data ?? []);
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
