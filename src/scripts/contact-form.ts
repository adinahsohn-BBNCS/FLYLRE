const form = document.getElementById("contact-form") as HTMLFormElement | null;
const wrap = document.getElementById("contact-form-wrap");
const success = document.getElementById("contact-form-success");
const errorBox = document.getElementById("contact-form-error");
const submitBtn = document.getElementById("contact-form-submit") as HTMLButtonElement | null;

type FormSubmitResponse = {
  success?: boolean | string;
  message?: string;
};

function showError(message: string) {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.hidden = false;
}

async function sendMessage(data: FormData) {
  const name = String(data.get("name") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const topic = String(data.get("topic") ?? "").trim();
  const message = String(data.get("message") ?? "").trim();
  const honey = String(data.get("_honey") ?? "");

  if (!name || !email || !message) {
    throw new Error("Please fill in your name, email, and message.");
  }

  if (honey) return;

  const notifyEmail = import.meta.env.PUBLIC_NOTIFY_EMAIL ?? "info@flylre.com";
  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(notifyEmail)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `Fly LRE contact — ${topic}`,
        _template: "table",
        _replyto: email,
        _honey: honey,
        name,
        email,
        topic,
        message,
      }),
    },
  );

  const result = (await response.json().catch(() => ({}))) as FormSubmitResponse;
  if (!response.ok || String(result.success) !== "true") {
    throw new Error(result.message || "Your message could not be sent.");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (errorBox) errorBox.hidden = true;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
  }

  try {
    await sendMessage(new FormData(form));
    if (wrap) wrap.hidden = true;
    if (success) success.hidden = false;
  } catch (err) {
    const detail = err instanceof Error ? err.message : "";
    showError(
      detail.startsWith("Please")
        ? detail
        : "Sorry — your message could not be sent right now. Please try again in a few minutes.",
    );
    console.error("Contact form:", detail);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send message";
    }
  }
});
