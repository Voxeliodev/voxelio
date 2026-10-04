"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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
import VoxelioLogo from "../components/VoxelioLogo";

// ============================================================
// SHARED LAYOUT for /games and /games/[id]
// ============================================================
// Renders the top bar, header, and nav so both pages look
// identical except for their middle content.
// ============================================================

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const pathname = usePathname();

  const refreshUser = () => setCurrentUser(getCurrentUser());

  useEffect(() => {
    refreshUser();
    const unsub = subscribeAuth(() => refreshUser());
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;
  const isOwner = isOwnerAccount(currentUser?.username);

  // Which tab is active?
  const isOnGamesList = pathname === "/games";

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games", active: pathname?.startsWith("/games") },
    { name: "Create", href: "/create" },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans theme-container">
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
                    <AccountBadge
                      username={currentUser.username}
                      userId={currentUser.id}
                      size={12}
                    />
                  </strong>
                </span>
                <button
                  onClick={handleSignOut}
                  className="hover:text-[#00E5FF]"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <span className="text-gray-400">Welcome, Guest</span>
                <Link href="/signin" className="hover:text-[#00E5FF]">
                  Sign In
                </Link>
                <Link href="/signup" className="hover:text-[#00E5FF]">
                  Sign Up
                </Link>
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
            <Link href="#" className="hover:text-[#00E5FF]">
              Help
            </Link>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
          <Link href="/games" className="hover:opacity-90">
            <VoxelioLogo />
          </Link>
          <div className="hidden md:flex items-center gap-2 bg-white/10 rounded px-3 py-1.5 border border-white/20">
            <input
              type="text"
              placeholder="Search games..."
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

      {/* PAGE CONTENT */}
      <main className="max-w-6xl mx-auto px-3 py-6">{children}</main>

      {/* FOOTER */}
      <footer className="bg-[#1A1A2E] text-white mt-8 border-t-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-6 text-center text-xs text-gray-500">
          © 2026 Voxelio. Voxelio is not affiliated with any other platform.
        </div>
      </footer>
    </div>
  );
}