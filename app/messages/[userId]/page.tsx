"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  getCurrentUser,
  signOut,
  findUserById,
  areFriends,
  getConversation,
  sendMessage,
  markConversationRead,
  formatVoxbux,
  getUnreadCount,
  subscribeAuth,
  type User,
  type Message,
} from "../../../lib/auth";
import { isOwnerAccount } from "../../../lib/badges";
import AccountBadge from "../../components/AccountBadge";
import Avatar from "../../components/Avatar";
import NavLink from "../../components/NavLink";

export default function ConversationPage() {
  const params = useParams();
  const otherId = (params.userId as string) || "";

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [other, setOther] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversation = (u: User | null, o: User | null) => {
    if (!u || !o) return;
    setMessages(getConversation(u.id, o.id));
  };

  useEffect(() => {
    const u = getCurrentUser();
    setCurrentUser(u);
    const o = findUserById(otherId);
    setOther(o || null);

    if (!u || !o) return;

    if (!areFriends(u.id, o.id)) {
      setError("You can only message people you're friends with.");
      return;
    }

    loadConversation(u, o);
    markConversationRead(u.id, o.id);
  }, [otherId]);

  useEffect(() => {
    const unsub = subscribeAuth(() => {
      const u = getCurrentUser();
      const o = findUserById(otherId);
      setCurrentUser(u);
      setOther(o || null);
      if (u && o) loadConversation(u, o);
    });
    return () => unsub();
  }, [otherId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !other) return;
    const result = sendMessage(currentUser.id, other.id, draft);
    if (result.success) {
      setDraft("");
      setMessages(getConversation(currentUser.id, other.id));
    } else {
      setError(result.error || "Failed to send.");
    }
  };

  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;
  const isOwner = isOwnerAccount(currentUser?.username);

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games" },
    { name: "Create", href: "/#create" },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages", active: true },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans flex flex-col">

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

      <main className="max-w-6xl mx-auto px-3 py-6 flex-1 w-full">

        {!currentUser ? (
          <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-12 text-center max-w-lg mx-auto">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="font-black text-2xl text-[#1A1A2E] mb-2">Sign in to view messages</h1>
            <Link
              href="/signin"
              className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
            >
              Sign In
            </Link>
          </div>
        ) : !other ? (
          <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-12 text-center max-w-lg mx-auto">
            <div className="text-6xl mb-4">👤</div>
            <h1 className="font-black text-2xl text-[#1A1A2E] mb-2">User Not Found</h1>
            <p className="text-sm text-[#666] mb-6">
              No account exists with that ID.
            </p>
            <Link
              href="/messages"
              className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
            >
              ← Back to Messages
            </Link>
          </div>
        ) : error ? (
          <div className="bg-white border-2 border-red-300 rounded p-12 text-center max-w-lg mx-auto">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="font-black text-2xl text-[#1A1A2E] mb-2">Can't Open This Chat</h1>
            <p className="text-sm text-[#666] mb-6">{error}</p>
            <div className="flex gap-2 justify-center">
              <Link
                href="/friends"
                className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
              >
                Go to Friends
              </Link>
              <Link
                href="/messages"
                className="inline-block bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm px-6 py-2.5 rounded border border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
              >
                ← Back
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden flex flex-col" style={{ height: "calc(100vh - 320px)", minHeight: "500px" }}>

            <div className="bg-gradient-to-r from-[#6C3CE0] to-[#5A2FC7] px-4 py-3 border-b-2 border-[#4A1FA8] flex items-center gap-3 flex-shrink-0">
              <Link
                href="/messages"
                className="text-white/80 hover:text-white text-sm font-bold"
                title="Back to inbox"
              >
                ←
              </Link>
              <Link
                href={`/profile/${other.username}/${other.id}`}
                className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-90 transition"
              >
                <div className="w-10 h-10 bg-white rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                  <Avatar config={other.avatarConfig} size={36} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-white text-sm truncate">{other.username}</span>
                    <AccountBadge username={other.username} userId={other.id} size={12} />
                  </div>
                  <p className="text-[10px] text-white/70">
                    {other.status === "online" ? "🟢 Online" : "⚫ Offline"}
                  </p>
                </div>
              </Link>
              <Link
                href={`/profile/${other.username}/${other.id}`}
                className="hidden sm:inline-block text-[11px] font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded transition"
              >
                View Profile
              </Link>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#EEF0F7]">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-sm text-[#888]">
                  <div className="text-5xl mb-3">👋</div>
                  <p>Say hi to <strong>{other.username}</strong> to start the conversation!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.fromId === currentUser.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                          mine
                            ? "bg-gradient-to-br from-[#7B4FF7] to-[#5A2FC7] text-white rounded-br-sm"
                            : "bg-white text-[#1A1A2E] border border-[#C5C8D6] rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <p className={`text-[9px] mt-1 ${mine ? "text-white/70" : "text-[#888]"}`}>
                          {formatTime(m.sentAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSend} className="border-t-2 border-[#C5C8D6] p-3 flex gap-2 bg-white flex-shrink-0">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 500))}
                placeholder={`Message ${other.username}...`}
                className="flex-1 border-2 border-[#C5C8D6] rounded-full px-4 py-2 text-sm outline-none focus:border-[#6C3CE0] transition"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className={`font-black text-sm px-5 py-2 rounded-full border-2 transition ${
                  draft.trim()
                    ? "bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7]"
                    : "bg-[#EEF0F7] text-[#888] border-[#C5C8D6] cursor-not-allowed"
                }`}
              >
                Send
              </button>
            </form>
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

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}