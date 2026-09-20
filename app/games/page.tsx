"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  getCurrentUser,
  signOut,
  formatVoxbux,
  getUnreadCount,
  subscribeAuth,
  type User,
} from "../../lib/auth";
import { isOwnerAccount } from "../../lib/badges";
import AccountBadge from "../components/AccountBadge";
import NavLink from "../components/NavLink";
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [featured, setFeatured] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [search, setSearch] = useState("");

  const refreshUser = () => setCurrentUser(getCurrentUser());

  useEffect(() => {
    refreshUser();
    const unsub = subscribeAuth(() => refreshUser());
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      Promise.all([
        fetchWorlds({ sort, category, search }),
        fetchWorlds({ featuredOnly: true, sort: "popular" }),
      ]).then(([list, feats]) => {
        if (cancelled) return;
        setWorlds(list);
        setFeatured(feats.slice(0, 5));
        setLoading(false);
      });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sort, category, search]);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;
  const isOwner = isOwnerAccount(currentUser?.username);

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games", active: true },
    { name: "Create", href: "/create" },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans">

      {/* TOP BAR */}
      <div className="bg-[#1A1A2E] text-white text-xs">
        <div className="max-w-6xl mx-auto px-3 py-1.5 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            {currentUser ? (
              <>
                <span className="text-gray-400">
                  Welcome,{" "}
                  <strong className="text-white inline-flex items-center">
                    {currentUser.username}
                    <AccountBadge username={currentUser.username} userId={currentUser.id} size={12} />
                  </strong>
                </span>
                <button onClick={handleSignOut} className="hover:text-[#00E5FF]">Sign Out</button>
              </>
            ) : (
              <>
                <span className="text-gray-400">Welcome, Guest</span>
                <Link href="/signin" className="hover:text-[#00E5FF]">Sign In</Link>
                <Link href="/signup" className="hover:text-[#00E5FF]">Sign Up</Link>
              </>
            )}
          </div>
          <div className="flex gap-4">
            <span>
              Voxbux:{" "}
              <strong className="text-[#FFD700]">
                {currentUser ? formatVoxbux(currentUser.voxbux) : "? V$"}
              </strong>
            </span>
            <Link href="#" className="hover:text-[#00E5FF]">Help</Link>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/voxelio-logo.png" alt="Voxelio" className="h-14 w-auto object-contain bg-white rounded px-4 py-1.5 shadow-md" />
          </Link>
          <div className="hidden md:flex items-center gap-2 bg-white/10 rounded px-3 py-1.5 border border-white/20">
            <input
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-white placeholder-white/60 text-sm outline-none w-48"
            />
            <span className="text-white text-sm">🔍</span>
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav className="bg-[#4A1FA8] border-b-2 border-[#2D1070]">
        <div className="max-w-6xl mx-auto px-3 flex flex-wrap">
          {navTabs.map((tab) => (
            <NavLink
              key={tab.name}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-bold border-r border-[#3A1580] transition relative ${
                tab.active
                  ? "bg-[#EEF0F7] text-[#4A1FA8]"
                  : tab.dev
                  ? "text-[#FF6B6B] hover:bg-[#3A1580]"
                  : tab.special
                  ? "text-[#FFD700] hover:bg-[#3A1580]"
                  : "text-white hover:bg-[#3A1580]"
              }`}
            >
              {tab.name}
              {tab.name === "Messages" && unreadCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-3 py-6">

        {/* HERO */}
        <div className="bg-gradient-to-r from-[#6C3CE0] via-[#7B4FF7] to-[#00B8D4] rounded border-2 border-[#4A1FA8] p-6 md:p-8 text-white relative overflow-hidden mb-6">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold mb-3">
              🎮 {worlds.length} WORLDS LIVE
            </div>
            <h1
              className="text-3xl md:text-5xl font-black mb-3"
              style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.3)" }}
            >
              Discover Worlds
            </h1>
            <p className="text-white/90 mb-5 text-sm md:text-base max-w-xl">
              Jump into any world with your custom avatar. Meet other players, build, race, explore — all in real time.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/games/${featured[0]?.id || "voxelio-plaza"}`}
                className="bg-gradient-to-b from-[#22C55E] to-[#16A34A] text-white font-bold text-sm px-5 py-2.5 rounded border-2 border-[#15803D] hover:from-[#4ADE80] hover:to-[#22C55E] transition shadow-md inline-block"
              >
                🎮 Quick Play
              </Link>
              <Link
                href="/create"
                className="bg-white text-[#4A1FA8] font-bold text-sm px-5 py-2.5 rounded border-2 border-[#4A1FA8] hover:bg-[#F0E8FF] transition shadow-md inline-block"
              >
                🛠️ Create a World
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
                <WorldCard key={world.id} world={world} compact />
              ))}
            </div>
          </section>
        )}

        {/* FILTERS */}
        <div className="bg-white border-2 border-[#C5C8D6] rounded p-3 mb-4 space-y-3">
          <div>
            <p className="text-[10px] font-bold text-[#666] uppercase tracking-wide mb-2">Sort by</p>
            <div className="flex flex-wrap gap-1.5">
              {([
                { id: "popular" as const, label: "Popular", emoji: "🔥" },
                { id: "top" as const, label: "Top Rated", emoji: "⭐" },
                { id: "new" as const, label: "New", emoji: "🆕" },
              ]).map((t) => (
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
            <p className="text-[10px] font-bold text-[#666] uppercase tracking-wide mb-2">Category</p>
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
              {loading ? "Loading…" : `${worlds.length} ${worlds.length === 1 ? "world" : "worlds"}`}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
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
              <h3 className="font-black text-2xl text-[#1A1A2E] mb-2">No Worlds Found</h3>
              <p className="text-sm text-[#666] max-w-lg mx-auto mb-6">
                Try a different search, sort, or category.
              </p>
              <button
                onClick={() => { setSearch(""); setCategory("all"); setSort("popular"); }}
                className="text-xs font-bold text-[#6C3CE0] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {worlds.map((world) => (
                <WorldCard key={world.id} world={world} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="bg-[#1A1A2E] text-white mt-8 border-t-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-6 text-center text-xs text-gray-500">
          © 2026 Voxelio. Voxelio is not affiliated with any other platform.
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// WORLD CARD
// ============================================================
function WorldCard({ world, compact = false }: { world: World; compact?: boolean }) {
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
        <span className="text-6xl md:text-7xl select-none drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
          {world.thumbnailEmoji}
        </span>

        {world.featured && (
          <span className="absolute top-1.5 left-1.5 bg-[#FFD700] text-[#1A1A2E] text-[9px] font-black px-1.5 py-0.5 rounded">
            ⭐ FEATURED
          </span>
        )}

        <span className="absolute top-1.5 right-1.5 bg-black/50 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
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

// Lighten or darken a hex color by a percent (-100..100)
function shade(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}