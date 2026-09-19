// ============================================================
// VOXELIO BODY PARTS
// Central registry for equippable body parts.
//
// Body parts are UNLOCKED by owning the matching item in the
// catalog (see lib/items.ts).
// ============================================================

export type BodyPartSlot =
  | "head"
  | "torso"
  | "leftArm"
  | "rightArm"
  | "leftLeg"
  | "rightLeg";

export const BODY_PART_SLOTS: {
  id: BodyPartSlot;
  name: string;
  emoji: string;
  color: string;
}[] = [
  { id: "head",      name: "Head",      emoji: "🧠", color: "#7B4FF7" },
  { id: "torso",     name: "Torso",     emoji: "👕", color: "#00D4FF" },
  { id: "leftArm",   name: "Left Arm",  emoji: "💪", color: "#FF6B35" },
  { id: "rightArm",  name: "Right Arm", emoji: "💪", color: "#FF6B35" },
  { id: "leftLeg",   name: "Left Leg",  emoji: "🦵", color: "#22C55E" },
  { id: "rightLeg",  name: "Right Leg", emoji: "🦵", color: "#22C55E" },
];

export type BodyPartRarity = "common" | "rare" | "epic" | "legendary";

export type BodyPart = {
  id: string;
  name: string;
  slot: BodyPartSlot;
  description: string;
  rarity: BodyPartRarity;
  modelPath?: string;
  modelScale?: number;
  modelOffset?: [number, number, number];
  modelRotation?: [number, number, number];
  builtIn?: boolean;
};

export const DEFAULT_PART_ID = "default";

// ============================================================
// REGISTERED BODY PARTS
// These IDs MUST match the item IDs in lib/items.ts exactly.
// ============================================================
export const BODY_PARTS: BodyPart[] = [
  {
    id: "head-round",
    name: "Round Head",
    slot: "head",
    description: "A smooth, circular head. Softer look than the default blocky shape.",
    rarity: "common",
    builtIn: true,
  },
  {
    id: "head-headless",
    name: "Headless Head",
    slot: "head",
    description: "No head at all. Your hat floats mysteriously in mid-air.",
    rarity: "rare",
    builtIn: true,
  },
];

// ============================================================
// HELPERS
// ============================================================
export function getBodyPartsForSlot(slot: BodyPartSlot): BodyPart[] {
  return BODY_PARTS.filter((p) => p.slot === slot);
}

export function getBodyPart(id: string): BodyPart | undefined {
  if (!id || id === DEFAULT_PART_ID) return undefined;
  return BODY_PARTS.find((p) => p.id === id);
}

export function isDefaultBodyPartId(id: string): boolean {
  return !id || id === DEFAULT_PART_ID;
}

export const DEFAULT_BODY_PARTS: Record<BodyPartSlot, string> = {
  head: DEFAULT_PART_ID,
  torso: DEFAULT_PART_ID,
  leftArm: DEFAULT_PART_ID,
  rightArm: DEFAULT_PART_ID,
  leftLeg: DEFAULT_PART_ID,
  rightLeg: DEFAULT_PART_ID,
};