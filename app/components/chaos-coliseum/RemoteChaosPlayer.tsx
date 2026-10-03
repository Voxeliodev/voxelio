"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Character } from "../Avatar";
import AccountBadge from "../AccountBadge";
import type { AvatarConfig } from "../../../lib/auth";
import { PLAYER_MAX_HP } from "../../../lib/chaosColiseum";

// ============================================================
// CHAOS COLISEUM — REMOTE PLAYER
// ============================================================
// Renders another player in the arena. Interpolates their position
// and rotation smoothly between network updates, shows an HP bar
// above their head, and plays a swing animation when they attack.
// ============================================================

export type RemoteChaosData = {
  id: string;
  username: string;
  displayId?: number | null;
  avatarConfig: AvatarConfig;
  targetPos: [number, number, number];
  targetRotY: number;
  hp: number;
  alive: boolean;
  swinging: boolean;
  lastSeen: number;
};

const VISUAL_OFFSET_Y = 0.65;

// ---- HP bar colors ----
function getHpColor(hp: number): string {
  if (hp > 66) return "#22C55E";        // green
  if (hp > 33) return "#FBBF24";        // amber
  return "#EF4444";                     // red
}

export default function RemoteChaosPlayer({ data }: { data: RemoteChaosData }) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPosRef = useRef(new THREE.Vector3(...data.targetPos));
  const currentRotRef = useRef(data.targetRotY);
  const walkRef = useRef(false);

  // Swing animation: increases when data.swinging flips to true
  const chopSwingRef = useRef(0);
  const lastSwingingRef = useRef(false);

  // Death fade-out
  const [fadeOpacity, setFadeOpacity] = useState(1);

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

    // Swing animation decay
    if (data.swinging && !lastSwingingRef.current) {
      chopSwingRef.current = 1;
    }
    lastSwingingRef.current = data.swinging;
    if (chopSwingRef.current > 0) {
      chopSwingRef.current = Math.max(0, chopSwingRef.current - delta * 2.8);
    }

    // Death fade
    const targetFade = data.alive ? 1 : 0.15;
    setFadeOpacity((prev) => prev + (targetFade - prev) * Math.min(1, delta * 4));
  });

  const hpPercent = Math.max(0, Math.min(100, (data.hp / PLAYER_MAX_HP) * 100));
  const hpColor = getHpColor(data.hp);

  return (
    <group ref={groupRef} position={data.targetPos}>
      {/* ===== NAMETAG + HP BAR ===== */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                color: data.alive ? "#FFFFFF" : "#9CA3AF",
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1,
                textShadow:
                  "0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 0 0 2px #000",
              }}
            >
              {data.username}
            </span>
            <AccountBadge username={data.username} userId={data.id} size={16} />
          </div>

          {/* HP bar (hidden when dead) */}
          {data.alive && (
            <div
              style={{
                width: 72,
                height: 8,
                background: "rgba(0,0,0,0.75)",
                borderRadius: 4,
                border: "1px solid rgba(0,0,0,0.9)",
                overflow: "hidden",
                boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
              }}
            >
              <div
                style={{
                  width: `${hpPercent}%`,
                  height: "100%",
                  background: hpColor,
                  borderRadius: 3,
                  transition: "width 0.15s ease-out, background 0.3s ease-out",
                  boxShadow: `0 0 6px ${hpColor}`,
                }}
              />
            </div>
          )}

          {/* Dead label */}
          {!data.alive && (
            <div
              style={{
                fontSize: 10,
                color: "#EF4444",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textShadow: "0 0 2px #000, 0 0 2px #000, 0 0 2px #000",
              }}
            >
              ☠️ DEAD
            </div>
          )}
        </div>
      </Html>

      {/* ===== CHARACTER BODY ===== */}
      <group
        position={[0, VISUAL_OFFSET_Y, 0]}
        // Fade opacity to 15% when dead
      >
        <group
          // @ts-ignore — R3F accepts opacity on groups only via child materials
          visible={fadeOpacity > 0.05}
        >
          <Character
            config={data.avatarConfig}
            hideAccessory
            walking={walkRef.current}
            chopSwingRef={chopSwingRef}
          />
        </group>
      </group>
    </group>
  );
}