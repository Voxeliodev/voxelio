"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OvenState } from "../../../lib/pizzaEmpireProgress";
import {
  OVEN_SIZE,
  MAX_OVEN_LEVEL,
} from "../../../lib/pizzaEmpire";

// ============================================================
// PIZZA OVEN — a single oven slot in a plot
// ============================================================
// Renders either an "unowned" placeholder (empty gray slot) or
// a working oven with fire glow, spinning pizza, and level
// decorations. Clickable to trigger an upgrade when owned.
// ============================================================

type Props = {
  oven: OvenState;
  slotIndex: number;
  isOwned: boolean;
  canUpgrade: boolean; // whether the player can currently afford an upgrade
  onClick: (slotIndex: number) => void;
};

// ============================================================
// BRICK OVEN BODY
// ============================================================
function OvenBody({ level }: { level: number }) {
  // Higher levels → slightly warmer, more decorative brick
  const brickColor =
    level >= 4 ? "#8B2E1A" : // deep red at max level
    level >= 3 ? "#A03A20" :
    level >= 2 ? "#B5472A" :
    "#7A3E1D"; // base brick

  return (
    <>
      {/* Main dome — big half-sphere on top of the base */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <sphereGeometry args={[1.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={brickColor} roughness={0.85} />
      </mesh>

      {/* Base — box that holds the dome */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.8, 2.4]} />
        <meshStandardMaterial color={brickColor} roughness={0.9} />
      </mesh>

      {/* Front archway / oven mouth — darker recess */}
      <mesh position={[0, 0.55, 1.23]} castShadow>
        <boxGeometry args={[1.1, 0.9, 0.05]} />
        <meshStandardMaterial color="#0A0A0A" roughness={0.95} />
      </mesh>

      {/* Chimney */}
      <mesh position={[0, 1.9, -0.6]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.9, 12]} />
        <meshStandardMaterial color="#3A2416" roughness={0.9} />
      </mesh>

      {/* Chimney cap */}
      <mesh position={[0, 2.4, -0.6]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 12]} />
        <meshStandardMaterial color="#2A1810" roughness={0.9} />
      </mesh>

      {/* Decorative rim around the dome base */}
      <mesh position={[0, 1.3, 0]}>
        <torusGeometry args={[1.22, 0.08, 8, 32]} />
        <meshStandardMaterial
          color={level >= 5 ? "#FFD700" : "#4A2E1A"}
          metalness={level >= 5 ? 0.7 : 0.1}
          roughness={level >= 5 ? 0.3 : 0.85}
        />
      </mesh>
    </>
  );
}

