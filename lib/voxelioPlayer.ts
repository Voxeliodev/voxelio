// ============================================================
// VOXELIO PLAYER — Client helper
// ============================================================
// Handles the handoff between the website and the Voxelio Player
// desktop app.
// ============================================================

import { supabase } from "./supabase";

const VOXELIO_PROTOCOL = "voxelio";
const INSTALL_DETECTION_TIMEOUT_MS = 2000;

// ============================================================
// Request a launcher token from the server
// ============================================================
export async function requestLauncherToken(
  worldId: string
): Promise<{ token: string; deepLink: string } | null> {
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
      )}&world=${encodeURIComponent(worldId)}`,
    };
  } catch (err) {
    console.error("[voxelioPlayer] fetch error:", err);
    return null;
  }
}

// ============================================================
// Launch the Voxelio Player app with a token
// ============================================================
export async function launchVoxelioPlayer(
  deepLink: string
): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;

    const onVisibilityChange = () => {
      if (document.hidden && !resolved) {
        resolved = true;
        resolve(true);
        cleanup();
      }
    };

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
export async function isVoxelioPlayerInstalled(): Promise<boolean> {
  const deepLink = `${VOXELIO_PROTOCOL}://ping`;
  return await launchVoxelioPlayer(deepLink);
}

// ============================================================
// High-level: request a token AND launch the app
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