"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { fetchWorlds, type World } from "../../lib/worlds";

type Sort = "popular" | "top" | "new";

const CATEGORIES = [
  { id: "all", name: "All", emoji: "🌐" },
  { id: "adventure", name: "Adventure", emoji: "🗺️" },
  { id: "obstacle", name: "Obby", emoji: "🏃" },
  { id: "roleplay", name: "Roleplay", emoji: "🎭" },
  { id: "building", name: "Building", emoji: "🏗️" },
  { id: "horror", name: "Horror", emoji: "👻" },
  { id: "tycoon", name: "Tycoon", emoji: "💰" },
  { id: "pvp", name: "PvP", emoji: "⚔️" },
  { id: "racing", name: "Racing", emoji: "🏎️" },
  { id: "social", name: "Social", emoji: "💬" },
];

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export default function GamesPage() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [featured, setFeatured] = useState<World[]>([]);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const [totalPlaying, setTotalPlaying] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [search, setSearch] = useState("");
  const [tick, setTick] = useState(0);

  const initialLoadRef = useRef(true);

  // ===== Fetch worlds =====
  useEffect(() => {
    let cancelled = false;
    if (initialLoadRef.current) setLoading(true);

    const timer = setTimeout(() => {
      Promise.all([
        fetchWorlds({ sort, category, search }),
        fetchWorlds({ featuredOnly: true, sort: "popular" }),
      ]).then(([list, feats]) => {
        if (cancelled) return;
        setWorlds(list);
        setFeatured(feats.slice(0, 5));
        setLoading(false);
        initialLoadRef.current = false;
      });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sort, category, search, tick]);

  // ===== Silent refresh every 30s =====
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // ===== Live player counts =====
  useEffect(() => {
    const observerKey = `observer-${Math.random().toString(36).slice(2, 10)}`;
    const lobby = supabase.channel("world-lobby", {
      config: { presence: { key: observerKey } },
    });

    const updateCounts = () => {
      const state = lobby.presenceState();
      const counts: Record<string, number> = {};
      let total = 0;

      for (const key of Object.keys(state)) {
        const entries = state[key] as any[];
        for (const entry of entries) {
          const wid = entry?.worldId;
          if (typeof wid === "string" && wid.length > 0) {
            counts[wid] = (counts[wid] || 0) + 1;
            total += 1;
          }
        }
      }

      setPlayerCounts(counts);
      setTotalPlaying(total);
    };

    lobby
      .on("presence", { event: "sync" }, updateCounts)
      .on("presence", { event: "join" }, updateCounts)
      .on("presence", { event: "leave" }, updateCounts)
      .subscribe();

    return () => {
      supabase.removeChannel(lobby);
    };
  }, []);

  return (
    <>
      {/* HERO */}
      <div className="bg-gradient-to-r from-[#6C3CE0] via-[#7B4FF7] to-[#00B8D4] rounded border-2 border-[#4A1FA8] p-6 md:p-8 text-white relative overflow-hidden mb-6">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold mb-3">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {totalPlaying} {totalPlaying === 1 ? "PLAYER" : "PLAYERS"} IN GAME
          </div>
          <h1
            className="text-3xl md:text-5xl font-black mb-3"
            style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.3)" }}
          >
            Discover Worlds
          </h1>
          <p className="text-white/90 mb-5 text-sm md:text-base max-w-xl">
            Jump into any world with your custom avatar. Meet other players,
            build, race, explore — all in real time.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/games/${featured[0]?.id || "impossible-obby"}`}
              className="bg-gradient-to-b from-[#22C55E] to-[#16A34A] text-white font-bold text-sm px-5 py-2.5 rounded border-2 border-[#15803D] hover:from-[#4ADE80] hover:to-[#22C55E] transition shadow-md inline-block"
            >
              🎮 Quick Play
            </Link>
            <Link
              href="/create"
              title="Coming soon — world creation is locked for now"
              className="bg-white/50 text-[#4A1FA8]/60 font-bold text-sm px-5 py-2.5 rounded border-2 border-[#4A1FA8]/40 transition shadow-md inline-block cursor-not-allowed"
            >
              🔒 Create a World
            </Link>
          </div>
        </div>
        <div className="absolute -right-12 -bottom-12 text-[200px] opacity-20 select-none">
          🎮
        </div>
      </div>

      {/* FEATURED ROW */}
      {featured.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3 border-b-2 border-[#C5C8D6] pb-1">
            <h2 className="text-lg font-black text-[#4A1FA8] flex items-center gap-2">
              ✨ Featured
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {featured.map((world) => (
              <WorldCard
                key={world.id}
                world={world}
                playerCount={playerCounts[world.id] || 0}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* FILTERS */}
      <div className="bg-white border-2 border-[#C5C8D6] rounded p-3 mb-4 space-y-3">
        <div>
          <p className="text-[10px] font-bold text-[#666] uppercase tracking-wide mb-2">
            Sort by
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "popular" as const, label: "Popular", emoji: "🔥" },
                { id: "top" as const, label: "Top Rated", emoji: "⭐" },
                { id: "new" as const, label: "New", emoji: "🆕" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setSort(t.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition flex items-center gap-1.5 ${
                  sort === t.id
                    ? "bg-[#6C3CE0] text-white border-[#4A1FA8]"
                    : "bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE]"
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-[#666] uppercase tracking-wide mb-2">
            Category
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition flex items-center gap-1.5 ${
                  category === cat.id
                    ? "bg-[#6C3CE0] text-white border-[#4A1FA8]"
                    : "bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE]"
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <section>
        <div className="flex items-center justify-between mb-3 border-b-2 border-[#C5C8D6] pb-1">
          <h2 className="text-lg font-black text-[#4A1FA8] flex items-center gap-2">
            🌍 All Worlds
          </h2>
          <span className="text-xs text-[#666] font-semibold">
            {loading
              ? "Loading…"
              : `${worlds.length} ${worlds.length === 1 ? "world" : "worlds"}`}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden"
              >
                <div className="aspect-square bg-[#EEF0F7] animate-pulse" />
                <div className="p-2 space-y-1">
                  <div className="h-3 bg-[#EEF0F7] rounded animate-pulse" />
                  <div className="h-2 bg-[#EEF0F7] rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : worlds.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-16 text-center">
            <div className="text-7xl mb-4">🔍</div>
            <h3 className="font-black text-2xl text-[#1A1A2E] mb-2">
              No Worlds Found
            </h3>
            <p className="text-sm text-[#666] max-w-lg mx-auto mb-6">
              Try a different search, sort, or category.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("all");
                setSort("popular");
              }}
              className="text-xs font-bold text-[#6C3CE0] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {worlds.map((world) => (
              <WorldCard
                key={world.id}
                world={world}
                playerCount={playerCounts[world.id] || 0}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// ============================================================
// WORLD CARD
// ============================================================
function WorldCard({
  world,
  playerCount,
  compact = false,
}: {
  world: World;
  playerCount: number;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/games/${world.id}`}
      className="group bg-white border-2 border-[#C5C8D6] rounded overflow-hidden hover:border-[#6C3CE0] hover:shadow-lg transition"
    >
      <div
        className="aspect-square flex items-center justify-center relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${world.thumbnailColor} 0%, ${shade(world.thumbnailColor, -30)} 100%)`,
        }}
      >
        {world.imageUrl ? (
          <img
            src={world.imageUrl}
            alt={world.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            draggable={false}
          />
        ) : (
          <span className="text-6xl md:text-7xl select-none drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
            {world.thumbnailEmoji}
          </span>
        )}

        {world.featured && (
          <span className="absolute top-1.5 left-1.5 bg-[#FFD700] text-[#1A1A2E] text-[9px] font-black px-1.5 py-0.5 rounded z-10">
            ⭐ FEATURED
          </span>
        )}

        {playerCount > 0 ? (
          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            {playerCount} playing
          </span>
        ) : null}

        <span className="absolute top-1.5 right-1.5 bg-black/50 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">
          {world.category}
        </span>
      </div>

      <div className={`p-2 ${compact ? "" : "space-y-1"}`}>
        <h3 className="font-black text-xs text-[#1A1A2E] truncate leading-tight">
          {world.name}
        </h3>
        <p className="text-[10px] text-[#666] truncate">
          by <strong className="text-[#4A1FA8]">{world.creator}</strong>
        </p>

        {!compact && (
          <div className="flex items-center justify-between text-[10px] text-[#666] pt-1 border-t border-[#E5E7F0]">
            <span title="Likes">👍 {formatCount(world.likes)}</span>
            <span title="Visits">👥 {formatCount(world.visits)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function shade(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}