// ============================================================
// FIRE GLOW — animated flicker inside the oven mouth
// ============================================================
function FireGlow({ level }: { level: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Higher level → bigger, brighter fire
  const intensity = 0.8 + level * 0.35;
  const fireSize = 0.55 + level * 0.08;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Flicker: combine two sine waves for organic fire rhythm
    const flicker = Math.sin(t * 8) * 0.15 + Math.sin(t * 13) * 0.1;
    if (lightRef.current) {
      lightRef.current.intensity = intensity + flicker;
    }
    if (meshRef.current) {
      const scale = 1 + flicker * 0.5;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <>
      {/* Point light spilling from the oven mouth */}
      <pointLight
        ref={lightRef}
        position={[0, 0.55, 1.6]}
        color="#FF6B00"
        intensity={intensity}
        distance={6}
        decay={2}
      />

      {/* Glowing sphere inside the mouth */}
      <mesh ref={meshRef} position={[0, 0.55, 1.15]}>
        <sphereGeometry args={[fireSize, 12, 12]} />
        <meshBasicMaterial
          color="#FF8C00"
          transparent
          opacity={0.85}
        />
      </mesh>
    </>
  );
}

// ============================================================
// SPINNING PIZZA — visible through the oven mouth
// ============================================================
function SpinningPizza({ level }: { level: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Spin faster at higher levels
      groupRef.current.rotation.z += delta * (0.8 + level * 0.4);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.55, 1.0]} rotation={[Math.PI / 2, 0, 0]}>
      {/* Pizza base (dough) */}
      <mesh castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.06, 16]} />
        <meshStandardMaterial color="#E8B96B" roughness={0.9} />
      </mesh>

      {/* Sauce (slightly smaller, sits on top) */}
      <mesh position={[0, 0.04, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.01, 16]} />
        <meshStandardMaterial color="#B22222" roughness={0.8} />
      </mesh>

      {/* Cheese + toppings (a few small spheres) */}
      {[
        [0.15, 0.05, 0.05, "#FFD700"],
        [-0.12, 0.05, 0.1, "#FFD700"],
        [0.05, 0.05, -0.15, "#8B0000"], // pepperoni
        [-0.18, 0.05, -0.08, "#8B0000"],
        [0.2, 0.05, -0.18, "#228B22"], // basil
        [-0.05, 0.05, 0.22, "#8B0000"],
      ].map(([x, y, z, color], i) => (
        <mesh
          key={i}
          position={[x as number, y as number, z as number]}
          rotation={[Math.PI, 0, 0]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color={color as string}
            roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================
// LEVEL INDICATOR — small stars above the oven showing level
// ============================================================
function LevelIndicator({ level }: { level: number }) {
  if (level < 1) return null;

  const totalWidth = (level - 1) * 0.3;
  const startX = -totalWidth / 2;

  return (
    <group position={[0, 2.85, 0]}>
      {Array.from({ length: level }).map((_, i) => (
        <mesh
          key={i}
          position={[startX + i * 0.3, 0, 0]}
          rotation={[0, 0, Math.PI / 4]}
        >
          <boxGeometry args={[0.14, 0.14, 0.05]} />
          <meshStandardMaterial
            color={level >= 5 ? "#FFD700" : "#FFFFFF"}
            emissive={level >= 5 ? "#FFD700" : "#FFFFFF"}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================
// UNOWNED SLOT — gray placeholder with "+" and cost
// ============================================================
function UnownedSlot({ canAfford }: { canAfford: boolean }) {
  const color = canAfford ? "#22C55E" : "#6B7280";

  return (
    <group>
      {/* Dashed base outline */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.1, 2.4]} />
        <meshStandardMaterial
          color="#2A2A2A"
          roughness={0.9}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* The "+" symbol */}
      <group position={[0, 0.6, 0]}>
        <mesh>
          <boxGeometry args={[0.7, 0.1, 0.1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[0.1, 0.7, 0.1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PizzaOven({
  oven,
  slotIndex,
  isOwned,
  canUpgrade,
  onClick,
}: Props) {
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick(slotIndex);
  };

  // ---- Unowned slot: render placeholder + clickable buy area ----
  if (!isOwned) {
    return (
      <group
        position={[0, 0, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
      >
        <UnownedSlot canAfford={canUpgrade} />

        {/* Invisible click plane — larger hitbox */}
        <mesh position={[0, 0.8, 0]} visible={false}>
          <boxGeometry args={[2.4, 1.6, 2.4]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>
    );
  }

  // ---- Owned oven: full oven with animations ----
  return (
    <group
      position={[0, 0, 0]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = canUpgrade ? "pointer" : "default";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      {/* Oven structure */}
      <group scale={[OVEN_SIZE[0] / 2.4, OVEN_SIZE[1] / 3, OVEN_SIZE[2] / 2.4]}>
        <OvenBody level={oven.level} />
      </group>

      {/* Fire + pizza (rendered at absolute positions, not scaled) */}
      <FireGlow level={oven.level} />
      <SpinningPizza level={oven.level} />

      {/* Level indicator floating above */}
      <LevelIndicator level={oven.level} />

      {/* Hover highlight — subtle glow ring under the oven when hovering */}
      {hovered && canUpgrade && oven.level < MAX_OVEN_LEVEL && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.6, 1.85, 32]} />
          <meshBasicMaterial
            color="#22C55E"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}