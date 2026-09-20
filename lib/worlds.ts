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
  // Fire and forget; if it fails we don't care
  await supabase.rpc("increment_world_visits", { world_id: id }).then(() => {});
}