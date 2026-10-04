// ============================================================
// PIZZA EMPIRE TYCOON — local progress tracking
// ============================================================
// Saves each player's coins, ovens, and stats locally, keyed
// by user ID. Mirrors the pattern used by lumberyardProgress.ts
// and chaosColiseumProgress.ts.
// ============================================================

import { getCurrentUser } from "./auth";
import {
  MAX_OVENS,
  MAX_OVEN_LEVEL,
  STARTING_COINS,
  getOvenCost,
  getOvenUpgradeCost,
  getOvenIncome,
} from "./pizzaEmpire";

// ============================================================
// TYPES
// ============================================================
export type OvenState = {
  owned: boolean;
  level: number; // 1..MAX_OVEN_LEVEL, only meaningful when owned
};

export type PizzaEmpireProgress = {
  coins: number;
  ovens: OvenState[]; // always length MAX_OVENS
  totalPizzasCooked: number;
  totalEarned: number;
  totalSpent: number;
  createdAt: number;
  updatedAt: number;
};

// ============================================================
// DEFAULT PROGRESS
// ============================================================
export function createDefaultProgress(): PizzaEmpireProgress {
  const now = Date.now();
  return {
    coins: STARTING_COINS,
    ovens: Array.from({ length: MAX_OVENS }, () => ({
      owned: false,
      level: 0,
    })),
    totalPizzasCooked: 0,
    totalEarned: 0,
    totalSpent: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================
// STORAGE KEY
// ============================================================
function storageKey(userId: string): string {
  return `voxelio-pizza-empire-${userId}`;
}

// ============================================================
// LOAD / SAVE
// ============================================================
export async function loadProgress(): Promise<PizzaEmpireProgress> {
  if (typeof window === "undefined") return createDefaultProgress();

  const user = getCurrentUser();
  if (!user) return createDefaultProgress();

  try {
    const raw = localStorage.getItem(storageKey(user.id));
    if (!raw) return createDefaultProgress();

    const parsed = JSON.parse(raw);

    // Rebuild ovens array defensively — ensure it's always length MAX_OVENS
    const ovens: OvenState[] = Array.from(
      { length: MAX_OVENS },
      (_, i) => {
        const existing = parsed?.ovens?.[i];
        if (
          existing &&
          typeof existing === "object" &&
          typeof existing.owned === "boolean"
        ) {
          return {
            owned: existing.owned,
            level: Math.max(
              0,
              Math.min(MAX_OVEN_LEVEL, Number(existing.level) || 0)
            ),
          };
        }
        return { owned: false, level: 0 };
      }
    );

    return {
      coins: Math.max(0, Number(parsed?.coins) || 0),
      ovens,
      totalPizzasCooked: Math.max(0, Number(parsed?.totalPizzasCooked) || 0),
      totalEarned: Math.max(0, Number(parsed?.totalEarned) || 0),
      totalSpent: Math.max(0, Number(parsed?.totalSpent) || 0),
      createdAt: Number(parsed?.createdAt) || Date.now(),
      updatedAt: Number(parsed?.updatedAt) || Date.now(),
    };
  } catch {
    return createDefaultProgress();
  }
}

export async function saveProgress(
  progress: PizzaEmpireProgress
): Promise<void> {
  if (typeof window === "undefined") return;

  const user = getCurrentUser();
  if (!user) return;

  try {
    const toSave: PizzaEmpireProgress = {
      ...progress,
      updatedAt: Date.now(),
    };
    localStorage.setItem(storageKey(user.id), JSON.stringify(toSave));
  } catch {
    // Ignore storage errors (quota full, private mode, etc.)
  }
}

// ============================================================
// RESET
// ============================================================
export async function resetProgress(): Promise<PizzaEmpireProgress> {
  const fresh = createDefaultProgress();
  await saveProgress(fresh);
  return fresh;
}

// ============================================================
// ECONOMY HELPERS
// ============================================================
// Total income per second from all owned ovens.
export function calculateIncomePerSecond(ovens: OvenState[]): number {
  let total = 0;
  for (const oven of ovens) {
    if (!oven.owned) continue;
    total += getOvenIncome(oven.level);
  }
  return total;
}

// How many ovens are currently owned.
export function countOwnedOvens(ovens: OvenState[]): number {
  return ovens.filter((o) => o.owned).length;
}

// Cost of the NEXT oven the player hasn't bought yet.
// Returns null if they already own all 12.
export function getNextOvenCost(ovens: OvenState[]): number | null {
  const ownedCount = countOwnedOvens(ovens);
  if (ownedCount >= MAX_OVENS) return null;
  return getOvenCost(ownedCount);
}

// ============================================================
// BUY / UPGRADE ACTIONS
// ============================================================
// Attempt to buy the next oven. Returns a new progress object
// on success, or null if the player can't afford it.
export function tryBuyNextOven(
  progress: PizzaEmpireProgress
): PizzaEmpireProgress | null {
  const cost = getNextOvenCost(progress.ovens);
  if (cost === null) return null; // already own all
  if (progress.coins < cost) return null; // can't afford

  // Find the first unowned slot
  const firstUnownedIdx = progress.ovens.findIndex((o) => !o.owned);
  if (firstUnownedIdx === -1) return null;

  const newOvens = [...progress.ovens];
  newOvens[firstUnownedIdx] = { owned: true, level: 1 };

  return {
    ...progress,
    coins: progress.coins - cost,
    ovens: newOvens,
    totalSpent: progress.totalSpent + cost,
    updatedAt: Date.now(),
  };
}

// Attempt to upgrade a specific oven. Returns a new progress
// object on success, or null if the action isn't possible.
export function tryUpgradeOven(
  progress: PizzaEmpireProgress,
  ovenIndex: number
): PizzaEmpireProgress | null {
  const oven = progress.ovens[ovenIndex];
  if (!oven || !oven.owned) return null;
  if (oven.level >= MAX_OVEN_LEVEL) return null; // maxed out

  const cost = getOvenUpgradeCost(oven.level);
  if (progress.coins < cost) return null;

  const newOvens = [...progress.ovens];
  newOvens[ovenIndex] = {
    owned: true,
    level: oven.level + 1,
  };

  return {
    ...progress,
    coins: progress.coins - cost,
    ovens: newOvens,
    totalSpent: progress.totalSpent + cost,
    updatedAt: Date.now(),
  };
}

// ============================================================
// INCOME TICK
// ============================================================
// Called on a timer. Adds `incomePerSecond * deltaSeconds` coins
// and increments the pizzas-cooked counter.
export function applyIncomeTick(
  progress: PizzaEmpireProgress,
  deltaSeconds: number,
  incomePerSecond: number
): PizzaEmpireProgress {
  if (incomePerSecond <= 0 || deltaSeconds <= 0) return progress;

  const earned = incomePerSecond * deltaSeconds;

  return {
    ...progress,
    coins: progress.coins + earned,
    totalEarned: progress.totalEarned + earned,
    totalPizzasCooked:
      progress.totalPizzasCooked + incomePerSecond * deltaSeconds,
    updatedAt: Date.now(),
  };
}