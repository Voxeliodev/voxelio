"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getCurrentUser, type User } from "../../../lib/auth";
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
  const [currentOnline, setCurrentOnline] = useState(0);

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

  // ===== Online count =====
  useEffect(() => {
    if (!worldId) return;
    const observerKey = `details-${Math.random().toString(36).slice(2, 10)}`;
    const lobby = supabase.channel("world-lobby", {
      config: { presence: { key: observerKey } },
    });

    const update = () => {
      try {
        const state = lobby.presenceState() as Record<string, any[]>;
        let count = 0;
        for (const key of Object.keys(state)) {
          const entries = state[key];
          if (!Array.isArray(entries)) continue;
          for (const e of entries) {
            if (e && typeof e === "object" && (e as any).worldId === worldId) {
              count += 1;
            }
          }
        }
        setCurrentOnline(count);
      } catch {
        setCurrentOnline(0);
      }
    };

    lobby
      .on("presence", { event: "sync" }, update)
      .on("presence", { event: "join" }, update)
      .on("presence", { event: "leave" }, update)
      .subscribe(() => update());

    const interval = setInterval(update, 4000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(lobby);
    };
  }, [worldId]);

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

  if (!mounted) {
    return (
      <div className="py-20 text-center text-[#666] font-semibold">
        Loading…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-16 text-center">
        <div className="text-7xl mb-4">🌍</div>
        <h2 className="text-2xl font-black text-[#1A1A2E] mb-2">
          World Not Found
        </h2>
        <p className="text-sm text-[#666] mb-6">
          This world doesn&apos;t exist or was removed.
        </p>
        <Link
          href="/games"
          className="inline-block bg-[#6C3CE0] hover:bg-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border-2 border-[#4A1FA8]"
        >
          ← Back to Games
        </Link>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="py-20 text-center text-[#666] font-semibold">
        Loading world…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== BACK BUTTON ===== */}
      <Link
        href="/games"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#4A1FA8] hover:text-[#6C3CE0] transition group"
      >
        <span className="inline-block transition-transform group-hover:-translate-x-0.5">
          ←
        </span>
        <span>Back to Games</span>
      </Link>

      {/* ===== GAME HEADER ===== */}
      <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-0">
          {/* LEFT: Thumbnail */}
          <div
            className="aspect-video relative overflow-hidden"
            style={{
              background: world.imageUrl
                ? `url(${world.imageUrl}) center/cover`
                : `linear-gradient(135deg, ${world.thumbnailColor} 0%, ${world.thumbnailColor}dd 100%)`,
            }}
          >
            {!world.imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center text-[120px]">
                {world.thumbnailEmoji}
              </div>
            )}
          </div>

          {/* RIGHT: Info + Play */}
          <div className="p-6 flex flex-col gap-3 border-l-2 border-[#E5E7F0]">
            <h1 className="text-3xl font-black text-[#1A1A2E] leading-tight">
              {world.name}
            </h1>

            <div className="text-sm text-[#666]">
              By{" "}
              <span className="text-[#4A1FA8] font-bold">
                @{world.creator || "voxelio"}
              </span>
            </div>

            <div className="text-xs text-[#666] space-y-1">
              <div>
                <strong className="text-[#1A1A2E]">Category:</strong>{" "}
                <span className="capitalize">{world.category}</span>
              </div>
              <div>
                <strong className="text-[#1A1A2E]">Max Players:</strong>{" "}
                {world.maxPlayers}
              </div>
            </div>

            {/* PLAY BUTTON */}
            <button
              onClick={handlePlay}
              disabled={launchStatus === "launching"}
              className="mt-3 w-full h-14 rounded-lg font-black text-lg text-white flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background:
                  launchStatus === "launching"
                    ? "linear-gradient(180deg, #9CA3AF, #6B7280)"
                    : "linear-gradient(180deg, #00A2FF 0%, #0072C7 100%)",
                boxShadow:
                  launchStatus === "launching"
                    ? "0 4px 12px rgba(107,114,128,0.4)"
                    : "0 6px 20px rgba(0,162,255,0.4)",
                border: "2px solid #005A9E",
                cursor: launchStatus === "launching" ? "wait" : "pointer",
              }}
            >
              <span className="text-xl">
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

            {/* STAT ROW */}
            <div className="flex justify-around mt-3 pt-3 border-t border-[#E5E7F0]">
              <button
                onClick={handleLike}
                disabled={liking}
                className="flex flex-col items-center gap-1 text-xs font-bold transition"
                style={{
                  color: liked ? "#FF4D8D" : "#666",
                  cursor: liking ? "wait" : "pointer",
                  background: "transparent",
                  border: "none",
                }}
              >
                <span className="text-xl">{liked ? "❤️" : "🤍"}</span>
                {likeCount.toLocaleString()}
              </button>
              <div className="flex flex-col items-center gap-1 text-xs font-bold text-[#666]">
                <span className="text-xl">👥</span>
                {currentOnline} online
              </div>
              <div className="flex flex-col items-center gap-1 text-xs font-bold text-[#666]">
                <span className="text-xl">⭐</span>
                {world.favorites.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
        <div className="flex border-b-2 border-[#E5E7F0]">
          {(
            [
              { key: "about", label: "About" },
              { key: "servers", label: "Servers" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-8 py-3 text-sm font-black transition ${
                activeTab === tab.key
                  ? "bg-[#EEF0F7] text-[#4A1FA8] border-b-4 border-[#6C3CE0] -mb-0.5"
                  : "text-[#666] hover:text-[#4A1FA8]"
              }`}
              style={{ background: activeTab === tab.key ? "#EEF0F7" : "transparent" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "about" && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-black text-[#1A1A2E] mb-2">
                Description
              </h2>
              <p className="text-sm text-[#444] whitespace-pre-wrap leading-relaxed">
                {world.description || "No description provided."}
              </p>
            </div>

            <div>
              <h2 className="text-lg font-black text-[#1A1A2E] mb-3">
                Stats
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[
                  ["Active", `${currentOnline} online`],
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
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#999] mb-1">
                      {label}
                    </div>
                    <div className="text-sm font-black text-[#1A1A2E] capitalize">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "servers" && (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">🌐</div>
            <div className="text-base font-black text-[#1A1A2E] mb-1">
              Server list coming soon
            </div>
            <div className="text-xs text-[#666]">
              In the meantime, click Play to join a public server.
            </div>
          </div>
        )}
      </div>

      {/* ===== BOTTOM BACK LINK ===== */}
      <div className="text-center pt-2">
        <Link
          href="/games"
          className="inline-block text-sm font-bold text-[#6C3CE0] hover:underline"
        >
          ← Back to Games
        </Link>
      </div>

      {/* ===== NOT-INSTALLED POPUP ===== */}
      {launchStatus === "not-installed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
          }}
          onClick={() => setLaunchStatus("idle")}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center border-4 border-[#6C3CE0] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-3">🎮</div>
            <h3 className="text-2xl font-black text-[#1A1A2E] mb-2">
              Voxelio Player Not Installed
            </h3>
            <p className="text-sm text-[#666] mb-6 leading-relaxed">
              To play Voxelio games, download the Voxelio Player app. It&apos;s
              free, fast, and runs full-screen.
            </p>
            <div className="flex gap-2 justify-center">
              <Link
                href="/download"
                className="bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-black text-sm px-6 py-3 rounded-lg border-2 border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
              >
                ⬇ Download App
              </Link>
              <button
                onClick={() => setLaunchStatus("idle")}
                className="bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm px-6 py-3 rounded-lg border-2 border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== FAILED TOAST ===== */}
      {launchStatus === "failed" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold text-sm px-5 py-3 rounded-lg shadow-2xl z-50">
          Failed to launch the app. Please try again.
        </div>
      )}
    </div>
  );
}