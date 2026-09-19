"use client";

import { useMemo, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { getItem, type Item } from "../../lib/items";

// ============================================================
// VOXELIO 3D ACCESSORIES — Held / worn items
// ============================================================
// Two kinds of accessories are supported:
//
// 1. Hardcoded meshes below (like VoxSword) — perfect for
//    simple shapes drawn entirely in code.
//
// 2. Uploaded GLB models — an item with a `modelPath` field
//    in lib/items.ts will load that .glb from /public/models/.
//    Use modelScale, modelOffset, modelRotation to position it.
// ============================================================

// ---------- Uploaded GLB model ----------
function ModelAccessory({ item }: { item: Item }) {
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

// ---------- Vox Sword (hardcoded) ----------
function VoxSword() {
  return (
    <group>
      {/* HANDLE */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.24, 0.06]} />
        <meshStandardMaterial color="#5A3818" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[0.065, 0.02, 0.065]} />
        <meshStandardMaterial color="#2A1810" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.065, 0.02, 0.065]} />
        <meshStandardMaterial color="#2A1810" roughness={0.9} />
      </mesh>

      {/* POMMEL */}
      <mesh position={[0, -0.16, 0]} castShadow>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#FFD700" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* GUARD */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.42, 0.06, 0.11]} />
        <meshStandardMaterial color="#3A1580" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.22, 0.15, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#FFD700" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0.22, 0.15, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#FFD700" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* BLADE */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.11, 0.85, 0.045]} />
        <meshStandardMaterial color="#C5C8D6" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[-0.055, 0.6, 0]}>
        <boxGeometry args={[0.006, 0.85, 0.046]} />
        <meshStandardMaterial color="#FFFFFF" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.055, 0.6, 0]}>
        <boxGeometry args={[0.006, 0.85, 0.046]} />
        <meshStandardMaterial color="#FFFFFF" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.6, 0.024]}>
        <boxGeometry args={[0.022, 0.83, 0.002]} />
        <meshStandardMaterial color="#7A7E8C" />
      </mesh>

      {/* TIP */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <coneGeometry args={[0.078, 0.14, 4]} />
        <meshStandardMaterial color="#C5C8D6" metalness={0.85} roughness={0.22} />
      </mesh>
    </group>
  );
}

// ---------- Router ----------
// Any item with a modelPath loads the GLB. Otherwise we match
// on the accessory ID for hardcoded meshes.
export function Accessory3DGeometry({ accessoryId }: { accessoryId: string }) {
  const item = getItem(accessoryId);
  if (!item) return null;

  // Uploaded GLB takes priority
  if (item.modelPath) {
    return (
      <Suspense fallback={null}>
        <ModelAccessory item={item} />
      </Suspense>
    );
  }

  // Hardcoded meshes
  if (accessoryId === "accessory-vox-sword") return <VoxSword />;

  return null;
}

// ---------- Public API ----------
export function Accessory3D({ accessoryId }: { accessoryId: string }) {
  if (!accessoryId) return null;

  return (
    <group position={[0.6, -0.15, 0]} rotation={[0, 0, 0.15]}>
      <Accessory3DGeometry accessoryId={accessoryId} />
    </group>
  );
}