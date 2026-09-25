"use client";

import { useState, useEffect } from "react";
import * as THREE from "three";
import type { Item } from "../../lib/items";

// ============================================================
// ItemPreview — STATIC thumbnail version for the catalog grid.
// ============================================================
// Previously this rendered a full WebGL canvas per card, which
// exhausted the browser's context limit on pages with many items.
// Now every preview is a lightweight static image or emoji.
//
// Full 3D previews still run in the modal (ItemModal.tsx) where
// only ONE canvas is open at a time.
// ============================================================

function CategoryFallback({ emoji, size }: { emoji: string; size: number }) {
  return (
    <div
      className="w-full bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] flex items-center justify-center"
      style={{ height: size }}
    >
      <span style={{ fontSize: size * 0.4 }}>{emoji}</span>
    </div>
  );
}

function CommunityShirtPreview({ item, size }: { item: Item; size: number }) {
  return (
    <div
      className="w-full bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] flex items-center justify-center overflow-hidden"
      style={{ height: size }}
    >
      <div
        className="rounded shadow-md overflow-hidden"
        style={{
          width: size * 0.72,
          height: size * 0.72,
          backgroundImage: `url(${item.imageUrl})`,
          backgroundSize: "430% 430%",
          backgroundPosition: "50% 58%",
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
}

function FacePreview({ item, size }: { item: Item; size: number }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!item.faceImageUrl) return;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      item.faceImageUrl,
      (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      () => {}
    );
    return () => { cancelled = true; };
  }, [item.faceImageUrl]);

  // Faces already have an image URL — just show it directly as a static
  // image. No WebGL needed.
  if (item.faceImageUrl) {
    return (
      <div
        className="w-full bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] flex items-center justify-center overflow-hidden"
        style={{ height: size }}
      >
        <img
          src={item.faceImageUrl}
          alt={item.name}
          className="max-w-[70%] max-h-[70%] object-contain"
          draggable={false}
        />
      </div>
    );
  }

  return <CategoryFallback emoji={item.previewEmoji} size={size} />;
}

function HairPreview({ item, size }: { item: Item; size: number }) {
  return <CategoryFallback emoji={item.previewEmoji} size={size} />;
}

function HatPreview({ item, size }: { item: Item; size: number }) {
  return <CategoryFallback emoji={item.previewEmoji} size={size} />;
}

function HeadPreview({ item, size }: { item: Item; size: number }) {
  return <CategoryFallback emoji={item.previewEmoji} size={size} />;
}

function ShirtPreview({ item, size }: { item: Item; size: number }) {
  // Community shirts: crop from the uploaded template
  if (item.imageUrl) {
    return <CommunityShirtPreview item={item} size={size} />;
  }
  // Built-in shirts: emoji fallback
  return <CategoryFallback emoji={item.previewEmoji} size={size} />;
}

function AccessoryPreview({ item, size }: { item: Item; size: number }) {
  return <CategoryFallback emoji={item.previewEmoji} size={size} />;
}

function GenericPreview({ item, size }: { item: Item; size: number }) {
  return <CategoryFallback emoji={item.previewEmoji} size={size} />;
}

export default function ItemPreview({ item, size = 160 }: { item: Item; size?: number }) {
  if (item.category === "hats") return <HatPreview item={item} size={size} />;
  if (item.category === "outfits") return <ShirtPreview item={item} size={size} />;
  if (item.category === "heads") return <HeadPreview item={item} size={size} />;
  if (item.category === "faces") return <FacePreview item={item} size={size} />;
  if (item.category === "hair") return <HairPreview item={item} size={size} />;
  if (item.category === "accessories") return <AccessoryPreview item={item} size={size} />;
  return <GenericPreview item={item} size={size} />;
}