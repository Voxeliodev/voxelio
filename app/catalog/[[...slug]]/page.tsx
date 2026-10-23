"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  getCurrentUser,
  signOut,
  formatVoxbux,
  getUnreadCount,
  subscribeAuth,
  fetchItemSales,
  type User,
} from "../../../lib/auth";
import { isOwnerAccount } from "../../../lib/badges";
import AccountBadge from "../../components/AccountBadge";
import ItemPreview from "../../components/ItemPreview";
import ItemModal from "../../components/ItemModal";
import NavLink from "../../components/NavLink";
import {
  getItemsByCategory,
  getItemBySlug,
  slugify,
  RARITY_LABELS,
  RARITY_COLORS,
  type Item,
} from "../../../lib/items";

type Category = { id: string; name: string; emoji: string };

const CATEGORIES: Category[] = [
  { id: "all", name: "All Items", emoji: "🛒" },
  { id: "featured", name: "Featured", emoji: "⭐" },
  { id: "hats", name: "Hats", emoji: "🧢" },
  { id: "heads", name: "Heads", emoji: "🧠" },
  { id: "faces", name: "Faces", emoji: "😊" },
  { id: "outfits", name: "Outfits", emoji: "👕" },
  { id: "accessories", name: "Accessories", emoji: "✨" },
  { id: "hair", name: "Hair", emoji: "💇" },
];

const SORT_OPTIONS = [
  { id: "relevance", name: "Relevance" },
  { id: "popular", name: "Most Popular" },
  { id: "price-low", name: "Price: Low to High" },
  { id: "price-high", name: "Price: High to Low" },
  { id: "newest", name: "Recently Added" },
];

function getSlugFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  const match = path.match(/^\/catalog\/(.+?)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function CatalogPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("relevance");
  const [sales, setSales] = useState<Record<string, number>>({});

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const refreshUser = () => setCurrentUser(getCurrentUser());

  useEffect(() => {
    refreshUser();
    fetchItemSales().then(setSales);

    const syncFromUrl = () => {
      const slug = getSlugFromUrl();
      if (slug) {
        const item = getItemBySlug(slug);
        setSelectedItem(item || null);
      } else {
        setSelectedItem(null);
      }
    };

    syncFromUrl();

    const unsub = subscribeAuth(() => refreshUser());

    window.addEventListener("popstate", syncFromUrl);
    return () => {
      unsub();
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const openItem = (item: Item) => {
    setSelectedItem(item);
    window.history.pushState({}, "", `/catalog/${slugify(item.name)}`);
  };

  const closeItem = () => {
    setSelectedItem(null);
    window.history.pushState({}, "", "/catalog");
  };

  const activeCategory = CATEGORIES.find((c) => c.id === category);

  let items = getItemsByCategory(category);
  if (search.trim()) {
    const q = search.toLowerCase();
    items = items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    );
  }

  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;
  const isOwner = isOwnerAccount(currentUser?.username);

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games" },
    { name: "Create", href: "/#create" },
    { name: "Catalog", href: "/catalog", active: true },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans">

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={closeItem}
          onPurchase={refreshUser}
          salesCount={sales[selectedItem.id] || 0}
        />
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          <aside className="lg:col-span-1 space-y-4">
            <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
                🛒 Categories
              </div>
              <ul className="p-2">
                {CATEGORIES.map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => setCategory(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm font-bold transition flex items-center gap-2 ${
                        category === cat.id
                          ? "bg-[#6C3CE0] text-white"
                          : "text-[#4A1FA8] hover:bg-[#EEF0F7]"
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
                💰 Your Balance
              </div>
              <div className="p-3 text-center">
                <p className="text-2xl font-black text-[#FFD700]">
                  {currentUser ? formatVoxbux(currentUser.voxbux) : "? V$"}
                </p>
                <p className="text-[10px] text-[#666] mb-3">Voxbux</p>
                <button className="w-full bg-gradient-to-b from-[#FFB84D] to-[#E08A1C] text-white font-bold text-xs py-2 rounded border border-[#A8680C] hover:from-[#FFC86D] hover:to-[#F09A2C] transition">
                  Buy Voxbux
                </button>
              </div>
            </div>

            <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
                Inventory
              </div>
              <ul className="p-3 text-sm space-y-1.5">
                <li>
                  <Link href="/my-items" className="text-[#4A1FA8] hover:underline flex items-center gap-1">
                    ▸ My Items
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-[#4A1FA8] hover:underline flex items-center gap-1">
                    ▸ Purchase History
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

          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-baseline justify-between">
              <h1 className="text-2xl font-black text-[#4A1FA8] flex items-center gap-2">
                <span>{activeCategory?.emoji}</span>
                <span>{activeCategory?.name}</span>
              </h1>
              <span className="text-xs text-[#666] font-semibold">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="bg-white border-2 border-[#C5C8D6] rounded p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="flex-1 flex items-center gap-2 bg-[#EEF0F7] border border-[#C5C8D6] rounded px-3 py-2 focus-within:border-[#6C3CE0]">
                <span className="text-[#666]">🔍</span>
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent outline-none text-sm flex-1 text-[#1A1A2E]"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-[#666] hover:text-[#6C3CE0] text-sm">✕</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#666] whitespace-nowrap">Sort by:</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-[#EEF0F7] border border-[#C5C8D6] rounded px-2 py-1.5 text-xs font-bold text-[#4A1FA8] outline-none focus:border-[#6C3CE0] cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => {
                  const owned = currentUser?.ownedItems.includes(item.id) || false;
                  const offSale = item.forSale === false;
                  const soldCount = sales[item.id] || 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => openItem(item)}
                      className={`bg-white border-2 rounded overflow-hidden transition cursor-pointer ${
                        owned
                          ? "border-green-400 hover:border-green-500"
                          : offSale
                          ? "border-red-300 hover:border-red-400"
                          : "border-[#C5C8D6] hover:border-[#6C3CE0]"
                      }`}
                    >
                      <div className="pointer-events-none">
                        <ItemPreview item={item} size={160} />
                      </div>

                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-black text-sm text-[#1A1A2E] leading-tight">
                            {item.name}
                          </h3>
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded text-white uppercase flex-shrink-0"
                            style={{ backgroundColor: RARITY_COLORS[item.rarity] }}
                          >
                            {RARITY_LABELS[item.rarity]}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#888] mb-2 flex items-center gap-2 flex-wrap">
                          <span>by <strong className="text-[#4A1FA8]">{item.creator}</strong></span>
                          <span className="text-[#FF6B6B] font-bold">
                            🔥 {soldCount.toLocaleString()} sold
                          </span>
                        </p>
                        <p className="text-xs text-[#666] mb-3 line-clamp-2" style={{ minHeight: "32px" }}>
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between gap-2 border-t border-[#E5E7F0] pt-2">
                          <span
                            className={`font-black text-sm ${
                              offSale ? "text-red-500" : "text-[#FFD700]"
                            }`}
                          >
                            {offSale
                              ? "Off Sale"
                              : item.price === 0
                              ? "FREE"
                              : `${item.price} V$`}
                          </span>

                          {offSale && !owned ? (
                            <span className="text-xs font-bold py-1.5 px-3 rounded border bg-[#EEF0F7] text-[#999] border-[#C5C8D6] cursor-not-allowed">
                              Unavailable
                            </span>
                          ) : owned ? (
                            <a
                              href="/avatar"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-bold py-1.5 px-3 rounded border bg-green-500 text-white border-green-700 hover:bg-green-600 transition"
                            >
                              ✓ Equip →
                            </a>
                          ) : (
                            <span className="text-xs font-bold py-1.5 px-3 rounded border bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8]">
                              {item.price === 0 ? "Get" : "Buy"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-16 text-center">
                <div className="text-7xl mb-4">🛒</div>
                <h2 className="font-black text-2xl text-[#1A1A2E] mb-2">
                  {search ? "No Items Found" : "No Items Yet"}
                </h2>
                <p className="text-sm text-[#666] max-w-lg mx-auto mb-6">
                  {search
                    ? `Nothing matches "${search}". Try a different search or category.`
                    : "Check back soon — new items are on the way!"}
                </p>
                {search ? (
                  <button onClick={() => setSearch("")} className="text-xs font-bold text-[#6C3CE0] hover:underline">
                    Clear search
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                  >
                    ← Back to Home
                  </Link>
                )}
              </div>
            )}
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