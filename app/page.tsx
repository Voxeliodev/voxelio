"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getUsers, getCurrentUser, signOut, formatVoxbux, subscribeAuth } from "../lib/auth";
import type { User } from "../lib/auth";
import { isOwnerAccount } from "../lib/badges";
import Avatar from "./components/Avatar";
import AccountBadge from "./components/AccountBadge";
import NavLink from "./components/NavLink";

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "friends">("all");

  const refresh = () => {
    setUsers(getUsers());
    setCurrentUser(getCurrentUser());
  };

  useEffect(() => {
    refresh();
    const unsub = subscribeAuth(() => refresh());
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
    setUsers(getUsers());
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.username.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "online" && user.status === "online") ||
      (filter === "friends" && currentUser?.friendIds?.includes(user.id));
    return matchesSearch && matchesFilter;
  });

  const onlineCount = users.filter((u) => u.status === "online").length;
  const friendsCount = currentUser ? currentUser.friendIds.length : 0;
  const isOwner = isOwnerAccount(currentUser?.username);

  const navTabs: any[] = [
    { name: "Home", href: "#", active: true },
    { name: "Games", href: "#discover" },
    { name: "Create", href: "#create" },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans">

      {/* TOP UTILITY BAR */}
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

      {/* MAIN HEADER */}
      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/voxelio-logo.png"
              alt="Voxelio Logo"
              className="h-14 w-auto object-contain bg-white rounded px-4 py-1.5 shadow-md"
            />
          </Link>
          <div className="hidden md:flex items-center gap-2 bg-white/10 rounded px-3 py-1.5 border border-white/20">
            <input
              type="text"
              placeholder="Search worlds..."
              className="bg-transparent text-white placeholder-white/60 text-sm outline-none w-48"
            />
            <button className="text-white text-sm">🔍</button>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav className="bg-[#4A1FA8] border-b-2 border-[#2D1070]">
        <div className="max-w-6xl mx-auto px-3 flex flex-wrap">
          {navTabs.map((tab) => (
            <NavLink
              key={tab.name}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-bold border-r border-[#3A1580] transition ${
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
            </NavLink>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-3 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        <aside className="lg:col-span-1 space-y-4">

          {currentUser ? (
            <div className="bg-white border-2 border-[#C5C8D6] rounded">
              <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 rounded-t border-b border-[#4A1FA8]">
                Your Account
              </div>
              <div className="p-3 space-y-3">
                <div className="flex flex-col items-center">
                  <Avatar config={currentUser.avatarConfig} size={90} />
                </div>
                <div className="text-center">
                  <Link
                    href={`/profile/${currentUser.username}/${currentUser.id}`}
                    className="font-black text-sm hover:text-[#6C3CE0] truncate inline-flex items-center justify-center"
                  >
                    {currentUser.username}
                    <AccountBadge username={currentUser.username} userId={currentUser.id} size={14} />
                  </Link>
                  <p className="text-[10px] text-[#666]">
                    {currentUser.status === "online" ? "🟢 Online" : "⚪ Offline"}
                  </p>
                </div>
                <div className="text-xs text-[#666] text-center border-t border-[#E5E7F0] pt-2">
                  Member since {currentUser.joined}
                </div>
                <div className="text-xs text-[#666] text-center">
                  Balance: <strong className="text-[#FFD700]">{formatVoxbux(currentUser.voxbux)}</strong>
                </div>
                <Link
                  href={`/profile/${currentUser.username}/${currentUser.id}`}
                  className="block text-center w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm py-2 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                >
                  👤 My Profile
                </Link>
                <Link
                  href="/avatar"
                  className="block text-center w-full bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm py-2 rounded border border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
                >
                  🎨 Edit Avatar
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm py-2 rounded border border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-[#C5C8D6] rounded">
              <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 rounded-t border-b border-[#4A1FA8]">
                Sign In
              </div>
              <div className="p-3 space-y-2">
                <Link
                  href="/signin"
                  className="block text-center w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm py-2 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                >
                  Log In
                </Link>
                <div className="text-xs text-center text-[#666] border-t border-[#E5E7F0] pt-2">
                  New here?{" "}
                  <Link href="/signup" className="text-[#6C3CE0] hover:underline font-bold">
                    Sign Up
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border-2 border-[#C5C8D6] rounded">
            <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 rounded-t border-b border-[#4A1FA8]">
              Voxelio Stats
            </div>
            <div className="p-3 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-[#666]">Players Online:</span>
                <strong className="text-[#4A1FA8]">{onlineCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Worlds:</span>
                <strong className="text-[#4A1FA8]">0</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">Members:</span>
                <strong className="text-[#4A1FA8]">{users.length}</strong>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-[#FFE9C4] to-[#FFD79A] border-2 border-[#E0A85C] rounded">
            <div className="bg-[#E0A85C] text-white text-sm font-bold px-3 py-2 rounded-t border-b border-[#B8883C]">
              ⭐ INDEV Club
            </div>
            <div className="p-3 text-sm">
              <p className="text-[#5A3A1A] mb-2 font-semibold">
                Get exclusive perks, more Voxbux, and a special badge!
              </p>
              <Link
                href="/indev"
                className="block text-center w-full bg-gradient-to-b from-[#FFB84D] to-[#E08A1C] text-white font-bold text-xs py-2 rounded border border-[#A8680C] hover:from-[#FFC86D] hover:to-[#F09A2C] transition"
              >
                Learn More
              </Link>
            </div>
          </div>

          <div className="bg-white border-2 border-[#C5C8D6] rounded">
            <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 rounded-t border-b border-[#4A1FA8]">
              Quick Links
            </div>
            <ul className="p-3 text-sm space-y-1.5">
              <li>
                <Link href="#" className="text-[#4A1FA8] hover:underline flex items-center gap-1">
                  ▸ Build a World
                </Link>
              </li>
              <li>
                <Link href="#" className="text-[#4A1FA8] hover:underline flex items-center gap-1">
                  ▸ Download Studio
                </Link>
              </li>
              <li>
                <Link href="#" className="text-[#4A1FA8] hover:underline flex items-center gap-1">
                  ▸ Report Abuse
                </Link>
              </li>
              <li>
                <Link href="#" className="text-[#4A1FA8] hover:underline flex items-center gap-1">
                  ▸ Parental Controls
                </Link>
              </li>
              <li>
                <a href="/redeem" className="text-[#4A1FA8] hover:underline flex items-center gap-1">
                  ▸ Redeem Code
                </a>
              </li>
            </ul>
          </div>
        </aside>

        <div className="lg:col-span-3 space-y-6">

          <div className="bg-gradient-to-r from-[#6C3CE0] via-[#7B4FF7] to-[#00B8D4] rounded border-2 border-[#4A1FA8] p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.3)" }}>
                Welcome to VOXELIO!
              </h1>
              <p className="text-white/90 mb-4 max-w-xl text-sm md:text-base">
                {currentUser ? (
                  <>
                    Hey{" "}
                    <strong className="inline-flex items-center">
                      {currentUser.username}
                      <AccountBadge username={currentUser.username} userId={currentUser.id} size={14} />
                    </strong>
                    ! Ready to build something amazing today?
                  </>
                ) : (
                  "Build worlds. Play together. Connect through Nexus Gates. Be one of the first creators in the universe of infinite possibilities."
                )}
              </p>
              <div className="flex gap-2 flex-wrap">
                {currentUser ? (
                  <>
                    <Link
                      href="/avatar"
                      className="bg-white text-[#4A1FA8] font-bold text-sm px-5 py-2.5 rounded border-2 border-[#4A1FA8] hover:bg-[#F0E8FF] transition shadow-md inline-block"
                    >
                      🎨 Edit Your Avatar
                    </Link>
                    <Link
                      href={`/profile/${currentUser.username}/${currentUser.id}`}
                      className="bg-[#1A1A2E] text-white font-bold text-sm px-5 py-2.5 rounded border-2 border-white/30 hover:bg-[#2A2A4E] transition shadow-md inline-block"
                    >
                      👤 View Profile
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/signup"
                    className="bg-white text-[#4A1FA8] font-bold text-sm px-5 py-2.5 rounded border-2 border-[#4A1FA8] hover:bg-[#F0E8FF] transition shadow-md inline-block"
                  >
                    🎮 Sign Up Free
                  </Link>
                )}
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 text-[180px] opacity-20 select-none">
              ◆
            </div>
          </div>

          <section id="discover">
            <div className="flex items-center justify-between mb-3 border-b-2 border-[#C5C8D6] pb-1">
              <h2 className="text-lg font-black text-[#4A1FA8]">🎯 Featured Worlds</h2>
            </div>
            <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-12 text-center">
              <div className="text-6xl mb-4">🏗️</div>
              <h3 className="font-black text-xl text-[#1A1A2E] mb-2">No Worlds Yet</h3>
              <p className="text-sm text-[#666] mb-6 max-w-md mx-auto">
                The Voxelio universe is waiting for its first creation. Will it be yours?
              </p>
              {!currentUser && (
                <Link
                  href="/signup"
                  className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-8 py-3 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition shadow-md"
                >
                  🛠️ Sign Up to Create
                </Link>
              )}
            </div>
          </section>

          <section id="people">
            <div className="flex items-center justify-between mb-3 border-b-2 border-[#C5C8D6] pb-1">
              <h2 className="text-lg font-black text-[#4A1FA8]">👥 Members</h2>
              <span className="text-xs text-[#666] font-semibold">
                {users.length} {users.length === 1 ? "member" : "members"}
              </span>
            </div>

            <div className="bg-white border-2 border-[#C5C8D6] rounded p-3 mb-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="flex-1 flex items-center gap-2 bg-[#EEF0F7] border border-[#C5C8D6] rounded px-3 py-2 focus-within:border-[#6C3CE0]">
                <span className="text-[#666]">🔍</span>
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent outline-none text-sm flex-1 text-[#1A1A2E]"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-[#666] hover:text-[#6C3CE0] text-sm">
                    ✕
                  </button>
                )}
              </div>

              <div className="flex gap-1">
                {[
                  { key: "all" as const, label: `All (${users.length})` },
                  { key: "online" as const, label: `Online (${onlineCount})` },
                  { key: "friends" as const, label: `Friends (${friendsCount})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-3 py-2 text-xs font-bold rounded border transition ${
                      filter === tab.key
                        ? "bg-[#6C3CE0] text-white border-[#4A1FA8]"
                        : "bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredUsers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden hover:border-[#6C3CE0] transition"
                  >
                    <Link
                      href={`/profile/${user.username}/${user.id}`}
                      className="block bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] p-3 flex justify-center hover:from-[#DDD6F0] hover:to-[#C5BCE5] transition"
                    >
                      <Avatar config={user.avatarConfig} size={80} />
                    </Link>

                    <div className="bg-gradient-to-r from-[#6C3CE0] to-[#5A2FC7] px-3 py-2 flex items-center justify-between gap-2">
                      <Link
                        href={`/profile/${user.username}/${user.id}`}
                        className="font-black text-white text-sm truncate hover:underline flex items-center flex-1 min-w-0"
                        title={user.username}
                      >
                        <span className="truncate">{user.username}</span>
                        <AccountBadge username={user.username} userId={user.id} size={14} />
                        {currentUser?.id === user.id && (
                          <span className="ml-2 text-[10px] bg-white/20 px-1.5 py-0.5 rounded flex-shrink-0">YOU</span>
                        )}
                      </Link>
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          user.status === "online" ? "bg-green-400" : "bg-gray-400"
                        }`}
                        title={user.status === "online" ? "Online" : "Offline"}
                      />
                    </div>

                    <div className="p-3">
                      <p className="text-xs text-[#666] mb-2 min-h-[32px]">{user.bio}</p>
                      <div className="flex justify-between text-[10px] text-[#666] mb-3 border-t border-[#E5E7F0] pt-2">
                        <span>👥 {user.friends} friends</span>
                        <span>📅 {user.joined}</span>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/profile/${user.username}/${user.id}`}
                          className="flex-1 text-center text-xs font-bold py-2 rounded border bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                        >
                          View Profile
                        </Link>
                        <Link
                          href="/friends"
                          className="px-3 text-xs font-bold py-2 rounded border bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
                          title="Add Friend"
                        >
                          +
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-10 text-center">
                <div className="text-5xl mb-3">👤</div>
                <h3 className="font-black text-lg text-[#1A1A2E] mb-2">
                  {search ? "No Players Found" : filter === "friends" ? "No Friends Yet" : "No Players Yet"}
                </h3>
                <p className="text-sm text-[#666] max-w-md mx-auto mb-4">
                  {search
                    ? `Nobody with "${search}" in their username has signed up yet.`
                    : filter === "friends"
                    ? "You haven't added any friends yet. Click the + button on a member's card to send a request."
                    : "Once players start joining Voxelio, they'll show up here."}
                </p>
                {search ? (
                  <button onClick={() => setSearch("")} className="text-xs font-bold text-[#6C3CE0] hover:underline">
                    Clear search
                  </button>
                ) : (
                  !currentUser && (
                    <Link
                      href="/signup"
                      className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-xs px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                    >
                      Be the First to Sign Up
                    </Link>
                  )
                )}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3 border-b-2 border-[#C5C8D6] pb-1">
              <h2 className="text-lg font-black text-[#4A1FA8]">🔥 Most Popular</h2>
            </div>
            <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-8 text-center">
              <div className="text-5xl mb-3">📊</div>
              <h3 className="font-bold text-lg text-[#1A1A2E] mb-1">No Data Yet</h3>
              <p className="text-sm text-[#666]">
                Check back later to see the most popular worlds on Voxelio!
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3 border-b-2 border-[#C5C8D6] pb-1">
              <h2 className="text-lg font-black text-[#4A1FA8]">📢 Voxelio News</h2>
              <Link href="#" className="text-xs text-[#6C3CE0] hover:underline font-semibold">
                View All →
              </Link>
            </div>
            <div className="bg-white border-2 border-[#C5C8D6] rounded p-4 space-y-3">
              {[
                { date: "Sep 18, 2026", title: "Welcome to Voxelio!", desc: "The platform is officially live. Be the first to create a world!" },
                { date: "Sep 12, 2026", title: "Creator Payout Increase", desc: "Creators now keep 70% of all Voxbux earned." },
                { date: "Sep 05, 2026", title: "Nova AI Assistant Released", desc: "Generate code, ideas, and assets with AI." },
              ].map((news) => (
                <div key={news.title} className="border-l-4 border-[#6C3CE0] pl-3">
                  <div className="text-[10px] text-[#888] font-semibold uppercase">{news.date}</div>
                  <h3 className="font-bold text-sm text-[#1A1A2E]">{news.title}</h3>
                  <p className="text-xs text-[#666]">{news.desc}</p>
                </div>
              ))}
            </div>
          </section>
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