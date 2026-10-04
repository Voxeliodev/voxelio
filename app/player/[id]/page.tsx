"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { fetchWorldById, type World } from "../../../lib/worlds";
import { getCurrentUser, type User } from "../../../lib/auth";
import ObbyGame from "../../components/obby/ObbyGame";
import LumberyardGame from "../../components/lumberyard/LumberyardGameMain";
import ChaosColiseumGameMain from "../../components/chaos-coliseum/ChaosColiseumGameMain";

// ============================================================
// VOXELIO PLAYER — in-app game launcher page
// ============================================================
// This route is loaded by the Voxelio Player desktop app (Electron).
// It expects a `token` query parameter, exchanges it for a Supabase
// session, and then renders the game full-screen with no site chrome.
// ============================================================

type Status = "exchanging" | "loading-world" | "ready" | "error";

function PlayerPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();

  const worldId = (params.id as string) || "";
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<Status>("exchanging");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // ============================================================
  // Detect touch device
  // ============================================================
  useEffect(() => {
    const touch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(touch);
  }, []);

  // ============================================================
  // Exchange token for a session
  // ============================================================
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No launch token provided.");
      return;
    }

    (async () => {
      try {
        // ---- 1. Send the token to the exchange endpoint ----
        const res = await fetch("/api/launcher-token/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setStatus("error");
          setErrorMessage(
            err.error || "This link has expired or has already been used."
          );
          return;
        }

        const json = await res.json();

        // ---- 2. Sign in with the returned session handoff ----
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: json.sessionHandoff.tokenHash,
          type: json.sessionHandoff.type,
        });

        if (verifyError) {
          console.error("[player] verifyOtp error:", verifyError);
          setStatus("error");
          setErrorMessage("Failed to authenticate. Please try again.");
          return;
        }

        // ---- 3. Load the user profile ----
        const u = getCurrentUser();
        setUser(u);

        // ---- 4. Load the world ----
        setStatus("loading-world");
        const w = await fetchWorldById(worldId);
        if (!w) {
          setStatus("error");
          setErrorMessage("World not found.");
          return;
        }
        setWorld(w);
        setStatus("ready");
      } catch (err) {
        console.error("[player] unexpected error:", err);
        setStatus("error");
        setErrorMessage("Something went wrong.");
      }
    })();
  }, [token, worldId]);

  // ============================================================
  // Exit: close the desktop app
  // ============================================================
  const handleExit = () => {
    // The Electron preload script exposes `window.voxelio`
    const w = window as any;
    if (w.voxelio?.requestExit) {
      w.voxelio.requestExit();
    } else {
      // Fallback for testing in a browser
      window.close();
    }
  };

  // ============================================================
  // RENDER — Exchanging token
  // ============================================================
  if (status === "exchanging") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle at center, #1A1A2E 0%, #0A0A1E 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 24,
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            background: "linear-gradient(90deg, #8B5FFF, #00E5FF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.02em",
          }}
        >
          VOXELIO
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
          Signing you in…
        </div>
        <div
          style={{
            width: 240,
            height: 4,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "60%",
              height: "100%",
              background: "linear-gradient(90deg, #8B5FFF, #00E5FF)",
              borderRadius: 999,
              animation: "pulse 1.4s ease-in-out infinite",
            }}
          />
        </div>
        <style>{`
          @keyframes pulse {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  // ============================================================
  // RENDER — Loading world
  // ============================================================
  if (status === "loading-world") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#0A0A1E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ fontSize: 32 }}>🌍</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
          Loading world…
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER — Error
  // ============================================================
  if (status === "error") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#0A0A1E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          color: "white",
          padding: 32,
          fontFamily: "system-ui, -apple-system, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 64 }}>⚠️</div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "#EF4444",
            letterSpacing: "0.02em",
          }}
        >
          Launch Failed
        </div>
        <div
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.65)",
            maxWidth: 400,
          }}
        >
          {errorMessage || "Something went wrong."}
        </div>
        <button
          onClick={handleExit}
          style={{
            marginTop: 16,
            background: "linear-gradient(180deg, #8B5FFF, #6C3CE0)",
            color: "white",
            border: "2px solid #4A1FA8",
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 900,
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    );
  }

  // ============================================================
  // RENDER — Ready: the game
  // ============================================================
  if (!world || !user) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "black" }}>
      {/* ---- Game canvas ---- */}
      {world.layout === "obby" ? (
        <ObbyGame
          config={user.avatarConfig}
          userId={user.id}
          username={user.username}
          world={world}
          inputDisabled={false}
          isTouchDevice={isTouchDevice}
        />
      ) : world.layout === "lumberyard" ? (
        <LumberyardGame
          config={user.avatarConfig}
          userId={user.id}
          username={user.username}
          world={world}
          inputDisabled={false}
          isTouchDevice={isTouchDevice}
        />
      ) : world.layout === "chaos-coliseum" ? (
        <ChaosColiseumGameMain
          config={user.avatarConfig}
          userId={user.id}
          username={user.username}
          world={world}
          inputDisabled={false}
          isTouchDevice={isTouchDevice}
        />
      ) : (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 14,
          }}
        >
          This world's layout isn't supported in the player yet.
        </div>
      )}

      {/* ---- Exit button (top-left) ---- */}
      <button
        onClick={handleExit}
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 100,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8,
          color: "white",
          fontSize: 12,
          fontWeight: 700,
          padding: "8px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <span style={{ fontSize: 14 }}>✕</span>
        Exit
      </button>
    </div>
  );
}

// ============================================================
// PAGE EXPORT — wrapped in Suspense for useSearchParams
// ============================================================
export default function PlayerPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#0A0A1E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          Loading…
        </div>
      }
    >
      <PlayerPageInner />
    </Suspense>
  );
}