"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { createWorld } from "../../lib/worlds";
import { LAYOUT_OPTIONS } from "../../lib/worldLayouts";

const EMOJI_CHOICES = [
  "🌍", "🏙️", "🏝️", "🏃", "💰", "👻", "⚔️", "🏎️", "🧱", "🐠",
  "🧟", "🍭", "🚀", "🏰", "🌋", "🏔️", "🎡", "🎯", "🎨", "🎪",
];

const COLOR_CHOICES = [
  "#6C3CE0", "#7B2FF7", "#00B8D4", "#22C55E", "#EF4444",
  "#F97316", "#FFD700", "#EC4899", "#A855F7", "#0EA5E9",
  "#4B5563", "#1A1A2E",
];

const CATEGORY_CHOICES = [
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

export default function CreateWorldPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🌍");
  const [color, setColor] = useState("#6C3CE0");
  const [category, setCategory] = useState("adventure");
  const [layout, setLayout] = useState("plaza");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => setUser(getCurrentUser());

  useEffect(() => {
    refresh();
    setMounted(true);
    const unsub = subscribeAuth(() => refresh());
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("You must be signed in.");
      return;
    }
    if (!name.trim()) {
      setError("Please give your world a name.");
      return;
    }

    setBusy(true);
    const res = await createWorld({
      name,
      description,
      category,
      layout,
      thumbnailEmoji: emoji,
      thumbnailColor: color,
      creator: user.username,
    });
    setBusy(false);

    if (!res.success || !res.world) {
      setError(res.error || "Couldn't create world.");
      return;
    }

    router.push(`/games/${res.world.id}`);
  };

  const unreadCount = user ? getUnreadCount(user.id) : 0;
  const isOwner = isOwnerAccount(user?.username);

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games" },
    { name: "Create", href: "/create", active: true },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans">

      <div className="bg-[#1A1A2E] text-white text-xs">
        <div className="max-w-6xl mx-auto px-3 py-1.5 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                <span className="text-gray-400">
                  Welcome,{" "}
                  <strong className="text-white inline-flex items-center">
                    {user.username}
                    <AccountBadge username={user.username} userId={user.id} size={12} />
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
                {user ? formatVoxbux(user.voxbux) : "? V$"}
              </strong>
            </span>
            <Link href="#" className="hover:text-[#00E5FF]">Help</Link>
          </div>
        </div>
      </div>

      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/voxelio-logo.png" alt="Voxelio" className="h-14 w-auto object-contain bg-white rounded px-4 py-1.5 shadow-md" />
          </Link>
        </div>
      </header>

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

      <main className="max-w-4xl mx-auto px-3 py-6">

        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#4A1FA8] mb-1">🛠️ Create a World</h1>
          <p className="text-sm text-[#666]">
            Design your own world and publish it for everyone to play.
          </p>
        </div>

        {!user ? (
          <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-12 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="font-black text-xl text-[#1A1A2E] mb-2">Sign in to create</h2>
            <p className="text-sm text-[#666] mb-6">
              You need an account to make worlds.
            </p>
            <Link
              href="/signin"
              className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-8 py-3 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* LIVE PREVIEW */}
            <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
                Preview
              </div>
              <div className="p-4 flex items-center gap-4">
                <div
                  className="w-24 h-24 rounded-lg flex items-center justify-center text-5xl flex-shrink-0 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${color} 0%, ${shade(color, -30)} 100%)`,
                  }}
                >
                  {emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-xl text-[#1A1A2E] truncate">
                    {name || "Untitled World"}
                  </h3>
                  <p className="text-xs text-[#666] mb-1">
                    by <strong className="text-[#4A1FA8]">{user.username}</strong>
                  </p>
                  <p className="text-xs text-[#666] line-clamp-2">
                    {description || "No description yet."}
                  </p>
                </div>
              </div>
            </div>

            {/* NAME + DESC */}
            <div className="bg-white border-2 border-[#C5C8D6] rounded p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[#1A1A2E] mb-1">
                  World Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 60))}
                  placeholder="e.g. The Crystal Caves"
                  className="w-full border-2 border-[#C5C8D6] rounded px-3 py-2 text-sm outline-none focus:border-[#6C3CE0]"
                  maxLength={60}
                />
                <p className="text-[10px] text-[#888] text-right mt-1">{name.length}/60</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[#1A1A2E] mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 240))}
                  placeholder="Tell players what your world is about…"
                  rows={2}
                  className="w-full border-2 border-[#C5C8D6] rounded px-3 py-2 text-sm outline-none resize-none focus:border-[#6C3CE0]"
                  maxLength={240}
                />
                <p className="text-[10px] text-[#888] text-right mt-1">{description.length}/240</p>
              </div>
            </div>

            {/* LAYOUT PICKER */}
            <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
                Choose a Layout
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLayout(opt.id)}
                    className={`flex flex-col items-start p-2 rounded border-2 transition text-left ${
                      layout === opt.id
                        ? "border-[#6C3CE0] bg-[#F5F0FF] shadow-md"
                        : "border-[#C5C8D6] bg-white hover:border-[#6C3CE0]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{opt.emoji}</span>
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: opt.accent }}
                      />
                    </div>
                    <span className="font-black text-xs text-[#1A1A2E] leading-tight">
                      {opt.name}
                    </span>
                    <span className="text-[10px] text-[#666] leading-tight line-clamp-2">
                      {opt.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* EMOJI + COLOR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
                <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
                  Thumbnail Emoji
                </div>
                <div className="p-3 grid grid-cols-6 gap-1.5">
                  {EMOJI_CHOICES.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={`aspect-square rounded border-2 text-2xl flex items-center justify-center transition ${
                        emoji === e
                          ? "border-[#6C3CE0] bg-[#F5F0FF] scale-110"
                          : "border-[#C5C8D6] hover:border-[#6C3CE0]"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
                <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
                  Thumbnail Color
                </div>
                <div className="p-3 grid grid-cols-6 gap-1.5">
                  {COLOR_CHOICES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`aspect-square rounded border-2 transition ${
                        color === c
                          ? "border-[#6C3CE0] scale-110 shadow-md"
                          : "border-[#C5C8D6] hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* CATEGORY */}
            <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
                Category
              </div>
              <div className="p-3 flex flex-wrap gap-1.5">
                {CATEGORY_CHOICES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full border transition flex items-center gap-1.5 ${
                      category === c.id
                        ? "bg-[#6C3CE0] text-white border-[#4A1FA8]"
                        : "bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE]"
                    }`}
                  >
                    <span>{c.emoji}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 rounded p-3 text-sm text-red-800">
                ❌ {error}
              </div>
            )}

            {/* SUBMIT */}
            <div className="flex gap-2">
              <Link
                href="/games"
                className="flex-1 text-center bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm py-3 rounded border-2 border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className={`flex-[2] font-black text-base py-3 rounded border-2 transition ${
                  busy || !name.trim()
                    ? "bg-[#EEF0F7] text-[#888] border-[#C5C8D6] cursor-not-allowed"
                    : "bg-gradient-to-b from-[#22C55E] to-[#16A34A] text-white border-[#15803D] hover:from-[#4ADE80] hover:to-[#22C55E] shadow-md"
                }`}
              >
                {busy ? "Creating…" : "🚀 Publish World"}
              </button>
            </div>
          </form>
        )}
      </main>

      <footer className="bg-[#1A1A2E] text-white mt-8 border-t-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-6 text-center text-xs text-gray-500">
          © 2026 Voxelio. Voxelio is not affiliated with any other platform.
        </div>
      </footer>
    </div>
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