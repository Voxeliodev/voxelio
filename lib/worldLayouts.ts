// ============================================================
// VOXELIO WORLD LAYOUTS
// ============================================================
// Each layout defines what a world looks like in-game:
// ground color + a list of blocks (position, size, color).
// The game page picks the layout based on world.layout.

export type BlockData = {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
};

export type Layout = {
  groundColor: string;
  blocks: BlockData[];
};

// ---------- Plaza — the town square ----------
const PLAZA: Layout = {
  groundColor: "#94A3B8",
  blocks: [
    // Central fountain
    { position: [0, 0.5, 0], size: [4, 1, 4], color: "#64748B" },
    { position: [0, 1.5, 0], size: [3, 1.5, 3], color: "#38BDF8" },
    { position: [0, 2.7, 0], size: [1, 1, 1], color: "#0EA5E9" },
    // Benches around
    { position: [8, 0.4, 4], size: [3, 0.6, 1], color: "#A16207" },
    { position: [-8, 0.4, 4], size: [3, 0.6, 1], color: "#A16207" },
    { position: [8, 0.4, -4], size: [3, 0.6, 1], color: "#A16207" },
    { position: [-8, 0.4, -4], size: [3, 0.6, 1], color: "#A16207" },
    // Stage
    { position: [0, 0.5, -18], size: [12, 1, 6], color: "#7B2FF7" },
    { position: [0, 1.5, -18], size: [10, 1, 4], color: "#6C3CE0" },
    // Street lamps (thin poles)
    { position: [12, 2, 0], size: [0.4, 4, 0.4], color: "#1A1A2E" },
    { position: [-12, 2, 0], size: [0.4, 4, 0.4], color: "#1A1A2E" },
    { position: [12, 2, -12], size: [0.4, 4, 0.4], color: "#1A1A2E" },
    { position: [-12, 2, -12], size: [0.4, 4, 0.4], color: "#1A1A2E" },
    // Planters
    { position: [5, 0.6, 8], size: [2, 1.2, 2], color: "#22C55E" },
    { position: [-5, 0.6, 8], size: [2, 1.2, 2], color: "#22C55E" },
  ],
};

// ---------- Sky Islands — floating platforms ----------
const SKY: Layout = {
  groundColor: "#60A5FA",
  blocks: [
    // Main island (very large, low)
    { position: [0, -0.5, 0], size: [30, 1, 30], color: "#22C55E" },
    // Stepping platforms upward
    { position: [10, 3, 10], size: [5, 0.6, 5], color: "#22C55E" },
    { position: [16, 6, 6], size: [5, 0.6, 5], color: "#22C55E" },
    { position: [20, 9, 0], size: [5, 0.6, 5], color: "#22C55E" },
    { position: [16, 12, -6], size: [5, 0.6, 5], color: "#22C55E" },
    { position: [10, 15, -10], size: [5, 0.6, 5], color: "#22C55E" },
    { position: [0, 18, -12], size: [6, 0.6, 6], color: "#FBBF24" }, // top island (golden)
    // Small side platform
    { position: [-12, 4, 8], size: [4, 0.6, 4], color: "#22C55E" },
    { position: [-18, 7, 4], size: [4, 0.6, 4], color: "#22C55E" },
    // Jump pads (bright colored low blocks)
    { position: [4, 0.2, -8], size: [2, 0.4, 2], color: "#EC4899" },
    { position: [-6, 0.2, -6], size: [2, 0.4, 2], color: "#EC4899" },
  ],
};

// ---------- Obby — linear obstacle course ----------
const OBBY: Layout = {
  groundColor: "#7F1D1D",
  blocks: [
    // Start platform
    { position: [0, 0.5, 10], size: [6, 1, 6], color: "#3B82F6" },
    // Sequence of small platforms going up and forward
    { position: [4, 2, 5], size: [2, 1, 2], color: "#EF4444" },
    { position: [-2, 4, 2], size: [2, 1, 2], color: "#EF4444" },
    { position: [4, 6, -2], size: [2, 1, 2], color: "#F97316" },
    { position: [-4, 8, -6], size: [2, 1, 2], color: "#F97316" },
    { position: [2, 10, -10], size: [2, 1, 2], color: "#FFD700" },
    { position: [-2, 12, -14], size: [2, 1, 2], color: "#FFD700" },
    // Finish (big golden platform)
    { position: [0, 14, -20], size: [6, 1, 6], color: "#F59E0B" },
    // Side decorations (spikes / obstacles)
    { position: [6, 1, 0], size: [1, 2, 1], color: "#1A1A2E" },
    { position: [-6, 1, -4], size: [1, 2, 1], color: "#1A1A2E" },
    { position: [7, 1, -8], size: [1, 2, 1], color: "#1A1A2E" },
  ],
};

