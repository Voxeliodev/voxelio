"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import PizzaOven from "./PizzaOven";
import type { OvenState } from "../../../lib/pizzaEmpireProgress";
import {
  PLOT_SIZE,
  PLOT_FLOOR_Y,
  OVEN_SLOT_OFFSETS,
  BUY_BUTTON_OFFSET,
  BUY_BUTTON_SIZE,
  CASH_REGISTER_OFFSET,
  CASH_REGISTER_SIZE,
  PLOT_FLOOR_COLOR,
  PLOT_EDGE_COLOR,
  BUY_BUTTON_COLOR,
  BUY_BUTTON_DISABLED_COLOR,
  CASH_REGISTER_COLOR,
  CASH_REGISTER_DARK,
  getNextOvenCost,
} from "../../../lib/pizzaEmpire";

// ============================================================
// PIZZA PLOT — one player's plot
// ============================================================
// Renders the plot floor, edge walls, all 12 ovens in a grid,
// the buy button, and the cash register.
//
// The player who owns the plot can click the ovens and buy
// button. Other players can walk on the plot but can't interact.
// ============================================================

type Props = {
  plotIndex: number;       // 0-3
  position: [number, number, number];
  ovens: OvenState[];
  coins: number;
  isOwnedByMe: boolean;
  onBuyOven: () => void;
  onUpgradeOven: (slotIndex: number) => void;
};

