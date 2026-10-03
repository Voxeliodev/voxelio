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
import { OBBY_KILL_Y } from "../../../lib/obbyLevel";

// ============================================================
// OBBY PLAYER — physics-based character controller
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

// Capsule collider — total height 1.7, radius 0.35
const CAPSULE_HALF_HEIGHT = 0.5;
const CAPSULE_RADIUS = 0.35;
const CAPSULE_TOTAL = CAPSULE_HALF_HEIGHT * 2 + CAPSULE_RADIUS * 2; // 1.7

// ============================================================
// SPAWN_YAW — the direction the player faces on spawn
//   0            = facing -Z (north) — the obby path direction
//   Math.PI / 2  = facing +X (east)
//   Math.PI      = facing +Z (south)
//   -Math.PI / 2 = facing -X (west)
// ============================================================
const SPAWN_YAW = 0;

const VISUAL_OFFSET_Y = 0.65;

type Props = {
  config: AvatarConfig;
  spawnPosition: [number, number, number];
  onFall: () => void;
  inputDisabled: boolean;
  isTouchDevice: boolean;
  onPositionUpdate?: (pos: [number, number, number], rotY: number) => void;
  touchState: { moveX: number; moveZ: number; jumpQueued: boolean };
};

export default function ObbyPlayer({
  config,
  spawnPosition,
  onFall,
  inputDisabled,
  isTouchDevice,
  onPositionUpdate,
  touchState,
}: Props) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const visualRef = useRef<THREE.Group>(null);
  const [, getKeys] = useKeyboardControls();
  const { camera } = useThree();
  const { rapier, world } = useRapier();

  const [walking, setWalking] = useState(false);
  const walkingRef = useRef(false);

  const cameraYawRef = useRef(SPAWN_YAW);
  const cameraPitchRef = useRef(0.35);
  const lastBroadcastRef = useRef(0);

  const velocityXZRef = useRef(new THREE.Vector2(0, 0));

  const jumpCooldownRef = useRef(0);
  const groundedRef = useRef(false);
  const coyoteTimerRef = useRef(0);
  const jumpRequestedRef = useRef(false);

  const forcedFacingRef = useRef<number | null>(null);

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

  // ===== Spawn / respawn reset =====
  useEffect(() => {
    if (!bodyRef.current) return;

    bodyRef.current.setTranslation(
      { x: spawnPosition[0], y: spawnPosition[1], z: spawnPosition[2] },
      true
    );
    bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

    // Rotate physics body to match SPAWN_YAW
    const halfYaw = SPAWN_YAW / 2;
    bodyRef.current.setRotation(
      { x: 0, y: Math.sin(halfYaw), z: 0, w: Math.cos(halfYaw) },
      true
    );

    // Rotate visual model to match SPAWN_YAW
    if (visualRef.current) {
      visualRef.current.rotation.set(0, SPAWN_YAW, 0);
    }

    velocityXZRef.current.set(0, 0);
    groundedRef.current = false;
    coyoteTimerRef.current = 0;
    jumpRequestedRef.current = false;

    cameraYawRef.current = SPAWN_YAW;
    cameraPitchRef.current = 0.35;
  }, [spawnPosition]);

  // Force the character to face SPAWN_YAW for the first 100ms after spawn,
  // so the walk-animation doesn't override it before the player moves.
  useEffect(() => {
    forcedFacingRef.current = SPAWN_YAW;
    const timer = setTimeout(() => {
      forcedFacingRef.current = null;
    }, 100);
    return () => clearTimeout(timer);
  }, [spawnPosition]);

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
    if (!inputDisabled) {
      if (keys.forward) localZ += 1;
      if (keys.backward) localZ -= 1;
      if (keys.left) localX += 1;
      if (keys.right) localX -= 1;
      if (isTouchDevice) {
        if (Math.abs(touchState.moveX) > 0.1) localX -= touchState.moveX;
        if (Math.abs(touchState.moveZ) > 0.1) localZ -= touchState.moveZ;
      }
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
    velocityXZRef.current.x += (targetVX - velocityXZRef.current.x) * Math.min(1, rate * dt);
    velocityXZRef.current.y += (targetVZ - velocityXZRef.current.y) * Math.min(1, rate * dt);

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

    const wantsJump =
      (!inputDisabled && keys.jump) || (isTouchDevice && touchState.jumpQueued);

    if (wantsJump && jumpCooldownRef.current <= 0) {
      jumpRequestedRef.current = true;
    }
    if (isTouchDevice) touchState.jumpQueued = false;

    const canJump = grounded || coyoteTimerRef.current > 0;
    if (jumpRequestedRef.current && canJump && jumpCooldownRef.current <= 0) {
      bodyRef.current.setLinvel(
        { x: current.x, y: JUMP_VELOCITY, z: current.z },
        true
      );
      jumpCooldownRef.current = 0.2;
      coyoteTimerRef.current = 0;
      groundedRef.current = false;
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
      const targetAngle = Math.atan2(velocityXZRef.current.x, velocityXZRef.current.y);
      let diff = targetAngle - visualRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      visualRef.current.rotation.y += diff * Math.min(1, ROT_LERP * dt);
    }

    if (pos.y < OBBY_KILL_Y) {
      onFall();
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
      const rotY = visualRef.current?.rotation.y || 0;
      onPositionUpdate([pos.x, pos.y, pos.z], rotY);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      name="obby-player"
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
        <Character config={config} hideAccessory walking={walking} />
      </group>
    </RigidBody>
  );
}