"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Character } from "../Avatar";
import AccountBadge from "../AccountBadge";
import type { AvatarConfig } from "../../../lib/auth";

// ============================================================
// PIZZA EMPIRE — REMOTE PLAYER
// ============================================================
// Renders another player in the arena. Interpolates their
// position and rotation smoothly between network updates, plays
// a walking animation, and shows their nametag + current coin
// balance above their head.
// ============================================================

export type RemotePizzaData = {
  id: string;
  username: string;
  displayId?: number | null;
  avatarConfig: AvatarConfig;
  targetPos: [number, number, number];
  targetRotY: number;
  coins: number;
  lastSeen: number;
};

const VISUAL_OFFSET_Y = 0.65;

// ============================================================
// FORMAT COINS FOR DISPLAY
// ============================================================
function formatCoins(n: number): string {
  if (n < 1000) return `${Math.floor(n)}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${(n / 1_000_000_000).toFixed(1)}B`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function RemotePizzaPlayer({
  data,
}: {
  data: RemotePizzaData;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPosRef = useRef(new THREE.Vector3(...data.targetPos));
  const currentRotRef = useRef(data.targetRotY);
  const walkRef = useRef(false);

  // ============================================================
  // SMOOTH MOTION
  // ============================================================
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

    // Walk state
    const moved = before.distanceTo(currentPosRef.current) > 0.01;
    walkRef.current = moved;
  });

  return (
    <group ref={groupRef} position={data.targetPos}>
      {/* ===== NAMETAG + COIN BADGE ===== */}
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
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Nametag row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1,
                textShadow:
                  "0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 0 0 2px #000",
              }}
            >
              {data.username}
            </span>
            <AccountBadge
              username={data.username}
              userId={data.id}
              size={16}
            />
          </div>

          {/* Coin balance pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(0,0,0,0.75)",
              border: "1px solid rgba(255, 215, 0, 0.5)",
              borderRadius: 999,
              padding: "2px 8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
            }}
          >
            <span style={{ fontSize: 11 }}>🪙</span>
            <span
              style={{
                color: "#FFD700",
                fontWeight: 900,
                fontSize: 11,
                lineHeight: 1,
                textShadow: "0 0 2px #000",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatCoins(data.coins)}
            </span>
          </div>
        </div>
      </Html>

      {/* ===== CHARACTER MODEL ===== */}
      <group position={[0, VISUAL_OFFSET_Y, 0]}>
        <Character
          config={data.avatarConfig}
          hideAccessory
          walking={walkRef.current}
        />
      </group>
    </group>
  );
}