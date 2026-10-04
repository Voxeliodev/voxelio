"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import {
  RigidBody,
  CapsuleCollider,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { Character } from "../Avatar";
import type { AvatarConfig } from "../../../lib/auth";
import {
  SWORD_COOLDOWN_MS,
  SWORD_SWING_DURATION_MS,
  PLAYER_MAX_HP,
  KNOCKBACK_FORCE,
} from "../../../lib/chaosColiseum";
import {
  playSwordSwing,
  playJump,
  playPlayerHurt,
  playPlayerDeath,
} from "../../../lib/sounds";

// ============================================================
// CHAOS COLISEUM — LOCAL PLAYER
// ============================================================

const MOVE_SPEED = 9;
const JUMP_VELOCITY = 11;
const CAMERA_DIST = 9;
const CAMERA_HEIGHT = 2.5;
const CAMERA_MIN_PITCH = -0.3;
const CAMERA_MAX_PITCH = 1.1;
const ROT_LERP = 14;
const AIR_CONTROL = 0.55;
const COYOTE_TIME = 0.12;

const CAPSULE_HALF_HEIGHT = 0.5;
const CAPSULE_RADIUS = 0.35;
const CAPSULE_TOTAL = CAPSULE_HALF_HEIGHT * 2 + CAPSULE_RADIUS * 2;

const VISUAL_OFFSET_Y = 0.65;

export const CHAOS_PLAYER_RB_NAME = "chaos-player";

export type PlayerState = {
  pos: [number, number, number];
  rotY: number;
  hp: number;
  alive: boolean;
  swinging: boolean;
};

type Props = {
  config: AvatarConfig;
  spawnPosition: [number, number, number];
  inputDisabled: boolean;
  isTouchDevice: boolean;
  onPositionUpdate?: (state: PlayerState) => void;
  onSwing?: (pos: [number, number, number], rotY: number) => void;
  hp: number;
  alive: boolean;
  onHpChange: (hp: number) => void;
  onDeath: () => void;
  onRespawnRequest: () => void;
  registerApi?: (api: ChaosPlayerApi) => void;
};

export type ChaosPlayerApi = {
  applyDamage: (amount: number, fromPos: [number, number, number]) => void;
  teleport: (pos: [number, number, number]) => void;
  getPosition: () => [number, number, number];
  getRotationY: () => number;
};

