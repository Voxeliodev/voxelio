// ============================================================
// CHAOS COLISEUM — local progress tracking
// ============================================================
// Stores each player's PvP stats locally, keyed by user ID.
// Mirrors the pattern used by lumberyardProgress.ts.
// ============================================================

import { getCurrentUser } from "./auth";

export type ColiseumProgress = {
  totalKills: number;
  totalDeaths: number;
  totalWins: number;
  roundsPlayed: number;
  bestKillStreak: number;
  currentKillStreak: number;
  // Session-level counters (reset each round)
  sessionKills: number;
  sessionDeaths: number;
};

const DEFAULT_PROGRESS: ColiseumProgress = {
  totalKills: 0,
  totalDeaths: 0,
  totalWins: 0,
  roundsPlayed: 0,
  bestKillStreak: 0,
  currentKillStreak: 0,
  sessionKills: 0,
  sessionDeaths: 0,
};

function storageKey(userId: string): string {
  return `voxelio-coliseum-progress-${userId}`;
}

// ============================================================
// Load / Save
// ============================================================

export async function loadColiseumProgress(): Promise<ColiseumProgress> {
  if (typeof window === "undefined") return { ...DEFAULT_PROGRESS };

  const user = getCurrentUser();
  if (!user) return { ...DEFAULT_PROGRESS };

  try {
    const raw = localStorage.getItem(storageKey(user.id));
    if (!raw) return { ...DEFAULT_PROGRESS };

    const parsed = JSON.parse(raw);
    // Merge with defaults in case we added new fields later
    return { ...DEFAULT_PROGRESS, ...parsed };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export async function saveColiseumProgress(
  progress: ColiseumProgress
): Promise<void> {
  if (typeof window === "undefined") return;

  const user = getCurrentUser();
  if (!user) return;

  try {
    localStorage.setItem(storageKey(user.id), JSON.stringify(progress));
  } catch {
    // Ignore storage errors (quota full, private mode, etc.)
  }
}

// ============================================================
// Stat mutation helpers
// ============================================================

// Record a kill for the current player.
// Returns the updated progress so the caller can use it immediately.
export async function recordKill(): Promise<ColiseumProgress> {
  const p = await loadColiseumProgress();
  p.totalKills += 1;
  p.sessionKills += 1;
  p.currentKillStreak += 1;
  if (p.currentKillStreak > p.bestKillStreak) {
    p.bestKillStreak = p.currentKillStreak;
  }
  await saveColiseumProgress(p);
  return p;
}

// Record a death for the current player.
// Resets the current kill streak.
export async function recordDeath(): Promise<ColiseumProgress> {
  const p = await loadColiseumProgress();
  p.totalDeaths += 1;
  p.sessionDeaths += 1;
  p.currentKillStreak = 0;
  await saveColiseumProgress(p);
  return p;
}

// Record the end of a round. If `won` is true, increments totalWins.
// Also resets session counters for the next round.
export async function recordRoundEnd(
  won: boolean
): Promise<ColiseumProgress> {
  const p = await loadColiseumProgress();
  p.roundsPlayed += 1;
  if (won) p.totalWins += 1;
  p.sessionKills = 0;
  p.sessionDeaths = 0;
  await saveColiseumProgress(p);
  return p;
}

// ============================================================
// Formatting helpers
// ============================================================

export function formatKDR(progress: ColiseumProgress): string {
  if (progress.totalDeaths === 0) {
    if (progress.totalKills === 0) return "0.00";
    return progress.totalKills.toFixed(2);
  }
  return (progress.totalKills / progress.totalDeaths).toFixed(2);
}

export function formatWinRate(progress: ColiseumProgress): string {
  if (progress.roundsPlayed === 0) return "0%";
  const rate = (progress.totalWins / progress.roundsPlayed) * 100;
  return `${rate.toFixed(0)}%`;
}

export function formatStreak(n: number): string {
  if (n === 0) return "—";
  return `${n}×`;
}