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

type FilterTab = "popular" | "top-rated" | "new" | "featured";

const FILTER_TABS: { id: FilterTab; label: string; emoji: string }[] = [
  { id: "popular", label: "Popular", emoji: "🔥" },
  { id: "top-rated", label: "Top Rated", emoji: "⭐" },
  { id: "new", label: "New", emoji: "🆕" },
  { id: "featured", label: "Featured", emoji: "✨" },
];

const CATEGORIES = [
  { id: "all", name: "All Categories", emoji: "🌐" },
  { id: "adventure", name: "Adventure", emoji: "🗺️" },
  { id: "obstacle", name: "Obstacle", emoji: "🏃" },
  { id: "roleplay", name: "Roleplay", emoji: "🎭" },
  { id: "building", name: "Building", emoji: "🏗️" },
  { id: "horror", name: "Horror", emoji: "👻" },
  { id: "tycoon", name: "Tycoon", emoji: "💰" },
  { id: "pvp", name: "PvP", emoji: "⚔️" },
  { id: "social", name: "Social", emoji: "💬" },
];

export default function GamesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [filter, setFilter] = useState<FilterTab>("popular");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const refresh = () => setCurrentUser(getCurrentUser());

  useEffect(() => {
    refresh();
    const unsub = subscribeAuth(() => refresh());
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;
  const isOwner = isOwnerAccount(currentUser?.username);

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games", active: true },
    { name: "Create", href: "/#create" },
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
            <button className="text-white text-sm">🔍</button>
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
        <div className="bg-gradient-to-r from-[#6C3CE0] via-[#7B4FF7] to-[#00B8D4] rounded border-2 border-[#4A1FA8] p-8 text-white relative overflow-hidden mb-6">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold mb-3">
              🎮 COMING SOON
            </div>
            <h1
              className="text-3xl md:text-5xl font-black mb-3"
              style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.3)" }}
            >
              Explore Worlds
            </h1>
            <p className="text-white/90 mb-5 text-sm md:text-base max-w-xl">
              Discover incredible worlds created by the Voxelio community. Adventure, obstacle courses, tycoons, roleplay, and more — all built with pure creativity.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/#create"
                className="bg-white text-[#4A1FA8] font-bold text-sm px-5 py-2.5 rounded border-2 border-[#4A1FA8] hover:bg-[#F0E8FF] transition shadow-md inline-block"
              >
                🛠️ Create a World
              </Link>
              <Link
                href="/catalog"
                className="bg-[#1A1A2E] text-white font-bold text-sm px-5 py-2.5 rounded border-2 border-white/30 hover:bg-[#2A2A4E] transition shadow-md inline-block"
              >
                🛍️ Browse Catalog
              </Link>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 text-[200px] opacity-20 select-none">
            🎮
          </div>
        </div>

        {/* FILTER TABS */}
        <div className="bg-white border-2 border-[#C5C8D6] rounded p-2 mb-4 flex flex-wrap gap-2">
          {FILTER_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-4 py-2 text-sm font-bold rounded border transition flex items-center gap-1.5 ${
                filter === t.id
                  ? "bg-[#6C3CE0] text-white border-[#4A1FA8]"
                  : "bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE]"
              }`}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* CATEGORY CHIPS */}
        <div className="bg-white border-2 border-[#C5C8D6] rounded p-3 mb-6">
          <p className="text-[10px] font-bold text-[#666] uppercase tracking-wide mb-2">Categories</p>
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

        {/* EMPTY STATE */}
        <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-16 text-center mb-6">
          <div className="text-7xl mb-4">🌍</div>
          <h2 className="font-black text-2xl text-[#1A1A2E] mb-2">No Worlds Yet</h2>
          <p className="text-sm text-[#666] max-w-lg mx-auto mb-6">
            The Voxelio universe is still being built. Worlds will start appearing here as soon as creators like you start building them.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Link
              href="/#create"
              className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition shadow-md"
            >
              🛠️ Be the First Creator
            </Link>
            {!currentUser && (
              <Link
                href="/signup"
                className="inline-block bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm px-6 py-2.5 rounded border border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
              >
                Sign Up Free
              </Link>
            )}
          </div>
        </div>

        {/* WHAT'S COMING */}
        <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
          <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
            🚧 What's Coming
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { emoji: "🎯", title: "Featured Worlds", desc: "Hand-picked creations from the Voxelio team" },
              { emoji: "🔥", title: "Trending Now", desc: "See what everyone's playing right this second" },
              { emoji: "⭐", title: "Like & Rate", desc: "Rate worlds and help great creations rise to the top" },
              { emoji: "👥", title: "Play with Friends", desc: "Join your friends' worlds with a single click" },
              { emoji: "🏆", title: "Creator Leaderboards", desc: "Top creators earn exclusive badges and Voxbux" },
              { emoji: "🛡️", title: "Safe & Moderated", desc: "Advanced chat filtering and parental controls" },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 bg-[#EEF0F7] border border-[#C5C8D6] rounded p-3"
              >
                <div className="text-3xl flex-shrink-0">{item.emoji}</div>
                <div>
                  <h3 className="font-black text-sm text-[#1A1A2E]">{item.title}</h3>
                  <p className="text-xs text-[#666]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-[#1A1A2E] text-white mt-8 border-t-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-bold mb-2 text-[#00E5FF]">Voxelio</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                <li><Link href="#" className="hover:text-white">About Us</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
                <li><Link href="#" className="hover:text-white">Press</Link></li>
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2 text-[#00E5FF]">Community</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                <li><Link href="#" className="hover:text-white">Forums</Link></li>
                <li><Link href="#" className="hover:text-white">Discord</Link></li>
                <li><Link href="#" className="hover:text-white">Events</Link></li>
                <li><Link href="#" className="hover:text-white">Developer Hub</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2 text-[#00E5FF]">Support</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                <li><Link href="#" className="hover:text-white">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white">Safety</Link></li>
                <li><Link href="#" className="hover:text-white">Report Abuse</Link></li>
                <li><Link href="#" className="hover:text-white">Parental Controls</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2 text-[#00E5FF]">Legal</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                <li><Link href="#" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white">DMCA</Link></li>
                <li><Link href="#" className="hover:text-white">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-6 pt-4 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-500">
            <p>© 2026 Voxelio. All rights reserved. Voxelio is not affiliated with any other platform.</p>
            <div className="flex gap-3">
              <Link href="#" className="hover:text-white">𝕏</Link>
              <Link href="#" className="hover:text-white">▶</Link>
              <Link href="#" className="hover:text-white">💬</Link>
              <Link href="#" className="hover:text-white">♪</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}