// ---------- Tycoon — long factory / conveyor ----------
const TYCOON: Layout = {
  groundColor: "#78716C",
  blocks: [
    // Floor grid of conveyor-like strips
    { position: [-6, 0.3, 0], size: [4, 0.6, 40], color: "#4B5563" },
    { position: [0, 0.3, 0], size: [4, 0.6, 40], color: "#4B5563" },
    { position: [6, 0.3, 0], size: [4, 0.6, 40], color: "#4B5563" },
    // Machinery blocks
    { position: [-6, 1.5, 10], size: [3, 3, 3], color: "#DC2626" },
    { position: [0, 1.5, 10], size: [3, 3, 3], color: "#DC2626" },
    { position: [6, 1.5, 10], size: [3, 3, 3], color: "#DC2626" },
    { position: [-6, 1.5, -10], size: [3, 3, 3], color: "#0EA5E9" },
    { position: [0, 1.5, -10], size: [3, 3, 3], color: "#0EA5E9" },
    { position: [6, 1.5, -10], size: [3, 3, 3], color: "#0EA5E9" },
    // Office (tall central building)
    { position: [0, 3, 0], size: [4, 6, 4], color: "#FCD34D" },
    { position: [0, 6.5, 0], size: [5, 1, 5], color: "#F59E0B" },
  ],
};

// ---------- Horror — enclosed creepy manor ----------
const HORROR: Layout = {
  groundColor: "#1F2937",
  blocks: [
    // Outer walls
    { position: [0, 2, 20], size: [40, 4, 1], color: "#111827" },
    { position: [0, 2, -20], size: [40, 4, 1], color: "#111827" },
    { position: [20, 2, 0], size: [1, 4, 40], color: "#111827" },
    { position: [-20, 2, 0], size: [1, 4, 40], color: "#111827" },
    // Inner rooms
    { position: [-5, 1.5, 5], size: [12, 3, 1], color: "#1F2937" },
    { position: [10, 1.5, -8], size: [1, 3, 14], color: "#1F2937" },
    { position: [-8, 1.5, -10], size: [14, 3, 1], color: "#1F2937" },
    // Gravestones / small blocks
    { position: [-14, 0.75, 14], size: [1, 1.5, 1], color: "#6B7280" },
    { position: [14, 0.75, 14], size: [1, 1.5, 1], color: "#6B7280" },
    { position: [-14, 0.75, -14], size: [1, 1.5, 1], color: "#6B7280" },
    { position: [14, 0.75, -14], size: [1, 1.5, 1], color: "#6B7280" },
  ],
};

// ---------- PvP — arena with cover ----------
const PVP: Layout = {
  groundColor: "#374151",
  blocks: [
    // Arena walls
    { position: [0, 3, 20], size: [40, 6, 1], color: "#7F1D1D" },
    { position: [0, 3, -20], size: [40, 6, 1], color: "#7F1D1D" },
    { position: [20, 3, 0], size: [1, 6, 40], color: "#7F1D1D" },
    { position: [-20, 3, 0], size: [1, 6, 40], color: "#7F1D1D" },
    // Cover blocks (scattered)
    { position: [4, 1, 4], size: [2, 2, 2], color: "#4B5563" },
    { position: [-4, 1, -4], size: [2, 2, 2], color: "#4B5563" },
    { position: [8, 1, -8], size: [2, 2, 2], color: "#4B5563" },
    { position: [-8, 1, 8], size: [2, 2, 2], color: "#4B5563" },
    { position: [0, 2, 12], size: [6, 4, 2], color: "#4B5563" },
    { position: [0, 2, -12], size: [6, 4, 2], color: "#4B5563" },
    { position: [12, 2, 0], size: [2, 4, 6], color: "#4B5563" },
    { position: [-12, 2, 0], size: [2, 4, 6], color: "#4B5563" },
    // Center tower
    { position: [0, 3, 0], size: [3, 6, 3], color: "#DC2626" },
  ],
};

