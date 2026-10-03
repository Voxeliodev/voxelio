// ============================================================
// IMPOSSIBLE OBBY — Level Design
// ============================================================
// Every platform, checkpoint, hazard, and the finish pad.
// Coordinates: +Z = toward camera at start, -Z = toward finish.
// Y is up. Ground level is y = 0.
// ============================================================

export type ObbyPlatform = {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
};

export type ObbyCheckpoint = {
  id: number;
  position: [number, number, number];
  spawn: [number, number, number];
};

export type ObbySpinner = {
  id: string;
  position: [number, number, number];
  length: number;
  speed: number; // radians per second
  color: string;
};

export type ObbyFinish = {
  position: [number, number, number];
  size: [number, number, number];
};

export const OBBY_START_SPAWN: [number, number, number] = [0, 2.5, 14];

export const OBBY_PLATFORMS: ObbyPlatform[] = [
  // ===== Section 1 — safe start =====
  { position: [0, 0.5, 14], size: [6, 1, 6], color: "#3B82F6" },

  // ===== Section 2 — three easy jumps =====
  { position: [0, 1.5, 8], size: [3, 1, 3], color: "#22C55E" },
  { position: [3, 2.5, 4], size: [3, 1, 3], color: "#22C55E" },
  { position: [-3, 3.5, 0], size: [3, 1, 3], color: "#22C55E" },

  // ===== Section 3 — moving platform (see MOVING_PLATFORMS below) =====
  // Safe landing pad after moving platform
  { position: [0, 5.5, -6], size: [4, 1, 4], color: "#FBBF24" },

  // ===== Section 4 — narrow beams =====
  { position: [4, 6, -10], size: [1, 0.5, 6], color: "#EF4444" },
  { position: [-2, 6.5, -14], size: [1, 0.5, 6], color: "#EF4444" },

  // ===== Section 5 — safe pad between hazards =====
  { position: [3, 7, -19], size: [4, 1, 4], color: "#FBBF24" },

  // ===== Section 6 — double moving platform sequence =====
  // Safe landing after double moving
  { position: [0, 9, -30], size: [4, 1, 4], color: "#FBBF24" },

  // ===== Section 7 — small precise jumps (chain of 5) =====
  { position: [2, 10, -34], size: [1.5, 1, 1.5], color: "#A855F7" },
  { position: [-2, 10.5, -37], size: [1.5, 1, 1.5], color: "#A855F7" },
  { position: [2, 11, -40], size: [1.5, 1, 1.5], color: "#A855F7" },
  { position: [-2, 11.5, -43], size: [1.5, 1, 1.5], color: "#A855F7" },
  { position: [0, 12, -46], size: [1.5, 1, 1.5], color: "#A855F7" },

  // ===== Section 8 — final approach to finish =====
  { position: [0, 12.5, -51], size: [3, 1, 3], color: "#FBBF24" },
];

// Moving platforms (oscillate between two points)
export type ObbyMovingPlatform = {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  size: [number, number, number];
  speed: number; // units per second along the path
  color: string;
};

export const OBBY_MOVING_PLATFORMS: ObbyMovingPlatform[] = [
  // Moving platform #1 — takes you from section 2 to section 3
  {
    id: "moving-1",
    from: [0, 4.5, -2],
    to: [0, 4.5, -6],
    size: [3, 0.6, 3],
    speed: 3,
    color: "#EC4899",
  },
  // Moving platform #2 — from section 5 toward section 6 (left-right sway)
  {
    id: "moving-2",
    from: [-3, 8, -23],
    to: [3, 8, -23],
    size: [3, 0.6, 3],
    speed: 4,
    color: "#EC4899",
  },
  // Moving platform #3 — from section 5 toward section 6 (forward-back)
  {
    id: "moving-3",
    from: [0, 8, -25],
    to: [0, 8, -29],
    size: [3, 0.6, 3],
    speed: 4,
    color: "#EC4899",
  },
];

// Spinning blade hazards
export const OBBY_SPINNERS: ObbySpinner[] = [
  {
    id: "spinner-1",
    position: [0, 7.5, -16],
    length: 7,
    speed: 2.5,
    color: "#1A1A2E",
  },
  {
    id: "spinner-2",
    position: [0, 10.5, -32],
    length: 6,
    speed: -3.0,
    color: "#1A1A2E",
  },
];

// Checkpoints — falling past these respawns you at the last one
export const OBBY_CHECKPOINTS: ObbyCheckpoint[] = [
  {
    id: 0,
    position: [0, 5.5, -6],
    spawn: [0, 6.5, -6],
  },
  {
    id: 1,
    position: [3, 7, -19],
    spawn: [3, 8, -19],
  },
  {
    id: 2,
    position: [0, 9, -30],
    spawn: [0, 10, -30],
  },
  {
    id: 3,
    position: [0, 12.5, -51],
    spawn: [0, 13.5, -51],
  },
];

// The finish pad — touching this (after all checkpoints) wins
export const OBBY_FINISH: ObbyFinish = {
  position: [0, 13.5, -55],
  size: [5, 0.5, 5],
};

// Platform below finish to stand on
export const OBBY_FINISH_BASE: ObbyPlatform = {
  position: [0, 13, -55],
  size: [6, 1, 6],
  color: "#FFD700",
};

// Kill floor — falling below this Y teleports you to the last checkpoint
export const OBBY_KILL_Y = -5;

// Ground color for the void beneath the obby
export const OBBY_GROUND_COLOR = "#1E1B4B";

// Distance checkpoints must be touched in order (if using strict mode)
export const OBBY_TOTAL_CHECKPOINTS = OBBY_CHECKPOINTS.length;