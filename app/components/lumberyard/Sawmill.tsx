"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SAWMILL_POSITION, SAWMILL_RADIUS } from "../../../lib/lumberyard";

// ============================================================
// SAWMILL — the sell station
// ============================================================
// Player walks here with a log equipped, presses E to sell.
// Has a spinning blade visual + a glowing drop zone.
// ============================================================

export default function Sawmill() {
  const bladeRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (bladeRef.current) {
      bladeRef.current.rotation.y += delta * 2;
    }
    if (ringRef.current) {
      const t = performance.now() / 1000;
      const scale = 1 + Math.sin(t * 2) * 0.05;
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  const [x, y, z] = SAWMILL_POSITION;

  return (
    <group position={[x, y, z]}>
      {/* Concrete base */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[8, 0.2, 8]} />
        <meshStandardMaterial color="#4B5563" roughness={0.9} />
      </mesh>

      {/* Roof/shelter structure */}
      <mesh position={[0, 3, 0]} castShadow>
        <boxGeometry args={[6, 0.3, 6]} />
        <meshStandardMaterial color="#7C2D12" roughness={0.8} />
      </mesh>
      {/* Support poles */}
      {[[-2.7, -2.7], [2.7, -2.7], [-2.7, 2.7], [2.7, 2.7]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 1.5, pz]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 3, 8]} />
          <meshStandardMaterial color="#451A03" roughness={0.9} />
        </mesh>
      ))}

      {/* Big saw blade */}
      <mesh ref={bladeRef} position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.15, 24]} />
        <meshStandardMaterial
          color="#E5E7EB"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Blade teeth (small boxes around the edge) */}
      {useMemo(
        () =>
          Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const r = 1.65;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * r, 1.2, Math.sin(angle) * r]}
                rotation={[0, -angle, 0]}
              >
                <boxGeometry args={[0.25, 0.12, 0.15]} />
                <meshStandardMaterial color="#9CA3AF" metalness={0.7} roughness={0.3} />
              </mesh>
            );
          }),
        []
      )}

      {/* Sell zone ring on the ground */}
      <mesh ref={ringRef} position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[SAWMILL_RADIUS - 0.5, SAWMILL_RADIUS, 48]} />
        <meshBasicMaterial color="#FBBF24" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Sign */}
      <mesh position={[0, 4, -3]} castShadow>
        <boxGeometry args={[4, 1, 0.2]} />
        <meshStandardMaterial color="#1A1A2E" />
      </mesh>
    </group>
  );
}