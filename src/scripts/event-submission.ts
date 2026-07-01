import { getSupabase } from "../lib/supabase";

const form = document.getElementById("event-form") as HTMLFormElement | null;
const success = document.getElementById("event-form-success");
const errorBox = document.getElementById("event-form-error");
const submitBtn = document.getElementById("event-form-submit") as HTMLButtonElement | null;

function showError(message: string) {
  if (!errorBox) return;
  errorBox.hidden = false;
  errorBox.textContent = message;
}

function hideError() {
  if (!errorBox) return;
  errorBox.hidden = true;
  errorBox.textContent = "";
}

async function notifyAdmin(details: {
  title: string;
  eventDate: string;
  eventTime: string;
  location: string;
  description: string;
  submitterName: string;
  submitterEmail: string;
}) {
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
        _subject: "Fly LRE - New event submission to review",
        _template: "table",
        "Review at": adminUrl,
        title: details.title,
        date: details.eventDate,
        time: details.eventTime || "—",
        location: details.location || "—",
        description: details.description,
        name: details.submitterName,
        email: details.submitterEmail,
      }),
    });
  } catch {
    /* Submission saved — don't fail if email fails */
  }
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideError();

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting…";
    }

    try {
      const supabase = getSupabase();
      const data = new FormData(form);
      const title = String(data.get("title") ?? "").trim();
      const eventDate = String(data.get("event_date") ?? "").trim();
      const eventTime = String(data.get("event_time") ?? "").trim();
      const location = String(data.get("location") ?? "").trim();
      const description = String(data.get("description") ?? "").trim();
      const submitterName = String(data.get("submitter_name") ?? "").trim();
      const submitterEmail = String(data.get("submitter_email") ?? "").trim();

      if (!title || !eventDate || !description || !submitterName || !submitterEmail) {
        throw new Error("Please fill in all required fields.");
      }

      const { error: insertError } = await supabase.from("event_submissions").insert({
        title,
        event_date: eventDate,
        event_time: eventTime || null,
        location: location || null,
        description,
        submitter_name: submitterName,
        submitter_email: submitterEmail,
        status: "pending",
      });

      if (insertError) throw insertError;

      await notifyAdmin({
        title,
        eventDate,
        eventTime,
        location,
        description,
        submitterName,
        submitterEmail,
      });

      form.hidden = true;
      if (success) success.hidden = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      showError(message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit for review";
      }
    }
  });
}
