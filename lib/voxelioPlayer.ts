// ============================================================
// VOXELIO PLAYER — Client helper
// ============================================================
// Handles the handoff between the website and the Voxelio Player
// desktop app. Responsible for:
//   1. Requesting a one-time launcher token from the server
//   2. Building the `voxelio://` deep link
//   3. Triggering the app to open
//   4. Detecting whether the app is installed
// ============================================================

import { supabase } from "./supabase";

// The custom protocol the Voxelio Player app registers for.
// Opening a URL like `voxelio://launch?token=xxx` will launch the app.
const VOXELIO_PROTOCOL = "voxelio";

// How long to wait for the app to respond before assuming it's not installed.
const INSTALL_DETECTION_TIMEOUT_MS = 2000;

// ============================================================
// Request a launcher token from the server
// ============================================================
// Returns the token if successful, or null if the user isn't signed in
// or the request failed.
export async function requestLauncherToken(
  worldId: string
): Promise<{ token: string; deepLink: string } | null> {
  // Get the user's Supabase access token
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.warn("[voxelioPlayer] No session — user must be signed in");
    return null;
  }

  try {
    const res = await fetch("/api/launcher-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ worldId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[voxelioPlayer] token request failed:", err);
      return null;
    }

    const json = await res.json();
    if (!json.token) return null;

    return {
      token: json.token,
      deepLink: `${VOXELIO_PROTOCOL}://launch?token=${encodeURIComponent(
        json.token
      )}`,
    };
  } catch (err) {
    console.error("[voxelioPlayer] fetch error:", err);
    return null;
  }
}

// ============================================================
// Launch the Voxelio Player app with a token
// ============================================================
// Opens the `voxelio://` URL. The OS will either launch the app
// (if installed) or do nothing (if not installed).
//
// Returns `true` if the app appears to have launched, `false` if
// we suspect it's not installed. Uses a timing heuristic: if the
// browser tab loses focus within INSTALL_DETECTION_TIMEOUT_MS,
// the app probably opened.
export async function launchVoxelioPlayer(
  deepLink: string
): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;

    // If the page loses visibility, the app likely opened.
    const onVisibilityChange = () => {
      if (document.hidden && !resolved) {
        resolved = true;
        resolve(true);
        cleanup();
      }
    };

    // If we hit the timeout, assume the app isn't installed.
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
        cleanup();
      }
    }, INSTALL_DETECTION_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onVisibilityChange);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onVisibilityChange);

    // Trigger the deep link
    try {
      window.location.href = deepLink;
    } catch (err) {
      console.error("[voxelioPlayer] failed to open deep link:", err);
      if (!resolved) {
        resolved = true;
        resolve(false);
        cleanup();
      }
    }
  });
}

// ============================================================
// Detect whether the Voxelio Player app is installed
// ============================================================
// This is a best-effort check — browsers don't let websites query
// installed apps directly for privacy reasons. We use the same
// visibility heuristic as `launchVoxelioPlayer`.
export async function isVoxelioPlayerInstalled(): Promise<boolean> {
  const deepLink = `${VOXELIO_PROTOCOL}://ping`;
  return await launchVoxelioPlayer(deepLink);
}

// ============================================================
// High-level: request a token AND launch the app in one call
// ============================================================
export async function playInVoxelioApp(worldId: string): Promise<{
  success: boolean;
  reason?: "no_session" | "token_failed" | "not_installed";
}> {
  const result = await requestLauncherToken(worldId);
  if (!result) {
    return { success: false, reason: "token_failed" };
  }

  const launched = await launchVoxelioPlayer(result.deepLink);
  if (!launched) {
    return { success: false, reason: "not_installed" };
  }

  return { success: true };
}