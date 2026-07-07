import { getSupabase } from "../lib/supabase";

const form = document.getElementById("pilot-form") as HTMLFormElement | null;
const success = document.getElementById("pilot-form-success");
const errorBox = document.getElementById("pilot-form-error");
const submitBtn = document.getElementById("pilot-form-submit") as HTMLButtonElement | null;

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
  email: string;
  aircraft: string;
  bio: string;
  photoUrl: string | null;
  showName: boolean;
}) {
  const notifyEmail = import.meta.env.PUBLIC_NOTIFY_EMAIL ?? "info@flylre.com";
  const adminUrl = `${window.location.origin}/admin/`;

  try {
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(notifyEmail)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: "Fly LRE - New pilot submission to review",
        _template: "table",
        "Review at": adminUrl,
        name: details.name,
        email: details.email,
        aircraft: details.aircraft || "—",
        bio: details.bio,
        photo: details.photoUrl ?? "No photo uploaded",
        "Show name on site": details.showName ? "Yes" : "No — aircraft/description only",
      }),
    });
  } catch {
    /* Submission is already saved — don't fail the pilot if email fails */
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
      const email = String(data.get("email") ?? "").trim();
      const aircraft = String(data.get("aircraft") ?? "").trim();
      const bio = String(data.get("bio") ?? "").trim();
      const showName = data.get("show_name") === "on";
      const photo = data.get("photo");

      if (!name || !email || !bio) {
        throw new Error("Please fill in name, email, and about you.");
      }

      let photoUrl: string | null = null;

      if (photo instanceof File && photo.size > 0) {
        if (photo.size > 5 * 1024 * 1024) {
          throw new Error("Photo must be 5 MB or smaller.");
        }

        const ext = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("pilot-photos")
          .upload(path, photo, { upsert: false, contentType: photo.type });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage.from("pilot-photos").getPublicUrl(path);
        photoUrl = publicUrl.publicUrl;
      }

      const { error: insertError } = await supabase.from("pilot_submissions").insert({
        name,
        email,
        aircraft: aircraft || null,
        bio,
        photo_url: photoUrl,
        show_name: showName,
        status: "pending",
      });

      if (insertError) throw insertError;

      await notifyAdmin({ name, email, aircraft, bio, photoUrl, showName });

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
