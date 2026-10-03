// ============================================================
// LUMBERYARD INC — Player progress (Supabase helpers)
// ============================================================

import { supabase } from "./supabase";
import type { AxeId } from "./lumberyard";

export type LumberyardProgress = {
  lumbercoins: number;
  currentAxe: AxeId;
  treesChopped: number;
  logsSold: number;
};

const DEFAULT_PROGRESS: LumberyardProgress = {
  lumbercoins: 0,
  currentAxe: "rusty",
  treesChopped: 0,
  logsSold: 0,
};

// Load progress for the current user. Creates a default row if none exists.
export async function loadProgress(): Promise<LumberyardProgress> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return DEFAULT_PROGRESS;

  const { data, error } = await supabase
    .from("lumberyard_progress")
    .select("lumbercoins, current_axe, trees_chopped, logs_sold")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) {
    // No row yet — try to create one
    await supabase.from("lumberyard_progress").insert({
      user_id: session.user.id,
      lumbercoins: 0,
      current_axe: "rusty",
    }).then(() => {});
    return DEFAULT_PROGRESS;
  }

  return {
    lumbercoins: Number(data.lumbercoins) || 0,
    currentAxe: (data.current_axe as AxeId) || "rusty",
    treesChopped: Number(data.trees_chopped) || 0,
    logsSold: Number(data.logs_sold) || 0,
  };
}

// Save progress
export async function saveProgress(progress: LumberyardProgress): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;

  const { error } = await supabase
    .from("lumberyard_progress")
    .upsert(
      {
        user_id: session.user.id,
        lumbercoins: progress.lumbercoins,
        current_axe: progress.currentAxe,
        trees_chopped: progress.treesChopped,
        logs_sold: progress.logsSold,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  return !error;
}

// Add coins and update stats
export async function addCoins(
  amount: number,
  logsToAdd: number = 0
): Promise<LumberyardProgress> {
  const current = await loadProgress();
  const updated: LumberyardProgress = {
    ...current,
    lumbercoins: current.lumbercoins + amount,
    logsSold: current.logsSold + logsToAdd,
  };
  await saveProgress(updated);
  return updated;
}

// Buy a new axe
export async function buyAxe(axeId: AxeId, price: number): Promise<{
  success: boolean;
  error?: string;
  progress?: LumberyardProgress;
}> {
  const current = await loadProgress();

  if (current.currentAxe === axeId) {
    return { success: false, error: "You already own this axe." };
  }

  if (current.lumbercoins < price) {
    return { success: false, error: "Not enough Lumbercoins." };
  }

  const updated: LumberyardProgress = {
    ...current,
    lumbercoins: current.lumbercoins - price,
    currentAxe: axeId,
  };

  const ok = await saveProgress(updated);
  if (!ok) return { success: false, error: "Failed to save." };

  return { success: true, progress: updated };
}

// Increment trees chopped
export async function recordChop(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const current = await loadProgress();
  await saveProgress({
    ...current,
    treesChopped: current.treesChopped + 1,
  });
}

// Format number with commas
export function formatCoins(n: number): string {
  return n.toLocaleString();
}