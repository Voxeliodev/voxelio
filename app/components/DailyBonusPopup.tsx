"use client";

import { useEffect, useState } from "react";
import { consumeDailyBonusNotification } from "../../lib/auth";

export default function DailyBonusPopup() {
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    console.log("[DailyBonusPopup] mounted");
    const t = setTimeout(() => {
      const amt = consumeDailyBonusNotification();
      console.log("[DailyBonusPopup] consumed:", amt);
      if (amt) setAmount(amt);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (amount === null) return;
    const t = setTimeout(() => setAmount(null), 6000);
    return () => clearTimeout(t);
  }, [amount]);

  if (amount === null) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => setAmount(null)}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border-4 border-[#FFD700] animate-[popIn_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#FFB84D] to-[#E08A1C] px-4 py-3 border-b-2 border-[#A8680C] text-center">
          <h2 className="text-white font-black text-lg">🎁 Daily Bonus!</h2>
        </div>

        <div className="p-6 text-center">
          <div className="text-6xl mb-3">💰</div>
          <p className="text-sm text-[#666] mb-1">You received</p>
          <p className="text-4xl font-black text-[#FFD700] mb-3">
            +{amount} V$
          </p>
          <p className="text-xs text-[#888] mb-5">
            Come back in 24 hours for another bonus.
          </p>

          <button
            onClick={() => setAmount(null)}
            className="w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-black text-sm py-2.5 rounded border-2 border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition shadow-md"
          >
            Claim 🎉
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes popIn {
          0%   { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}