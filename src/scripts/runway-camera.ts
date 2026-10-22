import { isRtspMeEmbed, nextCameraResetLabel } from "../lib/runway-camera";
import { getSupabase } from "../lib/supabase";

const section = document.getElementById("runway-camera");
const frame = document.getElementById("runway-camera-frame");
const start = document.getElementById("runway-camera-start");
const watchButton = document.getElementById("runway-camera-watch") as HTMLButtonElement | null;
const limitEl = document.getElementById("runway-camera-limit");
const errorEl = document.getElementById("runway-camera-error");

type CameraStatus = {
  is_available: boolean;
  views_used: number;
  monthly_limit: number;
};

type CameraClaim = {
  allowed: boolean;
  embed_url: string | null;
  views_used: number;
  monthly_limit: number;
};

function showLimitReached() {
  if (start) start.hidden = true;
  if (limitEl) {
    limitEl.textContent = `The live runway camera has reached its viewing limit for this month. It will be back on ${nextCameraResetLabel()}.`;
    limitEl.hidden = false;
  }
}

function showError(message: string) {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function showPlayer(embedUrl: string) {
  if (!frame) return;

  const iframe = document.createElement("iframe");
  iframe.src = embedUrl;
  iframe.title = "Live runway camera at 54CL";
  iframe.allow = "fullscreen; autoplay";
  iframe.allowFullscreen = true;

  frame.replaceChildren(iframe);
}

async function loadCameraStatus() {
  if (!section) return;

  try {
    const { data, error } = await getSupabase()
      .rpc("runway_camera_status")
      .maybeSingle<CameraStatus>();

    if (error) throw error;
    if (!data?.is_available) return;

    section.hidden = false;
    if (data.views_used >= data.monthly_limit) showLimitReached();
  } catch {
    /* Leave the camera panel hidden if it is not set up */
  }
}

async function watchLive() {
  if (!watchButton) return;

  watchButton.disabled = true;
  watchButton.textContent = "Loading…";
  if (errorEl) errorEl.hidden = true;

  try {
    const { data, error } = await getSupabase()
      .rpc("claim_runway_camera_view")
      .maybeSingle<CameraClaim>();

    if (error) throw error;

    if (data?.allowed && isRtspMeEmbed(data.embed_url)) {
      showPlayer(data.embed_url);
      return;
    }

    if (data && data.monthly_limit > 0 && data.views_used >= data.monthly_limit) {
      showLimitReached();
      return;
    }

    throw new Error("Camera unavailable");
  } catch {
    showError("The runway camera is unavailable right now. Please try again later.");
    watchButton.disabled = false;
    watchButton.textContent = "Watch live";
  }
}

watchButton?.addEventListener("click", () => {
  void watchLive();
});

void loadCameraStatus();
