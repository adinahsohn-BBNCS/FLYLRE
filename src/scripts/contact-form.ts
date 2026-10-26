import { getSupabase } from "../lib/supabase";

const form = document.getElementById("contact-form") as HTMLFormElement | null;
const wrap = document.getElementById("contact-form-wrap");
const success = document.getElementById("contact-form-success");
const errorBox = document.getElementById("contact-form-error");
const submitBtn = document.getElementById("contact-form-submit") as HTMLButtonElement | null;

type ContactMessage = {
  name: string;
  email: string;
  topic: string;
  message: string;
};

type FormSubmitResponse = {
  success?: boolean | string;
  message?: string;
};

function showError(message: string) {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function showSuccess() {
  if (wrap) wrap.hidden = true;
  if (success) success.hidden = false;
}

function emailNotification(details: ContactMessage, keepalive: boolean) {
  const notifyEmail = import.meta.env.PUBLIC_NOTIFY_EMAIL ?? "info@flylre.com";

  return fetch(`https://formsubmit.co/ajax/${encodeURIComponent(notifyEmail)}`, {
    method: "POST",
    keepalive,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      _subject: `Fly LRE contact — ${details.topic}`,
      _template: "table",
      _replyto: details.email,
      ...details,
      "View in admin": `${window.location.origin}/admin/#messages`,
    }),
  });
}

async function saveMessage(details: ContactMessage) {
  const { error } = await getSupabase().from("contact_messages").insert(details);
  return !error;
}

async function emailAndWait(details: ContactMessage) {
  const response = await emailNotification(details, false);
  const result = (await response.json().catch(() => ({}))) as FormSubmitResponse;
  if (!response.ok || String(result.success) !== "true") {
    throw new Error(result.message || "Your message could not be sent.");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (errorBox) errorBox.hidden = true;

  const data = new FormData(form);
  const details: ContactMessage = {
    name: String(data.get("name") ?? "").trim(),
    email: String(data.get("email") ?? "").trim(),
    topic: String(data.get("topic") ?? "").trim(),
    message: String(data.get("message") ?? "").trim(),
  };

  if (!details.name || !details.email || !details.message) {
    showError("Please fill in your name, email, and message.");
    return;
  }

  if (String(data.get("_honey") ?? "")) {
    showSuccess();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
  }

  try {
    if (await saveMessage(details)) {
      showSuccess();
      emailNotification(details, true).catch(() => {
        /* Message is already saved in admin — a slow or failed email is not shown to the visitor */
      });
      return;
    }

    if (submitBtn) submitBtn.textContent = "Sending — this can take up to a minute…";
    await emailAndWait(details);
    showSuccess();
  } catch (err) {
    console.error("Contact form:", err instanceof Error ? err.message : err);
    showError("Sorry — your message could not be sent right now. Please try again in a few minutes.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send message";
    }
  }
});
