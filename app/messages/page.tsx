"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  getCurrentUser,
  signOut,
  getConversations,
  findUserById,
  getUnreadCount,
  formatVoxbux,
  subscribeAuth,
  type User,
} from "../../lib/auth";
import { isOwnerAccount } from "../../lib/badges";
import AccountBadge from "../components/AccountBadge";
import Avatar from "../components/Avatar";
import NavLink from "../components/NavLink";

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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

  const conversations = currentUser ? getConversations(currentUser.id) : [];
  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;
  const isOwner = isOwnerAccount(currentUser?.username);

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/#discover" },
    { name: "Create", href: "/#create" },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages", active: true },
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

        {!currentUser ? (
          <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-12 text-center max-w-lg mx-auto">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="font-black text-2xl text-[#1A1A2E] mb-2">Sign in to view messages</h1>
            <p className="text-sm text-[#666] mb-6">
              You need an account to send and receive messages.
            </p>
            <Link
              href="/signin"
              className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-[#4A1FA8] mb-1">💬 Messages</h1>
                <p className="text-sm text-[#666]">
                  Chat with your friends. You can only message people you're friends with.
                </p>
              </div>
              <Link
                href="/friends"
                className="hidden md:inline-block bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm px-4 py-2 rounded border border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
              >
                👥 View Friends
              </Link>
            </div>

            {conversations.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="font-black text-xl text-[#1A1A2E] mb-2">No conversations yet</h3>
                <p className="text-sm text-[#666] max-w-md mx-auto mb-6">
                  Once you add friends, you can start chatting with them. Head to your friends list
                  to send your first message.
                </p>
                <Link
                  href="/friends"
                  className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                >
                  Go to Friends
                </Link>
              </div>
            ) : (
              <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
                {conversations.map((conv, idx) => {
                  const other = findUserById(conv.otherId);
                  if (!other) return null;
                  const last = conv.lastMessage;
                  const isMine = last.fromId === currentUser.id;
                  const preview = isMine ? `You: ${last.text}` : last.text;

                  return (
                    <Link
                      key={conv.otherId}
                      href={`/messages/${conv.otherId}`}
                      className={`flex items-center gap-3 p-3 hover:bg-[#F5F0FF] transition ${
                        idx !== conversations.length - 1 ? "border-b border-[#E5E7F0]" : ""
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#6C3CE0] to-[#5A2FC7] rounded flex items-center justify-center text-xl text-white overflow-hidden">
                          <Avatar config={other.avatarConfig} size={40} />
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            other.status === "online" ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm truncate">{other.username}</span>
                          <AccountBadge username={other.username} userId={other.id} size={12} />
                        </div>
                        <p className={`text-xs truncate ${conv.unread > 0 ? "text-[#1A1A2E] font-semibold" : "text-[#666]"}`}>
                          {preview}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-[#888]">
                          {formatRelative(last.sentAt)}
                        </span>
                        {conv.unread > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
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

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}