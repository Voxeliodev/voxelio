"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  getUsers,
  getCurrentUser,
  signOut,
  giftVoxbux,
  setVoxbux,
  banUser,
  unbanUser,
  terminateUser,
  isUserBanned,
  getBanStatusLabel,
  formatAccountId,
  formatVoxbux,
  getUnreadCount,
  subscribeAuth,
  type User,
} from "../../lib/auth";
import { isOwnerAccount } from "../../lib/badges";
import AccountBadge from "../components/AccountBadge";

const BAN_DURATIONS = [
  { id: "1h", name: "1 Hour", ms: 60 * 60 * 1000 },
  { id: "24h", name: "24 Hours", ms: 24 * 60 * 60 * 1000 },
  { id: "7d", name: "7 Days", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", name: "30 Days", ms: 30 * 24 * 60 * 60 * 1000 },
  { id: "permanent", name: "Permanent (Forever)", ms: "permanent" as const },
] as const;

type ActionType = "gift" | "set" | "ban" | "unban" | "terminate" | null;

export default function DevPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "banned">("all");

  const [actionUser, setActionUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [giftAmount, setGiftAmount] = useState("");

  const [banDuration, setBanDuration] = useState<string>("24h");
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    refresh();
    // Re-render whenever auth data changes (realtime updates, logins, etc.)
    const unsub = subscribeAuth(() => refresh());
    return () => unsub();
  }, []);

  const refresh = () => {
    setUsers(getUsers());
    setCurrentUser(getCurrentUser());
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const openAction = (user: User, action: ActionType) => {
    setActionUser(user);
    setActionType(action);
    setGiftAmount("");
    setBanDuration("24h");
    setBanReason("");
  };

  const closeAction = () => {
    setActionUser(null);
    setActionType(null);
    setGiftAmount("");
    setBanReason("");
  };

  const confirmGift = () => {
    if (!actionUser) return;
    const n = parseInt(giftAmount, 10);
    if (!Number.isFinite(n) || n <= 0) {
      showToast("error", "Enter a positive number.");
      return;
    }
    const result = giftVoxbux(actionUser.id, n);
    if (result.success) {
      showToast("success", `Gave ${n} V$ to ${actionUser.username}. New balance: ${formatVoxbux(result.newBalance ?? 0)}.`);
      refresh();
      closeAction();
    } else {
      showToast("error", result.error || "Gift failed.");
    }
  };

  const confirmSet = () => {
    if (!actionUser) return;
    const n = parseInt(giftAmount, 10);
    if (!Number.isFinite(n) || n < 0) {
      showToast("error", "Enter a valid number (0 or higher).");
      return;
    }
    const result = setVoxbux(actionUser.id, n);
    if (result.success) {
      showToast("success", `Set ${actionUser.username}'s balance to ${formatVoxbux(result.newBalance ?? 0)}.`);
      refresh();
      closeAction();
    } else {
      showToast("error", result.error || "Update failed.");
    }
  };

  const confirmBan = () => {
    if (!actionUser) return;
    const option = BAN_DURATIONS.find((d) => d.id === banDuration);
    if (!option) return;
    const result = banUser(actionUser.id, option.ms, banReason);
    if (result.success) {
      showToast("success", `Banned ${actionUser.username} (${option.name}).`);
      refresh();
      closeAction();
    } else {
      showToast("error", result.error || "Ban failed.");
    }
  };

  const confirmUnban = () => {
    if (!actionUser) return;
    const result = unbanUser(actionUser.id);
    if (result.success) {
      showToast("success", `Unbanned ${actionUser.username}.`);
      refresh();
      closeAction();
    } else {
      showToast("error", result.error || "Unban failed.");
    }
  };

  const confirmTerminate = () => {
    if (!actionUser) return;
    const result = terminateUser(actionUser.id);
    if (result.success) {
      showToast("success", `Terminated account "${actionUser.username}".`);
      refresh();
      closeAction();
    } else {
      showToast("error", result.error || "Terminate failed.");
    }
  };

  const isOwner = isOwnerAccount(currentUser?.username);

  const filtered = users
    .filter((u) => {
      if (filter === "banned" && !isUserBanned(u)) return false;
      if (filter === "active" && isUserBanned(u)) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const displayIdStr = u.displayId ? String(u.displayId) : "";
      return (
        u.username.toLowerCase().includes(q) ||
        u.id === q ||
        u.id.toLowerCase().includes(q) ||
        displayIdStr === q
      );
    })
    .sort((a, b) => {
      const ad = a.displayId ?? Number.MAX_SAFE_INTEGER;
      const bd = b.displayId ?? Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });

  const totalUsers = users.length;
  const bannedCount = users.filter((u) => isUserBanned(u)).length;
  const totalVoxbux = users.reduce((sum, u) => sum + u.voxbux, 0);

  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/#discover" },
    { name: "Create", href: "/#create" },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true, active: true }] : []),
    { name: "Friends", href: "/friends" },
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
            <Link
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
            </Link>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-3 py-6">

        {!isOwner ? (
          <div className="bg-white border-2 border-red-300 rounded p-12 text-center max-w-lg mx-auto">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="font-black text-2xl text-[#1A1A2E] mb-2">Access Denied</h1>
            <p className="text-sm text-[#666] mb-6">
              This area is restricted to the Voxelio Owner account.
            </p>
            <Link
              href="/"
              className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
            >
              ← Back to Home
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-black text-[#4A1FA8] mb-1 flex items-center gap-2">
                🛠️ Developer Console
              </h1>
              <p className="text-sm text-[#666]">
                Owner-only tools for managing Voxelio accounts.
              </p>
              <div className="mt-3 bg-red-50 border-2 border-red-300 rounded p-3 text-xs text-red-800">
                ⚠️ <strong>Careful!</strong> Actions taken here are permanent. Bans and terminations cannot be undone.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border-2 border-[#C5C8D6] rounded p-4">
                <p className="text-xs font-bold text-[#666] uppercase">Total Users</p>
                <p className="text-3xl font-black text-[#4A1FA8] mt-1">{totalUsers}</p>
              </div>
              <div className="bg-white border-2 border-[#C5C8D6] rounded p-4">
                <p className="text-xs font-bold text-[#666] uppercase">Banned Users</p>
                <p className="text-3xl font-black text-red-600 mt-1">{bannedCount}</p>
              </div>
              <div className="bg-white border-2 border-[#C5C8D6] rounded p-4">
                <p className="text-xs font-bold text-[#666] uppercase">Voxbux in Circulation</p>
                <p className="text-3xl font-black text-[#FFD700] mt-1">{formatVoxbux(totalVoxbux)}</p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#C5C8D6] rounded p-3 mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="flex-1 flex items-center gap-2 bg-[#EEF0F7] border border-[#C5C8D6] rounded px-3 py-2 focus-within:border-[#6C3CE0]">
                <span className="text-[#666]">🔍</span>
                <input
                  type="text"
                  placeholder="Search by username or account ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent outline-none text-sm flex-1 text-[#1A1A2E]"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-[#666] hover:text-[#6C3CE0] text-sm">✕</button>
                )}
              </div>

              <div className="flex gap-1">
                {[
                  { key: "all" as const, label: `All (${totalUsers})` },
                  { key: "active" as const, label: `Active (${totalUsers - bannedCount})` },
                  { key: "banned" as const, label: `Banned (${bannedCount})` },
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

            {filtered.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-10 text-center">
                <div className="text-5xl mb-3">👤</div>
                <p className="text-sm text-[#666]">
                  {search ? `No users match "${search}".` : "No users found."}
                </p>
              </div>
            ) : (
              <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
                {filtered.map((u, idx) => {
                  const status = getBanStatusLabel(u);
                  const isSelf = u.id === currentUser?.id;
                  const isOwnerTarget = isOwnerAccount(u.username);

                  return (
                    <div
                      key={u.id}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                        idx !== filtered.length - 1 ? "border-b border-[#E5E7F0]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#6C3CE0] to-[#5A2FC7] rounded flex items-center justify-center text-xl text-white flex-shrink-0">
                          {u.avatar}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-black text-sm truncate">{u.username}</span>
                            <AccountBadge username={u.username} userId={u.id} size={14} />
                            <span className="text-[10px] font-bold text-[#888] bg-[#EEF0F7] px-1.5 py-0.5 rounded">
                              {formatAccountId(u.id, u.displayId)}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] bg-[#6C3CE0] text-white px-1.5 py-0.5 rounded font-bold">YOU</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px]">
                            <span className="text-[#FFD700] font-bold">{formatVoxbux(u.voxbux)}</span>
                            <span
                              className={
                                status.tone === "ok"
                                  ? "text-green-600"
                                  : status.tone === "warn"
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }
                            >
                              {status.text}
                            </span>
                          </div>
                          {u.banReason && isUserBanned(u) && (
                            <p className="text-[10px] text-red-600 mt-0.5 italic">
                              Reason: {u.banReason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => openAction(u, "gift")}
                          className="text-[11px] font-bold px-2.5 py-1.5 rounded border bg-gradient-to-b from-[#FFB84D] to-[#E08A1C] text-white border-[#A8680C] hover:from-[#FFC86D] hover:to-[#F09A2C] transition"
                        >
                          + Gift V$
                        </button>
                        <button
                          onClick={() => openAction(u, "set")}
                          className="text-[11px] font-bold px-2.5 py-1.5 rounded border bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
                        >
                          Set V$
                        </button>
                        {isUserBanned(u) ? (
                          <button
                            onClick={() => openAction(u, "unban")}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded border bg-green-500 text-white border-green-700 hover:bg-green-600 transition"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => openAction(u, "ban")}
                            disabled={isOwnerTarget}
                            className={`text-[11px] font-bold px-2.5 py-1.5 rounded border transition ${
                              isOwnerTarget
                                ? "bg-[#EEF0F7] text-[#888] border-[#C5C8D6] cursor-not-allowed"
                                : "bg-red-500 text-white border-red-700 hover:bg-red-600"
                            }`}
                          >
                            Ban
                          </button>
                        )}
                        <button
                          onClick={() => openAction(u, "terminate")}
                          disabled={isOwnerTarget}
                          className={`text-[11px] font-bold px-2.5 py-1.5 rounded border transition ${
                            isOwnerTarget
                              ? "bg-[#EEF0F7] text-[#888] border-[#C5C8D6] cursor-not-allowed"
                              : "bg-[#1A1A2E] text-white border-black hover:bg-[#2A2A4E]"
                          }`}
                          title={isOwnerTarget ? "Cannot terminate the owner" : "Permanently delete this account"}
                        >
                          Terminate
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {actionUser && actionType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeAction}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-4 py-3 border-b-2 ${
              actionType === "terminate" || actionType === "ban"
                ? "bg-gradient-to-r from-red-600 to-red-500 border-red-800"
                : "bg-gradient-to-r from-[#6C3CE0] to-[#5A2FC7] border-[#4A1FA8]"
            }`}>
              <h2 className="text-white font-black text-base">
                {actionType === "gift" && `Gift Voxbux to ${actionUser.username}`}
                {actionType === "set" && `Set Voxbux for ${actionUser.username}`}
                {actionType === "ban" && `Ban ${actionUser.username}`}
                {actionType === "unban" && `Unban ${actionUser.username}`}
                {actionType === "terminate" && `⚠️ Terminate ${actionUser.username}`}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                ID {formatAccountId(actionUser.id, actionUser.displayId)} • Current balance: {formatVoxbux(actionUser.voxbux)}
              </p>
            </div>

            <div className="p-4 space-y-4">

              {actionType === "gift" && (
                <>
                  <p className="text-sm text-[#666]">Add Voxbux to this account.</p>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1A2E] mb-1">Amount to give</label>
                    <input
                      type="number"
                      min="1"
                      value={giftAmount}
                      onChange={(e) => setGiftAmount(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full border-2 border-[#C5C8D6] rounded px-3 py-2 text-sm outline-none focus:border-[#6C3CE0]"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    {[10, 50, 100, 500].map((n) => (
                      <button
                        key={n}
                        onClick={() => setGiftAmount(String(n))}
                        className="flex-1 text-xs font-bold py-1.5 rounded border border-[#C5C8D6] bg-[#EEF0F7] text-[#4A1FA8] hover:bg-[#E0E3EE] transition"
                      >
                        +{n}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {actionType === "set" && (
                <>
                  <p className="text-sm text-[#666]">
                    Set this account's Voxbux balance to an exact amount.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1A2E] mb-1">New balance</label>
                    <input
                      type="number"
                      min="0"
                      value={giftAmount}
                      onChange={(e) => setGiftAmount(e.target.value)}
                      placeholder="e.g. 0"
                      className="w-full border-2 border-[#C5C8D6] rounded px-3 py-2 text-sm outline-none focus:border-[#6C3CE0]"
                      autoFocus
                    />
                  </div>
                </>
              )}

              {actionType === "ban" && (
                <>
                  <p className="text-sm text-[#666]">
                    This user won't be able to sign in until the ban expires.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1A2E] mb-1">Ban duration</label>
                    <select
                      value={banDuration}
                      onChange={(e) => setBanDuration(e.target.value)}
                      className="w-full border-2 border-[#C5C8D6] rounded px-3 py-2 text-sm outline-none focus:border-[#6C3CE0] cursor-pointer"
                    >
                      {BAN_DURATIONS.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1A2E] mb-1">Reason (optional)</label>
                    <input
                      type="text"
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="e.g. Breaking community rules"
                      className="w-full border-2 border-[#C5C8D6] rounded px-3 py-2 text-sm outline-none focus:border-[#6C3CE0]"
                    />
                  </div>
                </>
              )}

              {actionType === "unban" && (
                <p className="text-sm text-[#666]">
                  This will remove the ban on <strong>{actionUser.username}</strong>. They will be able to sign in again immediately.
                </p>
              )}

              {actionType === "terminate" && (
                <>
                  <p className="text-sm text-[#666]">
                    This will <strong className="text-red-600">permanently delete</strong> the account{" "}
                    <strong>{actionUser.username}</strong> (ID {formatAccountId(actionUser.id, actionUser.displayId)}).
                  </p>
                  <div className="bg-red-50 border-2 border-red-300 rounded p-3 text-xs text-red-800 space-y-1">
                    <p>⚠️ This action <strong>cannot be undone</strong>.</p>
                    <p>⚠️ The username <strong>{actionUser.username}</strong> will be locked forever.</p>
                    <p>⚠️ The user loses all Voxbux ({formatVoxbux(actionUser.voxbux)}) and items.</p>
                  </div>
                </>
              )}
            </div>

            <div className="px-4 py-3 border-t border-[#E5E7F0] flex justify-end gap-2">
              <button
                onClick={closeAction}
                className="px-4 py-2 text-sm font-bold rounded border border-[#C5C8D6] bg-[#EEF0F7] text-[#4A1FA8] hover:bg-[#E0E3EE] transition"
              >
                Cancel
              </button>

              {actionType === "gift" && (
                <button
                  onClick={confirmGift}
                  className="px-4 py-2 text-sm font-bold rounded border bg-gradient-to-b from-[#FFB84D] to-[#E08A1C] text-white border-[#A8680C] hover:from-[#FFC86D] hover:to-[#F09A2C] transition"
                >
                  Gift Voxbux
                </button>
              )}
              {actionType === "set" && (
                <button
                  onClick={confirmSet}
                  className="px-4 py-2 text-sm font-bold rounded border bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                >
                  Set Balance
                </button>
              )}
              {actionType === "ban" && (
                <button
                  onClick={confirmBan}
                  className="px-4 py-2 text-sm font-bold rounded border bg-red-500 text-white border-red-700 hover:bg-red-600 transition"
                >
                  Ban Account
                </button>
              )}
              {actionType === "unban" && (
                <button
                  onClick={confirmUnban}
                  className="px-4 py-2 text-sm font-bold rounded border bg-green-500 text-white border-green-700 hover:bg-green-600 transition"
                >
                  Unban
                </button>
              )}
              {actionType === "terminate" && (
                <button
                  onClick={confirmTerminate}
                  className="px-4 py-2 text-sm font-bold rounded border bg-[#1A1A2E] text-white border-black hover:bg-[#2A2A4E] transition"
                >
                  Yes, Terminate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="bg-[#1A1A2E] text-white mt-8 border-t-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-6 text-center text-xs text-gray-500">
          © 2026 Voxelio. Voxelio is not affiliated with any other platform.
        </div>
      </footer>
    </div>
  );
}