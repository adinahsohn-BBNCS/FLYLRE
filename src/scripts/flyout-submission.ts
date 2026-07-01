import { getSupabase } from "../lib/supabase";

const form = document.getElementById("flyout-form") as HTMLFormElement | null;
const success = document.getElementById("flyout-form-success");
const errorBox = document.getElementById("flyout-form-error");
const submitBtn = document.getElementById("flyout-form-submit") as HTMLButtonElement | null;

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
  name: string;
  meta: string;
  description: string;
  submitterName: string;
  submitterEmail: string;
}) {
  const notifyEmail = import.meta.env.PUBLIC_NOTIFY_EMAIL ?? "info@flylre.com";
  const adminUrl = `${window.location.origin}/admin/#flyouts`;

  try {
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(notifyEmail)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: "Fly LRE - New fly-out submission to review",
        _template: "table",
        "Review at": adminUrl,
        destination: details.name,
        "time / distance": details.meta || "—",
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
      const name = String(data.get("name") ?? "").trim();
      const meta = String(data.get("meta") ?? "").trim();
      const description = String(data.get("description") ?? "").trim();
      const submitterName = String(data.get("submitter_name") ?? "").trim();
      const submitterEmail = String(data.get("submitter_email") ?? "").trim();

      if (!name || !description || !submitterName || !submitterEmail) {
        throw new Error("Please fill in all required fields.");
      }

      const { error: insertError } = await supabase.from("flyout_submissions").insert({
        name,
        meta: meta || null,
        description,
        submitter_name: submitterName,
        submitter_email: submitterEmail,
        status: "pending",
      });

      if (insertError) throw insertError;

      await notifyAdmin({ name, meta, description, submitterName, submitterEmail });

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
