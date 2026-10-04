"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import AccountBadge from "../../components/AccountBadge";
import { getCurrentUser, formatVoxbux, awardPlayedWithOwner, type User } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import {
  fetchWorldById,
  incrementWorldVisits,
  hasLikedWorld,
  likeWorld,
  unlikeWorld,
  type World,
} from "../../../lib/worlds";
import { playInVoxelioApp } from "../../../lib/voxelioPlayer";

// ============================================================
// GAME DETAILS PAGE — /games/[id]
// ============================================================
// Shows the game's info, stats, and a big Play button. Games are
// only playable through the Voxelio Player desktop app — this page
// never renders the game itself.
// ============================================================

export default function GameDetailsPage() {
  const params = useParams();
  const worldId = (params.id as string) || "";

  const [user, setUser] = useState<User | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);

  const [launchStatus, setLaunchStatus] = useState<
    "idle" | "launching" | "not-installed" | "failed"
  >("idle");

  const [activeTab, setActiveTab] = useState<"about" | "servers">("about");

  // ============================================================
  // LOAD USER + WORLD
  // ============================================================
  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    setMounted(true);
    fetchWorldById(worldId).then((w) => {
      if (!w) {
        setNotFound(true);
        return;
      }
      setWorld(w);
      setLikeCount(w.likes);
      hasLikedWorld(worldId).then((yes) => setLiked(yes));
      if (typeof window === "undefined") return;
      const visitKey = `voxelio-visited-${worldId}`;
      if (sessionStorage.getItem(visitKey) !== "1") {
        sessionStorage.setItem(visitKey, "1");
        incrementWorldVisits(worldId);
      }
    });
  }, [worldId]);

  // ============================================================
  // LIKE HANDLER
  // ============================================================
  const handleLike = useCallback(async () => {
    if (!user || liking) return;
    setLiking(true);
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    const ok = wasLiked ? await unlikeWorld(worldId) : await likeWorld(worldId);
    if (!ok) {
      setLiked(wasLiked);
      setLikeCount(prevCount);
    }
    setLiking(false);
  }, [user, liking, liked, likeCount, worldId]);

  // ============================================================
  // PLAY IN APP
  // ============================================================
  const handlePlay = useCallback(async () => {
    if (launchStatus === "launching") return;
    setLaunchStatus("launching");

    const result = await playInVoxelioApp(worldId);

    if (result.success) {
      setTimeout(() => setLaunchStatus("idle"), 2000);
    } else if (result.reason === "not_installed") {
      setLaunchStatus("not-installed");
    } else {
      setLaunchStatus("failed");
      setTimeout(() => setLaunchStatus("idle"), 2500);
    }
  }, [worldId, launchStatus]);

  // ============================================================
  // LOADING
  // ============================================================
  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1A1A2E",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading…
      </div>
    );
  }

  if (notFound) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1A1A2E",
          color: "white",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 16,
        }}
      >
        <div style={{ fontSize: 64 }}>🌍</div>
        <div style={{ fontSize: 28, fontWeight: 900 }}>World Not Found</div>
        <p style={{ color: "rgba(255,255,255,0.6)" }}>
          This world doesn't exist or was removed.
        </p>
        <Link
          href="/games"
          style={{
            background: "linear-gradient(180deg, #7B4FF7, #5A2FC7)",
            color: "white",
            padding: "10px 24px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Back to Games
        </Link>
      </div>
    );
  }

  if (!world) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1A1A2E",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading world…
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0D0D15",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
        paddingBottom: 60,
      }}
    >
      {/* ===== TOP NAV (keeps existing site chrome feel) ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "#0A0A12",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link
            href="/games"
            style={{
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ← Games
          </Link>
          <Link
            href="/"
            style={{
              color: "white",
              textDecoration: "none",
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: "0.02em",
            }}
          >
            VOXELIO
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user ? (
            <>
              <span
                style={{
                  color: "#FFD700",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {formatVoxbux(user.voxbux)}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {user.username}
                <AccountBadge
                  username={user.username}
                  userId={user.id}
                  size={14}
                />
              </span>
            </>
          ) : (
            <Link
              href="/signin"
              style={{
                background: "linear-gradient(180deg, #7B4FF7, #5A2FC7)",
                color: "white",
                padding: "6px 16px",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px 24px 0",
        }}
      >
        {/* ===== GAME HEADER: image left, info right ===== */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: 32,
            alignItems: "start",
          }}
        >
          {/* ---- LEFT: Thumbnail ---- */}
          <div
            style={{
              aspectRatio: "16 / 9",
              background: world.imageUrl
                ? `url(${world.imageUrl}) center/cover`
                : world.thumbnailColor || "#7B2FF7",
              borderRadius: 12,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {!world.imageUrl && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 96,
                }}
              >
                {world.thumbnailEmoji}
              </div>
            )}
          </div>

          {/* ---- RIGHT: Game info + Play button ---- */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1
              style={{
                fontSize: 34,
                fontWeight: 900,
                margin: 0,
                letterSpacing: "0.01em",
                lineHeight: 1.1,
              }}
            >
              {world.name}
            </h1>

            {/* Creator row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <span>By</span>
              <span
                style={{
                  color: "#00E5FF",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                @{world.creator || "voxelio"}
              </span>
            </div>

            {/* Maturity + category */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 13,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              <div>
                <strong style={{ color: "white" }}>Category:</strong>{" "}
                {world.category}
              </div>
              <div>
                <strong style={{ color: "white" }}>Max Players:</strong>{" "}
                {world.maxPlayers}
              </div>
            </div>

            {/* PLAY BUTTON + icons */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {/* Big Play button */}
                <button
                  onClick={handlePlay}
                  disabled={launchStatus === "launching"}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    height: 56,
                    borderRadius: 8,
                    border: "none",
                    background:
                      launchStatus === "launching"
                        ? "linear-gradient(180deg, #6B7280, #4B5563)"
                        : "linear-gradient(180deg, #00A2FF 0%, #0072C7 100%)",
                    color: "white",
                    fontSize: 18,
                    fontWeight: 900,
                    cursor:
                      launchStatus === "launching" ? "wait" : "pointer",
                    boxShadow:
                      launchStatus === "launching"
                        ? "0 4px 16px rgba(107,114,128,0.4)"
                        : "0 4px 16px rgba(0,162,255,0.4)",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (launchStatus !== "launching")
                      e.currentTarget.style.transform = "scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <span style={{ fontSize: 20 }}>
                    {launchStatus === "launching" ? "⏳" : "▶"}
                  </span>
                  <span>
                    {launchStatus === "launching"
                      ? "Launching…"
                      : launchStatus === "failed"
                      ? "Try Again"
                      : "Play"}
                  </span>
                </button>
              </div>

              {/* Under-play row: Like, Favorite, Notify */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  marginTop: 16,
                  justifyContent: "space-around",
                }}
              >
                <button
                  onClick={handleLike}
                  disabled={liking}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: liked ? "#FF4D8D" : "rgba(255,255,255,0.6)",
                    cursor: liking ? "wait" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ fontSize: 20 }}>
                    {liked ? "❤️" : "🤍"}
                  </span>
                  {likeCount.toLocaleString()}
                </button>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <span style={{ fontSize: 20 }}>👥</span>
                  {world.visits.toLocaleString()}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <span style={{ fontSize: 20 }}>⭐</span>
                  {world.favorites.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== TABS ===== */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginTop: 40,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {(
            [
              { key: "about", label: "About" },
              { key: "servers", label: "Servers" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "3px solid white"
                    : "3px solid transparent",
                color:
                  activeTab === tab.key
                    ? "white"
                    : "rgba(255,255,255,0.55)",
                fontSize: 14,
                fontWeight: 900,
                padding: "14px 32px",
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === "about" && (
          <div style={{ padding: "24px 0", maxWidth: 720 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 900,
                margin: "0 0 12px",
              }}
            >
              Description
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.75)",
                whiteSpace: "pre-wrap",
              }}
            >
              {world.description || "No description provided."}
            </p>

            <h2
              style={{
                fontSize: 18,
                fontWeight: 900,
                margin: "32px 0 12px",
              }}
            >
              Stats
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 16,
                fontSize: 13,
              }}
            >
              {[
                ["Active", world.visits.toLocaleString()],
                ["Visits", world.visits.toLocaleString()],
                ["Likes", world.likes.toLocaleString()],
                ["Favorites", world.favorites.toLocaleString()],
                ["Max Players", String(world.maxPlayers)],
                ["Category", world.category],
                [
                  "Created",
                  new Date(world.createdAt).toLocaleDateString(),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "servers" && (
          <div
            style={{
              padding: "32px 0",
              textAlign: "center",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌐</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              Server list coming soon
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              In the meantime, click Play to join a public server.
            </div>
          </div>
        )}
      </div>

      {/* ===== NOT-INSTALLED POPUP ===== */}
      {launchStatus === "not-installed" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setLaunchStatus("idle")}
        >
          <div
            style={{
              background:
                "linear-gradient(160deg, #1A1A2E 0%, #0F0F22 50%, #0A0A1E 100%)",
              border: "2px solid rgba(139, 95, 255, 0.4)",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(139,95,255,0.2)",
              borderRadius: 20,
              padding: 32,
              maxWidth: 440,
              margin: "0 16px",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎮</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                marginBottom: 8,
              }}
            >
              Voxelio Player Not Installed
            </div>
            <div
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.65)",
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              To play Voxelio games, download the Voxelio Player app.
              It&apos;s free, fast, and runs full-screen.
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <Link
                href="/download"
                style={{
                  background:
                    "linear-gradient(180deg, #8B5FFF 0%, #6C3CE0 50%, #5A2FC7 100%)",
                  border: "2px solid #4A1FA8",
                  color: "white",
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 900,
                  borderRadius: 10,
                  textDecoration: "none",
                  boxShadow:
                    "0 6px 20px rgba(108,60,224,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                ⬇ Download App
              </Link>
              <button
                onClick={() => setLaunchStatus("idle")}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.8)",
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== FAILED POPUP ===== */}
      {launchStatus === "failed" && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(220,38,38,0.9)",
            backdropFilter: "blur(8px)",
            padding: "12px 20px",
            borderRadius: 10,
            color: "white",
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            zIndex: 100,
          }}
        >
          Failed to launch the app. Please try again.
        </div>
      )}

      {/* ===== RESPONSIVE GRID OVERRIDE ===== */}
      <style jsx global>{`
        @media (max-width: 800px) {
          .game-header-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}