// ============================================================
// BUY BUTTON — big green pad that purchases the next oven
// ============================================================
function BuyButton({
  coins,
  ovens,
  enabled,
  onBuy,
}: {
  coins: number;
  ovens: OvenState[];
  enabled: boolean;
  onBuy: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const nextCost = getNextOvenCost(ovens);
  const allOwned = nextCost === null;
  const canAfford = nextCost !== null && coins >= nextCost;
  const active = enabled && !allOwned && canAfford;
  const buttonColor = allOwned
    ? "#4B5563"
    : canAfford
    ? BUY_BUTTON_COLOR
    : BUY_BUTTON_DISABLED_COLOR;

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!enabled || allOwned || !canAfford) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    onBuy();
  };

  return (
    <group
      position={BUY_BUTTON_OFFSET}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (enabled && canAfford && !allOwned) {
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      {/* Base pad — the clickable slab */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <boxGeometry args={[BUY_BUTTON_SIZE[0] + 0.4, 0.4, BUY_BUTTON_SIZE[2] + 0.4]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.9} />
      </mesh>

      {/* Button top — colored */}
      <mesh
        position={[0, pressed ? -0.2 : 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={BUY_BUTTON_SIZE} />
        <meshStandardMaterial
          color={buttonColor}
          roughness={0.5}
          emissive={buttonColor}
          emissiveIntensity={active ? (hovered ? 0.5 : 0.25) : 0}
        />
      </mesh>

      {/* Label text — floating HTML-ish plane using emissive material */}
      <mesh position={[0, 1.1, 0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[3.4, 0.7]} />
        <meshBasicMaterial color="transparent" transparent opacity={0} />
      </mesh>
      <group position={[0, 1.1, 0]}>
        <mesh>
          <planeGeometry args={[3.6, 0.8]} />
          <meshBasicMaterial
            color={active ? "#22C55E" : "#4B5563"}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>

      {/* Sparkle particles when affordable */}
      {active && hovered && (
        <Sparkles color="#FFD700" count={6} spread={1.5} position={[0, 1, 0]} />
      )}
    </group>
  );
}

// ============================================================
// SIMPLE SPARKLES — small floating particles for feedback
// ============================================================
function Sparkles({
  color,
  count,
  spread,
  position,
}: {
  color: string;
  count: number;
  spread: number;
  position: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const initialPositions = useRef(
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * spread,
      y: Math.random() * 0.8,
      z: (Math.random() - 0.5) * spread,
      speed: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    }))
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const data = initialPositions.current[i];
      if (!data) return;
      child.position.y = data.y + Math.sin(t * data.speed * 2 + data.phase) * 0.4;
      const scale = 0.6 + Math.sin(t * 3 + data.phase) * 0.3;
      child.scale.set(scale, scale, scale);
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {initialPositions.current.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <octahedronGeometry args={[0.1, 0]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================
// CASH REGISTER — decorational gold register, glowing when
// income is flowing
// ============================================================
function CashRegister({ hasIncome }: { hasIncome: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!lightRef.current) return;
    const t = state.clock.elapsedTime;
    if (hasIncome) {
      // Gentle pulse
      lightRef.current.intensity = 0.6 + Math.sin(t * 2) * 0.2;
    } else {
      lightRef.current.intensity = 0.15;
    }
  });

  return (
    <group position={CASH_REGISTER_OFFSET}>
      {/* Register body */}
      <mesh position={[0, CASH_REGISTER_SIZE[1] / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={CASH_REGISTER_SIZE} />
        <meshStandardMaterial color={CASH_REGISTER_COLOR} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Darker trim band */}
      <mesh position={[0, CASH_REGISTER_SIZE[1] * 0.6, 0]}>
        <boxGeometry args={[CASH_REGISTER_SIZE[0] + 0.05, 0.15, CASH_REGISTER_SIZE[2] + 0.05]} />
        <meshStandardMaterial color={CASH_REGISTER_DARK} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Screen — small dark panel on top */}
      <mesh position={[0, CASH_REGISTER_SIZE[1] + 0.1, 0]}>
        <boxGeometry args={[1.4, 0.6, 1.4]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.4} />
      </mesh>

      {/* Screen glow */}
      <mesh position={[0, CASH_REGISTER_SIZE[1] + 0.11, 0.71]}>
        <planeGeometry args={[1.2, 0.45]} />
        <meshBasicMaterial color="#22C55E" />
      </mesh>

      {/* Floating $ symbol above */}
      {hasIncome && (
        <group position={[0, CASH_REGISTER_SIZE[1] + 1.2, 0]}>
          <CashFloat />
        </group>
      )}

      {/* Light above register */}
      <pointLight
        ref={lightRef}
        position={[0, CASH_REGISTER_SIZE[1] + 0.5, 0]}
        color={CASH_REGISTER_COLOR}
        distance={5}
        decay={2}
      />
    </group>
  );
}

// A floating "$" made of three simple meshes
function CashFloat() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 1.5) * 0.15;
    groupRef.current.rotation.y = t * 0.6;
  });

  return (
    <group ref={groupRef}>
      {/* Vertical bar of the $ */}
      <mesh>
        <boxGeometry args={[0.08, 0.55, 0.08]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      {/* Top curve */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.22, 0.08, 0.08]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      {/* Bottom curve */}
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[0.22, 0.08, 0.08]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
    </group>
  );
}

// ============================================================
// PLOT FLOOR — the raised platform the player stands on
// ============================================================
function PlotFloor() {
  return (
    <>
      {/* Main floor slab */}
      <mesh position={[0, PLOT_FLOOR_Y - 0.5, 0]} receiveShadow>
        <boxGeometry args={[PLOT_SIZE, 1, PLOT_SIZE]} />
        <meshStandardMaterial color={PLOT_FLOOR_COLOR} roughness={0.9} />
      </mesh>

      {/* Edge rim — decorative border */}
      <mesh position={[0, PLOT_FLOOR_Y - 0.4, 0]} receiveShadow>
        <boxGeometry args={[PLOT_SIZE + 0.4, 0.4, PLOT_SIZE + 0.4]} />
        <meshStandardMaterial color={PLOT_EDGE_COLOR} roughness={0.85} />
      </mesh>
    </>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PizzaPlot({
  plotIndex,
  position,
  ovens,
  coins,
  isOwnedByMe,
  onBuyOven,
  onUpgradeOven,
}: Props) {
  // Compute whether any oven is producing income — for the register glow
  const hasIncome = ovens.some((o) => o.owned && o.level > 0);

  return (
    <group position={position}>
      {/* Floor + rim */}
      <PlotFloor />

      {/* 12 ovens arranged in a 4x3 grid */}
      {OVEN_SLOT_OFFSETS.map((offset, i) => (
        <group key={i} position={offset}>
          <PizzaOven
            oven={ovens[i] || { owned: false, level: 0 }}
            slotIndex={i}
            isOwned={isOwnedByMe}
            canUpgrade={
              isOwnedByMe &&
              (ovens[i]?.owned ? ovens[i].level < 5 : coins >= 0)
            }
            onClick={(slot) => {
              if (!isOwnedByMe) return;
              // If unowned → buy next oven
              // If owned → upgrade this oven
              if (!ovens[slot]?.owned) {
                onBuyOven();
              } else {
                onUpgradeOven(slot);
              }
            }}
          />
        </group>
      ))}

      {/* Buy button — placed at the front of the plot */}
      <BuyButton
        coins={coins}
        ovens={ovens}
        enabled={isOwnedByMe}
        onBuy={onBuyOven}
      />

      {/* Cash register at the back */}
      <CashRegister hasIncome={hasIncome} />
    </group>
  );
}