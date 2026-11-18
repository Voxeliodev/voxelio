"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls, Sky, Text, Sparkles } from "@react-three/drei";
import {
  RigidBody,
  CapsuleCollider,
  useRapier,
  type RapierRigidBody,
  Physics,
} from "@react-three/rapier";
import * as THREE from "three";
import { Character } from "../Avatar";
import { getCurrentUser, updateUser, type AvatarConfig } from "../../../lib/auth";
import { WONDERLAND_CHALLENGES } from "../../../lib/wonderland";

// ============================================================
// CONSTANTS (Copied from ObbyPlayer)
// ============================================================
const KEY_MAP = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
  { name: "jump", keys: [" ", "Space"] },
];

const MOVE_SPEED = 8;
const JUMP_VELOCITY = 11;
const CAMERA_DIST = 9;
const CAMERA_HEIGHT = 2.5;
const CAMERA_MIN_PITCH = -0.5;
const CAMERA_MAX_PITCH = 1.2;
const ROT_LERP = 14;
const AIR_CONTROL = 0.55;
const COYOTE_TIME = 0.12;

const CAPSULE_HALF_HEIGHT = 0.5;
const CAPSULE_RADIUS = 0.35;
const CAPSULE_TOTAL = CAPSULE_HALF_HEIGHT * 2 + CAPSULE_RADIUS * 2;

const SPAWN_YAW = Math.PI;
// FIXED: was Math.PI (which made the character face backwards while walking forward)
const VISUAL_FACING_OFFSET = 0;
const VISUAL_OFFSET_Y = 0.65;

// Challenge Positions
const CHALLENGE_POSITIONS = {
  "ch-1": [-15, 0, -15], // Frozen Lake
  "ch-2": [0, 0, -25],   // Snow Fort
  "ch-3": [15, 0, -15],  // Gingerbread House
};

// ============================================================
// PLAYER (Copied from ObbyPlayer)
// ============================================================
function WonderlandPlayer({
  config,
  onNearPillar,
}: {
  config: AvatarConfig;
  onNearPillar: (id: string | null) => void;
}) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const visualRef = useRef<THREE.Group>(null);
  const [, getKeys] = useKeyboardControls();
  const { camera } = useThree();
  const { rapier, world } = useRapier();

  const [walking, setWalking] = useState(false);
  const walkingRef = useRef(false);

  const cameraYawRef = useRef(SPAWN_YAW);
  const cameraPitchRef = useRef(0.35);
  const velocityXZRef = useRef(new THREE.Vector2(0, 0));

  const jumpCooldownRef = useRef(0);
  const groundedRef = useRef(false);
  const coyoteTimerRef = useRef(0);
  const jumpRequestedRef = useRef(false);
  const lastNearRef = useRef<string | null>(null);

  // Spawn reset
  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.setTranslation({ x: 0, y: 2, z: 15 }, true);
    bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }, []);

  // MOUSE LOOK (Right-click)
  useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        (canvas as HTMLElement).style.cursor = "grabbing";
        e.preventDefault();
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      cameraYawRef.current -= dx * 0.005;
      cameraPitchRef.current = Math.max(
        CAMERA_MIN_PITCH,
        Math.min(CAMERA_MAX_PITCH, cameraPitchRef.current + dy * 0.005)
      );
    };
    const onMouseUp = () => {
      dragging = false;
      (canvas as HTMLElement).style.cursor = "grab";
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    (canvas as HTMLElement).style.cursor = "grab";
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      (canvas as HTMLElement).style.cursor = "";
    };
  }, []);

  function checkGrounded(): boolean {
    if (!bodyRef.current) return false;
    const pos = bodyRef.current.translation();
    const rayOriginY = pos.y - CAPSULE_TOTAL / 2 + 0.05;
    const ray = new rapier.Ray(
      { x: pos.x, y: rayOriginY, z: pos.z },
      { x: 0, y: -1, z: 0 }
    );
    const hit = world.castRay(ray, 0.15, true, undefined, undefined, undefined, bodyRef.current);
    return hit !== null;
  }

  useFrame((_, delta) => {
    if (!bodyRef.current) return;
    const keys = getKeys();
    const dt = Math.min(delta, 0.05);

    const grounded = checkGrounded();
    if (grounded) {
      coyoteTimerRef.current = COYOTE_TIME;
    } else {
      coyoteTimerRef.current = Math.max(0, coyoteTimerRef.current - dt);
    }
    groundedRef.current = grounded;

    let localX = 0;
    let localZ = 0;
    if (keys.forward) localZ += 1;
    if (keys.backward) localZ -= 1;
    if (keys.left) localX += 1;
    if (keys.right) localX -= 1;

    const inputLen = Math.hypot(localX, localZ);
    if (inputLen > 0.001) {
      localX /= inputLen;
      localZ /= inputLen;
    }

    const yaw = cameraYawRef.current;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const worldX = localX * cosY + localZ * sinY;
    const worldZ = -localX * sinY + localZ * cosY;

    const rate = grounded ? 14 : 14 * AIR_CONTROL;
    const targetVX = worldX * MOVE_SPEED;
    const targetVZ = worldZ * MOVE_SPEED;
    velocityXZRef.current.x += (targetVX - velocityXZRef.current.x) * Math.min(1, rate * dt);
    velocityXZRef.current.y += (targetVZ - velocityXZRef.current.y) * Math.min(1, rate * dt);

    const current = bodyRef.current.linvel();
    bodyRef.current.setLinvel(
      { x: velocityXZRef.current.x, y: current.y, z: velocityXZRef.current.y },
      true
    );

    jumpCooldownRef.current -= dt;

    if (keys.jump && jumpCooldownRef.current <= 0) {
      jumpRequestedRef.current = true;
    }

    const canJump = grounded || coyoteTimerRef.current > 0;
    if (jumpRequestedRef.current && canJump && jumpCooldownRef.current <= 0) {
      bodyRef.current.setLinvel({ x: current.x, y: JUMP_VELOCITY, z: current.z }, true);
      jumpCooldownRef.current = 0.2;
      coyoteTimerRef.current = 0;
      groundedRef.current = false;
      jumpRequestedRef.current = false;
    }

    const pos = bodyRef.current.translation();
    const speed = Math.hypot(velocityXZRef.current.x, velocityXZRef.current.y);
    const isMoving = speed > 0.8;
    if (isMoving !== walkingRef.current) {
      walkingRef.current = isMoving;
      setWalking(isMoving);
    }

    if (isMoving && visualRef.current) {
      const targetAngle = Math.atan2(velocityXZRef.current.x, velocityXZRef.current.y);
      const facingTarget = targetAngle + VISUAL_FACING_OFFSET;
      let diff = facingTarget - visualRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      visualRef.current.rotation.y += diff * Math.min(1, ROT_LERP * dt);
    }

    // Respawn if fell off map
    if (pos.y < -15) {
      bodyRef.current.setTranslation({ x: 0, y: 2, z: 15 }, true);
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    // Camera Update
    if (visualRef.current) {
      const camYaw = cameraYawRef.current;
      const camPitch = cameraPitchRef.current;
      const horizDist = CAMERA_DIST * Math.cos(camPitch);
      const vertDist = CAMERA_DIST * Math.sin(camPitch);
      const lookX = pos.x;
      const lookY = pos.y + 0.3;
      const lookZ = pos.z;
      const targetCamX = lookX - Math.sin(camYaw) * horizDist;
      const targetCamY = lookY + CAMERA_HEIGHT + vertDist;
      const targetCamZ = lookZ - Math.cos(camYaw) * horizDist;

      const camLerp = Math.min(1, dt * 10);
      camera.position.x += (targetCamX - camera.position.x) * camLerp;
      camera.position.y += (targetCamY - camera.position.y) * camLerp;
      camera.position.z += (targetCamZ - camera.position.z) * camLerp;
      camera.lookAt(lookX, lookY, lookZ);
    }

    // Check Proximity to Challenges
    let currentlyNear: string | null = null;
    for (const [id, cPos] of Object.entries(CHALLENGE_POSITIONS)) {
      const dist = Math.hypot(pos.x - cPos[0], pos.z - cPos[2]);
      if (dist < 7) {
        currentlyNear = id;
        break;
      }
    }

    if (currentlyNear !== lastNearRef.current) {
      lastNearRef.current = currentlyNear;
      onNearPillar(currentlyNear);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      name="wonderland-player"
      position={[0, 2, 15]}
      colliders={false}
      enabledRotations={[false, false, false]}
      ccd
      friction={0.4}
      restitution={0}
      mass={1}
    >
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
      <group ref={visualRef} position={[0, VISUAL_OFFSET_Y, 0]}>
        <Character config={config} hideAccessory walking={walking} />
      </group>
    </RigidBody>
  );
}

// ============================================================
// ENVIRONMENT (Physics Colliders)
// ============================================================
function SnowGround() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#F0F8FF" roughness={0.9} />
      </mesh>
    </RigidBody>
  );
}