// ============================================================
// SWORD MESH — gripped in the palm, blade pointing forward
// ============================================================
function SwordMesh() {
  return (
    <group position={[0, 0, 0.08]} rotation={[-Math.PI / 2.5, 0, 0]}>
      {/* Handle / grip — passes through the palm */}
      <mesh castShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[0.07, 0.3, 0.07]} />
        <meshStandardMaterial color="#4A2E1A" roughness={0.9} />
      </mesh>

      {/* Pommel below the fist */}
      <mesh castShadow position={[0, -0.28, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#B8860B" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Crossguard just above the fist */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.32, 0.06, 0.08]} />
        <meshStandardMaterial color="#B8860B" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Blade extending forward from the fist */}
      <mesh castShadow position={[0, 0.65, 0]}>
        <boxGeometry args={[0.09, 1.1, 0.03]} />
        <meshStandardMaterial
          color="#E8E8E8"
          metalness={0.9}
          roughness={0.15}
          emissive="#AAAAAA"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Blade tip highlight */}
      <mesh castShadow position={[0, 1.24, 0]}>
        <boxGeometry args={[0.09, 0.14, 0.03]} />
        <meshStandardMaterial
          color="#FFFFFF"
          metalness={1}
          roughness={0.1}
          emissive="#FFFFFF"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

export default function ChaosColiseumPlayer({
  config,
  spawnPosition,
  inputDisabled,
  isTouchDevice,
  onPositionUpdate,
  onSwing,
  hp,
  alive,
  onHpChange,
  onDeath,
  onRespawnRequest,
  registerApi,
}: Props) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const visualRef = useRef<THREE.Group>(null);
  const [, getKeys] = useKeyboardControls();
  const { camera } = useThree();
  const { rapier, world } = useRapier();

  const [walking, setWalking] = useState(false);
  const walkingRef = useRef(false);

  const cameraYawRef = useRef(0);
  const cameraPitchRef = useRef(0.35);
  const lastBroadcastRef = useRef(0);

  const velocityXZRef = useRef(new THREE.Vector2(0, 0));
  const knockbackRef = useRef(new THREE.Vector2(0, 0));

  const jumpCooldownRef = useRef(0);
  const groundedRef = useRef(false);
  const coyoteTimerRef = useRef(0);
  const jumpRequestedRef = useRef(false);

  const forcedFacingRef = useRef<number | null>(null);
  const facingRef = useRef(0);

  const swingTriggerRef = useRef(0);
  const lastSwingTimeRef = useRef(0);
  const lastSwingTriggerRef = useRef(0);
  const chopSwingRef = useRef(0);

  const deadRef = useRef(!alive);
  useEffect(() => {
    deadRef.current = !alive;
  }, [alive]);

  // ============================================================
  // MOUSE LOOK
  // ============================================================
  useEffect(() => {
    if (isTouchDevice) return;
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
    };
  }, [isTouchDevice]);

  // ============================================================
  // SWING INPUT
  // ============================================================
  const trySwing = useCallback(() => {
    if (inputDisabled || deadRef.current) return;

    const now = performance.now();
    if (now - lastSwingTimeRef.current < SWORD_COOLDOWN_MS) return;
    lastSwingTimeRef.current = now;

    swingTriggerRef.current += 1;
    playSwordSwing();

    const pos = bodyRef.current?.translation();
    if (pos && onSwing) {
      onSwing([pos.x, pos.y, pos.z], facingRef.current);
    }
  }, [inputDisabled, onSwing]);

  useEffect(() => {
    if (isTouchDevice) return;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) trySwing();
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [isTouchDevice, trySwing]);

  // ============================================================
  // GROUND CHECK
  // ============================================================
  function checkGrounded(): boolean {
    if (!bodyRef.current) return false;
    const pos = bodyRef.current.translation();
    const rayOriginY = pos.y - CAPSULE_TOTAL / 2 + 0.05;
    const ray = new rapier.Ray(
      { x: pos.x, y: rayOriginY, z: pos.z },
      { x: 0, y: -1, z: 0 }
    );
    const hit = world.castRay(
      ray,
      0.15,
      true,
      undefined,
      undefined,
      undefined,
      bodyRef.current
    );
    return hit !== null;
  }

  // ============================================================
  // TELEPORT
  // ============================================================
  const teleport = useCallback((pos: [number, number, number]) => {
    if (!bodyRef.current) return;
    bodyRef.current.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true);
    bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    bodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    velocityXZRef.current.set(0, 0);
    knockbackRef.current.set(0, 0);
    groundedRef.current = false;
    coyoteTimerRef.current = 0;
    if (visualRef.current) {
      visualRef.current.rotation.set(0, 0, 0);
    }
  }, []);

  useEffect(() => {
    teleport(spawnPosition);
    cameraYawRef.current = 0;
    cameraPitchRef.current = 0.35;
  }, [spawnPosition, teleport]);

  // ============================================================
  // DAMAGE API
  // ============================================================
  useEffect(() => {
    if (!registerApi) return;

    const api: ChaosPlayerApi = {
      applyDamage: (amount: number, fromPos: [number, number, number]) => {
        if (!bodyRef.current || deadRef.current) return;

        const newHp = Math.max(0, hp - amount);
        onHpChange(newHp);

        const pos = bodyRef.current.translation();
        const dx = pos.x - fromPos[0];
        const dz = pos.z - fromPos[2];
        const dist = Math.hypot(dx, dz) || 1;
        const nx = dx / dist;
        const nz = dz / dist;
        knockbackRef.current.set(nx * KNOCKBACK_FORCE, nz * KNOCKBACK_FORCE);

        const currentVel = bodyRef.current.linvel();
        bodyRef.current.setLinvel(
          {
            x: currentVel.x + nx * KNOCKBACK_FORCE,
            y: Math.max(currentVel.y, 4),
            z: currentVel.z + nz * KNOCKBACK_FORCE,
          },
          true
        );

        if (newHp <= 0) {
          playPlayerDeath();
          onDeath();
        } else {
          playPlayerHurt();
        }
      },
      teleport,
      getPosition: () => {
        const p = bodyRef.current?.translation();
        return p ? [p.x, p.y, p.z] : [0, 0, 0];
      },
      getRotationY: () => facingRef.current,
    };

    registerApi(api);
  }, [registerApi, hp, onHpChange, onDeath, teleport]);

  // ============================================================
  // FRAME LOOP
  // ============================================================
  useFrame((_, delta) => {
    if (!bodyRef.current) return;
    const keys = getKeys();
    const dt = Math.min(delta, 0.05);

    if (deadRef.current) {
      const current = bodyRef.current.linvel();
      bodyRef.current.setLinvel(
        { x: current.x * 0.85, y: current.y, z: current.z * 0.85 },
        true
      );
      return;
    }

    if (swingTriggerRef.current !== lastSwingTriggerRef.current) {
      lastSwingTriggerRef.current = swingTriggerRef.current;
      chopSwingRef.current = 1;
    }
    if (chopSwingRef.current > 0) {
      chopSwingRef.current = Math.max(
        0,
        chopSwingRef.current - dt * (1000 / SWORD_SWING_DURATION_MS)
      );
    }

    const grounded = checkGrounded();
    if (grounded) {
      coyoteTimerRef.current = COYOTE_TIME;
    } else {
      coyoteTimerRef.current = Math.max(0, coyoteTimerRef.current - dt);
    }
    groundedRef.current = grounded;

    let localX = 0;
    let localZ = 0;
    if (!inputDisabled) {
      if (keys.forward) localZ += 1;
      if (keys.backward) localZ -= 1;
      if (keys.left) localX += 1;
      if (keys.right) localX -= 1;
    }
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
    velocityXZRef.current.x +=
      (targetVX - velocityXZRef.current.x) * Math.min(1, rate * dt);
    velocityXZRef.current.y +=
      (targetVZ - velocityXZRef.current.y) * Math.min(1, rate * dt);

    knockbackRef.current.x *= Math.pow(0.88, dt * 60);
    knockbackRef.current.y *= Math.pow(0.88, dt * 60);
    if (Math.abs(knockbackRef.current.x) < 0.1) knockbackRef.current.x = 0;
    if (Math.abs(knockbackRef.current.y) < 0.1) knockbackRef.current.y = 0;

    const current = bodyRef.current.linvel();
    bodyRef.current.setLinvel(
      {
        x: velocityXZRef.current.x + knockbackRef.current.x,
        y: current.y,
        z: velocityXZRef.current.y + knockbackRef.current.y,
      },
      true
    );

    jumpCooldownRef.current -= dt;
    const wantsJump = !inputDisabled && keys.jump;
    if (wantsJump && jumpCooldownRef.current <= 0) {
      jumpRequestedRef.current = true;
    }
    const canJump = grounded || coyoteTimerRef.current > 0;
    if (jumpRequestedRef.current && canJump && jumpCooldownRef.current <= 0) {
      bodyRef.current.setLinvel(
        { x: current.x, y: JUMP_VELOCITY, z: current.z },
        true
      );
      playJump();
      jumpCooldownRef.current = 0.2;
      coyoteTimerRef.current = 0;
      jumpRequestedRef.current = false;
    }
    if (jumpRequestedRef.current && coyoteTimerRef.current <= 0 && !grounded) {
      jumpRequestedRef.current = false;
    }

    const pos = bodyRef.current.translation();
    const speed = Math.hypot(velocityXZRef.current.x, velocityXZRef.current.y);
    const isMoving = speed > 0.8;
    if (isMoving !== walkingRef.current) {
      walkingRef.current = isMoving;
      setWalking(isMoving);
    }

    if (forcedFacingRef.current !== null && visualRef.current) {
      visualRef.current.rotation.y = forcedFacingRef.current;
    } else if (isMoving && visualRef.current) {
      const targetAngle = Math.atan2(
        velocityXZRef.current.x,
        velocityXZRef.current.y
      );
      let diff = targetAngle - visualRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      visualRef.current.rotation.y += diff * Math.min(1, ROT_LERP * dt);
    }
    facingRef.current = visualRef.current?.rotation.y || 0;

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

    const now = performance.now();
    if (onPositionUpdate && now - lastBroadcastRef.current > 66) {
      lastBroadcastRef.current = now;
      onPositionUpdate({
        pos: [pos.x, pos.y, pos.z],
        rotY: facingRef.current,
        hp,
        alive: !deadRef.current,
        swinging: chopSwingRef.current > 0,
      });
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      name={CHAOS_PLAYER_RB_NAME}
      position={spawnPosition}
      colliders={false}
      enabledRotations={[false, false, false]}
      ccd
      friction={0.4}
      restitution={0}
      mass={1}
    >
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />

      <group ref={visualRef} position={[0, VISUAL_OFFSET_Y, 0]}>
        <Character
          config={config}
          hideAccessory
          walking={walking}
          chopSwingRef={chopSwingRef}
          rightHandContent={<SwordMesh />}
        />
      </group>
    </RigidBody>
  );
}