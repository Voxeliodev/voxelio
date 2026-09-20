"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls, Sky } from "@react-three/drei";
import { Character } from "../components/Avatar";
import AccountBadge from "../components/AccountBadge";
import { getCurrentUser, formatVoxbux } from "../../lib/auth";
import type { User, AvatarConfig } from "../../lib/auth";

// ============================================================
// VOXELIO GAME — Phase 1: Solo walkable world
// ============================================================

const KEY_MAP = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
];

const MOVE_SPEED = 6; // units per second
const SPRINT_MULT = 1.8;
const CAMERA_DISTANCE = 8;
const CAMERA_HEIGHT = 4;
const CAMERA_LOOK_HEIGHT = 1.2;
const ROTATION_LERP = 12;

// Character origin: feet at y=0 → group must be at +1.6
const CHARACTER_Y_OFFSET = 1.6;

// ============================================================
// GROUND
// ============================================================
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#4ADE80" roughness={0.95} />
    </mesh>
  );
}

// ============================================================
// A FEW DECORATIVE BLOCKS SO YOU CAN SEE MOVEMENT
// ============================================================
function Obstacle({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={[position[0], position[1] / 2, position[2]]} castShadow receiveShadow>
      <boxGeometry args={[position[0] === 0 ? 1 : 1, position[1], position[0] === 0 ? 1 : 1]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

// ============================================================
// PLAYER — WASD movement + third-person camera
// ============================================================
function Player({ config }: { config: AvatarConfig }) {
  const [, getKeys] = useKeyboardControls();
  const groupRef = useRef<THREE.Group>(null);
  const positionRef = useRef(new THREE.Vector3(0, CHARACTER_Y_OFFSET, 0));
  const facingRef = useRef(0);
  const velocityRef = useRef(new THREE.Vector3());

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

    // Rotate to face movement direction
    if (len > 0) {
      dx /= len;
      dz /= len;

      const sprint = false; // TODO: shift key later
      const speed = MOVE_SPEED * (sprint ? SPRINT_MULT : 1);

      // Target facing angle
      const targetAngle = Math.atan2(dx, dz);

      // Smoothly rotate
      const current = groupRef.current.rotation.y;
      let diff = targetAngle - current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y = current + diff * Math.min(1, delta * ROTATION_LERP);

      facingRef.current = groupRef.current.rotation.y;

      // Move forward in facing direction
      velocityRef.current.set(
        Math.sin(facingRef.current) * speed,
        0,
        Math.cos(facingRef.current) * speed
      );

      positionRef.current.x += velocityRef.current.x * delta;
      positionRef.current.z += velocityRef.current.z * delta;
    }

    // Keep in bounds
    const bound = 95;
    positionRef.current.x = Math.max(-bound, Math.min(bound, positionRef.current.x));
    positionRef.current.z = Math.max(-bound, Math.min(bound, positionRef.current.z));

    // Apply to group
    groupRef.current.position.copy(positionRef.current);

    // ===== Third-person camera follow =====
    const targetCamX = positionRef.current.x - Math.sin(facingRef.current) * CAMERA_DISTANCE;
    const targetCamZ = positionRef.current.z - Math.cos(facingRef.current) * CAMERA_DISTANCE;
    const targetCamY = positionRef.current.y + CAMERA_HEIGHT;

    const camLerp = Math.min(1, delta * 4);
    state.camera.position.x += (targetCamX - state.camera.position.x) * camLerp;
    state.camera.position.y += (targetCamY - state.camera.position.y) * camLerp;
    state.camera.position.z += (targetCamZ - state.camera.position.z) * camLerp;

    state.camera.lookAt(
      positionRef.current.x,
      positionRef.current.y + CAMERA_LOOK_HEIGHT - CHARACTER_Y_OFFSET,
      positionRef.current.z
    );
  });

  return (
    <group ref={groupRef} position={[0, CHARACTER_Y_OFFSET, 0]}>
      <Character config={config} />
    </group>
  );
}

// ============================================================
// THE SCENE
// ============================================================
function World({ config }: { config: AvatarConfig }) {
  return (
    <>
      <Sky sunPosition={[100, 50, 100]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <hemisphereLight args={["#ffffff", "#88aa88", 0.4]} />

      <Ground />

      {/* Some blocks to run around */}
      <Obstacle position={[5, 2, -5]} color="#7B2FF7" />
      <Obstacle position={[-8, 3, -3]} color="#00B8D4" />
      <Obstacle position={[10, 1.5, 8]} color="#FFD700" />
      <Obstacle position={[-4, 4, 6]} color="#EC4899" />
      <Obstacle position={[0, 6, -15]} color="#4B5563" />

      <Player config={config} />
    </>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function PlayPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-[#1A1A2E] flex flex-col items-center justify-center text-white p-6">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-black mb-2">Sign in to play</h1>
        <p className="text-sm text-white/70 mb-6">
          You need an account to enter the Voxelio world.
        </p>
        <Link
          href="/signin"
          className="bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">

      {/* The game */}
      <KeyboardControls map={KEY_MAP}>
        <Canvas
          shadows
          camera={{ position: [0, 4, 8], fov: 55 }}
          dpr={[1, 2]}
          style={{ background: "#87CEEB" }}
        >
          <World config={user.avatarConfig} />
        </Canvas>
      </KeyboardControls>

      {/* Overlays */}
      <div className="absolute top-3 left-3 flex gap-2 pointer-events-auto">
        <Link
          href="/"
          className="bg-black/60 hover:bg-black/80 backdrop-blur text-white text-xs font-bold px-3 py-2 rounded border border-white/20"
        >
          ← Home
        </Link>
      </div>

      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-xs flex items-center gap-2">
        <span className="font-bold inline-flex items-center">
          {user.username}
          <AccountBadge username={user.username} userId={user.id} size={12} />
        </span>
        <span className="text-[#FFD700] font-bold">{formatVoxbux(user.voxbux)}</span>
      </div>

      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-[11px] space-y-1">
        <p className="font-bold mb-1">🎮 Controls</p>
        <p><kbd className="bg-white/10 px-1 rounded">W</kbd> <kbd className="bg-white/10 px-1 rounded">A</kbd> <kbd className="bg-white/10 px-1 rounded">S</kbd> <kbd className="bg-white/10 px-1 rounded">D</kbd> — Move</p>
        <p className="text-white/60">Multiplayer coming soon</p>
      </div>
    </div>
  );
}