function FrozenLake() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15, 0.05, -15]} receiveShadow>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.1} metalness={0.8} />
      </mesh>
    </RigidBody>
  );
}

function GingerbreadHouse() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <group position={[15, 0, -15]}>
        <mesh position={[0, 3, 0]} castShadow receiveShadow>
          <boxGeometry args={[6, 6, 6]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0, 7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
          <coneGeometry args={[5, 4, 4]} />
          <meshStandardMaterial color="#A52A2A" />
        </mesh>
        <mesh position={[0, 1.5, 3.05]} castShadow>
          <boxGeometry args={[1.5, 3, 0.2]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
      </group>
    </RigidBody>
  );
}

function SnowFort() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
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
    </RigidBody>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function WonderlandGameMain({
  config,
  userId,
  username,
  world,
  inputDisabled,
  isTouchDevice,
}: {
  config: AvatarConfig;
  userId: string;
  username: string;
  world: any;
  inputDisabled: boolean;
  isTouchDevice: boolean;
}) {
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
        <Canvas shadows camera={{ position: [0, 6, 20], fov: 60 }} dpr={[1, 2]}>
          <Physics gravity={[0, -30, 0]} timeStep="vary">
            <Sky sunPosition={[100, 50, 100]} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[20, 40, 20]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
            <hemisphereLight args={["#ffffff", "#88aa88", 0.4]} />

            <Sparkles count={500} scale={50} size={2} speed={0.4} opacity={0.6} color="#FFFFFF" />

            <SnowGround />
            <FrozenLake />
            <SnowFort />
            <GingerbreadHouse />

            <Text position={[-15, 8, -15]} fontSize={3} color="#00E5FF">⛸️</Text>
            <Text position={[0, 6, -25]} fontSize={3} color="#FFFFFF">❄️</Text>
            <Text position={[15, 9, -15]} fontSize={3} color="#FF69B4">🍭</Text>

            <WonderlandPlayer 
              config={config} 
              onNearPillar={setNearChallenge} 
            />
          </Physics>
        </Canvas>
      </KeyboardControls>

      {/* Claim UI */}
      {nearChallenge && !inputDisabled && (
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