"use client";

import { useState, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls, Sky, Text, Sparkles } from "@react-three/drei";
import { Character } from "../Avatar";
import { getCurrentUser, updateUser, type AvatarConfig } from "../../../lib/auth";
import type { World } from "../../../lib/worlds";
import { WONDERLAND_CHALLENGES } from "../../../lib/wonderland";

const KEY_MAP = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
];

const MOVE_SPEED = 8;
const CAMERA_DISTANCE = 8;
const CAMERA_HEIGHT = 4;
const CAMERA_LOOK_HEIGHT = 1.2;
const ROTATION_LERP = 12;
const CHARACTER_Y_OFFSET = 1.6;

// ============================================================
// WINTER SCENERY
// ============================================================
function SnowGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#F0F8FF" roughness={0.9} />
    </mesh>
  );
}

function FrozenLake() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15, 0.05, -15]} receiveShadow>
      <circleGeometry args={[8, 32]} />
      <meshStandardMaterial color="#87CEEB" roughness={0.1} metalness={0.8} />
    </mesh>
  );
}

function GingerbreadHouse() {
  return (
    <group position={[15, 0, -15]}>
      {/* Walls */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 6, 6]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[5, 4, 4]} />
        <meshStandardMaterial color="#A52A2A" />
      </mesh>
      {/* Door */}
      <mesh position={[0, 1.5, 3.05]} castShadow>
        <boxGeometry args={[1.5, 3, 0.2]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>
    </group>
  );
}

function SnowFort() {
  return (
    <group position={[0, 0, -25]}>
      <mesh position={[-3, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 2, 3]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[3, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 2, 3]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 2.5, -2]} castShadow receiveShadow>
        <boxGeometry args={[9, 1, 3]} />
        <meshStandardMaterial color="#E2E8F0" />
      </mesh>
    </group>
  );
}

// ============================================================
// PLAYER
// ============================================================
function Player({ config, onNearPillar }: { config: AvatarConfig, onNearPillar: (id: string | null) => void }) {
  const [, getKeys] = useKeyboardControls();
  const groupRef = useRef<THREE.Group>(null);
  
  const position = useRef(new THREE.Vector3(0, CHARACTER_Y_OFFSET, 10));
  const facing = useRef(0);
  const lastNear = useRef<string | null>(null);

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
    if (len > 0) {
      dx /= len;
      dz /= len;
      const targetAngle = Math.atan2(dx, dz);
      
      let diff = targetAngle - groupRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * Math.min(1, delta * ROTATION_LERP);
      facing.current = groupRef.current.rotation.y;

      position.current.x += Math.sin(facing.current) * MOVE_SPEED * delta;
      position.current.z += Math.cos(facing.current) * MOVE_SPEED * delta;
    }

    groupRef.current.position.copy(position.current);

    // Camera follow
    const targetCamX = position.current.x - Math.sin(facing.current) * CAMERA_DISTANCE;
    const targetCamZ = position.current.z - Math.cos(facing.current) * CAMERA_DISTANCE;
    const targetCamY = position.current.y + CAMERA_HEIGHT;

    state.camera.position.x += (targetCamX - state.camera.position.x) * Math.min(1, delta * 4);
    state.camera.position.y += (targetCamY - state.camera.position.y) * Math.min(1, delta * 4);
    state.camera.position.z += (targetCamZ - state.camera.position.z) * Math.min(1, delta * 4);

    state.camera.lookAt(
      position.current.x,
      position.current.y + CAMERA_LOOK_HEIGHT - CHARACTER_Y_OFFSET,
      position.current.z
    );

    // Check Proximity to challenges
    let currentlyNear: string | null = null;
    if (Math.hypot(position.current.x - (-15), position.current.z - (-15)) < 6) currentlyNear = "ch-1"; // Lake
    else if (Math.hypot(position.current.x - (0), position.current.z - (-22)) < 6) currentlyNear = "ch-2"; // Fort
    else if (Math.hypot(position.current.x - (15), position.current.z - (-15)) < 6) currentlyNear = "ch-3"; // House

    if (currentlyNear !== lastNear.current) {
      lastNear.current = currentlyNear;
      onNearPillar(currentlyNear);
    }
  });

  return (
    <group ref={groupRef} position={[0, CHARACTER_Y_OFFSET, 10]}>
      <Character config={config} />
    </group>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function WonderlandGameMain({ config }: { config: AvatarConfig }) {
  const [nearChallenge, setNearChallenge] = useState<string | null>(null);

  const handleClaim = (challengeId: string, rewardItemId: string) => {
    const freshUser = getCurrentUser();
    if (!freshUser) return;

    const currentBadges = freshUser.wonderlandBadges || [];
    if (!currentBadges.includes(challengeId)) {
      const newBadges = [...currentBadges, challengeId];
      const newOwned = freshUser.ownedItems.includes(rewardItemId) 
        ? freshUser.ownedItems 
        : [...freshUser.ownedItems, rewardItemId];
      
      updateUser({ ...freshUser, ownedItems: newOwned, wonderlandBadges: newBadges });
      alert("🎉 Challenge Complete! You unlocked a new item! Check your inventory.");
      setNearChallenge(null);
    } else {
      alert("You already completed this challenge!");
    }
  };

  return (
    <div className="absolute inset-0 bg-black">
      <KeyboardControls map={KEY_MAP}>
        <Canvas shadows camera={{ position: [0, 5, 10], fov: 55 }} dpr={[1, 2]}>
          <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[20, 30, 20]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />

          {/* Snow particles falling */}
          <Sparkles count={500} scale={50} size={2} speed={0.4} opacity={0.6} color="#FFFFFF" />

          <SnowGround />
          
          {/* The 3 Challenge Areas */}
          <FrozenLake />
          <SnowFort />
          <GingerbreadHouse />

          {/* Floating icons above the areas */}
          <Text position={[-15, 8, -15]} fontSize={3} color="#00E5FF">⛸️</Text>
          <Text position={[0, 6, -25]} fontSize={3} color="#FFFFFF">❄️</Text>
          <Text position={[15, 9, -15]} fontSize={3} color="#FF69B4">🍭</Text>

          <Player config={config} onNearPillar={setNearChallenge} />
        </Canvas>
      </KeyboardControls>

      {/* Claim UI */}
      {nearChallenge && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/95 px-8 py-4 rounded-xl shadow-2xl border-4 border-[#1E3A8A] text-center animate-bounce z-50">
          <p className="font-black text-xl text-[#1E3A8A] mb-2">Challenge Found!</p>
          <button 
            onClick={() => {
              const pillar = WONDERLAND_CHALLENGES.find(c => c.id === nearChallenge);
              if (pillar) handleClaim(pillar.id, pillar.rewardItemId);
            }}
            className="bg-[#FFD700] hover:bg-[#FFC000] text-[#1E3A8A] font-black px-6 py-2 rounded-lg border-2 border-[#B45309] transition shadow-md"
          >
            Claim Reward
          </button>
        </div>
      )}
    </div>
  );
}