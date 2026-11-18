// ============================================================
// VOXELIO'S WONDERLAND — game data (challenges, rewards, locations)
// ============================================================

export type WonderlandChallenge = {
  id: string;
  name: string;
  description: string;
  badgeName: string;
  rewardItemId: string;
  emoji: string;
};

// ===== The Challenges =====
export const WONDERLAND_CHALLENGES: WonderlandChallenge[] = [
  {
    id: "ch-1",
    name: "Frozen Lake Slide",
    description: "Slide down the icy hill without falling in the water.",
    badgeName: "Ice Skater",
    rewardItemId: "acc-ice-crown",
    emoji: "⛸️",
  },
  {
    id: "ch-2",
    name: "Snowball Fight Champion",
    description: "Hit 10 other players with snowballs.",
    badgeName: "Snowball Sniper",
    rewardItemId: "acc-santa-hat",
    emoji: "❄️",
  },
  {
    id: "ch-3",
    name: "Sweet Tooth",
    description: "Find the hidden Candy Cane in the Gingerbread House.",
    badgeName: "Candy Hunter",
    rewardItemId: "acc-candy-cane-sword",
    emoji: "🍭",
  },
];

export function getChallenge(id: string): WonderlandChallenge | undefined {
  return WONDERLAND_CHALLENGES.find((c) => c.id === id);
}

// ===== 3D World Constants =====
// (Use these if you build a 3D world for the game later)
export const WONDERLAND_SPAWN: [number, number, number] = [0, 2.5, 20];

export const GINGERBREAD_HOUSE_POS: [number, number, number] = [-15, 0, -10];
export const SLIDE_TOP_POS: [number, number, number] = [15, 10, -10];
export const SLIDE_BOTTOM_POS: [number, number, number] = [15, 0, -25];

export const SNOWBALL_SPAWN_AREA = { 
  minX: -20, maxX: 20, 
  minZ: -20, maxZ: 20 
};

export const WORLD_BOUNDS = 50;