// ---------- Racing — track with walls ----------
const RACING: Layout = {
  groundColor: "#0F172A",
  blocks: [
    // Track surface (long oval strip — approximated with boxes)
    { position: [0, 0.2, 0], size: [50, 0.4, 8], color: "#1E293B" },
    { position: [0, 0.2, 0], size: [8, 0.4, 50], color: "#1E293B" },
    // Outer walls
    { position: [0, 1, 25], size: [50, 2, 1], color: "#EC4899" },
    { position: [0, 1, -25], size: [50, 2, 1], color: "#EC4899" },
    { position: [25, 1, 0], size: [1, 2, 50], color: "#EC4899" },
    { position: [-25, 1, 0], size: [1, 2, 50], color: "#EC4899" },
    // Center island
    { position: [0, 0.5, 0], size: [10, 1, 10], color: "#0EA5E9" },
    // Neon poles around track
    { position: [20, 3, 20], size: [0.4, 6, 0.4], color: "#00B8D4" },
    { position: [-20, 3, 20], size: [0.4, 6, 0.4], color: "#00B8D4" },
    { position: [20, 3, -20], size: [0.4, 6, 0.4], color: "#00B8D4" },
    { position: [-20, 3, -20], size: [0.4, 6, 0.4], color: "#00B8D4" },
  ],
};

// ---------- Parkour — rooftops ----------
const PARKOUR: Layout = {
  groundColor: "#1E293B",
  blocks: [
    // Starting rooftop
    { position: [0, 4, 20], size: [8, 1, 8], color: "#DC2626" },
    // Sequence of rooftops
    { position: [6, 6, 14], size: [5, 1, 5], color: "#F97316" },
    { position: [-4, 8, 10], size: [5, 1, 5], color: "#FBBF24" },
    { position: [6, 10, 4], size: [5, 1, 5], color: "#84CC16" },
    { position: [-6, 12, -2], size: [5, 1, 5], color: "#22C55E" },
    { position: [4, 14, -8], size: [5, 1, 5], color: "#14B8A6" },
    { position: [-4, 16, -14], size: [5, 1, 5], color: "#06B6D4" },
    // Finish
    { position: [0, 18, -20], size: [8, 1, 8], color: "#6C3CE0" },
    // Ground obstacles
    { position: [8, 1, 0], size: [3, 2, 3], color: "#4B5563" },
    { position: [-8, 1, -4], size: [3, 2, 3], color: "#4B5563" },
  ],
};

// ---------- Underwater — coral pillars ----------
const UNDERWATER: Layout = {
  groundColor: "#0C4A6E",
  blocks: [
    // Coral pillars of varying heights
    { position: [10, 2, 10], size: [2, 4, 2], color: "#F472B6" },
    { position: [-10, 3, 8], size: [2, 6, 2], color: "#FB923C" },
    { position: [8, 4, -12], size: [3, 8, 3], color: "#FCD34D" },
    { position: [-12, 2.5, -10], size: [2, 5, 2], color: "#F472B6" },
    { position: [15, 1.5, 0], size: [2, 3, 2], color: "#FB923C" },
    { position: [-15, 3.5, 0], size: [2, 7, 2], color: "#FCD34D" },
    // Seaweed (thin tall)
    { position: [4, 3, 15], size: [0.6, 6, 0.6], color: "#22C55E" },
    { position: [-4, 3, 15], size: [0.6, 6, 0.6], color: "#16A34A" },
    { position: [6, 4, -18], size: [0.6, 8, 0.6], color: "#22C55E" },
    // Big rock
    { position: [0, 2, -10], size: [8, 4, 6], color: "#155E75" },
  ],
};

// ---------- Zombie — abandoned buildings ----------
const ZOMBIE: Layout = {
  groundColor: "#3F3F46",
  blocks: [
    // Buildings (tall, varied)
    { position: [10, 5, 10], size: [6, 10, 6], color: "#52525B" },
    { position: [-10, 4, 12], size: [6, 8, 6], color: "#52525B" },
    { position: [12, 6, -10], size: [8, 12, 6], color: "#3F3F46" },
    { position: [-12, 3, -10], size: [6, 6, 6], color: "#52525B" },
    // Barricades (low walls)
    { position: [0, 1, 0], size: [10, 2, 1], color: "#78716C" },
    { position: [-3, 1, 4], size: [1, 2, 8], color: "#78716C" },
    { position: [5, 1, -4], size: [1, 2, 8], color: "#78716C" },
    // Scattered debris
    { position: [6, 0.5, 6], size: [2, 1, 2], color: "#57534E" },
    { position: [-6, 0.5, 6], size: [1.5, 1, 1.5], color: "#57534E" },
    { position: [0, 0.5, -8], size: [2, 1, 2], color: "#57534E" },
  ],
};

