"use client";

import { supabase } from "./supabase";

// ============================================================
// WORLDS / GAMES
// ============================================================

export type World = {
  id: string;
  name: string;
  description: string;
  thumbnailEmoji: string;
  thumbnailColor: string;
  category: string;
  layout: string;
  creator: string;
  maxPlayers: number;
  visits: number;
  likes: number;
  favorites: number;
  featured: boolean;
  createdAt: string;
};

function rowToWorld(row: any): World {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    thumbnailEmoji: row.thumbnail_emoji || "🌍",
    thumbnailColor: row.thumbnail_color || "#7B2FF7",
    category: row.category || "adventure",
    layout: row.layout || "plaza",
    creator: row.creator || "Voxelio",
    maxPlayers: row.max_players ?? 20,
    visits: Number(row.visits) || 0,
    likes: Number(row.likes) || 0,
    favorites: Number(row.favorites) || 0,
    featured: Boolean(row.featured),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export async function fetchWorlds(opts?: {
  sort?: "popular" | "top" | "new";
  category?: string;
  search?: string;
  featuredOnly?: boolean;
}): Promise<World[]> {
  let query = supabase.from("worlds").select("*");

  if (opts?.featuredOnly) {
    query = query.eq("featured", true);
  }
  if (opts?.category && opts.category !== "all") {
    query = query.eq("category", opts.category);
  }
  if (opts?.search && opts.search.trim()) {
    const q = opts.search.trim();
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const sort = opts?.sort || "popular";
  if (sort === "popular") query = query.order("visits", { ascending: false });
  else if (sort === "top") query = query.order("likes", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  query = query.limit(60);

  const { data, error } = await query;
  if (error) {
    console.error("fetchWorlds error:", error.message);
    return [];
  }
  return (data || []).map(rowToWorld);
}

export async function fetchWorldById(id: string): Promise<World | null> {
  const { data, error } = await supabase
    .from("worlds")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToWorld(data);
}

export async function incrementWorldVisits(id: string): Promise<void> {
  await supabase.rpc("increment_world_visits", { world_id: id }).then(() => {});
}

// ============================================================
// LIKES
// ============================================================

/** Returns true if the signed-in user has liked this world. */
export async function hasLikedWorld(worldId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;

  const { data, error } = await supabase
    .from("world_likes")
    .select("user_id")
    .eq("world_id", worldId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

/** Insert a like row. Trigger updates worlds.likes. */
export async function likeWorld(worldId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;

  const { error } = await supabase
    .from("world_likes")
    .insert({ world_id: worldId, user_id: session.user.id });

  if (error) {
    console.error("likeWorld error:", error.message);
    return false;
  }
  return true;
}

/** Delete the like row. Trigger decrements worlds.likes. */
export async function unlikeWorld(worldId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;

  const { error } = await supabase
    .from("world_likes")
    .delete()
    .eq("world_id", worldId)
    .eq("user_id", session.user.id);

  if (error) {
    console.error("unlikeWorld error:", error.message);
    return false;
  }
  return true;
}

// ============================================================
// CREATE (still locked)
// ============================================================
export async function createWorld(input: {
  name: string;
  description: string;
  category: string;
  layout: string;
  thumbnailEmoji: string;
  thumbnailColor: string;
  creator: string;
  maxPlayers?: number;
}): Promise<{ success: boolean; error?: string; world?: World }> {
  const slug = input.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const suffix = Math.random().toString(36).slice(2, 7);
  const id = `${slug || "world"}-${suffix}`;

  const row = {
    id,
    name: input.name.trim().slice(0, 60),
    description: input.description.trim().slice(0, 240),
    thumbnail_emoji: input.thumbnailEmoji || "🌍",
    thumbnail_color: input.thumbnailColor || "#7B2FF7",
    category: input.category || "adventure",
    layout: input.layout || "plaza",
    creator: input.creator,
    max_players: input.maxPlayers ?? 20,
  };

  const { data, error } = await supabase
    .from("worlds")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("createWorld error:", error.message);
    return { success: false, error: error.message };
  }
  return { success: true, world: rowToWorld(data) };
}