"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Character } from "../Avatar";
import AccountBadge from "../AccountBadge";
import type { AvatarConfig } from "../../../lib/auth";
import { getAxe, type AxeId } from "../../../lib/lumberyard";

// ============================================================
// REMOTE LUMBER PLAYER — other players in the lumberyard
// ============================================================
// Receives position + rotation + chop-swing state from the network
// and animates smoothly between updates.
// ============================================================

export type RemoteLumberData = {
  id: string;
  username: string;
  displayId?: number | null;
  avatarConfig: AvatarConfig;
  currentAxeId: AxeId;
  targetPos: [number, number, number];
  targetRotY: number;
  lastSeen: number;
};

// Shared axe mesh component — same as the one in LumberyardPlayer
function RemoteAxeMesh({ axeId }: { axeId: AxeId }) {
  const axe = getAxe(axeId);

  return (
    <group position={[0, 0.15, 0.2]} rotation={[0.2, 0, 0]}>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshStandardMaterial color={axe.color} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.25, 0.85, 0]}>
        <boxGeometry args={[0.45, 0.3, 0.08]} />
        <meshStandardMaterial
          color={axe.bladeColor}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      <mesh castShadow position={[0.47, 0.85, 0]}>
        <boxGeometry args={[0.05, 0.3, 0.08]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive={new THREE.Color(axe.bladeColor)}
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

// Matches VISUAL_OFFSET_Y in LumberyardPlayer.tsx — needed so the
// remote player's feet align with the ground (not sunk into it).
const VISUAL_OFFSET_Y = 0.65;

export default function RemoteLumberPlayer({ data }: { data: RemoteLumberData }) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPosRef = useRef(new THREE.Vector3(...data.targetPos));
  const currentRotRef = useRef(data.targetRotY);
  const walkRef = useRef(false);

  // Detect movement to trigger walk animation
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = new THREE.Vector3(...data.targetPos);
    const lerp = Math.min(1, delta * 12);
    const before = currentPosRef.current.clone();
    currentPosRef.current.lerp(target, lerp);
    groupRef.current.position.copy(currentPosRef.current);

    // Smooth rotation
    let diff = data.targetRotY - currentRotRef.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentRotRef.current += diff * Math.min(1, delta * 14);
    groupRef.current.rotation.y = currentRotRef.current;

    // Walking state
    const moved = before.distanceTo(currentPosRef.current) > 0.01;
    walkRef.current = moved;
  });

  return (
    <group ref={groupRef} position={data.targetPos}>
      {/* Nametag */}
      <Html
        position={[0, 2.55 + VISUAL_OFFSET_Y, 0]}
        center
        distanceFactor={10}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none", overflow: "visible" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <span
            style={{
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1,
              textShadow: "0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 0 0 2px #000",
            }}
          >
            {data.username}
          </span>
          <AccountBadge username={data.username} userId={data.id} size={16} />
        </div>
      </Html>

      {/* FIX: Offset the visual model so its feet are on the ground */}
      <group position={[0, VISUAL_OFFSET_Y, 0]}>
        <Character
          config={data.avatarConfig}
          hideAccessory
          walking={walkRef.current}
          rightHandContent={<RemoteAxeMesh axeId={data.currentAxeId} />}
        />
      </group>
    </group>
  );
}