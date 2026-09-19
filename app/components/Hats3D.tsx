"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { getItem, type Item } from "../../lib/items";

// ============================================================
// VOXELIO 3D HATS
// ============================================================

// ---------- External GLB model ----------
function ModelHat({ item }: { item: Item }) {
  if (!item.modelPath) return null;
  const gltf = useGLTF(item.modelPath);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const scale = item.modelScale ?? 1;
  const offset = item.modelOffset ?? [0, 0, 0];
  const rotation = item.modelRotation ?? [0, 0, 0];

  return (
    <primitive
      object={scene}
      scale={scale}
      position={offset}
      rotation={rotation}
      castShadow
    />
  );
}

// ---------- Fallback Cap ----------
function FallbackCap() {
  return (
    <>
      <mesh position={[0, 0.02, 0]} scale={[1, 0.55, 1]} castShadow>
        <sphereGeometry args={[0.6, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1A1A2E" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, -0.1, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.26, 48]} />
        <meshStandardMaterial color="#1A1A2E" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, -0.21, 0.68]} rotation={[-0.16, 0, 0]} castShadow>
        <boxGeometry args={[1.05, 0.06, 0.6]} />
        <meshStandardMaterial color="#0F0F1E" roughness={0.65} metalness={0.03} />
      </mesh>
    </>
  );
}

// ---------- Wooden Sign: "VOX COOKS" ----------
function makeSignTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 1024, 640);

  // Outer dark frame
  ctx.strokeStyle = "#3B2008";
  ctx.lineWidth = 26;
  ctx.strokeRect(13, 13, 1024 - 26, 640 - 26);

  // Inner thinner line
  ctx.strokeStyle = "#2A1505";
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, 1024 - 60, 640 - 60);

  // Text — "carved" effect with a shadow + highlight
  ctx.font = "900 170px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillText("VOX", 515, 205);
  ctx.fillText("COOKS", 515, 445);

  // Main text
  ctx.fillStyle = "#FFEBC9";
  ctx.fillText("VOX", 512, 200);
  ctx.fillText("COOKS", 512, 440);

  // Highlight
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  ctx.fillText("VOX", 510, 198);
  ctx.fillText("COOKS", 510, 438);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function VoxCooksSign() {
  const texture = useMemo(() => makeSignTexture(), []);

  const woodMain = "#8B5A2B";
  const woodDark = "#5A3818";
  const woodDarker = "#3B2008";

  // Layout in local space:
  //   Board bottom is at y = 0.175  (board center 0.5, half-height 0.325)
  //   Post must reach all the way up to that point (and slightly into the board)
  //
  //   Post spans y = -0.35 → 0.20   (height 0.55, center -0.075)
  //   Bracket spans y = 0.10 → 0.20 (height 0.10, center 0.15)

  return (
    <group>
      {/* ===== POST going into the head and up to the sign ===== */}
      <mesh position={[0, -0.075, 0]} castShadow>
        <boxGeometry args={[0.16, 0.55, 0.16]} />
        <meshStandardMaterial color={woodDark} roughness={0.9} />
      </mesh>

      {/* ===== Bracket / collar at the joint (right below the board) ===== */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.34, 0.1, 0.16]} />
        <meshStandardMaterial color={woodDarker} roughness={0.95} />
      </mesh>

      {/* ===== Main sign board ===== */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.0, 0.65, 0.12]} />
        <meshStandardMaterial color={woodMain} roughness={0.85} />
      </mesh>

      {/* ===== Front face texture with "VOX COOKS" ===== */}
      {texture && (
        <mesh position={[0, 0.5, 0.061]}>
          <planeGeometry args={[0.98, 0.63]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} />
        </mesh>
      )}

      {/* ===== Corner nails ===== */}
      <mesh position={[-0.4, 0.73, 0.065]}>
        <circleGeometry args={[0.028, 12]} />
        <meshStandardMaterial color={woodDarker} />
      </mesh>
      <mesh position={[0.4, 0.73, 0.065]}>
        <circleGeometry args={[0.028, 12]} />
        <meshStandardMaterial color={woodDarker} />
      </mesh>
      <mesh position={[-0.4, 0.27, 0.065]}>
        <circleGeometry args={[0.028, 12]} />
        <meshStandardMaterial color={woodDarker} />
      </mesh>
      <mesh position={[0.4, 0.27, 0.065]}>
        <circleGeometry args={[0.028, 12]} />
        <meshStandardMaterial color={woodDarker} />
      </mesh>
    </group>
  );
}

// ---------- Public API ----------

export function Hat3DGeometry({ hatId }: { hatId: string }) {
  const item = getItem(hatId);
  if (!item) return null;

  if (item.modelPath) return <ModelHat item={item} />;
  if (hatId === "hat-vox-sign") return <VoxCooksSign />;
  return <FallbackCap />;
}

export function Hat3D({ hatId }: { hatId: string }) {
  if (!hatId) return null;
  return (
    <group position={[0, 1.8, 0]}>
      <Hat3DGeometry hatId={hatId} />
    </group>
  );
}