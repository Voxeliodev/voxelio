"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getCurrentUser, signOut, formatVoxbux, getUnreadCount, redeemCode } from "../../lib/auth";
import type { User } from "../../lib/auth";
import { isOwnerAccount } from "../../lib/badges";
import AccountBadge from "../components/AccountBadge";
import NavLink from "../components/NavLink";
import VoxelioLogo from "../components/VoxelioLogo"; // 👈 NEW IMPORT

export default function RedeemPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    | { type: "success"; rewardText: string }
    | { type: "error"; message: string }
    | null
  >(null);
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !code.trim()) return;

    setBusy(true);
    setResult(null);

    const res = await redeemCode(code);

    if (res.success) {
      setResult({ type: "success", rewardText: res.rewardText || "Reward claimed!" });
      setCode("");
      setCurrentUser(getCurrentUser());
    } else {
      setResult({ type: "error", message: res.error || "Couldn't redeem that code." });
      setShakeKey((k) => k + 1);
    }

    setBusy(false);
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
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  return (
    // 👇 Added theme-container for Halloween dark mode
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans theme-container">

      <style>{`
        @keyframes voxShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes voxPopIn {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .vox-shake { animation: voxShake 0.4s ease-in-out; }
        .vox-pop { animation: voxPopIn 0.4s ease-out; }
      `}</style>

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
              Voxbux: <strong className="text-[#FFD700]">{currentUser ? formatVoxbux(currentUser.voxbux) : "? V$"}</strong>
            </span>
            <Link href="#" className="hover:text-[#00E5FF]">Help</Link>
          </div>
        </div>
      </div>

      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
          {/* 👇 New logo component */}
          <VoxelioLogo />
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

      <main className="max-w-3xl mx-auto px-3 py-12">

        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎁</div>
          <h1 className="text-3xl font-black text-[#4A1FA8] mb-2">Redeem a Code</h1>
          <p className="text-sm text-[#666] max-w-md mx-auto">
            Got a Voxelio promo code? Enter it below to unlock Voxbux, items, and exclusive rewards.
          </p>
        </div>

        {!currentUser ? (
          <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-12 text-center">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="font-black text-xl text-[#1A1A2E] mb-2">Sign in to redeem codes</h2>
            <p className="text-sm text-[#666] mb-6">
              You need an account to claim rewards.
            </p>
            <Link
              href="/signin"
              className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-8 py-3 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <>
            <form
              key={shakeKey}
              onSubmit={handleSubmit}
              className={`bg-white border-2 border-[#C5C8D6] rounded overflow-hidden ${
                result?.type === "error" ? "vox-shake" : ""
              }`}
            >
              <div className="bg-gradient-to-r from-[#6C3CE0] to-[#A855F7] px-4 py-3 border-b-2 border-[#4A1FA8]">
                <h2 className="text-white font-black text-sm">Enter Your Code</h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1A1A2E] mb-2 uppercase tracking-wide">
                    Promo Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="VOXELIO2026"
                    disabled={busy}
                    className="w-full border-2 border-[#C5C8D6] rounded px-4 py-3 text-center text-lg font-black tracking-widest outline-none focus:border-[#6C3CE0] transition disabled:opacity-60 uppercase"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={32}
                  />
                  <p className="text-[10px] text-[#888] text-center mt-2">
                    Codes are not case-sensitive. Dashes and spaces are ignored.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={busy || !code.trim()}
                  className={`w-full font-black text-base py-3 rounded border-2 transition ${
                    busy || !code.trim()
                      ? "bg-[#EEF0F7] text-[#888] border-[#C5C8D6] cursor-not-allowed"
                      : "bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] shadow-md"
                  }`}
                >
                  {busy ? "Redeeming…" : "🎁 Redeem Code"}
                </button>
              </div>
            </form>

            {result && result.type === "success" && (
              <div className="mt-4 bg-gradient-to-b from-[#22C55E] to-[#16A34A] text-white rounded border-2 border-[#15803D] p-6 text-center vox-pop shadow-lg">
                <div className="text-5xl mb-2">🎉</div>
                <h3 className="font-black text-xl mb-1">Reward Claimed!</h3>
                <p className="text-sm text-white/90 mb-3">You received:</p>
                <p className="text-2xl font-black">{result.rewardText}</p>
              </div>
            )}

            {result && result.type === "error" && (
              <div className="mt-4 bg-red-50 border-2 border-red-300 rounded p-4 text-center">
                <div className="text-3xl mb-1">❌</div>
                <p className="text-sm font-bold text-red-800">{result.message}</p>
              </div>
            )}

            <div className="mt-6 bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
                💡 Where to find codes
              </div>
              <div className="p-4 text-xs text-[#666] space-y-2">
                <p>▸ Follow Voxelio on social media for event drops</p>
                <p>▸ Codes are given out during seasonal events</p>
                <p>▸ Content creators sometimes share exclusive codes</p>
                <p>▸ Watch the news feed on the homepage for announcements</p>
              </div>
            </div>
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