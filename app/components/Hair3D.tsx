"use client";

import { useMemo, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { getItem, type Item } from "../../lib/items";

// ============================================================
// VOXELIO 3D HAIR
// ============================================================
// Hair is drawn on top of the head. The head is a RoundedBox
// 0.85 × 0.85 × 0.85 at y = 1.4 in the avatar's local space,
// so hair meshes are centered around the same point.

const HEAD_Y = 1.4;

// ---------- GLB upload support ----------
function ModelHair({ item }: { item: Item }) {
  const gltf = useGLTF(item.modelPath!);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  return (
    <primitive
      object={scene}
      scale={item.modelScale ?? 1}
      position={item.modelOffset ?? [0, 0, 0]}
      rotation={item.modelRotation ?? [0, 0, 0]}
      castShadow
    />
  );
}

// ---------- Short hair (cap) ----------
function ShortHair({ color }: { color: string }) {
  return (
    <group position={[0, HEAD_Y, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.12, -0.42]} castShadow>
        <boxGeometry args={[0.55, 0.2, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

// ---------- Mohawk ----------
function Mohawk({ baseColor, spikeColor }: { baseColor: string; spikeColor: string }) {
  return (
    <group position={[0, HEAD_Y, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.48, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
        <meshStandardMaterial color={baseColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.13, 0.55, 0.55]} />
        <meshStandardMaterial color={spikeColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, 0.05]} rotation={[0.2, 0, 0]} castShadow>
        <coneGeometry args={[0.08, 0.25, 8]} />
        <meshStandardMaterial color={spikeColor} roughness={0.7} />
      </mesh>
    </group>
  );
}

// ---------- Long hair ----------
function LongHair({ color }: { color: string }) {
  return (
    <group position={[0, HEAD_Y, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.35, -0.4]} castShadow>
        <boxGeometry args={[0.75, 0.85, 0.16]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.75, -0.4]} castShadow>
        <boxGeometry args={[0.6, 0.15, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[-0.42, -0.35, 0]} castShadow>
        <boxGeometry args={[0.16, 0.75, 0.68]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0.42, -0.35, 0]} castShadow>
        <boxGeometry args={[0.16, 0.75, 0.68]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

// ---------- Ponytail ----------
function Ponytail({ color }: { color: string }) {
  return (
    <group position={[0, HEAD_Y, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Hair tie — rotation is on the mesh, not the geometry */}
      <mesh position={[0, 0.05, -0.5]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.09, 0.03, 8, 16]} />
        <meshStandardMaterial color="#E11D48" roughness={0.5} />
      </mesh>

      <mesh position={[0, -0.25, -0.55]} rotation={[0.3, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 0.6, 12]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.6, -0.63]} castShadow>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

// ---------- Router ----------
export function Hair3DGeometry({ hairId }: { hairId: string }) {
  const item = getItem(hairId);
  if (!item) return null;

  if (item.modelPath) {
    return (
      <Suspense fallback={null}>
        <ModelHair item={item} />
      </Suspense>
    );
  }

  switch (hairId) {
    case "hair-short-black":
      return <ShortHair color="#1A0F08" />;
    case "hair-short-blonde":
      return <ShortHair color="#D9B370" />;
    case "hair-mohawk-pink":
      return <Mohawk baseColor="#3B2314" spikeColor="#EC4899" />;
    case "hair-long-brown":
      return <LongHair color="#5A3818" />;
    case "hair-ponytail-black":
      return <Ponytail color="#1A0F08" />;
    default:
      return null;
  }
}

export function Hair3D({ hairId }: { hairId: string }) {
  if (!hairId) return null;
  return <Hair3DGeometry hairId={hairId} />;
}