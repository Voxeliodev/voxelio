"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from "@react-three/rapier";
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

  // Camera state
  const cameraYawRef = useRef(0);
  const cameraPitchRef = useRef(0.35);
  const lastBroadcastRef = useRef(0);

  // Input smoothing
  const velocityXZRef = useRef(new THREE.Vector2(0, 0));

  // Track if player has "jumped this frame" so we don't double-jump
  const jumpCooldownRef = useRef(0);
  const groundedRef = useRef(false);

  // Handle mouse look on desktop
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

  // Ground detection using a ray cast downward from the player's feet
  function checkGrounded(): boolean {
    if (!bodyRef.current) return false;
    const pos = bodyRef.current.translation();
    const ray = new rapier.Ray(
      { x: pos.x, y: pos.y - 0.9, z: pos.z },
      { x: 0, y: -1, z: 0 }
    );
    const hit = world.castRay(ray, 0.2, true, undefined, undefined, undefined, bodyRef.current);
    return hit !== null;
  }

  // ===== Apply teleport when spawn changes (respawn) =====
  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.setTranslation(
      { x: spawnPosition[0], y: spawnPosition[1], z: spawnPosition[2] },
      true
    );
    bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    velocityXZRef.current.set(0, 0);
  }, [spawnPosition]);

  useFrame((_, delta) => {
    if (!bodyRef.current) return;
    const keys = getKeys();
    const dt = Math.min(delta, 0.05);

    // ===== Directional input =====
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

    // ===== Rotate input by camera yaw =====
    const yaw = cameraYawRef.current;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const worldX = localX * cosY + localZ * sinY;
    const worldZ = -localX * sinY + localZ * cosY;

    // ===== Smooth velocity =====
    const grounded = checkGrounded();
    groundedRef.current = grounded;
    const rate = grounded ? 12 : 12 * AIR_CONTROL;

    const targetVX = worldX * MOVE_SPEED;
    const targetVZ = worldZ * MOVE_SPEED;
    velocityXZRef.current.x += (targetVX - velocityXZRef.current.x) * Math.min(1, rate * dt);
    velocityXZRef.current.y += (targetVZ - velocityXZRef.current.y) * Math.min(1, rate * dt);

    // ===== Apply horizontal velocity =====
    const current = bodyRef.current.linvel();
    bodyRef.current.setLinvel(
      {
        x: velocityXZRef.current.x,
        y: current.y,
        z: velocityXZRef.current.y,
      },
      true
    );

    // ===== Jump =====
    jumpCooldownRef.current -= dt;
    const wantsJump =
      (!inputDisabled && keys.jump) || (isTouchDevice && touchState.jumpQueued);

    if (wantsJump && grounded && jumpCooldownRef.current <= 0) {
      bodyRef.current.setLinvel(
        { x: current.x, y: JUMP_VELOCITY, z: current.z },
        true
      );
      jumpCooldownRef.current = 0.15;
      groundedRef.current = false;
    }
    if (isTouchDevice) touchState.jumpQueued = false;

    // ===== Facing direction =====
    const pos = bodyRef.current.translation();
    const speed = Math.hypot(velocityXZRef.current.x, velocityXZRef.current.y);
    const isMoving = speed > 0.8;
    if (isMoving !== walkingRef.current) {
      walkingRef.current = isMoving;
      setWalking(isMoving);
    }

    if (isMoving && visualRef.current) {
      const targetAngle = Math.atan2(velocityXZRef.current.x, velocityXZRef.current.y);
      let diff = targetAngle - visualRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      visualRef.current.rotation.y += diff * Math.min(1, ROT_LERP * dt);
    }

    // ===== Fall detection =====
    if (pos.y < OBBY_KILL_Y) {
      onFall();
    }

    // ===== Camera follow =====
    if (visualRef.current) {
      const camYaw = cameraYawRef.current;
      const camPitch = cameraPitchRef.current;
      const horizDist = CAMERA_DIST * Math.cos(camPitch);
      const vertDist = CAMERA_DIST * Math.sin(camPitch);
      const lookX = pos.x;
      const lookY = pos.y + 0.5;
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

    // ===== Broadcast position (for multiplayer later) =====
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
      position={spawnPosition}
      colliders={false}
      enabledRotations={[false, false, false]}
      ccd
      friction={0.4}
      restitution={0}
      mass={1}
    >
      <CapsuleCollider args={[0.5, 0.35]} />
      {/* Visual character rendered at feet position (offset up by capsule half-height) */}
      <group ref={visualRef} position={[0, 0, 0]}>
        <Character config={config} hideAccessory walking={walking} />
      </group>
    </RigidBody>
  );
}