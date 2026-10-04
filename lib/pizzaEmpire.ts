// ============================================================
// PIZZA EMPIRE TYCOON — level definition
// ============================================================
// Four players each get their own 30x30 plot arranged in a
// 2x2 grid. Each plot has a buy button, 12 oven slots, and a
// cash register. Ovens generate passive income over time.
// ============================================================

// ============================================================
// ARENA
// ============================================================
export const ARENA_SIZE = 64;
export const ARENA_RADIUS = ARENA_SIZE / 2; // 32
export const ARENA_WALL_HEIGHT = 4;

// ============================================================
// PLOTS
// ============================================================
export const PLOT_SIZE = 30;
export const PLOT_GAP = 2; // gap between plots (walkway)
export const MAX_PLAYERS = 4;

// Plot centers, arranged 2x2 around origin.
// Order: top-left, top-right, bottom-right, bottom-left.
export const PLOT_POSITIONS: [number, number, number][] = (() => {
  const offset = (PLOT_SIZE / 2) + (PLOT_GAP / 2); // 16
  return [
    [-offset, 0, -offset], // top-left  (Player 1)
    [offset, 0, -offset],  // top-right (Player 2)
    [offset, 0, offset],   // bottom-right (Player 3)
    [-offset, 0, offset],  // bottom-left (Player 4)
  ];
})();

// Player spawn points — one per plot, on the outer corner,
// facing inward toward the plot center.
export const PLOT_SPAWNS: [number, number, number][] = (() => {
  const corner = (PLOT_SIZE / 2) + (PLOT_GAP / 2) - 2; // 14
  return [
    [-corner, 1.2, -corner], // near top-left plot corner
    [corner, 1.2, -corner],  // near top-right plot corner
    [corner, 1.2, corner],   // near bottom-right plot corner
    [-corner, 1.2, corner],  // near bottom-left plot corner
  ];
})();

// Y-height of the plot floor (raised slightly above the arena floor)
export const PLOT_FLOOR_Y = 0.25;

// ============================================================
// OVENS
// ============================================================
// Each plot has a 4x3 grid of oven slots (12 total).
export const MAX_OVENS = 12;

// Oven slot positions, relative to a plot's center.
// Arranged 4 wide (x) by 3 deep (z).
export const OVEN_SLOT_OFFSETS: [number, number, number][] = (() => {
  const cols = 4;
  const rows = 3;
  const spacingX = 6;
  const spacingZ = 6;
  const offsets: [number, number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      offsets.push([
        (c - (cols - 1) / 2) * spacingX, // centered on x
        0,
        (r - (rows - 1) / 2) * spacingZ, // centered on z
      ]);
    }
  }
  return offsets;
})();

// Oven visual size
export const OVEN_SIZE: [number, number, number] = [3, 3, 3];

// ============================================================
// OVEN ECONOMY
// ============================================================
// Base cost of the first oven — each successive oven costs more.
export const OVEN_BASE_COST = 50;
export const OVEN_COST_MULTIPLIER = 1.55;

// Base income per oven per second (level 1).
export const OVEN_BASE_INCOME_PER_SECOND = 1;

// Upgrade: each level doubles the income.
export const OVEN_INCOME_LEVEL_MULTIPLIER = 2;
export const MAX_OVEN_LEVEL = 5;

// Cost to upgrade an oven, based on its current level.
export const OVEN_UPGRADE_BASE_COST = 100;
export const OVEN_UPGRADE_COST_MULTIPLIER = 2.2;

// ============================================================
// ECONOMY HELPERS
// ============================================================
// Cost of the Nth oven (0-indexed).
export function getOvenCost(ovenIndex: number): number {
  return Math.round(
    OVEN_BASE_COST * Math.pow(OVEN_COST_MULTIPLIER, ovenIndex)
  );
}

// Cost to upgrade an oven from `currentLevel` to `currentLevel + 1`.
export function getOvenUpgradeCost(currentLevel: number): number {
  return Math.round(
    OVEN_UPGRADE_BASE_COST *
      Math.pow(OVEN_UPGRADE_COST_MULTIPLIER, currentLevel - 1)
  );
}

// Income per second for an oven at a given level.
export function getOvenIncome(level: number): number {
  return (
    OVEN_BASE_INCOME_PER_SECOND *
    Math.pow(OVEN_INCOME_LEVEL_MULTIPLIER, level - 1)
  );
}

// ============================================================
// PLOT FIXTURES
// ============================================================
// Buy button (local offset within the plot) — placed near the
// outer edge, so the player spawns facing it.
export const BUY_BUTTON_OFFSET: [number, number, number] = [0, 0.5, -11];
export const BUY_BUTTON_SIZE: [number, number, number] = [3, 1, 3];

// Cash register — placed at the opposite edge.
export const CASH_REGISTER_OFFSET: [number, number, number] = [0, 0.5, 11];
export const CASH_REGISTER_SIZE: [number, number, number] = [4, 2, 2];

// The plot's outer floor (the tile the player stands on)
export const PLOT_FLOOR_COLOR = "#3B1E10"; // warm pizza-stone brown
export const PLOT_EDGE_COLOR = "#7A3E1D";  // darker brick rim

// Buy button colors
export const BUY_BUTTON_COLOR = "#22C55E";       // green when affordable
export const BUY_BUTTON_DISABLED_COLOR = "#6B7280"; // gray when not

// Oven appearance
export const OVEN_COLOR = "#2D2D2D";              // dark metal
export const OVEN_DOOR_COLOR = "#1A1A1A";         // black door
export const OVEN_GLOW_COLOR = "#FF6B00";         // orange glow (fire)
export const OVEN_INACTIVE_COLOR = "#4B4B4B";     // unowned oven slot

// Cash register appearance
export const CASH_REGISTER_COLOR = "#FFD700";     // gold
export const CASH_REGISTER_DARK = "#B8860B";      // darker gold trim

// ============================================================
// PLAYER
// ============================================================
export const PLAYER_RADIUS = 0.42;
export const PLAYER_HEIGHT = 1.8;
export const CHARACTER_Y_OFFSET = PLOT_FLOOR_Y + 1.35; // 1.6

// ============================================================
// INITIAL STATE
// ============================================================
export const STARTING_COINS = 25;
export const TICK_INTERVAL_MS = 250; // economy tick rate