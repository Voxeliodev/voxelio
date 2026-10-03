"use client";

import { AXES, getAxe, formatCoins, type AxeId } from "../../../lib/lumberyard";

// ============================================================
// AXE SHOP — modal with all axes
// ============================================================

type Props = {
  open: boolean;
  onClose: () => void;
  currentAxe: AxeId;
  lumbercoins: number;
  onBuy: (axeId: AxeId, price: number) => void;
};

export default function Shop({ open, onClose, currentAxe, lumbercoins, onBuy }: Props) {
  if (!open) return null;

  const currentIndex = AXES.findIndex((a) => a.id === currentAxe);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-[#1A1A2E] to-[#0A0A1E] rounded-2xl border-4 border-[#FBBF24] shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#FBBF24] to-[#E08A1C] px-5 py-3 flex items-center justify-between border-b-2 border-[#A8680C] z-10">
          <div>
            <h2 className="text-2xl font-black text-[#1A1A2E]">🪓 Axe Shop</h2>
            <p className="text-[11px] text-[#1A1A2E]/70 font-bold">
              Better axes = faster chopping + bigger trees
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#1A1A2E] hover:bg-black/10 rounded w-8 h-8 flex items-center justify-center text-2xl font-black"
          >
            ×
          </button>
        </div>

        {/* Balance */}
        <div className="px-5 py-3 bg-black/30 border-b border-white/10">
          <div className="text-center">
            <div className="text-[10px] text-white/60 uppercase font-bold tracking-wide">
              Your Lumbercoins
            </div>
            <div className="text-3xl font-black text-[#FBBF24] tabular-nums">
              🪙 {formatCoins(lumbercoins)}
            </div>
          </div>
        </div>

        {/* Axes list */}
        <div className="p-5 space-y-3">
          {AXES.map((axe, i) => {
            const owned = i <= currentIndex;
            const isCurrent = axe.id === currentAxe;
            const canAfford = lumbercoins >= axe.price;

            return (
              <div
                key={axe.id}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition ${
                  isCurrent
                    ? "bg-[#6C3CE0]/30 border-[#6C3CE0]"
                    : owned
                    ? "bg-[#22C55E]/10 border-[#22C55E]/40"
                    : canAfford
                    ? "bg-white/5 border-white/20 hover:border-[#FBBF24]"
                    : "bg-white/5 border-white/10"
                }`}
              >
                {/* Icon */}
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-4xl flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${axe.color} 0%, ${axe.bladeColor} 100%)`,
                  }}
                >
                  {axe.emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-white">{axe.name}</h3>
                    {isCurrent && (
                      <span className="text-[10px] font-black bg-[#6C3CE0] text-white px-2 py-0.5 rounded uppercase">
                        Equipped
                      </span>
                    )}
                    {owned && !isCurrent && (
                      <span className="text-[10px] font-black bg-[#22C55E] text-white px-2 py-0.5 rounded uppercase">
                        Owned
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4 mt-1 text-xs text-white/70">
                    <span>💥 {axe.damage} dmg</span>
                    <span>⏱️ {(axe.cooldownMs / 1000).toFixed(2)}s</span>
                  </div>

                  <div className="text-xs text-white/50 mt-1">
                    {i === 0 && "Basic starter — can chop small pines"}
                    {i === 1 && "Unlocks Oak trees"}
                    {i === 2 && "Unlocks Redwood trees"}
                    {i === 3 && "Unlocks Ancient Sequoia"}
                    {i === 4 && "Endgame axe — max power"}
                  </div>
                </div>

                {/* Price / Buy button */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {!owned && (
                    <>
                      <div className={`text-xl font-black tabular-nums ${canAfford ? "text-[#FBBF24]" : "text-red-400"}`}>
                        🪙 {formatCoins(axe.price)}
                      </div>
                      <button
                        onClick={() => onBuy(axe.id, axe.price)}
                        disabled={!canAfford}
                        className={`text-sm font-black px-4 py-2 rounded-lg border-2 transition ${
                          canAfford
                            ? "bg-gradient-to-b from-[#FBBF24] to-[#E08A1C] hover:from-[#FCD34D] hover:to-[#F09A2C] text-[#1A1A2E] border-[#A8680C]"
                            : "bg-[#EEF0F7]/20 text-white/40 border-white/10 cursor-not-allowed"
                        }`}
                      >
                        {canAfford ? "Buy" : "Locked"}
                      </button>
                    </>
                  )}
                  {isCurrent && (
                    <div className="text-[10px] font-bold text-[#6C3CE0] uppercase">
                      In Use
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-white/10 bg-black/20 text-center text-[11px] text-white/50">
          Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded">ESC</kbd> or click outside to close
        </div>
      </div>
    </div>
  );
}