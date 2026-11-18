"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls, Sky, Text } from "@react-three/drei";
import { Character } from "../components/Avatar";
import AccountBadge from "../components/AccountBadge";
import { getCurrentUser, formatVoxbux, updateUser } from "../../lib/auth";
import { WONDERLAND_CHALLENGES } from "../../lib/wonderland";
import type { User, AvatarConfig } from "../../lib/auth";

// ============================================================
// VOXELIO GAME — Phase 1: Solo walkable world & Wonderland Obby
// ============================================================

const KEY_MAP = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
  { name: "jump", keys: [" ", "Space"] }, // 👈 Added jump
];

const MOVE_SPEED = 6; 
const JUMP_FORCE = 8;
const GRAVITY = 20;

const CHARACTER_Y_OFFSET = 1.6;

// ============================================================
// NORMAL WORLD (Grassy)
// ============================================================
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#4ADE80" roughness={0.95} />
    </mesh>
  );
}

function Obstacle({ position, color }: { position: [number, number, number]; color: string; }) {
  return (
    <mesh position={[position[0], position[1] / 2, position[2]]} castShadow receiveShadow>
      <boxGeometry args={[position[0] === 0 ? 1 : 1, position[1], position[0] === 0 ? 1 : 1]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

// ============================================================
// WONDERLAND OBBY WORLD
// ============================================================
const PLATFORMS = [
  { pos: [0, 0, 0], size: [8, 1, 8] },       // Start
  { pos: [0, 1, -8], size: [4, 1, 4] },      // Jump 1
  { pos: [4, 2, -14], size: [4, 1, 4] },     // Jump 2
  { pos: [-4, 3, -20], size: [4, 1, 4] },    // Jump 3
  { pos: [0, 4, -26], size: [10, 1, 10] },   // Final Island
];

function WonderlandObby({ 
  onHitPillar 
}: { 
  onHitPillar: (id: string, rewardId: string) => void 
}) {
  return (
    <>
      <Sky sunPosition={[100, 50, 100]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 30, 20]} intensity={1.2} castShadow />

      {/* Snowy Ground Background */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#F0F8FF" />
      </mesh>

      {/* Platforms */}
      {PLATFORMS.map((p, i) => (
        <mesh key={i} position={p.pos as [number, number, number]} receiveShadow castShadow>
          <boxGeometry args={p.size as [number, number, number]} />
          <meshStandardMaterial color={i === 0 || i === PLATFORMS.length - 1 ? "#E0F2FE" : "#BAE6FD"} />
        </mesh>
      ))}

      {/* Challenge Pillars */}
      {WONDERLAND_CHALLENGES.map((ch, index) => {
        const x = -4 + (index * 4);
        return (
          <group 
            key={ch.id} 
            position={[x, 4.5, -26]} 
            onClick={(e) => {
              e.stopPropagation();
              onHitPillar(ch.id, ch.rewardItemId);
            }}
          >
            <mesh castShadow>
              <cylinderGeometry args={[1, 1, 5, 16]} />
              <meshStandardMaterial 
                color={index === 0 ? "#00E5FF" : index === 1 ? "#FFFFFF" : "#FF69B4"} 
                emissive={index === 0 ? "#00E5FF" : index === 1 ? "#FFFFFF" : "#FF69B4"}
                emissiveIntensity={0.5}
              />
            </mesh>
            <Text position={[0, 3, 0]} fontSize={0.8} color="white" outlineWidth={0.05} outlineColor="#000">
              {ch.emoji}
            </Text>
          </group>
        );
      })}
    </>
  );
}

// ============================================================
// PLAYER — WASD movement + Jump Physics
// ============================================================
function Player({ config, isObby }: { config: AvatarConfig, isObby: boolean }) {
  const [, getKeys] = useKeyboardControls();
  const groupRef = useRef<THREE.Group>(null);
  
  // Physics state
  const position = useRef(new THREE.Vector3(0, CHARACTER_Y_OFFSET, 0));
  const velocityY = useRef(0);
  const isGrounded = useRef(true);
  const facing = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const keys = getKeys();
    let dx = 0;
    let dz = 0;
    if (keys.forward) dz -= 1;
    if (keys.backward) dz += 1;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;

    const len = Math.hypot(dx, dz);

    // Rotate and move X/Z
    if (len > 0) {
      dx /= len;
      dz /= len;
      const targetAngle = Math.atan2(dx, dz);
      
      let diff = targetAngle - groupRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * Math.min(1, delta * 12);
      facing.current = groupRef.current.rotation.y;

      position.current.x += Math.sin(facing.current) * MOVE_SPEED * delta;
      position.current.z += Math.cos(facing.current) * MOVE_SPEED * delta;
    }

    // Jumping & Gravity
    if (isObby) {
      // Jump
      if (keys.jump && isGrounded.current) {
        velocityY.current = JUMP_FORCE;
        isGrounded.current = false;
      }

      velocityY.current -= GRAVITY * delta;
      position.current.y += velocityY.current * delta;

      // Simple Platform Collision
      isGrounded.current = false;
      const playerBottom = position.current.y - CHARACTER_Y_OFFSET;

      // Check if we landed on a platform
      for (const p of PLATFORMS) {
        const platTop = p.pos[1] + p.size[1] / 2;
        const platMinX = p.pos[0] - p.size[0] / 2;
        const platMaxX = p.pos[0] + p.size[0] / 2;
        const platMinZ = p.pos[2] - p.size[2] / 2;
        const platMaxZ = p.pos[2] + p.size[2] / 2;

        if (
          position.current.x >= platMinX && position.current.x <= platMaxX &&
          position.current.z >= platMinZ && position.current.z <= platMaxZ &&
          playerBottom <= platTop && playerBottom > platTop - 1.5 // tolerance
        ) {
          position.current.y = platTop + CHARACTER_Y_OFFSET;
          velocityY.current = 0;
          isGrounded.current = true;
          break;
        }
      }

      // Respawn if fell off
      if (position.current.y < -20) {
        position.current.set(0, CHARACTER_Y_OFFSET + 2, 0);
        velocityY.current = 0;
      }
    } else {
      // Normal world ground
      position.current.y = CHARACTER_Y_OFFSET;
    }

    // Apply position
    groupRef.current.position.copy(position.current);

    // Camera follow
    const targetCamX = position.current.x - Math.sin(facing.current) * 8;
    const targetCamZ = position.current.z - Math.cos(facing.current) * 8;
    const targetCamY = position.current.y + 4;

    state.camera.position.x += (targetCamX - state.camera.position.x) * Math.min(1, delta * 4);
    state.camera.position.y += (targetCamY - state.camera.position.y) * Math.min(1, delta * 4);
    state.camera.position.z += (targetCamZ - state.camera.position.z) * Math.min(1, delta * 4);

    state.camera.lookAt(position.current.x, position.current.y, position.current.z);
  });

  return (
    <group ref={groupRef} position={[0, CHARACTER_Y_OFFSET, 0]}>
      <Character config={config} />
    </group>
  );
}

// ============================================================
// PAGE COMPONENT
// ============================================================
export default function PlayPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // 👇 Detect which world to load based on URL query
  const [worldId, setWorldId] = useState<string>("default");

  useEffect(() => {
    setUser(getCurrentUser());
    setMounted(true);

    // Check URL for the world id (e.g. ?world=wonderland or ?id=wonderland)
    const params = new URLSearchParams(window.location.search);
    const id = params.get("world") || params.get("id") || "default";
    setWorldId(id);
  }, []);

  const handleHitPillar = (challengeId: string, rewardItemId: string) => {
    if (!user) return;
    const freshUser = getCurrentUser();
    if (!freshUser) return;

    const currentBadges = freshUser.wonderlandBadges || [];
    if (!currentBadges.includes(challengeId)) {
      const newBadges = [...currentBadges, challengeId];
      const newOwned = freshUser.ownedItems.includes(rewardItemId) 
        ? freshUser.ownedItems 
        : [...freshUser.ownedItems, rewardItemId];
      
      updateUser({ 
        ...freshUser, 
        ownedItems: newOwned, 
        wonderlandBadges: newBadges 
      });
      
      alert("🎉 Challenge Complete! You unlocked a new item! Check your inventory.");
      setUser(getCurrentUser()); // Refresh local user state
    } else {
      alert("You already completed this challenge!");
    }
  };

  if (!mounted) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-[#1A1A2E] flex flex-col items-center justify-center text-white p-6">
        <h1 className="text-2xl font-black mb-2">Sign in to play</h1>
        <Link href="/signin" className="bg-[#7B4FF7] text-white px-6 py-2 rounded">Sign In</Link>
      </div>
    );
  }

  const isWonderland = worldId === "wonderland";

  return (
    <div className="fixed inset-0 bg-black">
      <KeyboardControls map={KEY_MAP}>
        <Canvas shadows camera={{ position: [0, 4, 8], fov: 55 }} dpr={[1, 2]}>
          {isWonderland ? (
             <WonderlandObby onHitPillar={handleHitPillar} />
          ) : (
            <>
              <Sky sunPosition={[100, 50, 100]} />
              <ambientLight intensity={0.55} />
              <directionalLight position={[20, 30, 20]} intensity={1.1} castShadow />
              <Ground />
              <Obstacle position={[5, 2, -5]} color="#7B2FF7" />
              <Obstacle position={[-8, 3, -3]} color="#00B8D4" />
            </>
          )}
          <Player config={user.avatarConfig} isObby={isWonderland} />
        </Canvas>
      </KeyboardControls>

      {/* OVERLAYS */}
      <div className="absolute top-3 left-3 flex gap-2 pointer-events-auto">
        <Link href="/" className="bg-black/60 text-white text-xs font-bold px-3 py-2 rounded">
          ← Home
        </Link>
      </div>

      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs flex items-center gap-2 px-3 py-2 rounded">
        <span className="font-bold inline-flex items-center">
          {user.username}
          <AccountBadge username={user.username} userId={user.id} size={12} />
        </span>
        <span className="text-[#FFD700] font-bold">{formatVoxbux(user.voxbux)}</span>
      </div>

      <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[11px] p-3 rounded space-y-1">
        <p className="font-bold mb-1">{isWonderland ? "❄️ Wonderland Controls" : "🎮 Controls"}</p>
        <p><kbd className="bg-white/10 px-1 rounded">W</kbd> <kbd className="bg-white/10 px-1 rounded">A</kbd> <kbd className="bg-white/10 px-1 rounded">S</kbd> <kbd className="bg-white/10 px-1 rounded">D</kbd> — Move</p>
        {isWonderland && (
          <p className="text-yellow-300 font-bold mt-1">
            <kbd className="bg-white/10 px-1 rounded">SPACE</kbd> to Jump!
          </p>
        )}
      </div>
    </div>
  );
}