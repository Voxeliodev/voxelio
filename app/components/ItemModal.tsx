"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getCurrentUser, buyItem, formatVoxbux, type User } from "../../lib/auth";
import ItemPreview from "./ItemPreview";
import { RARITY_LABELS, RARITY_COLORS, type Item } from "../../lib/items";
import { supabase } from "../../lib/supabase";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ============================================================
// Shared texture loader for community shirts
// ============================================================
const CELL_W = 1 / 3;
const CELL_H = 1 / 3;
const INSET_X = 0.10;
const INSET_TOP = 0.22;
const INSET_BOT = 0.10;

let communityCache: Record<string, THREE.Texture> = {};

function useShirtTexture(imageUrl: string | undefined): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(() => {
    if (!imageUrl) return null;
    return communityCache[imageUrl] || null;
  });

  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      return;
    }
    if (communityCache[imageUrl]) {
      setTexture(communityCache[imageUrl]);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      communityCache[imageUrl] = tex;
      setTexture(tex);
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return texture;
}

function applyCellUV(tex: THREE.Texture, col: 0 | 1 | 2, row: 0 | 1 | 2) {
  const u0 = col * CELL_W + INSET_X * CELL_W;
  const u1 = (col + 1) * CELL_W - INSET_X * CELL_W;

  const rowFromBottom = 2 - row;
  const cellV0 = rowFromBottom * CELL_H;
  const cellV1 = (rowFromBottom + 1) * CELL_H;

  const topInset = INSET_TOP * CELL_H;
  const botInset = INSET_BOT * CELL_H;

  const v0 = cellV0 + botInset;
  const v1 = cellV1 - topInset;

  tex.offset.set(u0, v0);
  tex.repeat.set(u1 - u0, v1 - v0);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
}

// ============================================================
// 3D COMMUNITY SHIRT PREVIEW
// ============================================================
function CommunityShirt3DPreview({ imageUrl }: { imageUrl: string }) {
  const texture = useShirtTexture(imageUrl);

  if (!texture) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#888] text-xs">
        Loading texture…
      </div>
    );
  }

  const torsoSize: [number, number, number] = [0.9, 1, 0.5];
  const torsoPosition: [number, number, number] = [0, 0.1, 0];

  const [w, h, d] = torsoSize;

  // Build face textures
  const frontTex = texture.clone(); applyCellUV(frontTex, 1, 1); frontTex.needsUpdate = true;
  const backTex = texture.clone(); applyCellUV(backTex, 1, 0); backTex.needsUpdate = true;
  const leftTex = texture.clone(); applyCellUV(leftTex, 0, 0); leftTex.needsUpdate = true;
  const rightTex = texture.clone(); applyCellUV(rightTex, 2, 0); rightTex.needsUpdate = true;
  const topTex = texture.clone(); applyCellUV(topTex, 0, 1); topTex.needsUpdate = true;
  const bottomTex = texture.clone(); applyCellUV(bottomTex, 0, 2); bottomTex.needsUpdate = true;

  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  // Sleeves — small textured boxes on either side
  const sleeveSize: [number, number, number] = [0.3, 0.4, 0.3];
  const sleeveOffsetY = 0.5; // near the top of the torso

  return (
    <group position={torsoPosition}>
      {/* TORSO — solid core + 6 textured planes */}
      <mesh castShadow>
        <boxGeometry args={torsoSize} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>

      <mesh position={[0, 0, hd + 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={frontTex} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, -hd - 0.002]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={backTex} roughness={0.7} />
      </mesh>
      <mesh position={[hw + 0.002, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial map={rightTex} roughness={0.7} />
      </mesh>
      <mesh position={[-hw - 0.002, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial map={leftTex} roughness={0.7} />
      </mesh>
      <mesh position={[0, hh + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={topTex} roughness={0.7} />
      </mesh>
      <mesh position={[0, -hh - 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={bottomTex} roughness={0.7} />
      </mesh>

      {/* LEFT SLEEVE */}
      <mesh position={[-hw - sleeveSize[0] / 2 - 0.01, sleeveOffsetY, 0]} castShadow>
        <boxGeometry args={sleeveSize} />
        <meshStandardMaterial map={leftTex} roughness={0.7} />
      </mesh>

      {/* RIGHT SLEEVE */}
      <mesh position={[hw + sleeveSize[0] / 2 + 0.01, sleeveOffsetY, 0]} castShadow>
        <boxGeometry args={sleeveSize} />
        <meshStandardMaterial map={rightTex} roughness={0.7} />
      </mesh>
    </group>
  );
}

// ============================================================
// MODAL COMPONENT
// ============================================================
export default function ItemModal({
  item,
  onClose,
  onPurchase,
  salesCount,
}: {
  item: Item;
  onClose: () => void;
  onPurchase: () => void;
  salesCount?: number;
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
  const isCommunityShirt = Boolean(item.imageUrl) && item.category === "outfits";

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
              {isCommunityShirt ? (
                /* 3D preview for community shirts */
                <div
                  className="w-full bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0]"
                  style={{ height: 380 }}
                >
                  <Canvas
                    camera={{ position: [0, 0.3, 2.8], fov: 45 }}
                    dpr={[1, 2]}
                    shadows
                  >
                    <ambientLight intensity={0.75} />
                    <directionalLight
                      position={[3, 5, 4]}
                      intensity={1.1}
                      castShadow
                    />
                    <directionalLight position={[-3, 2, -3]} intensity={0.45} />
                    <hemisphereLight args={["#ffffff", "#666680", 0.4]} />

                    <CommunityShirt3DPreview imageUrl={item.imageUrl!} />

                    <OrbitControls
                      enablePan={false}
                      enableZoom={false}
                      autoRotate
                      autoRotateSpeed={2}
                      minPolarAngle={Math.PI / 4}
                      maxPolarAngle={Math.PI / 1.8}
                    />
                  </Canvas>
                  <p className="text-center text-[10px] text-[#888] pb-2">
                    🖱️ Drag to rotate
                  </p>
                </div>
              ) : (
                /* Default preview for other items */
                <ItemPreview item={item} size={380} />
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
              <div className="p-3 border-b border-[#E5E7F0]">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
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

                {salesCount !== undefined && salesCount > 0 && (
                  <p className="text-[11px] text-[#FF6B6B] font-bold mt-1 mb-2">
                    🔥 {salesCount.toLocaleString()} sold
                  </p>
                )}

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