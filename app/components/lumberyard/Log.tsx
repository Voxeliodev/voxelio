"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================
// LOG — a chop-ed wood log lying on the ground
// ============================================================
// Can be picked up by walking near it and pressing E.
// Or dropped by the player.
// ============================================================

export type LogData = {
  id: string;
  position: [number, number, number];
  value: number;
  treeType: string;
};

type Props = {
  log: LogData;
  canPickup: boolean;
  onPickup: (logId: string) => void;
};

export default function Log({ log, canPickup, onPickup }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!meshRef.current) return;
    // Gentle bob when player is close enough to pick up
    if (canPickup) {
      const t = performance.now() / 1000;
      meshRef.current.position.y = log.position[1] + Math.sin(t * 3) * 0.05;
      meshRef.current.rotation.y += 0.008;
    } else {
      meshRef.current.position.y = log.position[1];
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (canPickup) onPickup(log.id);
  };

  return (
    <mesh
      ref={meshRef}
      position={log.position}
      rotation={[0, 0, Math.PI / 2]}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (canPickup) {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      <cylinderGeometry args={[0.35, 0.35, 1.2, 10]} />
      <meshStandardMaterial
        color={hovered && canPickup ? "#A16207" : "#78350F"}
        roughness={0.9}
        emissive={canPickup ? new THREE.Color("#FBBF24") : new THREE.Color(0, 0, 0)}
        emissiveIntensity={canPickup ? 0.3 : 0}
      />

      {/* Pickup hint — floating "E" indicator */}
      {canPickup && (
        <mesh position={[0, 1.2, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshBasicMaterial color="#FBBF24" transparent opacity={0.9} />
        </mesh>
      )}
    </mesh>
  );
}