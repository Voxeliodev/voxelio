// ============================================================
// CHAOS COLISEUM — level definition
// ============================================================
// A round coliseum-inspired arena with tiered seating visuals.
// Players fight 1v1v1v1 (max 4) with swords. Most kills wins.
// ============================================================

export type ColiseumPlatform = {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  isWalkable?: boolean;
};

// ============================================================
// CONFIG
// ============================================================
export const COLISEUM_SIZE = 60;               // arena diameter
export const COLISEUM_RADIUS = COLISEUM_SIZE / 2;
export const COLISEUM_FLOOR_Y = 0;             // y of the arena floor top
export const COLISEUM_WALL_HEIGHT = 4;         // how tall the boundary walls are
export const COLISEUM_MAX_PLAYERS = 4;

// Sword / combat tuning
export const SWORD_DAMAGE = 25;                // 4 hits to kill (100 HP)
export const SWORD_RANGE = 4.0;                // melee reach in units
export const SWORD_ARC_DEGREES = 90;           // swing arc half-angle
export const SWORD_COOLDOWN_MS = 550;          // time between swings
export const SWORD_SWING_DURATION_MS = 350;    // how long the swing animation lasts
export const KNOCKBACK_FORCE = 12;             // impulse applied to victim
export const PLAYER_MAX_HP = 100;
export const RESPAWN_DELAY_MS = 3000;
export const ROUND_DURATION_MS = 5 * 60_000;   // 5 minute rounds (adjust as needed)

// ============================================================
// SPAWN POINTS — 4 corners of the arena
// ============================================================
export const COLISEUM_SPAWNS: [number, number, number][] = [
  [-18, 1.2, -18],
  [ 18, 1.2, -18],
  [ 18, 1.2,  18],
  [-18, 1.2,  18],
];

// ============================================================
// ARENA PLATFORMS
// ============================================================
export const COLISEUM_PLATFORMS: ColiseumPlatform[] = [
  // ----- Main floor (large flat box, top at y=0) -----
  {
    position: [0, -0.5, 0],
    size: [COLISEUM_SIZE, 1, COLISEUM_SIZE],
    color: "#8B7355", // sandy stone
    isWalkable: true,
  },

  // ----- Central raised pedestal for dramatic combat -----
  {
    position: [0, 0.5, 0],
    size: [10, 1, 10],
    color: "#A0885F",
    isWalkable: true,
  },

  // ----- 4 corner pillars (decorative, walkable tops) -----
  {
    position: [-22, 1.5, -22],
    size: [3, 4, 3],
    color: "#6B5A45",
    isWalkable: true,
  },
  {
    position: [ 22, 1.5, -22],
    size: [3, 4, 3],
    color: "#6B5A45",
    isWalkable: true,
  },
  {
    position: [ 22, 1.5,  22],
    size: [3, 4, 3],
    color: "#6B5A45",
    isWalkable: true,
  },
  {
    position: [-22, 1.5,  22],
    size: [3, 4, 3],
    color: "#6B5A45",
    isWalkable: true,
  },
];

// ============================================================
// BOUNDARY WALLS — keep players inside the arena
// ============================================================
export const COLISEUM_WALLS: ColiseumPlatform[] = [
  // North wall (z = -COLISEUM_RADIUS)
  {
    position: [0, COLISEUM_WALL_HEIGHT / 2, -COLISEUM_RADIUS + 0.5],
    size: [COLISEUM_SIZE, COLISEUM_WALL_HEIGHT, 1],
    color: "#5C4A38",
  },
  // South wall
  {
    position: [0, COLISEUM_WALL_HEIGHT / 2, COLISEUM_RADIUS - 0.5],
    size: [COLISEUM_SIZE, COLISEUM_WALL_HEIGHT, 1],
    color: "#5C4A38",
  },
  // West wall
  {
    position: [-COLISEUM_RADIUS + 0.5, COLISEUM_WALL_HEIGHT / 2, 0],
    size: [1, COLISEUM_WALL_HEIGHT, COLISEUM_SIZE],
    color: "#5C4A38",
  },
  // East wall
  {
    position: [COLISEUM_RADIUS - 0.5, COLISEUM_WALL_HEIGHT / 2, 0],
    size: [1, COLISEUM_WALL_HEIGHT, COLISEUM_SIZE],
    color: "#5C4A38",
  },
];

// ============================================================
// TIERED SEATING — purely visual, sits above the walls
// ============================================================
export const COLISEUM_TIERS: ColiseumPlatform[] = (() => {
  const tiers: ColiseumPlatform[] = [];
  const tierCount = 3;
  const tierHeight = 3;
  const tierDepth = 4;

  for (let t = 0; t < tierCount; t++) {
    const y = COLISEUM_WALL_HEIGHT + t * tierHeight + tierHeight / 2;
    const offset = COLISEUM_RADIUS + tierDepth / 2 + t * tierDepth;

    // North
    tiers.push({
      position: [0, y, -offset],
      size: [COLISEUM_SIZE + t * tierDepth * 2, tierHeight, tierDepth],
      color: t % 2 === 0 ? "#4A3C2E" : "#3E3226",
    });
    // South
    tiers.push({
      position: [0, y, offset],
      size: [COLISEUM_SIZE + t * tierDepth * 2, tierHeight, tierDepth],
      color: t % 2 === 0 ? "#4A3C2E" : "#3E3226",
    });
    // West
    tiers.push({
      position: [-offset, y, 0],
      size: [tierDepth, tierHeight, COLISEUM_SIZE + t * tierDepth * 2],
      color: t % 2 === 0 ? "#4A3C2E" : "#3E3226",
    });
    // East
    tiers.push({
      position: [offset, y, 0],
      size: [tierDepth, tierHeight, COLISEUM_SIZE + t * tierDepth * 2],
      color: t % 2 === 0 ? "#4A3C2E" : "#3E3226",
    });
  }
  return tiers;
})();

// ============================================================
// UTILITY: find nearest spawn for a given position
// ============================================================
export function findNearestSpawn(pos: [number, number, number]): [number, number, number] {
  let best = COLISEUM_SPAWNS[0];
  let bestDist = Infinity;
  for (const s of COLISEUM_SPAWNS) {
    const dx = s[0] - pos[0];
    const dz = s[2] - pos[2];
    const d = dx * dx + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return [...best];
}

// ============================================================
// UTILITY: pick a random spawn (for respawn)
// ============================================================
export function pickRandomSpawn(): [number, number, number] {
  const idx = Math.floor(Math.random() * COLISEUM_SPAWNS.length);
  return [...COLISEUM_SPAWNS[idx]];
}