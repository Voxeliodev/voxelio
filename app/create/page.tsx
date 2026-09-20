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

// ============================================================
// WORLD CREATION IS LOCKED FOR NOW
// ============================================================
// To re-enable, replace the locked JSX below with the actual
// create form. Everything that powered it is still in
// lib/worlds.ts (createWorld) and lib/worldLayouts.ts.
// ============================================================

export default function CreateWorldPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

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

      <main className="max-w-3xl mx-auto px-3 py-16">

        <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">

          {/* Locked banner */}
          <div className="bg-gradient-to-r from-[#4A1FA8] via-[#6C3CE0] to-[#A855F7] px-6 py-8 text-white text-center relative overflow-hidden">
            <div className="text-7xl mb-3">🔒</div>
            <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.3)" }}>
              World Creation
            </h1>
            <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
              Coming Soon
            </div>
            <div className="absolute -right-8 -bottom-8 text-[160px] opacity-10 select-none">🛠️</div>
          </div>

          {/* Body */}
          <div className="p-8 text-center space-y-4">

            <p className="text-[#1A1A2E] font-semibold">
              We're still building the world editor.
            </p>

            <p className="text-sm text-[#666] max-w-lg mx-auto">
              Soon you'll be able to design your own worlds, place blocks, and publish them for everyone to play. Right now you can still jump into any world from the Games page and hang out with other players.
            </p>

            <div className="bg-[#EEF0F7] border-2 border-[#C5C8D6] rounded p-4 text-left max-w-lg mx-auto">
              <p className="text-xs font-bold text-[#4A1FA8] uppercase tracking-wide mb-2">
                🚧 What's coming
              </p>
              <ul className="text-xs text-[#666] space-y-1.5">
                <li>🎨 Block-by-block world editor</li>
                <li>🌍 Publish worlds for anyone to join</li>
                <li>⭐ Likes, visits, and featured spots</li>
                <li>💰 Earn Voxbux when your world is popular</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-center flex-wrap pt-2">
              <Link
                href="/games"
                className="inline-block bg-gradient-to-b from-[#22C55E] to-[#16A34A] text-white font-bold text-sm px-6 py-2.5 rounded border-2 border-[#15803D] hover:from-[#4ADE80] hover:to-[#22C55E] transition shadow-md"
              >
                🎮 Play Existing Worlds
              </Link>
              <Link
                href="/"
                className="inline-block bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm px-6 py-2.5 rounded border-2 border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Small dev note for you */}
        {isOwner && (
          <div className="mt-4 bg-yellow-50 border-2 border-yellow-300 rounded p-3 text-xs text-yellow-900">
            <strong>Owner note:</strong> World creation is disabled in <code>app/create/page.tsx</code>. To re-enable, restore the create form. The backend (<code>createWorld</code> in <code>lib/worlds.ts</code>) is still fully functional.
          </div>
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