// ---------- Candy — colorful stacked blocks ----------
const CANDY: Layout = {
  groundColor: "#FBCFE8",
  blocks: [
    // Candy cane columns
    { position: [10, 3, 10], size: [1.5, 6, 1.5], color: "#FFFFFF" },
    { position: [10, 4.5, 10], size: [2, 1, 2], color: "#EF4444" },
    { position: [-10, 3, 10], size: [1.5, 6, 1.5], color: "#EF4444" },
    { position: [-10, 4.5, 10], size: [2, 1, 2], color: "#FFFFFF" },
    // Big lollipops
    { position: [0, 1.5, -12], size: [0.5, 3, 0.5], color: "#FFFFFF" },
    { position: [0, 4, -12], size: [3, 3, 3], color: "#EC4899" },
    { position: [12, 1.5, -6], size: [0.5, 3, 0.5], color: "#FFFFFF" },
    { position: [12, 4, -6], size: [3, 3, 3], color: "#A855F7" },
    { position: [-12, 1.5, -6], size: [0.5, 3, 0.5], color: "#FFFFFF" },
    { position: [-12, 4, -6], size: [3, 3, 3], color: "#FBBF24" },
    // Candy blocks
    { position: [6, 1, 0], size: [2, 2, 2], color: "#A855F7" },
    { position: [-6, 1, 0], size: [2, 2, 2], color: "#22C55E" },
    { position: [0, 1, 0], size: [3, 2, 3], color: "#FBBF24" },
  ],
};

// ---------- Space — metallic platforms ----------
const SPACE: Layout = {
  groundColor: "#0F172A",
  blocks: [
    // Main metallic platform
    { position: [0, -0.5, 0], size: [24, 1, 24], color: "#334155" },
    { position: [0, 0.1, 0], size: [22, 0.3, 22], color: "#475569" },
    // Floating panels
    { position: [10, 4, 10], size: [4, 0.4, 4], color: "#38BDF8" },
    { position: [-10, 5, 8], size: [4, 0.4, 4], color: "#38BDF8" },
    { position: [8, 7, -10], size: [4, 0.4, 4], color: "#818CF8" },
    { position: [-8, 3, -10], size: [4, 0.4, 4], color: "#818CF8" },
    // Satellite / tower
    { position: [0, 2, 0], size: [1.5, 4, 1.5], color: "#64748B" },
    { position: [0, 4.5, 0], size: [3, 1, 3], color: "#22D3EE" },
    // Star decorations (small glowing pillars)
    { position: [12, 2, 0], size: [0.4, 4, 0.4], color: "#F0ABFC" },
    { position: [-12, 2, 0], size: [0.4, 4, 0.4], color: "#F0ABFC" },
  ],
};

// ============================================================
// REGISTRY
// ============================================================
export const LAYOUTS: Record<string, Layout> = {
  plaza: PLAZA,
  sky: SKY,
  obby: OBBY,
  tycoon: TYCOON,
  horror: HORROR,
  pvp: PVP,
  racing: RACING,
  parkour: PARKOUR,
  underwater: UNDERWATER,
  zombie: ZOMBIE,
  candy: CANDY,
  space: SPACE,
};

export function getLayout(layoutId: string | undefined | null): Layout {
  if (!layoutId) return LAYOUTS.plaza;
  return LAYOUTS[layoutId] || LAYOUTS.plaza;
}

// Options shown in the create page picker
export const LAYOUT_OPTIONS: {
  id: string;
  name: string;
  emoji: string;
  description: string;
  accent: string;
}[] = [
  { id: "plaza", name: "Plaza", emoji: "🏙️", description: "Town square with a fountain and benches", accent: "#7B2FF7" },
  { id: "sky", name: "Sky Islands", emoji: "🏝️", description: "Floating platforms to jump between", accent: "#22C55E" },
  { id: "obby", name: "Obby Course", emoji: "🏃", description: "Linear obstacle course rising upward", accent: "#EF4444" },
  { id: "tycoon", name: "Tycoon", emoji: "💰", description: "Factory floor with machinery", accent: "#FFD700" },
  { id: "horror", name: "Horror", emoji: "👻", description: "Dark enclosed manor with rooms", accent: "#4B5563" },
  { id: "pvp", name: "PvP Arena", emoji: "⚔️", description: "Walled arena with cover blocks", accent: "#DC2626" },
  { id: "racing", name: "Racing", emoji: "🏎️", description: "Oval track with neon walls", accent: "#EC4899" },
  { id: "parkour", name: "Parkour", emoji: "🧱", description: "Rooftops at increasing heights", accent: "#F97316" },
  { id: "underwater", name: "Underwater", emoji: "🐠", description: "Coral pillars and seaweed", accent: "#0EA5E9" },
  { id: "zombie", name: "Zombie", emoji: "🧟", description: "Abandoned buildings and barricades", accent: "#7F1D1D" },
  { id: "candy", name: "Candy", emoji: "🍭", description: "Sweet pink world with lollipops", accent: "#F472B6" },
  { id: "space", name: "Space", emoji: "🚀", description: "Metallic station with floating panels", accent: "#38BDF8" },
];