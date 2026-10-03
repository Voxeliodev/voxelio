"use client";

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTreeType, type TreeSpawn, type TreeTypeDef } from "../../../lib/lumberyard";

// ============================================================
// TREE — one tree in the lumberyard
// ============================================================
// Can be clicked to take damage. When HP hits zero, plays a
// falling animation. Regrows after `regrowMs`.
// ============================================================

type Props = {
  spawn: TreeSpawn;
  currentDamage: number;         // total damage already dealt
  onClick: (spawnId: string) => void;
  canDamage: boolean;            // true if player's axe is strong enough
};

export default function Tree({ spawn, currentDamage, onClick, canDamage }: Props) {
  const type = getTreeType(spawn.type);
  const [hovered, setHovered] = useState(false);
  const [chopFlash, setChopFlash] = useState(0); // 0-1, decays over time

  const trunkRef = useRef<THREE.Mesh>(null);
  const leavesRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);

  const maxHp = type.hp;
  const hpRemaining = Math.max(0, maxHp - currentDamage);
  const hpPercent = hpRemaining / maxHp;

  // Tree falls when dead — animate rotation
  const fallingRef = useRef(false);
  const fallProgressRef = useRef(0);
  const fallDirectionRef = useRef(1);

  const isDead = currentDamage >= maxHp;

  // Trigger fall animation when hp hits zero
  if (isDead && !fallingRef.current) {
    fallingRef.current = true;
    fallDirectionRef.current = Math.random() > 0.5 ? 1 : -1;
  }
  // Reset fall state when tree regrows
  if (!isDead && fallingRef.current) {
    fallingRef.current = false;
    fallProgressRef.current = 0;
  }

  useFrame((_, delta) => {
    // Chop flash decay
    if (chopFlash > 0) {
      setChopFlash((f) => Math.max(0, f - delta * 3));
    }

    // Fall animation
    if (fallingRef.current && groupRef.current) {
      fallProgressRef.current = Math.min(1, fallProgressRef.current + delta * 0.8);
      const angle = (fallProgressRef.current * Math.PI) / 2.2; // ~80 degrees
      groupRef.current.rotation.z = fallDirectionRef.current * angle;
    } else if (groupRef.current && !isDead) {
      // Gentle sway when alive
      const t = performance.now() / 1000;
      groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.01;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (isDead) return;
    if (!canDamage) return;
    setChopFlash(1);
    onClick(spawn.id);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = canDamage && !isDead ? "pointer" : "not-allowed";
  };
  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "";
  };

  return (
    <group ref={groupRef} position={spawn.position}>
      {/* TRUNK */}
      <mesh
        ref={trunkRef}
        position={[0, (type.trunkHeight * type.scale) / 2, 0]}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <cylinderGeometry
          args={[
            type.scale * 0.35,
            type.scale * 0.42,
            type.trunkHeight * type.scale,
            10,
          ]}
        />
        <meshStandardMaterial
          color={hovered && canDamage && !isDead ? "#A16207" : type.trunkColor}
          roughness={0.9}
          emissive={chopFlash > 0 ? new THREE.Color("#DC2626") : new THREE.Color(0, 0, 0)}
          emissiveIntensity={chopFlash * 0.6}
        />
      </mesh>

      {/* LEAVES — stacked spheres */}
      <group
        ref={leavesRef}
        position={[0, type.trunkHeight * type.scale + type.leavesRadius * 0.6, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <mesh castShadow>
          <sphereGeometry args={[type.leavesRadius * type.scale, 12, 12]} />
          <meshStandardMaterial
            color={hovered && canDamage && !isDead ? "#22C55E" : type.leavesColor}
            roughness={0.85}
            emissive={chopFlash > 0 ? new THREE.Color("#DC2626") : new THREE.Color(0, 0, 0)}
            emissiveIntensity={chopFlash * 0.4}
          />
        </mesh>
        <mesh position={[0, type.leavesRadius * type.scale * 0.8, 0]} castShadow>
          <sphereGeometry args={[type.leavesRadius * type.scale * 0.7, 10, 10]} />
          <meshStandardMaterial
            color={hovered && canDamage && !isDead ? "#22C55E" : type.leavesColor}
            roughness={0.85}
          />
        </mesh>
      </group>

      {/* HP BAR — floating above tree, only if damaged and not dead */}
      {currentDamage > 0 && !isDead && (
        <group position={[0, type.trunkHeight * type.scale + type.leavesRadius * type.scale * 1.8, 0]}>
          {/* Background */}
          <mesh>
            <planeGeometry args={[1.5, 0.15]} />
            <meshBasicMaterial color="#1A1A2E" transparent opacity={0.75} />
          </mesh>
          {/* Foreground (HP fill) */}
          <mesh position={[(hpPercent - 1) * 0.75, 0, 0.01]}>
            <planeGeometry args={[1.5 * hpPercent, 0.15]} />
            <meshBasicMaterial
              color={hpPercent > 0.5 ? "#22C55E" : hpPercent > 0.25 ? "#FBBF24" : "#EF4444"}
            />
          </mesh>
        </group>
      )}

      {/* "NEEDS BETTER AXE" indicator when player can't chop */}
      {!canDamage && !isDead && (
        <group position={[0, type.trunkHeight * type.scale + type.leavesRadius * type.scale * 1.8, 0]}>
          <mesh>
            <planeGeometry args={[2, 0.4]} />
            <meshBasicMaterial color="#DC2626" transparent opacity={0.85} />
          </mesh>
        </group>
      )}
    </group>
  );
}