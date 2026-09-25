// ============================================================
// VOXELIO — Global cache of approved community shirts
// ============================================================
// Any component can call `loadCommunityShirts()` to populate the
// cache and `findCommunityShirt(id)` to look up a shirt by its ID.
// ============================================================

import { supabase } from "./supabase";
import type { Item } from "./items";

let cached: Item[] = [];
let loadPromise: Promise<Item[]> | null = null;
const listeners = new Set<() => void>();

export function getCachedCommunityShirts(): Item[] {
  return cached;
}

export function subscribeCommunityShirts(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function loadCommunityShirts(): Promise<Item[]> {
  // If already loaded, return cached copy
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { data, error } = await supabase
      .from("community_shirts")
      .select("*")
      .eq("status", "approved")
      .order("approved_at", { ascending: false });

    if (error || !data) {
      console.warn("Failed to load community shirts:", error);
      loadPromise = null; // allow retry
      return [];
    }

    cached = data.map((s) => ({
      id: `community-${s.id}`,
      name: s.name,
      description: s.description || `A community shirt by ${s.creator_username}`,
      price: s.price,
      category: "outfits" as const,
      rarity: "rare" as const,
      previewEmoji: "👕",
      creator: s.creator_username,
      imageUrl: s.image_url,
    }));

    listeners.forEach((fn) => fn());
    return cached;
  })();

  return loadPromise;
}

export function findCommunityShirt(id: string): Item | undefined {
  return cached.find((s) => s.id === id);
}

export function isCommunityShirtId(id: string): boolean {
  return id.startsWith("community-");
}