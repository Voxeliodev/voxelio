"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getCurrentUser, buyItem, formatVoxbux, type User } from "../../lib/auth";
import ItemPreview from "./ItemPreview";
import { RARITY_LABELS, RARITY_COLORS, type Item } from "../../lib/items";

export default function ItemModal({
  item,
  onClose,
  onPurchase,
}: {
  item: Item;
  onClose: () => void;
  onPurchase: () => void;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  const refreshUser = () => setCurrentUser(getCurrentUser());

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleBuy = () => {
    if (!currentUser) {
      showToast("error", "Sign in to buy items.");
      return;
    }
    if (item.forSale === false) {
      showToast("error", "This item is no longer for sale.");
      return;
    }
    const result = buyItem(currentUser.id, item.id, item.price);
    if (result.success) {
      showToast("success", `Purchased ${item.name}! You now have ${formatVoxbux(result.newBalance ?? 0)}.`);
      refreshUser();
      onPurchase();
    } else {
      showToast("error", result.error || "Purchase failed.");
    }
  };

  const owned = currentUser?.ownedItems.includes(item.id) || false;
  const canAfford = (currentUser?.voxbux ?? 0) >= item.price;
  const offSale = item.forSale === false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded shadow-lg text-white text-sm font-bold ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div
        className="bg-[#EEF0F7] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#6C3CE0] to-[#5A2FC7] px-4 py-3 flex items-center justify-between sticky top-0 z-10 border-b-2 border-[#4A1FA8]">
          <h2 className="text-white font-black text-lg truncate">{item.name}</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl font-black leading-none px-2 hover:bg-white/10 rounded transition"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-4">
          <div className="lg:col-span-3">
            <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <ItemPreview item={item} size={380} />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <div className="p-3 border-b border-[#E5E7F0]">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase"
                    style={{ backgroundColor: RARITY_COLORS[item.rarity] }}
                  >
                    {RARITY_LABELS[item.rarity]}
                  </span>
                  <span className="text-[10px] font-bold text-[#666] uppercase">
                    {item.category}
                  </span>
                  {offSale && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500 text-white uppercase">
                      Off Sale
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#E5E7F0]">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-[#6C3CE0] to-[#5A2FC7] flex items-center justify-center text-white text-sm font-black">
                    ◆
                  </div>
                  <div>
                    <p className="text-[10px] text-[#888] uppercase font-bold">Created by</p>
                    <p className="text-sm font-black text-[#4A1FA8]">{item.creator}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-3">
                <div>
                  <p className="text-[10px] text-[#888] uppercase font-bold mb-1">Price</p>
                  <p
                    className={`text-3xl font-black ${
                      offSale ? "text-red-500" : "text-[#FFD700]"
                    }`}
                  >
                    {offSale
                      ? "Off Sale"
                      : item.price === 0
                      ? "FREE"
                      : `${item.price} V$`}
                  </p>
                  {currentUser && !offSale && (
                    <p className="text-xs text-[#666] mt-1">
                      Your balance: <strong className="text-[#4A1FA8]">{formatVoxbux(currentUser.voxbux)}</strong>
                    </p>
                  )}
                </div>

                {owned ? (
                  <div className="space-y-2">
                    <div className="bg-green-50 border-2 border-green-300 rounded p-2 text-center">
                      <p className="text-xs font-bold text-green-700">✓ You own this item</p>
                    </div>
                    <Link
                      href="/avatar"
                      className="block text-center w-full bg-gradient-to-b from-[#22C55E] to-[#16A34A] text-white font-black text-sm py-2.5 rounded border-2 border-[#15803D] hover:from-[#4ADE80] hover:to-[#22C55E] transition shadow-md"
                    >
                      🎨 Equip
                    </Link>
                  </div>
                ) : offSale ? (
                  <div className="bg-red-50 border-2 border-red-300 rounded p-3 text-center">
                    <p className="text-xs font-bold text-red-700">
                      🚫 This item is no longer available for purchase.
                    </p>
                  </div>
                ) : !currentUser ? (
                  <Link
                    href="/signin"
                    className="block text-center w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-black text-sm py-2.5 rounded border-2 border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition shadow-md"
                  >
                    🔒 Sign In to Buy
                  </Link>
                ) : (
                  <button
                    onClick={handleBuy}
                    disabled={!canAfford}
                    className={`w-full font-black text-sm py-2.5 rounded border-2 transition shadow-md ${
                      canAfford
                        ? "bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7]"
                        : "bg-[#EEF0F7] text-[#888] border-[#C5C8D6] cursor-not-allowed"
                    }`}
                  >
                    {canAfford ? `🛒 Buy for ${item.price} V$` : "Not Enough Voxbux"}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <div className="bg-[#6C3CE0] text-white text-xs font-bold px-3 py-2 border-b border-[#4A1FA8]">
                Description
              </div>
              <div className="p-3">
                <p className="text-xs text-[#1A1A2E] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <div className="bg-[#6C3CE0] text-white text-xs font-bold px-3 py-2 border-b border-[#4A1FA8]">
                ℹ️ Details
              </div>
              <ul className="p-3 text-[11px] text-[#666] space-y-1.5">
                <li className="flex items-start gap-2">
                  <span>✅</span>
                  <span>Created by <strong className="text-[#4A1FA8]">{item.creator}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span>{offSale ? "🚫" : "🔒"}</span>
                  <span>{offSale ? "No longer available for purchase" : "Yours forever after purchase"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>🎨</span>
                  <span>Equip from your Avatar Editor</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-[#C5C8D6] bg-white/50 text-center text-[10px] text-[#888]">
          Press <kbd className="px-1.5 py-0.5 bg-[#EEF0F7] border border-[#C5C8D6] rounded font-mono">ESC</kbd> or click outside to close
        </div>
      </div>
    </div>
  );
}