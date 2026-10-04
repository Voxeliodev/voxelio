"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { fetchWorldById, type World } from "../../../lib/worlds";
import { getCurrentUser, type User } from "../../../lib/auth";
import AccountBadge from "../../components/AccountBadge";
import { filterMessage } from "../../../lib/chatFilter";
import { playError } from "../../../lib/sounds";
import ObbyGame from "../../components/obby/ObbyGame";
import LumberyardGame from "../../components/lumberyard/LumberyardGameMain";
import ChaosColiseumGameMain from "../../components/chaos-coliseum/ChaosColiseumGameMain";

// ============================================================
// VOXELIO PLAYER — in-app game launcher page
// ============================================================

type Status = "exchanging" | "loading-world" | "ready" | "error";

type ChatMessage = {
  id: string;
  userId: string;
  username: string;
  text: string;
  expiresAt: number;
};

const CHAT_LIFETIME_MS = 5000;
const CHAT_OVERLAY_LIFETIME_MS = 7000;
const CHAT_MAX_LENGTH = 120;
const CHAT_MUTE_DURATION_MS = 60_000;
const CHAT_SPAM_THRESHOLD = 3;

function getChatChannelName(worldId: string): string {
  return `world-chat-${worldId}`;
}

// ============================================================
// CHAT OVERLAY
// ============================================================
function ChatOverlay({ messages }: { messages: ChatMessage[] }) {
  const now = Date.now();
  const recent = messages.filter((m) => m.expiresAt > now).slice(-6);

  if (recent.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "120px",
        left: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        maxWidth: 340,
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      {recent.map((m) => (
        <div
          key={m.id}
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.85), rgba(20,10,40,0.75))",
            border: "1px solid rgba(108, 60, 224, 0.4)",
            borderLeft: "3px solid #6C3CE0",
            borderRadius: 8,
            padding: "6px 10px",
            color: "white",
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "#00E5FF",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {m.username}
            <AccountBadge username={m.username} userId={m.userId} size={14} />
          </span>
          <span style={{ color: "rgba(255,255,255,0.92)", marginLeft: 2 }}>
            {m.text}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// INNER PAGE
// ============================================================
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

  const exchangedRef = useRef(false);

  // ===== Chat state =====
  const [overlayMessages, setOverlayMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastChatSentRef = useRef(0);
  const recentMessagesRef = useRef<string[]>([]);
  const muteUntilRef = useRef(0);
  const chatChannelRef = useRef<any>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ===== Touch detection =====
  useEffect(() => {
    const touch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(touch);
  }, []);

  // ===== Token exchange =====
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No launch token provided.");
      return;
    }

    if (exchangedRef.current) return;
    exchangedRef.current = true;

    (async () => {
      try {
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

        const u = getCurrentUser();
        setUser(u);

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

  // ===== Chat channel subscription =====
  useEffect(() => {
    if (!user || !worldId || status !== "ready") return;

    const channelName = getChatChannelName(worldId);
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false }, presence: { key: user.id } },
    });

    channel
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        if (!payload || payload.userId === user.id) return;
        const incoming: ChatMessage = {
          id: payload.id,
          userId: payload.userId,
          username: payload.username,
          text: filterMessage(String(payload.text || "").slice(0, CHAT_MAX_LENGTH)),
          expiresAt: Date.now() + CHAT_OVERLAY_LIFETIME_MS,
        };
        setOverlayMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      })
      .subscribe((s: string) => {
        if (s === "SUBSCRIBED") {
          channel.track({ id: user.id, username: user.username, worldId });
        }
      });

    chatChannelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      chatChannelRef.current = null;
    };
  }, [user, worldId, status]);

  // ===== Chat expiry =====
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setOverlayMessages((prev) => prev.filter((m) => m.expiresAt > now));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // ===== System message auto-clear =====
  useEffect(() => {
    if (!systemMessage) return;
    const t = setTimeout(() => setSystemMessage(null), 3000);
    return () => clearTimeout(t);
  }, [systemMessage]);

  // ===== T key to open chat, Esc to close =====
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const inInput =
        active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
      if ((e.key === "t" || e.key === "T") && !chatOpen && !inInput) {
        e.preventDefault();
        setChatOpen(true);
      } else if (e.key === "Escape" && chatOpen) {
        e.preventDefault();
        setChatOpen(false);
        setDraft("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chatOpen]);

  useEffect(() => {
    if (chatOpen && inputRef.current) inputRef.current.focus();
  }, [chatOpen]);

  // ===== Send chat =====
  const sendChat = useCallback(() => {
    const me = user;
    const text = draft.trim();
    if (!me || !text) {
      setChatOpen(false);
      setDraft("");
      return;
    }

    const now = Date.now();

    if (now < muteUntilRef.current) {
      const remaining = Math.ceil((muteUntilRef.current - now) / 1000);
      setSystemMessage(`🚫 You are muted for spamming. ${remaining}s remaining.`);
      playError();
      setDraft("");
      setChatOpen(false);
      return;
    }

    const recent = recentMessagesRef.current;
    recent.push(text);
    while (recent.length > CHAT_SPAM_THRESHOLD) recent.shift();
    const isSpam =
      recent.length >= CHAT_SPAM_THRESHOLD &&
      recent.every((m) => m === recent[0]);

    if (isSpam) {
      muteUntilRef.current = now + CHAT_MUTE_DURATION_MS;
      recentMessagesRef.current = [];
      setSystemMessage("🚫 Muted for 1 minute — you spammed the same message.");
      playError();
      setDraft("");
      setChatOpen(false);
      return;
    }

    lastChatSentRef.current = now;
    const filtered = filterMessage(text.slice(0, CHAT_MAX_LENGTH));
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const msg: ChatMessage = {
      id,
      userId: me.id,
      username: me.username,
      text: filtered,
      expiresAt: Date.now() + CHAT_OVERLAY_LIFETIME_MS,
    };
    const payload = {
      id: msg.id,
      userId: msg.userId,
      username: msg.username,
      text: msg.text,
    };

    setOverlayMessages((prev) => [...prev, msg]);

    const channel = chatChannelRef.current;
    if (channel) {
      try {
        channel.send({ type: "broadcast", event: "chat", payload });
      } catch {}
    }

    setDraft("");
    setChatOpen(false);
  }, [draft, user]);

  // ===== Exit =====
  const handleExit = () => {
    const w = window as any;
    if (w.voxelio?.requestExit) {
      w.voxelio.requestExit();
    } else if (w.voxelio?.closeApp) {
      w.voxelio.closeApp();
    } else {
      window.close();
    }
  };

  // ============================================================
  // RENDER — Exchange
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
  // RENDER — Ready
  // ============================================================
  if (!world || !user) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "black" }}>
      {/* Game canvas — pass chatOpen as inputDisabled */}
      {world.layout === "obby" ? (
        <ObbyGame
          config={user.avatarConfig}
          userId={user.id}
          username={user.username}
          world={world}
          inputDisabled={chatOpen}
          isTouchDevice={isTouchDevice}
        />
      ) : world.layout === "lumberyard" ? (
        <LumberyardGame
          config={user.avatarConfig}
          userId={user.id}
          username={user.username}
          world={world}
          inputDisabled={chatOpen}
          isTouchDevice={isTouchDevice}
        />
      ) : world.layout === "chaos-coliseum" ? (
        <ChaosColiseumGameMain
          config={user.avatarConfig}
          userId={user.id}
          username={user.username}
          world={world}
          inputDisabled={chatOpen}
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

      {/* Chat overlay */}
      <ChatOverlay messages={overlayMessages} />

      {/* Exit button */}
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
          opacity: 0.5,
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
      >
        <span style={{ fontSize: 14 }}>✕</span>
        Exit
      </button>

      {/* System message */}
      {systemMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 180,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "rgba(220,38,38,0.9)",
              backdropFilter: "blur(8px)",
              padding: "8px 16px",
              borderRadius: 10,
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {systemMessage}
          </div>
        </div>
      )}

      {/* Chat input */}
      {chatOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(560px, 90vw)",
            zIndex: 40,
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChat();
            }}
            style={{
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(8px)",
              border: "2px solid #6C3CE0",
              borderRadius: 10,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            }}
          >
            <span style={{ color: "#00E5FF", fontWeight: 700, fontSize: 14 }}>
              💬
            </span>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) =>
                setDraft(e.target.value.slice(0, CHAT_MAX_LENGTH))
              }
              placeholder="Type a message…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "white",
                fontSize: 14,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
              maxLength={CHAT_MAX_LENGTH}
              autoComplete="off"
            />
            <button
              type="submit"
              style={{
                background: "#6C3CE0",
                color: "white",
                border: "none",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Send
            </button>
            <button
              type="button"
              onClick={() => {
                setChatOpen(false);
                setDraft("");
              }}
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.6)",
                border: "none",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </form>
          <p
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.5)",
              textAlign: "center",
              marginTop: 4,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Esc to cancel
          </p>
        </div>
      )}

      {/* "Press T to chat" hint */}
      {!chatOpen && !isTouchDevice && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(6px)",
              padding: "4px 12px",
              borderRadius: 999,
              color: "rgba(255,255,255,0.5)",
              fontSize: 10,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Press T to chat
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE EXPORT
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