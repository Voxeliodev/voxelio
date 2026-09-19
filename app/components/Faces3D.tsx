"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { getItem } from "../../lib/items";

// ============================================================
// VOXELIO 3D FACES — PNG overlay on the front of the head
// ============================================================
// Default PNG is /faces/default.png — shown on the head when
// no custom face is equipped. If it fails to load, we fall
// back to the built-in box eyes + mouth.
// Custom faces come from items with category "faces".

const HEAD_Y = 1.4;
const BOX_HEAD_SIZE = 0.85;
const ROUND_HEAD_RADIUS = 0.52;

// Reusable texture loader — cannot crash, just returns null on failure
function useFaceTexture(url: string) {
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
      () => {
        if (cancelled) return;
        setFailed(true);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { texture, failed };
}

function FaceOverlay({
  url,
  headType,
}: {
  url: string;
  headType: "default" | "round";
}) {
  const { texture, failed } = useFaceTexture(url);

  if (failed || !texture) return null;

  if (headType === "round") {
    return (
      <mesh position={[0, HEAD_Y, 0]}>
        <sphereGeometry
          args={[
            ROUND_HEAD_RADIUS + 0.003,
            48,
            48,
            Math.PI * 0.3,
            Math.PI * 0.4,
            Math.PI * 0.25,
            Math.PI * 0.5,
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

// ===== Custom equipped face (from items.ts) =====
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

// ===== Default face =====
// Meant to be rendered INSIDE the head group (at [0, 1.4, 0]).
// Loads /faces/default.png. If it fails, falls back to the
// built-in box eyes + mouth so the head is never blank.
export function DefaultFace3D({
  headType = "default",
}: {
  headType?: "default" | "round";
}) {
  const { texture, failed } = useFaceTexture("/faces/default.png");

  // PNG loaded — show it
  if (texture && !failed) {
    if (headType === "round") {
      return (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry
            args={[
              ROUND_HEAD_RADIUS + 0.003,
              48,
              48,
              Math.PI * 0.3,
              Math.PI * 0.4,
              Math.PI * 0.25,
              Math.PI * 0.5,
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
    return (
      <mesh position={[0, 0, BOX_HEAD_SIZE / 2 + 0.001]}>
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

  // Fallback: old box eyes + mouth
  const eyeZ = headType === "round" ? 0.5 : 0.44;
  const mouthZ = headType === "round" ? 0.5 : 0.44;

  return (
    <group>
      <mesh position={[-0.18, 0.1, eyeZ]}>
        <boxGeometry args={[0.09, 0.12, 0.03]} />
        <meshStandardMaterial color="#1A1A2E" />
      </mesh>
      <mesh position={[0.18, 0.1, eyeZ]}>
        <boxGeometry args={[0.09, 0.12, 0.03]} />
        <meshStandardMaterial color="#1A1A2E" />
      </mesh>
      <mesh position={[0, -0.16, mouthZ]}>
        <boxGeometry args={[0.2, 0.04, 0.03]} />
        <meshStandardMaterial color="#1A1A2E" />
      </mesh>
    </group>
  );
}