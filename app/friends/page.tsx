"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  getUsers,
  getCurrentUser,
  signOut,
  getFriendList,
  getIncomingRequests,
  getOutgoingRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  sendFriendRequest,
  areFriends,
  hasIncomingRequestFrom,
  hasOutgoingRequestTo,
  formatVoxbux,
  getUnreadCount,
  subscribeAuth,
  type User,
} from "../../lib/auth";
import { isOwnerAccount } from "../../lib/badges";
import AccountBadge from "../components/AccountBadge";
import Avatar from "../components/Avatar";
import NavLink from "../components/NavLink";

type Tab = "friends" | "requests" | "sent" | "find";

export default function FriendsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const friends = currentUser ? getFriendList(currentUser.id) : [];
  const incoming = currentUser ? getIncomingRequests(currentUser.id) : [];
  const outgoing = currentUser ? getOutgoingRequests(currentUser.id) : [];
  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;
  const isOwner = isOwnerAccount(currentUser?.username);

  const searchResults: User[] = (() => {
    if (!currentUser || !searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return getUsers()
      .filter((u) => u.id !== currentUser.id)
      .filter((u) => {
        const displayIdStr = u.displayId ? String(u.displayId) : "";
        return (
          u.username.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q) ||
          displayIdStr === q
        );
      })
      .slice(0, 20);
  })();

  const handleAccept = (fromId: string) => {
    if (!currentUser) return;
    const result = acceptFriendRequest(currentUser.id, fromId);
    if (result.success) {
      showToast("success", "Friend request accepted!");
      refresh();
    } else {
      showToast("error", result.error || "Failed to accept.");
    }
  };

  const handleDecline = (fromId: string) => {
    if (!currentUser) return;
    declineFriendRequest(currentUser.id, fromId);
    showToast("success", "Request declined.");
    refresh();
  };

  const handleCancelSent = (toId: string) => {
    if (!currentUser) return;
    cancelFriendRequest(currentUser.id, toId);
    showToast("success", "Request cancelled.");
    refresh();
  };

  const handleRemove = (otherId: string) => {
    if (!currentUser) return;
    if (!confirm("Remove this friend?")) return;
    removeFriend(currentUser.id, otherId);
    showToast("success", "Friend removed.");
    refresh();
  };

  const handleSendRequest = (toId: string) => {
    if (!currentUser) return;
    const result = sendFriendRequest(currentUser.id, toId);
    if (result.success) {
      showToast("success", "Friend request sent!");
      refresh();
    } else {
      showToast("error", result.error || "Failed to send.");
    }
  };

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/#discover" },
    { name: "Create", href: "/#create" },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends", active: true },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans">

      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded shadow-lg text-white text-sm font-bold ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.text}
        </div>
      )}

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

      <main className="max-w-6xl mx-auto px-3 py-6">

        {!currentUser ? (
          <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-12 text-center max-w-lg mx-auto">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="font-black text-2xl text-[#1A1A2E] mb-2">Sign in to view friends</h1>
            <p className="text-sm text-[#666] mb-6">
              You need an account to add friends and see your friend list.
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
            <div className="mb-6">
              <h1 className="text-3xl font-black text-[#4A1FA8] mb-1">👥 Friends</h1>
              <p className="text-sm text-[#666]">
                Manage your friends, requests, and find new people to add.
              </p>
            </div>

            <div className="bg-white border-2 border-[#C5C8D6] rounded p-2 mb-4 flex flex-wrap gap-2">
              {([
                { id: "friends" as const, label: `Friends (${friends.length})`, emoji: "👥" },
                { id: "requests" as const, label: `Requests (${incoming.length})`, emoji: "📥" },
                { id: "sent" as const, label: `Sent (${outgoing.length})`, emoji: "📤" },
                { id: "find" as const, label: "Find People", emoji: "🔍" },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 text-sm font-bold rounded border transition flex items-center gap-1.5 ${
                    tab === t.id
                      ? "bg-[#6C3CE0] text-white border-[#4A1FA8]"
                      : "bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE]"
                  }`}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {tab === "friends" && (
              <>
                {friends.length === 0 ? (
                  <EmptyState
                    emoji="👤"
                    title="No friends yet"
                    desc="Head to the Find People tab to search for users and send friend requests."
                    actionLabel="Find People"
                    onAction={() => setTab("find")}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {friends.map((u) => (
                      <UserCard
                        key={u.id}
                        user={u}
                        actions={
                          <>
                            <Link
                              href={`/messages/${u.id}`}
                              className="flex-1 text-center text-xs font-bold py-2 rounded border bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                            >
                              💬 Message
                            </Link>
                            <button
                              onClick={() => handleRemove(u.id)}
                              className="px-3 text-xs font-bold py-2 rounded border bg-red-500 text-white border-red-700 hover:bg-red-600 transition"
                              title="Remove friend"
                            >
                              ✕
                            </button>
                          </>
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "requests" && (
              <>
                {incoming.length === 0 ? (
                  <EmptyState
                    emoji="📭"
                    title="No incoming requests"
                    desc="When someone adds you as a friend, their request will show up here."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {incoming.map((u) => (
                      <UserCard
                        key={u.id}
                        user={u}
                        actions={
                          <>
                            <button
                              onClick={() => handleAccept(u.id)}
                              className="flex-1 text-xs font-bold py-2 rounded border bg-green-500 text-white border-green-700 hover:bg-green-600 transition"
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => handleDecline(u.id)}
                              className="flex-1 text-xs font-bold py-2 rounded border bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
                            >
                              Decline
                            </button>
                          </>
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "sent" && (
              <>
                {outgoing.length === 0 ? (
                  <EmptyState
                    emoji="📪"
                    title="No pending requests"
                    desc="Friend requests you've sent that haven't been accepted yet will appear here."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {outgoing.map((u) => (
                      <UserCard
                        key={u.id}
                        user={u}
                        badge={<span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-bold">PENDING</span>}
                        actions={
                          <button
                            onClick={() => handleCancelSent(u.id)}
                            className="flex-1 text-xs font-bold py-2 rounded border bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
                          >
                            Cancel Request
                          </button>
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "find" && (
              <>
                <div className="bg-white border-2 border-[#C5C8D6] rounded p-3 mb-4">
                  <div className="flex items-center gap-2 bg-[#EEF0F7] border border-[#C5C8D6] rounded px-3 py-2 focus-within:border-[#6C3CE0]">
                    <span className="text-[#666]">🔍</span>
                    <input
                      type="text"
                      placeholder="Search by username or account ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent outline-none text-sm flex-1 text-[#1A1A2E]"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="text-[#666] hover:text-[#6C3CE0] text-sm">✕</button>
                    )}
                  </div>
                </div>

                {!searchQuery.trim() ? (
                  <EmptyState
                    emoji="🔎"
                    title="Search for players"
                    desc="Type a username or account ID above to find people to add as friends."
                  />
                ) : searchResults.length === 0 ? (
                  <EmptyState
                    emoji="😕"
                    title="No players found"
                    desc={`Nobody matches "${searchQuery}". Try a different search.`}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchResults.map((u) => {
                      const alreadyFriends = areFriends(currentUser.id, u.id);
                      const incomingFrom = hasIncomingRequestFrom(currentUser.id, u.id);
                      const outgoingTo = hasOutgoingRequestTo(currentUser.id, u.id);

                      let action: React.ReactNode;
                      if (alreadyFriends) {
                        action = (
                          <Link
                            href={`/messages/${u.id}`}
                            className="flex-1 text-center text-xs font-bold py-2 rounded border bg-green-500 text-white border-green-700 hover:bg-green-600 transition"
                          >
                            ✓ Message
                          </Link>
                        );
                      } else if (incomingFrom) {
                        action = (
                          <button
                            onClick={() => handleAccept(u.id)}
                            className="flex-1 text-xs font-bold py-2 rounded border bg-green-500 text-white border-green-700 hover:bg-green-600 transition"
                          >
                            ✓ Accept Request
                          </button>
                        );
                      } else if (outgoingTo) {
                        action = (
                          <button
                            disabled
                            className="flex-1 text-xs font-bold py-2 rounded border bg-[#EEF0F7] text-[#888] border-[#C5C8D6] cursor-not-allowed"
                          >
                            Request Sent
                          </button>
                        );
                      } else {
                        action = (
                          <button
                            onClick={() => handleSendRequest(u.id)}
                            className="flex-1 text-xs font-bold py-2 rounded border bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                          >
                            + Add Friend
                          </button>
                        );
                      }

                      return (
                        <UserCard
                          key={u.id}
                          user={u}
                          actions={action}
                        />
                      );
                    })}
                  </div>
                )}
              </>
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

function UserCard({
  user,
  actions,
  badge,
}: {
  user: User;
  actions: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden hover:border-[#6C3CE0] transition">
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
        </Link>
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            user.status === "online" ? "bg-green-400" : "bg-gray-400"
          }`}
          title={user.status === "online" ? "Online" : "Offline"}
        />
      </div>

      <div className="p-3">
        {badge && <div className="mb-2">{badge}</div>}
        <p className="text-xs text-[#666] mb-2 min-h-[32px] line-clamp-2">{user.bio}</p>
        <div className="flex justify-between text-[10px] text-[#666] mb-3 border-t border-[#E5E7F0] pt-2">
          <span>👥 {user.friendIds.length} friends</span>
          <span>📅 {user.joined}</span>
        </div>
        <div className="flex gap-2">{actions}</div>
      </div>
    </div>
  );
}

function EmptyState({
  emoji,
  title,
  desc,
  actionLabel,
  onAction,
}: {
  emoji: string;
  title: string;
  desc: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-12 text-center">
      <div className="text-6xl mb-4">{emoji}</div>
      <h3 className="font-black text-xl text-[#1A1A2E] mb-2">{title}</h3>
      <p className="text-sm text-[#666] max-w-md mx-auto mb-4">{desc}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}