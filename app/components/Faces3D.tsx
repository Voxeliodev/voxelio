"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { getItem } from "../../lib/items";

// ============================================================
// VOXELIO 3D FACES — PNG overlay on the front of the head
// ============================================================
// Supports two head types:
//   "default" → box head (0.85 × 0.85 × 0.85 RoundedBox at y=1.4)
//   "round"   → sphere head (radius 0.52 at y=1.4)
// The round-head version uses a curved sphere patch so the face
// wraps naturally around the curvature instead of floating flat.

const HEAD_Y = 1.4;
const BOX_HEAD_SIZE = 0.85;
const ROUND_HEAD_RADIUS = 0.52;

function FaceOverlay({
  url,
  headType,
}: {
  url: string;
  headType: "default" | "round";
}) {
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

  // ===== ROUND HEAD =====
  // A thin spherical shell patch centered on the front of the head.
  // Because the patch shares the sphere's shape, the texture bends
  // with the head instead of poking through it at the corners.
  if (headType === "round") {
    return (
      <mesh position={[0, HEAD_Y, 0]}>
        <sphereGeometry
          args={[
            ROUND_HEAD_RADIUS + 0.003, // slightly larger so no z-fighting
            48, // width segments
            48, // height segments
            Math.PI * 0.3, // phiStart (rotate patch to front)
            Math.PI * 0.4, // phiLength (72° horizontally)
            Math.PI * 0.25, // thetaStart (upper area)
            Math.PI * 0.5, // thetaLength (90° vertically)
          ]}
        />
        <meshBasicMaterial
          map={texture}
          transparent
          toneMapped={false}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
    );
  }

  // ===== DEFAULT BOX HEAD =====
  return (
    <mesh position={[0, HEAD_Y, BOX_HEAD_SIZE / 2 + 0.001]}>
      <planeGeometry args={[BOX_HEAD_SIZE, BOX_HEAD_SIZE]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export function Face3D({
  faceId,
  headType = "default",
}: {
  faceId: string;
  headType?: "default" | "round";
}) {
  if (!faceId) return null;
  const item = getItem(faceId);
  if (!item || !item.faceImageUrl) return null;
  return <FaceOverlay url={item.faceImageUrl} headType={headType} />;
}