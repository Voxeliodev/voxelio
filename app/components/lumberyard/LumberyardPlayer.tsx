"use client";

import { useRef, useEffect, useState } from "react";
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
import { getAxe, type AxeId } from "../../../lib/lumberyard";

// ============================================================
// LUMBERYARD PLAYER — physics-based, holds an axe
// ============================================================

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
const VISUAL_OFFSET_Y = 0.65;

export const LUMBERYARD_PLAYER_NAME = "lumberyard-player";

type Props = {
  config: AvatarConfig;
  spawnPosition: [number, number, number];
  inputDisabled: boolean;
  isTouchDevice: boolean;
  currentAxeId: AxeId;
  onPositionUpdate?: (pos: [number, number, number], rotY: number) => void;
  onChopSwing?: () => void;
  swingTriggerRef: React.MutableRefObject<number>;
};

// ============================================================
// Axe mesh — rendered inside the hand group
// ============================================================
function AxeMesh({ axeId }: { axeId: AxeId }) {
  const axe = getAxe(axeId);

  return (
    <group position={[0, 0.15, 0.2]} rotation={[0.2, 0, 0]}>
      {/* Handle */}
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshStandardMaterial color={axe.color} roughness={0.9} />
      </mesh>
      {/* Blade */}
      <mesh castShadow position={[0.25, 0.85, 0]}>
        <boxGeometry args={[0.45, 0.3, 0.08]} />
        <meshStandardMaterial
          color={axe.bladeColor}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {/* Blade edge highlight */}
      <mesh castShadow position={[0.47, 0.85, 0]}>
        <boxGeometry args={[0.05, 0.3, 0.08]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive={new THREE.Color(axe.bladeColor)}
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

export default function LumberyardPlayer({
  config,
  spawnPosition,
  inputDisabled,
  isTouchDevice,
  currentAxeId,
  onPositionUpdate,
  onChopSwing,
  swingTriggerRef,
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
  const jumpCooldownRef = useRef(0);
  const coyoteTimerRef = useRef(0);
  const forcedFacingRef = useRef<number | null>(null);

  const lastSwingTriggerRef = useRef(0);
  const chopSwingRef = useRef(0);

  useEffect(() => {
    if (isTouchDevice) return;
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
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

    (canvas as HTMLElement).style.cursor = "grab";
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isTouchDevice]);

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

  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.setTranslation(
      { x: spawnPosition[0], y: spawnPosition[1], z: spawnPosition[2] },
      true
    );
    bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    bodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    if (visualRef.current) visualRef.current.rotation.set(0, 0, 0);
    velocityXZRef.current.set(0, 0);
    coyoteTimerRef.current = 0;
    cameraYawRef.current = 0;
    cameraPitchRef.current = 0.35;
  }, [spawnPosition]);

  useEffect(() => {
    forcedFacingRef.current = 0;
    const timer = setTimeout(() => {
      forcedFacingRef.current = null;
    }, 100);
    return () => clearTimeout(timer);
  }, [spawnPosition]);

  // ===== Chop swing decay =====
  useFrame((_, delta) => {
    if (swingTriggerRef.current !== lastSwingTriggerRef.current) {
      lastSwingTriggerRef.current = swingTriggerRef.current;
      chopSwingRef.current = 1;
      if (onChopSwing) onChopSwing();
    }
    if (chopSwingRef.current > 0) {
      chopSwingRef.current = Math.max(0, chopSwingRef.current - delta * 2.5);
    }
  });

  // ===== Movement loop =====
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
    velocityXZRef.current.x += (worldX * MOVE_SPEED - velocityXZRef.current.x) * Math.min(1, rate * dt);
    velocityXZRef.current.y += (worldZ * MOVE_SPEED - velocityXZRef.current.y) * Math.min(1, rate * dt);

    const current = bodyRef.current.linvel();
    bodyRef.current.setLinvel(
      {
        x: velocityXZRef.current.x,
        y: current.y,
        z: velocityXZRef.current.y,
      },
      true
    );

    jumpCooldownRef.current -= dt;
    const wantsJump = !inputDisabled && keys.jump;
    const canJump = grounded || coyoteTimerRef.current > 0;
    if (wantsJump && canJump && jumpCooldownRef.current <= 0) {
      bodyRef.current.setLinvel({ x: current.x, y: JUMP_VELOCITY, z: current.z }, true);
      jumpCooldownRef.current = 0.2;
      coyoteTimerRef.current = 0;
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
      const targetAngle = Math.atan2(velocityXZRef.current.x, velocityXZRef.current.y);
      let diff = targetAngle - visualRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      visualRef.current.rotation.y += diff * Math.min(1, ROT_LERP * dt);
    }

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
      onPositionUpdate([pos.x, pos.y, pos.z], visualRef.current?.rotation.y || 0);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      name={LUMBERYARD_PLAYER_NAME}
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
          rightHandContent={<AxeMesh axeId={currentAxeId} />}
        />
      </group>
    </RigidBody>
  );
}