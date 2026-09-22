"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  getCurrentUser,
  signOut,
  subscribeIndev,
  cancelIndev,
  isIndevMember,
  getIndevDaysRemaining,
  formatVoxbux,
  getUnreadCount,
  subscribeAuth,
  INDEV_PRICING,
  type User,
  type IndevTier,
} from "../../lib/auth";
import AccountBadge from "../components/AccountBadge";
import VoxelioLogo from "../components/VoxelioLogo";

const BENEFITS = [
  {
    emoji: "💎",
    title: "INDEV Badge",
    desc: "A purple star appears next to your username everywhere on Voxelio.",
  },
  {
    emoji: "💰",
    title: "Voxbux Stipend",
    desc: "Get bonus Voxbux back the moment you subscribe — up to 6,000 V$ on Yearly.",
  },
  {
    emoji: "🧢",
    title: "Exclusive Avatar Item",
    desc: "Unlock an INDEV-only avatar item that can't be bought or worn by anyone else.",
  },
  {
    emoji: "💸",
    title: "80% Creator Revenue",
    desc: "Keep 80% of all Voxbux earned from your creations — up from the standard 70%.",
  },
  {
    emoji: "⚡",
    title: "Priority Support",
    desc: "Your support tickets and reports are handled first by the Voxelio team.",
  },
  {
    emoji: "🎁",
    title: "Early Access",
    desc: "Try new features and tools before they're released to everyone else.",
  },
];

const FAQ = [
  {
    q: "How long does my membership last?",
    a: "Monthly lasts 30 days. Yearly lasts 365 days. When it expires, you can renew from this same page.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account card on this page. You'll keep membership until your current period ends.",
  },
  {
    q: "Do I get Voxbux monthly?",
    a: "The Voxbux stipend is granted upfront when you subscribe. Renew to keep receiving it.",
  },
  {
    q: "Will the badge show on my profile?",
    a: "Yes — the INDEV star appears next to your username on your profile, the homepage, comments, and everywhere your name is shown.",
  },
  {
    q: "What is the Exclusive Avatar Item?",
    a: "A one-of-a-kind wearable that only INDEV Club members can equip. It's automatically added to your inventory when you subscribe.",
  },
];

