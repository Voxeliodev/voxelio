// ============================================================
// IMPOSSIBLE OBBY — Leaderboard helpers
// ============================================================

import { supabase } from "./supabase";

export type LeaderboardEntry = {
  id: string;
  userId: string;
  username: string;
  timeMs: number;
  completedAt: string;
};

export type PersonalBest = {
  timeMs: number;
  completedAt: string;
} | null;

// Fetch the top N times for a given world
export async function fetchTopTimes(
  worldId: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("obby_leaderboard")
    .select("id, user_id, username, time_ms, completed_at")
    .eq("world_id", worldId)
    .order("time_ms", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  // Deduplicate by user — keep their best (lowest) time only
  const seenUsers = new Set<string>();
  const deduped: LeaderboardEntry[] = [];

  for (const row of data) {
    if (seenUsers.has(row.user_id)) continue;
    seenUsers.add(row.user_id);
    deduped.push({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      timeMs: row.time_ms,
      completedAt: row.completed_at,
    });
  }

  return deduped;
}

// Fetch the current user's personal best for a world
export async function fetchPersonalBest(
  worldId: string
): Promise<PersonalBest> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from("obby_leaderboard")
    .select("time_ms, completed_at")
    .eq("world_id", worldId)
    .eq("user_id", session.user.id)
    .order("time_ms", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    timeMs: data.time_ms,
    completedAt: data.completed_at,
  };
}

// Submit a completion time. Server-side validation happens in the API route.
export async function submitTime(
  worldId: string,
  timeMs: number
): Promise<{ success: boolean; error?: string; newBest?: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: "Not signed in" };
  }

  const res = await fetch("/api/obby/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ worldId, timeMs }),
  });

  const json = await res.json();

  if (!res.ok) {
    return { success: false, error: json.error || "Submission failed" };
  }

  return { success: true, newBest: json.newBest };
}

// Format milliseconds as "M:SS.mmm"
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

// Format milliseconds as a short string like "42.31s" or "1:23.45"
export function formatShortTime(ms: number): string {
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return formatTime(ms);
}