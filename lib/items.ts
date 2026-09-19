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