"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { getItem } from "../../lib/items";

// ============================================================
// VOXELIO 3D FACES — PNG overlay on the front of the head
// ============================================================

// Matches DefaultHead in Avatar.tsx
const HEAD_SIZE = 0.85;
const HEAD_Y = 1.4;

function FaceOverlay({ url }: { url: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTexture(null);
    setFailed(false);

    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      (err) => {
        if (cancelled) return;
        console.error("❌ Face texture failed to load:", url, err);
        setFailed(true);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed || !texture) return null;

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

export function Face3D({ faceId }: { faceId: string }) {
  if (!faceId) return null;
  const item = getItem(faceId);
  if (!item || !item.faceImageUrl) return null;
  return <FaceOverlay url={item.faceImageUrl} />;
}