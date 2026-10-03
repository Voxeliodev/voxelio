// ============================================================
// LUMBERYARD INC — game data (trees, axes, constants)
// ============================================================

// ===== Axes =====
export type AxeId = "rusty" | "iron" | "steel" | "gold" | "diamond";

export type AxeDef = {
  id: AxeId;
  name: string;
  emoji: string;
  price: number;              // in Lumbercoins
  damage: number;             // damage per hit
  cooldownMs: number;         // time between hits
  color: string;              // handle color for the visual
  bladeColor: string;         // blade color for the visual
};

export const AXES: AxeDef[] = [
  {
    id: "rusty",
    name: "Rusty Axe",
    emoji: "🪓",
    price: 0,
    damage: 10,
    cooldownMs: 800,
    color: "#78350F",
    bladeColor: "#9CA3AF",
  },
  {
    id: "iron",
    name: "Iron Axe",
    emoji: "🪓",
    price: 500,
    damage: 25,
    cooldownMs: 650,
    color: "#78350F",
    bladeColor: "#E5E7EB",
  },
  {
    id: "steel",
    name: "Steel Axe",
    emoji: "🪓",
    price: 2500,
    damage: 50,
    cooldownMs: 500,
    color: "#78350F",
    bladeColor: "#93C5FD",
  },
  {
    id: "gold",
    name: "Golden Axe",
    emoji: "🪓",
    price: 10000,
    damage: 100,
    cooldownMs: 400,
    color: "#78350F",
    bladeColor: "#FBBF24",
  },
  {
    id: "diamond",
    name: "Diamond Axe",
    emoji: "🪓",
    price: 50000,
    damage: 250,
    cooldownMs: 300,
    color: "#0F172A",
    bladeColor: "#67E8F9",
  },
];

export function getAxe(id: string): AxeDef {
  return AXES.find((a) => a.id === id) || AXES[0];
}

// ===== Trees =====
export type TreeTypeId = "small" | "medium" | "large" | "ancient";

export type TreeTypeDef = {
  id: TreeTypeId;
  name: string;
  emoji: string;
  minAxe: AxeId;              // minimum axe required to damage
  hp: number;                 // total hit points
  logValue: number;           // Lumbercoins when sold
  regrowMs: number;           // time before respawn
  trunkColor: string;
  leavesColor: string;
  scale: number;              // visual scale (1 = normal)
  trunkHeight: number;        // in world units
  leavesRadius: number;       // in world units
};

export const TREE_TYPES: TreeTypeDef[] = [
  {
    id: "small",
    name: "Pine",
    emoji: "🌲",
    minAxe: "rusty",
    hp: 30,
    logValue: 25,
    regrowMs: 20_000,
    trunkColor: "#78350F",
    leavesColor: "#16A34A",
    scale: 1,
    trunkHeight: 2.4,
    leavesRadius: 1.4,
  },
  {
    id: "medium",
    name: "Oak",
    emoji: "🌳",
    minAxe: "iron",
    hp: 120,
    logValue: 150,
    regrowMs: 30_000,
    trunkColor: "#451A03",
    leavesColor: "#15803D",
    scale: 1.3,
    trunkHeight: 3.2,
    leavesRadius: 1.9,
  },
  {
    id: "large",
    name: "Redwood",
    emoji: "🌴",
    minAxe: "steel",
    hp: 400,
    logValue: 800,
    regrowMs: 45_000,
    trunkColor: "#7C2D12",
    leavesColor: "#166534",
    scale: 1.7,
    trunkHeight: 4.2,
    leavesRadius: 2.4,
  },
  {
    id: "ancient",
    name: "Ancient Sequoia",
    emoji: "🎄",
    minAxe: "gold",
    hp: 2000,
    logValue: 5000,
    regrowMs: 60_000,
    trunkColor: "#3F2313",
    leavesColor: "#064E3B",
    scale: 2.4,
    trunkHeight: 6,
    leavesRadius: 3.2,
  },
];

export function getTreeType(id: string): TreeTypeDef {
  return TREE_TYPES.find((t) => t.id === id) || TREE_TYPES[0];
}

// ===== Tree spawn positions in the world =====
export type TreeSpawn = {
  id: string;                 // unique per instance (so it can regrow)
  type: TreeTypeId;
  position: [number, number, number];
};

// A nice forest layout. Trees are spread across the map.
// Sawmill sits at (0, 0, -20) — trees are all north of it.
export const TREE_SPAWNS: TreeSpawn[] = [
  // Small pines near spawn (easy early game)
  { id: "t1", type: "small", position: [-6, 0, 5] },
  { id: "t2", type: "small", position: [8, 0, 6] },
  { id: "t3", type: "small", position: [-12, 0, 12] },
  { id: "t4", type: "small", position: [12, 0, 14] },
  { id: "t5", type: "small", position: [0, 0, 15] },

  // Medium oaks (a bit further)
  { id: "t6", type: "medium", position: [-18, 0, -2] },
  { id: "t7", type: "medium", position: [18, 0, -4] },
  { id: "t8", type: "medium", position: [-22, 0, 8] },
  { id: "t9", type: "medium", position: [22, 0, 10] },

  // Large redwoods (deeper into forest)
  { id: "t10", type: "large", position: [-30, 0, -10] },
  { id: "t11", type: "large", position: [30, 0, -12] },
  { id: "t12", type: "large", position: [0, 0, -20] },

  // Ancient sequoia (rare, hard to chop)
  { id: "t13", type: "ancient", position: [-40, 0, -25] },
  { id: "t14", type: "ancient", position: [40, 0, -25] },
];

// ===== Sawmill location =====
export const SAWMILL_POSITION: [number, number, number] = [0, 0, 30];
export const SAWMILL_RADIUS = 4; // player must be within this radius to sell

// ===== Player spawn =====
export const LUMBERYARD_SPAWN: [number, number, number] = [0, 2.5, 25];

// ===== World bounds =====
export const WORLD_BOUNDS = 60;

// ===== Log pickups =====
export const LOG_PICKUP_RADIUS = 1.8;       // distance at which a log can be picked up
export const LOG_SELL_RADIUS = SAWMILL_RADIUS;