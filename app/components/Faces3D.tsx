"use client";

import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { getItem } from "../../lib/items";

// ============================================================
// VOXELIO 3D FACES
// ============================================================
// Faces are PNG images with transparency (like skin overlays
// from Minecraft or Roblox). They're drawn on a thin plane
// hovering just in front of the head, sized to match the head.

// Matches DefaultHead's size and position in Avatar.tsx
const HEAD_SIZE = 0.85;
const HEAD_Y = 1.4;

function FaceOverlay({ url }: { url: string }) {
  const texture = useTexture(url);

  useMemo(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
  }, [texture]);

  return (
    <mesh position={[0, HEAD_Y, HEAD_SIZE / 2 + 0.001]}>
      <planeGeometry args={[HEAD_SIZE, HEAD_SIZE]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

// ============================================================
// Public API
// ============================================================
export function Face3D({ faceId }: { faceId: string }) {
  if (!faceId) return null;
  const item = getItem(faceId);
  if (!item) return null;
  if (!item.faceImageUrl) return null;
  return <FaceOverlay url={item.faceImageUrl} />;
}