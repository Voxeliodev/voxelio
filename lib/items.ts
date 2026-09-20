// ============================================================
// VOXELIO ITEMS — The item database
// ============================================================

export type ItemRarity = "common" | "rare" | "epic" | "legendary";

export type ItemCategory =
  | "hats"
  | "heads"
  | "faces"
  | "outfits"
  | "accessories"
  | "hair";

export type Item = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ItemCategory;
  rarity: ItemRarity;
  previewEmoji: string;
  creator: string;

  modelPath?: string;
  modelScale?: number;
  modelOffset?: [number, number, number];
  modelRotation?: [number, number, number];

  shirtColorOverride?: string;
  shirtText?: string;
  shirtTextColor?: string;
  shirtTextSegments?: { text: string; color: string }[];

  faceImageUrl?: string;
};

export const ITEMS: Item[] = [
  // ===== HATS =====
  {
    id: "hat-vox-cooks",
    name: "Vox Cooks Skater Cap",
    description:
      "The first item ever created for Voxelio. Rock the original Vox Cooks cap and represent the community.",
    price: 20,
    category: "hats",
    rarity: "legendary",
    previewEmoji: "🧢",
    creator: "Voxelio",
  },
  {
    id: "hat-vox-sign",
    name: "Vox Cooks Wooden Sign",
    description:
      "A rustic wooden sign that sits on top of your head. Clearly marks you as a Vox Cooks enthusiast.",
    price: 25,
    category: "hats",
    rarity: "rare",
    previewEmoji: "🪧",
    creator: "Voxelio",
  },
  {
    id: "hat-vox-cooks-beanie",
    name: "Vox Cooks Beanie",
    description:
      "A snug black ribbed beanie with the Vox Cooks logo stitched across the fold in purple. Warm, cosy, and iconic.",
    price: 55,
    category: "hats",
    rarity: "epic",
    previewEmoji: "🧶",
    creator: "Voxelio",
  },
  {
    id: "hat-vox-halloween",
    name: "Vox Halloween Hat",
    description: "A spooky Halloween-themed hat. Perfect for October.",
    price: 100,
    category: "hats",
    rarity: "epic",
    previewEmoji: "🎃",
    creator: "Voxelio",
    modelPath: "/models/Vox_Haloween.glb",
    modelScale: 1,
    modelOffset: [0, 0, 0],
    modelRotation: [0, 0, 0],
  },

  // ===== HEADS =====
  {
    id: "head-round",
    name: "Round Head",
    description:
      "A smooth, circular head. Free to claim — unlocks the Round Head in your avatar editor.",
    price: 0,
    category: "heads",
    rarity: "common",
    previewEmoji: "🟠",
    creator: "Voxelio",
  },
  {
    id: "head-headless",
    name: "Headless Head",
    description:
      "No head at all. Your hat floats mysteriously in mid-air. Yours for 150k.",
    price: 150000,
    category: "heads",
    rarity: "rare",
    previewEmoji: "👻",
    creator: "Voxelio",
  },

  // ===== SHIRTS =====
  {
    id: "shirt-vox-cooks",
    name: "Vox Cooks Tee",
    description:
      "A black tee with the Vox Cooks logo in purple, sitting in the top-right corner. Represent the community.",
    price: 5,
    category: "outfits",
    rarity: "rare",
    previewEmoji: "👕",
    creator: "Voxelio",
    shirtColorOverride: "#0A0A0A",
  },
  {
    id: "shirt-suit",
    name: "Business Suit",
    description:
      "A sharp dark suit with a crisp white shirt and a bold red tie. Look the part.",
    price: 0,
    category: "outfits",
    rarity: "epic",
    previewEmoji: "🕴️",
    creator: "Voxelio",
    shirtColorOverride: "#1A1A2E",
  },
  {
    id: "shirt-i-love-vox",
    name: "I HEART VOX",
    description:
      "A clean white shirt with \"I HEART VOX\" printed across the chest. Show the world you love Voxelio.",
    price: 50,
    category: "outfits",
    rarity: "rare",
    previewEmoji: "❤️",
    creator: "Voxelio",
    shirtColorOverride: "#FFFFFF",
    shirtTextSegments: [
      { text: "I", color: "#000000" },
      { text: " HEART", color: "#E11D48" },
      { text: " VOX", color: "#7B2FF7" },
    ],
  },

  // ===== ACCESSORIES =====
  {
    id: "accessory-vox-sword",
    name: "Vox Sword",
    description:
      "A classic voxel sword — silver blade, gold guard, and a sturdy wooden grip. Yours to wield.",
    price: 75,
    category: "accessories",
    rarity: "rare",
    previewEmoji: "⚔️",
    creator: "Voxelio",
  },

  // ===== FACES =====
  {
    id: "face-silly",
    name: "Silly Face",
    description: "A goofy face to make everyone laugh.",
    price: 25,
    category: "faces",
    rarity: "rare",
    previewEmoji: "😜",
    creator: "Voxelio",
    faceImageUrl: "/faces/silly-face.png",
  },
  {
    id: "face-casual",
    name: "Casual Face",
    description: "A relaxed, easy-going face. Perfect for everyday exploring.",
    price: 25,
    category: "faces",
    rarity: "rare",
    previewEmoji: "🙂",
    creator: "Voxelio",
    faceImageUrl: "/faces/casual-person.png",
  },
  {
    id: "face-golden-times",
    name: "Face of Golden Times",
    description:
      "A radiant golden face that glows with nostalgia. For those who remember the golden era of Voxelio.",
    price: 250,
    category: "faces",
    rarity: "epic",
    previewEmoji: "🌟",
    creator: "Voxelio",
    faceImageUrl: "/faces/face-of-golden-times.png",
  },
  {
    id: "face-yellow-sparkle-times",
    name: "Face of Yellow Sparkle Times",
    description:
      "A cheerful yellow face covered in sparkles. Bright, happy, and impossible to miss.",
    price: 250,
    category: "faces",
    rarity: "epic",
    previewEmoji: "✨",
    creator: "Voxelio",
    faceImageUrl: "/faces/face-of-yellow-sparkle-times.png",
  },
];

export function getItem(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}

// ============ SLUG HELPERS ============
export function slugify(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "");
}

export function getItemBySlug(slug: string): Item | undefined {
  if (!slug) return undefined;
  const decoded = decodeURIComponent(slug).toLowerCase();
  return ITEMS.find((i) => slugify(i.name).toLowerCase() === decoded);
}

export function getItemsByCategory(category: string): Item[] {
  if (category === "all" || category === "featured") return ITEMS;
  return ITEMS.filter((i) => i.category === category);
}

export function getHats(): Item[] {
  return ITEMS.filter((i) => i.category === "hats");
}

export function getShirts(): Item[] {
  return ITEMS.filter((i) => i.category === "outfits");
}

export function getHeads(): Item[] {
  return ITEMS.filter((i) => i.category === "heads");
}

export function getAccessories(): Item[] {
  return ITEMS.filter((i) => i.category === "accessories");
}

export function getFaces(): Item[] {
  return ITEMS.filter((i) => i.category === "faces");
}

export function getHair(): Item[] {
  return ITEMS.filter((i) => i.category === "hair");
}

export const RARITY_LABELS: Record<ItemRarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "#9CA3AF",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
};