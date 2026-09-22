"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import {
  getCurrentUser,
  subscribeAuth,
  hydrateAuth,
  type User,
} from "../../lib/auth";
import {
  getItem,
  RARITY_COLORS,
  RARITY_LABELS,
  type Item,
  type ItemCategory,
} from "../../lib/items";
import ItemPreview from "../components/ItemPreview";
import VoxelioLogo from "../components/VoxelioLogo"; // 👈 NEW IMPORT

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  hats: "Hats",
  heads: "Heads",
  faces: "Faces",
  outfits: "Outfits",
  accessories: "Accessories",
  hair: "Hair",
};

const CATEGORY_EMOJI: Record<ItemCategory, string> = {
  hats: "🧢",
  heads: "🧠",
  faces: "😊",
  outfits: "👕",
  accessories: "✨",
  hair: "💇",
};

const CATEGORY_ORDER: ItemCategory[] = [
  "hats",
  "heads",
  "faces",
  "outfits",
  "accessories",
  "hair",
];

export default function InventoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Force a fresh pull from Supabase every time this page is shown
  const refresh = useCallback(async () => {
    await hydrateAuth();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setUser(null);
      setReady(true);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (!error && data) {
      const fresh = getCurrentUser();
      if (fresh) setUser(fresh);
      else setUser(null);
    } else {
      setUser(getCurrentUser());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();

    const unsub = subscribeAuth(() => {
      setUser(getCurrentUser());
    });

    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    const onPopState = () => refresh();
    window.addEventListener("popstate", onPopState);

    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("popstate", onPopState);
    };
  }, [refresh]);

  if (!ready) {
    return (
      // 👇 Added theme-container so the loading screen also goes dark
      <div className="min-h-screen bg-[#EEF0F7] flex items-center justify-center text-[#666] theme-container">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      // 👇 Added theme-container so the sign-in prompt also goes dark
      <div className="min-h-screen bg-[#EEF0F7] flex flex-col items-center justify-center p-8 text-center theme-container">
        <div className="bg-white border-2 border-[#C5C8D6] rounded p-8 max-w-md">
          <p className="mb-4 text-[#1A1A2E] font-bold">
            You need to sign in to see your inventory.
          </p>
          <Link
            href="/signin"
            className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const owned: Item[] = user.ownedItems
    .map((id) => getItem(id))
    .filter((i): i is Item => Boolean(i));

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: owned.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    // 👇 Added theme-container for Halloween dark mode
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans theme-container">
      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
          {/* 👇 New logo component */}
          <VoxelioLogo />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-[#4A1FA8] flex items-center gap-2">
            <span>🎒</span>
            <span>Inventory</span>
          </h1>
          <Link
            href="/catalog"
            className="text-xs font-bold text-[#6C3CE0] hover:underline"
          >
            ← Back to Catalog
          </Link>
        </div>

        {owned.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-16 text-center">
            <div className="text-7xl mb-4">🎒</div>
            <h2 className="font-black text-2xl text-[#1A1A2E] mb-2">
              Your Inventory is Empty
            </h2>
            <p className="text-sm text-[#666] max-w-lg mx-auto mb-6">
              You don&apos;t own any items yet. Head to the catalog to find
              something you like.
            </p>
            <Link
              href="/catalog"
              className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
            >
              Visit the Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <section key={group.category}>
                <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
                  <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8] flex items-center gap-2">
                    <span>{CATEGORY_EMOJI[group.category]}</span>
                    <span>{CATEGORY_LABELS[group.category]}</span>
                    <span className="text-[10px] font-normal text-white/70">
                      ({group.items.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {group.items.map((item) => (
                      <ItemTile key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ItemTile({ item }: { item: Item }) {
  return (
    <Link
      href={`/catalog/${encodeURIComponent(
        item.name.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "")
      )}`}
      className="bg-white border-2 border-green-400 hover:border-green-500 rounded overflow-hidden transition cursor-pointer block"
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

        <p className="text-[10px] text-[#888] mb-2">
          by <strong className="text-[#4A1FA8]">{item.creator}</strong>
        </p>

        <div className="flex items-center justify-between gap-2 border-t border-[#E5E7F0] pt-2">
          <span className="text-xs font-bold text-green-600">✓ Owned</span>
          <a
            href="/avatar"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-bold py-1.5 px-3 rounded border bg-green-500 text-white border-green-700 hover:bg-green-600 transition"
          >
            Equip →
          </a>
        </div>
      </div>
    </Link>
  );
}