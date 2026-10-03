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

export async function fetchTopTimes(
  worldId: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  // Fetch a bit more than needed to account for duplicates per user
  // (voxelio may have 100 entries, so we need to fetch many to get all unique users)
  const FETCH_MULTIPLIER = 20;

  const { data, error } = await supabase
    .from("obby_leaderboard")
    .select("id, user_id, username, time_ms, completed_at")
    .eq("world_id", worldId)
    .order("time_ms", { ascending: true })
    .limit(limit * FETCH_MULTIPLIER);

  if (error || !data) return [];

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
    if (deduped.length >= limit) break;
  }

  return deduped;
}

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

// Submit a completion time
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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ worldId, timeMs }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { success: false, error: json.error || "Submission failed" };
  }

  return { success: true, newBest: json.newBest };
}

// ============================================================
// Time formatting
// ============================================================

export function formatShortTime(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms));

  if (totalMs < 60_000) {
    const seconds = totalMs / 1000;
    return `${seconds.toFixed(2)}s`;
  }

  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((totalMs % 1000) / 10);

  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

export function formatTime(ms: number): string {
  return formatShortTime(ms);
}