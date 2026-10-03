"use client";

import { getAxe, formatCoins, type AxeId } from "../../../lib/lumberyard";

// ============================================================
// LUMBER HUD — top bar with coins, current axe, equipped log
// ============================================================

type Props = {
  lumbercoins: number;
  currentAxe: AxeId;
  equippedLog: { value: number; treeType: string } | null;
  onOpenShop: () => void;
  message: string | null;
};

export default function LumberHud({
  lumbercoins,
  currentAxe,
  equippedLog,
  onOpenShop,
  message,
}: Props) {
  const axe = getAxe(currentAxe);

  return (
    <>
      {/* ===== TOP-LEFT: Coins + Axe ===== */}
      <div className="absolute top-20 left-3 z-30 flex flex-col gap-2">
        <div className="bg-black/70 backdrop-blur rounded-lg border-2 border-[#FBBF24] px-4 py-2 shadow-lg">
          <div className="text-[10px] text-white/60 uppercase font-bold tracking-wide">
            Lumbercoins
          </div>
          <div className="text-2xl font-black text-[#FBBF24] tabular-nums">
            🪙 {formatCoins(lumbercoins)}
          </div>
        </div>

        <div className="bg-black/70 backdrop-blur rounded-lg border-2 border-[#6C3CE0] px-3 py-2 shadow-lg flex items-center gap-2">
          <span className="text-2xl">{axe.emoji}</span>
          <div>
            <div className="text-[10px] text-white/60 uppercase font-bold tracking-wide">
              Current Axe
            </div>
            <div className="text-sm font-black text-white">{axe.name}</div>
          </div>
        </div>
      </div>

      {/* ===== TOP-RIGHT: Equipped log + Shop button ===== */}
      <div className="absolute top-20 right-3 z-30 flex flex-col gap-2 items-end">
        {equippedLog ? (
          <div className="bg-black/70 backdrop-blur rounded-lg border-2 border-[#22C55E] px-4 py-2 shadow-lg">
            <div className="text-[10px] text-white/60 uppercase font-bold tracking-wide">
              Carrying Log
            </div>
            <div className="text-lg font-black text-[#22C55E]">
              🪵 {equippedLog.treeType} · {formatCoins(equippedLog.value)}🪙
            </div>
            <div className="text-[10px] text-white/60 mt-1">
              Walk to sawmill → press E to sell
            </div>
          </div>
        ) : (
          <div className="bg-black/50 backdrop-blur rounded-lg border border-white/20 px-4 py-2 text-white/60 text-xs">
            🪵 No log equipped
          </div>
        )}

        <button
          onClick={onOpenShop}
          className="bg-gradient-to-b from-[#FBBF24] to-[#E08A1C] hover:from-[#FCD34D] hover:to-[#F09A2C] text-[#1A1A2E] font-black text-sm px-5 py-2.5 rounded-lg border-2 border-[#A8680C] shadow-lg transition"
        >
          🛒 Axe Shop
        </button>
      </div>

      {/* ===== CENTER: Toast message ===== */}
      {message && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
          <div className="bg-black/80 backdrop-blur rounded-lg border-2 border-white/30 px-6 py-3 text-white font-bold text-base shadow-2xl animate-pulse">
            {message}
          </div>
        </div>
      )}

      {/* ===== BOTTOM-CENTER: Controls hint ===== */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden md:block">
        <div className="bg-black/60 backdrop-blur rounded-full border border-white/20 px-4 py-1.5 text-white/70 text-[11px] flex items-center gap-3">
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded">Click tree</kbd> Chop</span>
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded">E</kbd> Pick up / Sell log</span>
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded">WASD</kbd> Move</span>
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded">Space</kbd> Jump</span>
        </div>
      </div>
    </>
  );
}