export default function IndevPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmingTier, setConfirmingTier] = useState<IndevTier | null>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    const unsub = subscribeAuth(() => setCurrentUser(getCurrentUser()));
    return () => unsub();
  }, []);

  const refreshUser = () => setCurrentUser(getCurrentUser());

  const handleSignOut = () => {
    signOut();
    setCurrentUser(null);
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubscribe = (tier: IndevTier) => {
    if (!currentUser) {
      showToast("error", "Sign in to join the INDEV Club.");
      return;
    }
    const pricing = INDEV_PRICING[tier];
    const result = subscribeIndev(currentUser.id, tier);
    if (result.success) {
      const newBalance = result.newBalance ?? 0;
      showToast(
        "success",
        `Welcome to the INDEV Club! You received ${pricing.stipend} V$ back. New balance: ${formatVoxbux(newBalance)}.`
      );
      refreshUser();
      setConfirmingTier(null);
    } else {
      showToast("error", result.error || "Subscription failed.");
    }
  };

  const handleCancel = () => {
    if (!currentUser) return;
    if (!confirm("Cancel your INDEV Club membership? You'll lose benefits immediately.")) return;
    const result = cancelIndev(currentUser.id);
    if (result.success) {
      showToast("success", "Your INDEV Club membership has been cancelled.");
      refreshUser();
    } else {
      showToast("error", result.error || "Cancel failed.");
    }
  };

  const isMember = isIndevMember(currentUser);
  const daysLeft = currentUser && isMember ? getIndevDaysRemaining(currentUser) : 0;

  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/#discover" },
    { name: "Create", href: "/#create" },
    { name: "Catalog", href: "/catalog" },
    ...(currentUser?.id === "1" ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true, active: true },
  ];

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans theme-container">

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded shadow-lg text-white text-sm font-bold max-w-sm ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.text}
        </div>
      )}

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
                    {/* 👇 FIXED: added username prop so Moderator badge shows */}
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
          <VoxelioLogo />
        </div>
      </header>

      {/* NAV */}
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

      {/* HERO */}
      <section className="bg-gradient-to-br from-[#4A1FA8] via-[#6C3CE0] to-[#A855F7] text-white">
        <div className="max-w-6xl mx-auto px-3 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-4">
            <span>⭐</span>
            <span>Voxelio Membership</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.25)" }}>
            Join the INDEV Club
          </h1>
          <p className="text-white/85 text-base md:text-lg max-w-2xl mx-auto mb-8">
            Unlock exclusive perks, an INDEV badge, bonus Voxbux, and help support the future of Voxelio.
          </p>

          {currentUser && isMember ? (
            <div className="max-w-lg mx-auto bg-white/15 backdrop-blur-sm border-2 border-white/30 rounded-xl p-6">
              <div className="text-5xl mb-2">💎</div>
              <h2 className="text-xl font-black mb-1">You're an INDEV Club member!</h2>
              <p className="text-white/85 text-sm mb-1">
                {currentUser.indevClub?.tier === "monthly" ? "Monthly" : "Yearly"} plan
              </p>
              <p className="text-white/70 text-xs mb-4">
                {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  onClick={() => {
                    const tier = currentUser.indevClub?.tier || "monthly";
                    setConfirmingTier(tier);
                  }}
                  className="bg-white text-[#4A1FA8] font-bold text-sm px-5 py-2.5 rounded border-2 border-white hover:bg-[#F0E8FF] transition shadow-md"
                >
                  🔄 Renew
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-[#1A1A2E]/50 text-white font-bold text-sm px-5 py-2.5 rounded border-2 border-white/30 hover:bg-[#1A1A2E]/80 transition"
                >
                  Cancel Membership
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 justify-center flex-wrap">
              {!currentUser ? (
                <Link
                  href="/signin"
                  className="bg-white text-[#4A1FA8] font-bold text-base px-6 py-3 rounded border-2 border-[#4A1FA8] hover:bg-[#F0E8FF] transition shadow-lg"
                >
                  🔒 Sign In to Join
                </Link>
              ) : (
                <a
                  href="#tiers"
                  className="bg-white text-[#4A1FA8] font-bold text-base px-6 py-3 rounded border-2 border-[#4A1FA8] hover:bg-[#F0E8FF] transition shadow-lg"
                >
                  ⬇️ View Plans
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-3 py-10">

        {/* BENEFITS */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-[#4A1FA8] mb-2">What You Get</h2>
            <p className="text-sm text-[#666]">Every INDEV Club membership includes these perks.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="bg-white border-2 border-[#C5C8D6] rounded-lg p-5 hover:border-[#6C3CE0] transition">
                <div className="text-4xl mb-3">{b.emoji}</div>
                <h3 className="font-black text-base text-[#1A1A2E] mb-2">{b.title}</h3>
                <p className="text-xs text-[#666] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TIERS */}
        <section id="tiers" className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-[#4A1FA8] mb-2">Choose Your Plan</h2>
            <p className="text-sm text-[#666]">Pay with Voxbux. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {(["monthly", "yearly"] as IndevTier[]).map((tier) => {
              const pricing = INDEV_PRICING[tier];
              const isYearly = tier === "yearly";
              const netCost = pricing.price - pricing.stipend;
              const canAfford = (currentUser?.voxbux ?? 0) >= pricing.price;

              return (
                <div
                  key={tier}
                  className={`bg-white rounded-lg overflow-hidden border-2 ${
                    isYearly ? "border-[#FFD700] shadow-lg" : "border-[#C5C8D6]"
                  }`}
                >
                  <div
                    className={`px-5 py-4 ${
                      isYearly
                        ? "bg-gradient-to-r from-[#FFD700] to-[#F59E0B] text-[#4A1FA8]"
                        : "bg-gradient-to-r from-[#6C3CE0] to-[#5A2FC7] text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black">{pricing.name}</h3>
                      {isYearly && (
                        <span className="text-[10px] font-black bg-[#4A1FA8] text-[#FFD700] px-2 py-1 rounded uppercase">
                          Best Value
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${isYearly ? "text-[#4A1FA8]/80" : "text-white/70"}`}>
                      {pricing.description}
                    </p>
                  </div>

                  <div className="p-5">
                    <div className="mb-4">
                      <p className="text-[10px] uppercase font-bold text-[#888] mb-1">Price</p>
                      <p className="text-3xl font-black text-[#1A1A2E]">
                        {formatVoxbux(pricing.price)}
                      </p>
                    </div>

                    <div className="mb-5 bg-[#EEF0F7] rounded p-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#666]">You pay</span>
                        <span className="font-bold text-[#1A1A2E]">{formatVoxbux(pricing.price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666]">Stipend back</span>
                        <span className="font-bold text-green-600">+{formatVoxbux(pricing.stipend)}</span>
                      </div>
                      <div className="flex justify-between border-t border-[#C5C8D6] pt-1 mt-1">
                        <span className="text-[#666] font-bold">Net cost</span>
                        <span className="font-black text-[#4A1FA8]">{formatVoxbux(netCost)}</span>
                      </div>
                    </div>

                    <ul className="text-xs space-y-1.5 mb-5">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>INDEV Badge next to your name</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{formatVoxbux(pricing.stipend)} Voxbux stipend</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>Exclusive INDEV avatar item</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>80% creator revenue share</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>Priority support</span>
                      </li>
                    </ul>

                    {!currentUser ? (
                      <Link
                        href="/signin"
                        className="block text-center w-full font-black text-sm py-3 rounded border-2 bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
                      >
                        Sign In to Join
                      </Link>
                    ) : (
                      <button
                        onClick={() => setConfirmingTier(tier)}
                        disabled={!canAfford && !isMember}
                        className={`w-full font-black text-sm py-3 rounded border-2 transition ${
                          isYearly
                            ? "bg-gradient-to-b from-[#FFD700] to-[#F59E0B] text-[#4A1FA8] border-[#B45309] hover:from-[#FFE04D] hover:to-[#FFA500]"
                            : "bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7]"
                        } ${!canAfford && !isMember ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {!canAfford && !isMember
                          ? "Not Enough Voxbux"
                          : isMember
                          ? `Renew ${pricing.name}`
                          : `Join ${pricing.name}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-[#4A1FA8] mb-2">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-white border-2 border-[#C5C8D6] rounded p-4">
                <h3 className="font-black text-sm text-[#4A1FA8] mb-1">❓ {item.q}</h3>
                <p className="text-xs text-[#666] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* CONFIRM MODAL */}
      {confirmingTier && currentUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmingTier(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#6C3CE0] to-[#A855F7] px-4 py-3 rounded-t-lg">
              <h2 className="text-white font-black text-lg">
                {isMember ? "Renew" : "Join"} INDEV Club — {INDEV_PRICING[confirmingTier].name}
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-[#666]">
                {isMember
                  ? "Your membership will be extended from your current expiry date."
                  : "You're about to become an INDEV Club member."}
              </p>

              <div className="bg-[#EEF0F7] rounded p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#666]">Cost</span>
                  <span className="font-bold text-[#1A1A2E]">-{formatVoxbux(INDEV_PRICING[confirmingTier].price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Stipend back</span>
                  <span className="font-bold text-green-600">+{formatVoxbux(INDEV_PRICING[confirmingTier].stipend)}</span>
                </div>
                <div className="flex justify-between border-t border-[#C5C8D6] pt-1 mt-1">
                  <span className="text-[#666] font-bold">New balance after</span>
                  <span className="font-black text-[#4A1FA8]">
                    {formatVoxbux(currentUser.voxbux - INDEV_PRICING[confirmingTier].price + INDEV_PRICING[confirmingTier].stipend)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmingTier(null)}
                  className="px-4 py-2 text-sm font-bold rounded border border-[#C5C8D6] bg-[#EEF0F7] text-[#4A1FA8] hover:bg-[#E0E3EE] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubscribe(confirmingTier)}
                  className="px-4 py-2 text-sm font-bold rounded border bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#1A1A2E] text-white mt-8 border-t-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-6 text-center text-xs text-gray-500">
          © 2026 Voxelio. Voxelio is not affiliated with any other platform.
        </div>
      </footer>
    </div>
  );
}