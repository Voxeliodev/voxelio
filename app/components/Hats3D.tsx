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

  ctx.strokeStyle = "#3B2008";
  ctx.lineWidth = 26;
  ctx.strokeRect(13, 13, 1024 - 26, 640 - 26);

  ctx.strokeStyle = "#2A1505";
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, 1024 - 60, 640 - 60);

  ctx.font = "900 170px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillText("VOX", 515, 205);
  ctx.fillText("COOKS", 515, 445);

  ctx.fillStyle = "#FFEBC9";
  ctx.fillText("VOX", 512, 200);
  ctx.fillText("COOKS", 512, 440);

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

  return (
    <group>
      <mesh position={[0, -0.075, 0]} castShadow>
        <boxGeometry args={[0.16, 0.55, 0.16]} />
        <meshStandardMaterial color={woodDark} roughness={0.9} />
      </mesh>

      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.34, 0.1, 0.16]} />
        <meshStandardMaterial color={woodDarker} roughness={0.95} />
      </mesh>

      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.0, 0.65, 0.12]} />
        <meshStandardMaterial color={woodMain} roughness={0.85} />
      </mesh>

      {texture && (
        <mesh position={[0, 0.5, 0.061]}>
          <planeGeometry args={[0.98, 0.63]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} />
        </mesh>
      )}

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

// ---------- Vox Cooks Beanie ----------
// Ribbed black beanie. The "Vox Cooks" text is baked into the
// brim texture so it wraps naturally around the cylinder.

function makeBeanieRibTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0A0A0A";
  ctx.fillRect(0, 0, 512, 512);

  const ribCount = 26;
  const ribWidth = 512 / ribCount;
  for (let i = 0; i < ribCount; i++) {
    const x = i * ribWidth;
    const grad = ctx.createLinearGradient(x, 0, x + ribWidth, 0);
    grad.addColorStop(0, "#000000");
    grad.addColorStop(0.5, "#1E1E1E");
    grad.addColorStop(1, "#000000");
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, ribWidth, 512);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeBeanieBrimTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const W = 2048;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Base fabric
  ctx.fillStyle = "#0A0A0A";
  ctx.fillRect(0, 0, W, H);

  // Rib stripes
  const ribCount = 42;
  const ribWidth = W / ribCount;
  for (let i = 0; i < ribCount; i++) {
    const x = i * ribWidth;
    const grad = ctx.createLinearGradient(x, 0, x + ribWidth, 0);
    grad.addColorStop(0, "#000000");
    grad.addColorStop(0.5, "#1E1E1E");
    grad.addColorStop(1, "#000000");
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, ribWidth, H);
  }

  // ===== "Vox Cooks" — big, centered horizontally =====
  ctx.font = "900 260px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.lineWidth = 22;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000000";
  ctx.strokeText("Vox Cooks", W / 2, H / 2);

  ctx.fillStyle = "#A855F7";
  ctx.fillText("Vox Cooks", W / 2, H / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.offset.x = 0.5;
  tex.needsUpdate = true;
  return tex;
}

function VoxCooksBeanie() {
  const brimTexture = useMemo(() => makeBeanieBrimTexture(), []);
  const ribTexture = useMemo(() => makeBeanieRibTexture(), []);

  return (
    // Raise the whole beanie up so it sits higher on the head
    <group position={[0, 0.25, 0]}>
      {/* ===== FOLDED BRIM (cuff) ===== */}
      <mesh position={[0, -0.28, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.36, 64]} />
        <meshStandardMaterial
          color="#FFFFFF"
          map={brimTexture ?? undefined}
          roughness={0.95}
        />
      </mesh>

      {/* ===== CROWN DOME ===== */}
      <mesh position={[0, -0.10, 0]} scale={[1, 1.15, 1]} castShadow>
        <sphereGeometry args={[0.52, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#0A0A0A"
          map={ribTexture ?? undefined}
          roughness={0.95}
        />
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
  if (hatId === "hat-vox-cooks-beanie") return <VoxCooksBeanie />;
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