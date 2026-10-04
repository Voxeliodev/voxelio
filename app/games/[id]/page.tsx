"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls, Sky, Html } from "@react-three/drei";
import { Character } from "../../components/Avatar";
import AccountBadge from "../../components/AccountBadge";
import ObbyGame from "../../components/obby/ObbyGame";
import LumberyardGame from "../../components/lumberyard/LumberyardGameMain";
import ChaosColiseumGameMain from "../../components/chaos-coliseum/ChaosColiseumGameMain";
import Shop from "@/app/components/lumberyard/Shop";
import Tree from "@/app/components/lumberyard/Tree";
import Log, { type LogData } from "@/app/components/lumberyard/Log";
import Sawmill from "@/app/components/lumberyard/Sawmill";
import { getCurrentUser, formatVoxbux, awardPlayedWithOwner, type User, type AvatarConfig } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import { playError } from "../../../lib/sounds";
import { playInVoxelioApp } from "../../../lib/voxelioPlayer";
import {
  fetchWorldById,
  incrementWorldVisits,
  hasLikedWorld,
  likeWorld,
  unlikeWorld,
  type World,
} from "../../../lib/worlds";
import { getLayout, type BlockData } from "../../../lib/worldLayouts";
import { filterMessage } from "../../../lib/chatFilter";

const ENABLE_OWNER_BADGE_DETECTION = true;

const KEY_MAP = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
  { name: "jump", keys: [" ", "Space"] },
];

const MOVE_SPEED = 7.5;
const ACCEL = 60;
const DECEL = 80;
const ROTATION_LERP = 18;

const CAMERA_MIN_DIST = 3;
const CAMERA_MAX_DIST = 18;
const CAMERA_DEFAULT_DIST = 9;
const CAMERA_DEFAULT_PITCH = 0.32;
const CAMERA_MIN_PITCH = -0.25;
const CAMERA_MAX_PITCH = 1.15;
const CAMERA_LOOK_OFFSET = -0.2;
const CAMERA_LERP = 10;

const CHARACTER_Y_OFFSET = 1.6;
const GRAVITY = -28;
const JUMP_VELOCITY = 10;
const PLAYER_RADIUS = 0.42;
const PLAYER_HEIGHT = 1.8;

const BROADCAST_INTERVAL = 50;
const HEARTBEAT_INTERVAL = 400;
const STALE_TIMEOUT = 3000;
const CHAT_LIFETIME_MS = 5000;
const CHAT_OVERLAY_LIFETIME_MS = 7000;
const CHAT_MAX_LENGTH = 120;
const CHAT_MUTE_DURATION_MS = 60_000;
const CHAT_SPAM_THRESHOLD = 3;

const touchState = { moveX: 0, moveZ: 0, jumpQueued: false };
const touchLookState = { yawDelta: 0, pitchDelta: 0 };

type RemotePlayerData = {
  id: string;
  username: string;
  displayId?: number | null;
  avatarConfig: AvatarConfig;
  targetPos: [number, number, number];
  targetRotY: number;
  lastSeen: number;
};

type ChatMessage = {
  id: string;
  userId: string;
  username: string;
  text: string;
  expiresAt: number;
};

function findSafeSpawn(blocks: BlockData[]): THREE.Vector3 {
  const spawn = new THREE.Vector3(0, CHARACTER_Y_OFFSET, 0);
  const maxIter = blocks.length + 2;

  for (let iter = 0; iter < maxIter; iter++) {
    let pushedUp = false;
    const pFeetY = spawn.y - CHARACTER_Y_OFFSET;
    const pTopY = pFeetY + PLAYER_HEIGHT;
    const pMinX = spawn.x - PLAYER_RADIUS;
    const pMaxX = spawn.x + PLAYER_RADIUS;
    const pMinZ = spawn.z - PLAYER_RADIUS;
    const pMaxZ = spawn.z + PLAYER_RADIUS;

    for (const b of blocks) {
      const [bx, by, bz] = b.position;
      const [sx, sy, sz] = b.size;
      const bMinX = bx - sx / 2;
      const bMaxX = bx + sx / 2;
      const bMinY = by - sy / 2;
      const bMaxY = by + sy / 2;
      const bMinZ = bz - sz / 2;
      const bMaxZ = bz + sz / 2;
      if (pMaxX <= bMinX || pMinX >= bMaxX) continue;
      if (pMaxZ <= bMinZ || pMinZ >= bMaxZ) continue;
      if (pTopY <= bMinY || pFeetY >= bMaxY) continue;
      spawn.y = Math.max(spawn.y, bMaxY + CHARACTER_Y_OFFSET + 0.05);
      pushedUp = true;
    }
    if (!pushedUp) break;
  }
  if (spawn.y > 60) spawn.y = 60;
  return spawn;
}

function resolveBlockCollisions(pos: THREE.Vector3, blocks: BlockData[]): void {
  for (let iter = 0; iter < 4; iter++) {
    let anyResolved = false;
    for (const b of blocks) {
      const [bx, by, bz] = b.position;
      const [sx, sy, sz] = b.size;
      const bMinX = bx - sx / 2;
      const bMaxX = bx + sx / 2;
      const bMinY = by - sy / 2;
      const bMaxY = by + sy / 2;
      const bMinZ = bz - sz / 2;
      const bMaxZ = bz + sz / 2;
      const pMinX = pos.x - PLAYER_RADIUS;
      const pMaxX = pos.x + PLAYER_RADIUS;
      const pFeetY = pos.y - CHARACTER_Y_OFFSET;
      const pTopY = pFeetY + PLAYER_HEIGHT;
      const pMinZ = pos.z - PLAYER_RADIUS;
      const pMaxZ = pos.z + PLAYER_RADIUS;
      if (pMaxX <= bMinX || pMinX >= bMaxX || pTopY <= bMinY || pFeetY >= bMaxY || pMaxZ <= bMinZ || pMinZ >= bMaxZ) continue;
      const penX = Math.min(pMaxX - bMinX, bMaxX - pMinX);
      const penY = Math.min(pTopY - bMinY, bMaxY - pFeetY);
      const penZ = Math.min(pMaxZ - bMinZ, bMaxZ - pMinZ);
      if (penX <= penY && penX <= penZ) pos.x += pos.x < bx ? -penX : penX;
      else if (penY <= penZ) pos.y += pos.y < by + CHARACTER_Y_OFFSET ? -penY : penY;
      else pos.z += pos.z < bz ? -penZ : penZ;
      anyResolved = true;
    }
    if (!anyResolved) break;
  }
}

function isGrounded(pos: THREE.Vector3, blocks: BlockData[]): boolean {
  const feetY = pos.y - CHARACTER_Y_OFFSET;
  if (feetY <= 0.08) return true;
  for (const b of blocks) {
    const topY = b.position[1] + b.size[1] / 2;
    if (Math.abs(feetY - topY) < 0.15 && Math.abs(pos.x - b.position[0]) < b.size[0] / 2 + PLAYER_RADIUS * 0.7 && Math.abs(pos.z - b.position[2]) < b.size[2] / 2 + PLAYER_RADIUS * 0.7) return true;
  }
  return false;
}

function resolvePlayerCollisions(pos: THREE.Vector3, myId: string, remotePositions: Map<string, THREE.Vector3>): void {
  const minDist = PLAYER_RADIUS * 2;
  for (const [id, other] of remotePositions) {
    if (id === myId) continue;
    const myFeetY = pos.y - CHARACTER_Y_OFFSET;
    const otherFeetY = other.y - CHARACTER_Y_OFFSET;
    if (Math.abs(myFeetY - otherFeetY) > PLAYER_HEIGHT * 0.9) continue;
    const dx = pos.x - other.x;
    const dz = pos.z - other.z;
    const distSq = dx * dx + dz * dz;
    if (distSq >= minDist * minDist) continue;
    const dist = Math.sqrt(distSq);
    if (dist < 0.001) { pos.x += minDist * 0.5; continue; }
    const overlap = minDist - dist;
    pos.x += (dx / dist) * overlap;
    pos.z += (dz / dist) * overlap;
  }
}

function Nametag({ username, userId }: { username: string; userId: string }) {
  return (
    <Html position={[0, 2.55, 0]} center distanceFactor={10} zIndexRange={[10, 0]} style={{ pointerEvents: "none", overflow: "visible" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14, lineHeight: 1, textShadow: "0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 0 0 2px #000" }}>{username}</span>
        <AccountBadge username={username} userId={userId} size={16} />
      </div>
    </Html>
  );
}

function RemotePlayer({
  data, remotePositions,
}: {
  data: RemotePlayerData;
  remotePositions: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const currentRef = useRef(new THREE.Vector3(...data.targetPos));
  const currentRotRef = useRef(data.targetRotY);
  const walkingRef = useRef(false);

  useEffect(() => {
    remotePositions.current.set(data.id, currentRef.current);
    return () => { remotePositions.current.delete(data.id); };
  }, [data.id, remotePositions]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = new THREE.Vector3(...data.targetPos);
    const lerp = Math.min(1, delta * 12);
    currentRef.current.lerp(target, lerp);
    groupRef.current.position.copy(currentRef.current);
    let diff = data.targetRotY - currentRotRef.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentRotRef.current += diff * Math.min(1, delta * 14);
    groupRef.current.rotation.y = currentRotRef.current;
    const dist = currentRef.current.distanceTo(target);
    walkingRef.current = dist > 0.05;
  });

  return (
    <group ref={groupRef} position={data.targetPos}>
      <Nametag username={data.username} userId={data.id} />
      <Character config={data.avatarConfig} hideAccessory walking={walkingRef.current} />
    </group>
  );
}

function LocalPlayer({
  config, myId, blocks, onMove, inputDisabled, remotePositions, isTouchDevice,
}: {
  config: AvatarConfig;
  myId: string;
  blocks: BlockData[];
  onMove: (pos: [number, number, number], rotY: number) => void;
  inputDisabled: boolean;
  remotePositions: React.MutableRefObject<Map<string, THREE.Vector3>>;
  isTouchDevice: boolean;
}) {
  const { gl } = useThree();
  const [, getKeys] = useKeyboardControls();
  const safeSpawn = useMemo(() => findSafeSpawn(blocks), [blocks]);

  const groupRef = useRef<THREE.Group>(null);
  const positionRef = useRef(safeSpawn.clone());
  const velocityRef = useRef(new THREE.Vector2(0, 0));
  const facingRef = useRef(0);
  const velocityYRef = useRef(0);
  const groundedRef = useRef(false);
  const lastBroadcastRef = useRef(0);
  const needsBroadcastRef = useRef(true);

  const cameraYawRef = useRef(0);
  const cameraPitchRef = useRef(CAMERA_DEFAULT_PITCH);
  const cameraDistRef = useRef(CAMERA_DEFAULT_DIST);

  const [walking, setWalking] = useState(false);
  const walkingStateRef = useRef(false);

  useEffect(() => {
    if (isTouchDevice) return;
    const canvas = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.style.cursor = "grabbing";
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
      cameraPitchRef.current = Math.max(CAMERA_MIN_PITCH, Math.min(CAMERA_MAX_PITCH, cameraPitchRef.current + dy * 0.005));
    };

    const onMouseUp = () => {
      if (dragging) {
        dragging = false;
        canvas.style.cursor = "grab";
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistRef.current = Math.max(CAMERA_MIN_DIST, Math.min(CAMERA_MAX_DIST, cameraDistRef.current + e.deltaY * 0.01));
    };

    canvas.style.cursor = "grab";
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.style.cursor = "";
    };
  }, [gl, isTouchDevice]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const keys = getKeys();

    if (isTouchDevice) {
      cameraYawRef.current += touchLookState.yawDelta;
      cameraPitchRef.current = Math.max(CAMERA_MIN_PITCH, Math.min(CAMERA_MAX_PITCH, cameraPitchRef.current + touchLookState.pitchDelta));
      touchLookState.yawDelta = 0;
      touchLookState.pitchDelta = 0;
    }

    let localX = 0;
    let localZ = 0;

    if (!inputDisabled) {
      if (keys.forward) localZ += 1;
      if (keys.backward) localZ -= 1;
      if (keys.left) localX += 1;
      if (keys.right) localX -= 1;
      if (isTouchDevice) {
        if (Math.abs(touchState.moveX) > 0.05) localX = -touchState.moveX;
        if (Math.abs(touchState.moveZ) > 0.05) localZ = -touchState.moveZ;
      }
    }

    const inputLen = Math.hypot(localX, localZ);
    const hasInput = inputLen > 0.001;
    if (hasInput) { localX /= inputLen; localZ /= inputLen; }

    const yaw = cameraYawRef.current;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const worldX = localX * cosY + localZ * sinY;
    const worldZ = -localX * sinY + localZ * cosY;

    if (hasInput) {
      const targetAngle = Math.atan2(worldX, worldZ);
      const current = groupRef.current.rotation.y;
      let diff = targetAngle - current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y = current + diff * Math.min(1, delta * ROTATION_LERP);
      facingRef.current = groupRef.current.rotation.y;
    }

    const targetVX = hasInput ? worldX * MOVE_SPEED : 0;
    const targetVZ = hasInput ? worldZ * MOVE_SPEED : 0;

    const rate = hasInput ? ACCEL : DECEL;
    const dvx = targetVX - velocityRef.current.x;
    const dvz = targetVZ - velocityRef.current.y;
    const dvLen = Math.hypot(dvx, dvz);
    if (dvLen > 0.001) {
      const step = Math.min(rate * delta, dvLen);
      velocityRef.current.x += (dvx / dvLen) * step;
      velocityRef.current.y += (dvz / dvLen) * step;
    } else {
      velocityRef.current.x = targetVX;
      velocityRef.current.y = targetVZ;
    }

    positionRef.current.x += velocityRef.current.x * delta;
    positionRef.current.z += velocityRef.current.y * delta;

    const speedSq = velocityRef.current.x ** 2 + velocityRef.current.y ** 2;
    const isMoving = speedSq > 1.0;
    if (isMoving !== walkingStateRef.current) {
      walkingStateRef.current = isMoving;
      setWalking(isMoving);
    }

    const wantJump = (!inputDisabled && keys.jump) || (isTouchDevice && touchState.jumpQueued);
    if (wantJump && groundedRef.current) {
      velocityYRef.current = JUMP_VELOCITY;
      groundedRef.current = false;
    }
    if (isTouchDevice) touchState.jumpQueued = false;

    velocityYRef.current += GRAVITY * delta;
    positionRef.current.y += velocityYRef.current * delta;

    if (positionRef.current.y < CHARACTER_Y_OFFSET) {
      positionRef.current.y = CHARACTER_Y_OFFSET;
      velocityYRef.current = 0;
    }

    resolveBlockCollisions(positionRef.current, blocks);
    resolvePlayerCollisions(positionRef.current, myId, remotePositions.current);

    const grounded = isGrounded(positionRef.current, blocks) && velocityYRef.current <= 0.01;
    groundedRef.current = grounded;
    if (grounded && velocityYRef.current < 0) velocityYRef.current = 0;

    const bound = 95;
    positionRef.current.x = Math.max(-bound, Math.min(bound, positionRef.current.x));
    positionRef.current.z = Math.max(-bound, Math.min(bound, positionRef.current.z));
    groupRef.current.position.copy(positionRef.current);

    const camYaw = cameraYawRef.current;
    const camPitch = cameraPitchRef.current;
    const camDist = cameraDistRef.current;
    const horizDist = camDist * Math.cos(camPitch);
    const vertDist = camDist * Math.sin(camPitch);
    const lookX = positionRef.current.x;
    const lookY = positionRef.current.y + CAMERA_LOOK_OFFSET;
    const lookZ = positionRef.current.z;
    const targetCamX = lookX - Math.sin(camYaw) * horizDist;
    const targetCamY = lookY + vertDist;
    const targetCamZ = lookZ - Math.cos(camYaw) * horizDist;

    const camLerp = Math.min(1, delta * CAMERA_LERP);
    state.camera.position.x += (targetCamX - state.camera.position.x) * camLerp;
    state.camera.position.y += (Math.max(0.5, targetCamY) - state.camera.position.y) * camLerp;
    state.camera.position.z += (targetCamZ - state.camera.position.z) * camLerp;
    state.camera.lookAt(lookX, lookY, lookZ);

    const now = performance.now();
    const sinceLast = now - lastBroadcastRef.current;
    const shouldFast = needsBroadcastRef.current && sinceLast >= BROADCAST_INTERVAL;
    const shouldHeartbeat = sinceLast >= HEARTBEAT_INTERVAL;

    if (shouldFast || shouldHeartbeat) {
      lastBroadcastRef.current = now;
      needsBroadcastRef.current = false;
      onMove([positionRef.current.x, positionRef.current.y, positionRef.current.z], facingRef.current);
    }
  });

  return (
    <group ref={groupRef} position={safeSpawn}>
      <Character config={config} hideAccessory walking={walking} />
    </group>
  );
}

function Ground({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

function WorldScene({
  config, userId, username, world, others, onMove, inputDisabled, isTouchDevice,
}: {
  config: AvatarConfig;
  userId: string;
  username: string;
  world: World;
  others: RemotePlayerData[];
  onMove: (pos: [number, number, number], rotY: number) => void;
  inputDisabled: boolean;
  isTouchDevice: boolean;
}) {
  const layout = getLayout(world.layout);
  const blocks = layout.blocks;
  const remotePositions = useRef<Map<string, THREE.Vector3>>(new Map());

  return (
    <>
      <Sky sunPosition={[100, 50, 100]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 30, 20]} intensity={1.15} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-50} shadow-camera-right={50} shadow-camera-top={50} shadow-camera-bottom={-50} />
      <hemisphereLight args={["#ffffff", "#88aa88", 0.4]} />
      <Ground color={layout.groundColor} />
      {blocks.map((b, i) => (
        <mesh key={i} position={b.position} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} roughness={0.75} />
        </mesh>
      ))}
      <LocalPlayer config={config} myId={userId} blocks={blocks} onMove={onMove} inputDisabled={inputDisabled} remotePositions={remotePositions} isTouchDevice={isTouchDevice} />
      {others.map((p) => (
        <RemotePlayer key={p.id} data={p} remotePositions={remotePositions} />
      ))}
    </>
  );
}

function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);
  const baseCenterRef = useRef({ x: 0, y: 0 });
  const maxDist = 55;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    baseCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    pointerIdRef.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActive(true);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    touchState.moveX = 0;
    touchState.moveZ = 0;
  };

  const updateFromPointer = (clientX: number, clientY: number) => {
    const dx = clientX - baseCenterRef.current.x;
    const dy = clientY - baseCenterRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxDist);
    const nx = dist > 0 ? (dx / dist) * clamped : 0;
    const ny = dist > 0 ? (dy / dist) * clamped : 0;
    setKnobPos({ x: nx, y: ny });
    touchState.moveX = nx / maxDist;
    touchState.moveZ = ny / maxDist;
  };

  return (
    <div ref={baseRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
      className="fixed bottom-6 left-6 rounded-full border-2 border-white/30 backdrop-blur touch-none select-none z-30"
      style={{ width: 140, height: 140, background: active ? "rgba(108, 60, 224, 0.25)" : "rgba(0, 0, 0, 0.35)" }}>
      <div className="absolute rounded-full bg-white/80 shadow-lg pointer-events-none"
        style={{ width: 60, height: 60, left: "50%", top: "50%", transform: `translate(calc(-50% + ${knobPos.x}px), calc(-50% + ${knobPos.y}px))`, transition: active ? "none" : "transform 0.15s ease" }} />
    </div>
  );
}

function JumpButton() {
  const [pressed, setPressed] = useState(false);
  const down = (e: React.PointerEvent) => { e.preventDefault(); touchState.jumpQueued = true; setPressed(true); };
  const up = () => setPressed(false);
  return (
    <button onPointerDown={down} onPointerUp={up} onPointerCancel={up}
      className={`fixed bottom-6 right-6 rounded-full border-2 border-white/30 backdrop-blur touch-none select-none z-30 flex items-center justify-center text-white text-2xl font-black transition ${pressed ? "scale-95 bg-[#22C55E]/60" : "bg-black/40"}`}
      style={{ width: 90, height: 90 }}>⬆️</button>
  );
}

function TouchLookArea({ onLook }: { onLook: (dx: number, dy: number) => void }) {
  const pointerIdRef = useRef<number | null>(null);
  const lastRef = useRef({ x: 0, y: 0 });
  const down = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = e.pointerId;
    lastRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - lastRef.current.x;
    const dy = e.clientY - lastRef.current.y;
    lastRef.current = { x: e.clientX, y: e.clientY };
    onLook(dx, dy);
  };
  const up = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
  };
  return <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="fixed top-0 right-0 w-1/2 h-full touch-none select-none z-20" style={{ background: "transparent" }} />;
}

// ============================================================
// CHAT CHANNEL NAME
// ============================================================
function getChatChannelName(worldId: string): string {
  return `world-chat-${worldId}`;
}

// ============================================================
// CHAT OVERLAY — the ONLY chat display in the game
// ============================================================
function ChatOverlay({ messages }: { messages: ChatMessage[] }) {
  const now = Date.now();
  const recent = messages
    .filter((m) => m.expiresAt > now)
    .slice(-6);

  if (recent.length === 0) return null;

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{
        bottom: "120px",
        left: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        maxWidth: "340px",
      }}
    >
      {recent.map((m) => (
        <div
          key={m.id}
          style={{
            background: "linear-gradient(90deg, rgba(0,0,0,0.85), rgba(20,10,40,0.75))",
            border: "1px solid rgba(108, 60, 224, 0.4)",
            borderLeft: "3px solid #6C3CE0",
            borderRadius: "8px",
            padding: "6px 10px",
            color: "white",
            fontSize: "13px",
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            animation: "chatOverlayIn 0.2s ease-out",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#00E5FF", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
            {m.username}
            <AccountBadge username={m.username} userId={m.userId} size={14} />
          </span>
          <span style={{ color: "rgba(255,255,255,0.92)", marginLeft: "2px" }}>{m.text}</span>
        </div>
      ))}
      <style jsx global>{`
        @keyframes chatOverlayIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default function WorldPage() {
  const params = useParams();
  const worldId = (params.id as string) || "";

  const [user, setUser] = useState<User | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [others, setOthers] = useState<RemotePlayerData[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [overlayMessages, setOverlayMessages] = useState<ChatMessage[]>([]);
  const [launchStatus, setLaunchStatus] = useState<"idle" | "launching" | "not-installed" | "failed">("idle");

  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastChatSentRef = useRef(0);
  const recentMessagesRef = useRef<string[]>([]);
  const muteUntilRef = useRef(0);

  const pendingChatRef = useRef<Array<{ id: string; userId: string; username: string; text: string }>>([]);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);

  const channelRef = useRef<any>(null);
  const chatChannelRef = useRef<any>(null);
  const lobbyRef = useRef<any>(null);
  const localPosRef = useRef<{ pos: [number, number, number]; rotY: number }>({ pos: [0, CHARACTER_Y_OFFSET, 0], rotY: 0 });
  const userRef = useRef<User | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    const touch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(touch);
  }, []);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    setMounted(true);
    fetchWorldById(worldId).then((w) => {
      if (!w) { setNotFound(true); return; }
      setWorld(w);
      setLikeCount(w.likes);
      hasLikedWorld(worldId).then((yes) => setLiked(yes));
      if (typeof window === "undefined") return;
      const visitKey = `voxelio-visited-${worldId}`;
      if (sessionStorage.getItem(visitKey) !== "1") {
        sessionStorage.setItem(visitKey, "1");
        incrementWorldVisits(worldId);
      }
    });
  }, [worldId]);

  useEffect(() => {
    if (!user || !worldId) return;
    const lobby = supabase.channel("world-lobby", { config: { presence: { key: user.id } } });
    lobby.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        lobby.track({ userId: user.id, username: user.username, worldId, joinedAt: Date.now() });
      }
    });
    lobbyRef.current = lobby;
    return () => {
      lobby.untrack();
      supabase.removeChannel(lobby);
      lobbyRef.current = null;
    };
  }, [user, worldId]);

  useEffect(() => {
    if (!ENABLE_OWNER_BADGE_DETECTION) return;
    if (!user || !worldId) return;
    if (user.username.toLowerCase() === "voxelio") return;
    if (user.playedWithOwner) return;

    let cancelled = false;
    let awarded = false;

    const checkOwner = async () => {
      if (cancelled || awarded) return;
      try {
        const candidates = [channelRef.current, lobbyRef.current].filter(
          (c) => c && typeof c.presenceState === "function"
        );
        let ownerPresent = false;

        for (const ch of candidates) {
          let state: Record<string, any[]> = {};
          try { state = ch.presenceState() as Record<string, any[]>; } catch { continue; }
          if (!state || typeof state !== "object") continue;

          for (const key of Object.keys(state)) {
            const entries = state[key];
            if (!Array.isArray(entries)) continue;
            for (const e of entries) {
              if (!e || typeof e !== "object") continue;
              const name = String((e as any).username || "").toLowerCase();
              const wid = (e as any).worldId;
              if (name === "voxelio" && (!wid || wid === worldId)) {
                ownerPresent = true;
                break;
              }
            }
            if (ownerPresent) break;
          }
          if (ownerPresent) break;
        }

        if (ownerPresent) {
          awarded = true;
          try {
            await awardPlayedWithOwner(user.id);
          } catch {
            awarded = false;
          }
        }
      } catch (err) {
        if (typeof console !== "undefined") console.warn("[owner-badge] check failed:", err);
      }
    };

    const interval = setInterval(checkOwner, 3000);
    checkOwner();

    return () => { cancelled = true; clearInterval(interval); };
  }, [user, worldId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const inInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
      if ((e.key === "t" || e.key === "T") && !chatOpen && !inInput) { e.preventDefault(); setChatOpen(true); }
      else if (e.key === "Escape" && chatOpen) { e.preventDefault(); setChatOpen(false); setDraft(""); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chatOpen]);

  useEffect(() => { if (chatOpen && inputRef.current) inputRef.current.focus(); }, [chatOpen]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setOverlayMessages((prev) => prev.filter((m) => m.expiresAt > now));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!systemMessage) return;
    const t = setTimeout(() => setSystemMessage(null), 3000);
    return () => clearTimeout(t);
  }, [systemMessage]);

  useEffect(() => {
    if (!user || !worldId) return;
    const interval = setInterval(() => {
      const channel = chatChannelRef.current;
      if (!channel) return;
      const queue = pendingChatRef.current;
      if (queue.length === 0) return;
      pendingChatRef.current = [];
      for (const msg of queue) {
        try {
          channel.send({ type: "broadcast", event: "chat", payload: msg });
        } catch {}
      }
    }, 200);
    return () => clearInterval(interval);
  }, [user, worldId]);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    const overlayMsg: ChatMessage = {
      ...msg,
      expiresAt: Date.now() + CHAT_OVERLAY_LIFETIME_MS,
    };
    setOverlayMessages((prev) => {
      if (prev.some((m) => m.id === overlayMsg.id)) return prev;
      return [...prev, overlayMsg];
    });
  }, []);

  const sendChat = useCallback(() => {
    const me = user;
    const text = draft.trim();
    if (!me || !text) { setChatOpen(false); setDraft(""); return; }

    const now = Date.now();

    if (now < muteUntilRef.current) {
      const remaining = Math.ceil((muteUntilRef.current - now) / 1000);
      setSystemMessage(`🚫 You are muted for spamming. ${remaining}s remaining.`);
      playError();
      setDraft("");
      setChatOpen(false);
      return;
    }

    const recent = recentMessagesRef.current;
    recent.push(text);
    while (recent.length > CHAT_SPAM_THRESHOLD) recent.shift();

    const isSpam =
      recent.length >= CHAT_SPAM_THRESHOLD &&
      recent.every((m) => m === recent[0]);

    if (isSpam) {
      muteUntilRef.current = now + CHAT_MUTE_DURATION_MS;
      recentMessagesRef.current = [];
      setSystemMessage("🚫 Muted for 1 minute — you spammed the same message.");
      playError();
      setDraft("");
      setChatOpen(false);
      return;
    }

    lastChatSentRef.current = now;
    const filtered = filterMessage(text.slice(0, CHAT_MAX_LENGTH));
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const msg: ChatMessage = { id, userId: me.id, username: me.username, text: filtered, expiresAt: Date.now() + CHAT_LIFETIME_MS };
    const payload = { id: msg.id, userId: msg.userId, username: msg.username, text: msg.text };

    addChatMessage(msg);

    const channel = chatChannelRef.current;
    if (channel) {
      try {
        channel.send({ type: "broadcast", event: "chat", payload });
      } catch {
        pendingChatRef.current.push(payload);
      }
    } else {
      pendingChatRef.current.push(payload);
    }

    setDraft(""); setChatOpen(false);
  }, [draft, user, addChatMessage]);

  const cancelChat = useCallback(() => { setChatOpen(false); setDraft(""); }, []);

  const handleLike = useCallback(async () => {
    if (!user || liking) return;
    setLiking(true);
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    const ok = wasLiked ? await unlikeWorld(worldId) : await likeWorld(worldId);
    if (!ok) { setLiked(wasLiked); setLikeCount(prevCount); }
    setLiking(false);
  }, [user, liking, liked, likeCount, worldId]);

  const handleMove = useCallback((pos: [number, number, number], rotY: number) => {
    localPosRef.current = { pos, rotY };
    const channel = channelRef.current;
    const me = userRef.current;
    if (!channel || !me) return;
    channel.send({ type: "broadcast", event: "move", payload: { id: me.id, username: me.username, displayId: me.displayId ?? null, avatarConfig: me.avatarConfig, pos, rotY } });
  }, []);

  const handlePlayInApp = useCallback(async () => {
    if (launchStatus === "launching") return;
    setLaunchStatus("launching");

    const result = await playInVoxelioApp(worldId);

    if (result.success) {
      setTimeout(() => setLaunchStatus("idle"), 2000);
    } else if (result.reason === "not_installed") {
      setLaunchStatus("not-installed");
    } else {
      setLaunchStatus("failed");
      setTimeout(() => setLaunchStatus("idle"), 2500);
    }
  }, [worldId, launchStatus]);

  useEffect(() => {
    if (!user || !worldId) return;
    const channel = supabase.channel(`world-${worldId}`, { config: { broadcast: { self: false }, presence: { key: user.id } } });

    channel
      .on("broadcast", { event: "move" }, ({ payload }) => {
        if (!payload || payload.id === user.id) return;
        setOthers((prev) => {
          const existing = prev.findIndex((p) => p.id === payload.id);
          const next: RemotePlayerData = { id: payload.id, username: payload.username, displayId: payload.displayId, avatarConfig: payload.avatarConfig, targetPos: payload.pos, targetRotY: payload.rotY, lastSeen: Date.now() };
          if (existing >= 0) { const copy = [...prev]; copy[existing] = next; return copy; }
          return [...prev, next];
        });
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
        const me = localPosRef.current;
        const u = userRef.current;
        if (u) {
          channel.send({ type: "broadcast", event: "move", payload: { id: u.id, username: u.username, displayId: u.displayId ?? null, avatarConfig: u.avatarConfig, pos: me.pos, rotY: me.rotY } });
        }
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          channel.track({ id: user.id, username: user.username, worldId });
        }
      });

    channelRef.current = channel;

    const staleTimer = setInterval(() => {
      const now = Date.now();
      setOthers((prev) => prev.filter((p) => now - p.lastSeen < STALE_TIMEOUT));
    }, 2000);

    return () => {
      clearInterval(staleTimer);
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, worldId]);

  useEffect(() => {
    if (!user || !worldId) return;
    const chatChannelName = getChatChannelName(worldId);
    const channel = supabase.channel(chatChannelName, {
      config: { broadcast: { self: false }, presence: { key: user.id } },
    });

    channel
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        if (!payload || payload.userId === user.id) return;
        const incoming: ChatMessage = {
          id: payload.id,
          userId: payload.userId,
          username: payload.username,
          text: filterMessage(String(payload.text || "").slice(0, CHAT_MAX_LENGTH)),
          expiresAt: Date.now() + CHAT_LIFETIME_MS,
        };
        addChatMessage(incoming);
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          channel.track({ id: user.id, username: user.username, worldId });
        }
      });

    chatChannelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      chatChannelRef.current = null;
    };
  }, [user?.id, worldId, addChatMessage]);

  const touchLook = useCallback((dx: number, dy: number) => {
    touchLookState.yawDelta -= dx * 0.005;
    touchLookState.pitchDelta += dy * 0.005;
  }, []);

  if (!mounted) return <div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading…</div>;

  if (!user) {
    return (
      <div className="fixed inset-0 bg-[#1A1A2E] flex flex-col items-center justify-center text-white p-6">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-black mb-2">Sign in to play</h1>
        <p className="text-sm text-white/70 mb-6">You need an account to enter worlds.</p>
        <div className="flex gap-2">
          <Link href="/signin" className="bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition">Sign In</Link>
          <Link href="/games" className="bg-white/10 text-white font-bold text-sm px-6 py-2.5 rounded border border-white/20 hover:bg-white/20 transition">← Back</Link>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="fixed inset-0 bg-[#1A1A2E] flex flex-col items-center justify-center text-white p-6">
        <div className="text-6xl mb-4">🌍</div>
        <h1 className="text-2xl font-black mb-2">World Not Found</h1>
        <p className="text-sm text-white/70 mb-6">This world doesn't exist or was removed.</p>
        <Link href="/games" className="bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition">← Back to Games</Link>
      </div>
    );
  }

  if (!world) return <div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading world…</div>;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {world.layout === "obby" ? (
        <ObbyGame
          config={user.avatarConfig}
          userId={user.id}
          username={user.username}
          world={world}
          inputDisabled={chatOpen}
          isTouchDevice={isTouchDevice}
        />
      ) : world.layout === "lumberyard" ? (
        <LumberyardGame
          config={user.avatarConfig}
          userId={user.id}
          username={user.username}
          world={world}
          inputDisabled={chatOpen}
          isTouchDevice={isTouchDevice}
        />
      ) : world.layout === "chaos-coliseum" ? (
        <ChaosColiseumGameMain
          config={user.avatarConfig}
          userId={user.id}
          username={user.username}
          world={world}
          inputDisabled={chatOpen}
          isTouchDevice={isTouchDevice}
        />
      ) : (
        <KeyboardControls map={KEY_MAP}>
          <Canvas shadows camera={{ position: [0, 5, 9], fov: 55 }} dpr={[1, 2]} style={{ background: "#87CEEB" }}>
            <WorldScene config={user.avatarConfig} userId={user.id} username={user.username} world={world} others={others} onMove={handleMove} inputDisabled={chatOpen} isTouchDevice={isTouchDevice} />
          </Canvas>
        </KeyboardControls>
      )}

      <ChatOverlay messages={overlayMessages} />

      {isTouchDevice && !chatOpen && world.layout !== "obby" && world.layout !== "lumberyard" && world.layout !== "chaos-coliseum" && (<><TouchLookArea onLook={touchLook} /><Joystick /><JumpButton /></>)}

      <div className="absolute top-3 left-3 flex items-center gap-2 z-30">
        <Link href="/games" className="bg-black/60 hover:bg-black/80 backdrop-blur text-white text-xs font-bold px-3 py-2 rounded border border-white/20">← Exit</Link>
        <div className="bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-xs hidden sm:flex items-center gap-2">
          <span className="text-lg leading-none">{world.thumbnailEmoji}</span>
          <div className="leading-tight"><div className="font-bold">{world.name}</div><div className="text-[10px] text-white/60">{world.category}</div></div>
        </div>
      </div>

      {/* ===== PLAY IN VOXELIO APP BUTTON ===== */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={handlePlayInApp}
          disabled={launchStatus === "launching"}
          className="flex items-center gap-2 rounded-xl font-black text-sm px-5 py-2.5 shadow-2xl transition active:scale-[0.98]"
          style={{
            background:
              launchStatus === "launching"
                ? "linear-gradient(180deg, #6B7280, #4B5563)"
                : "linear-gradient(180deg, #22C55E 0%, #16A34A 100%)",
            border: "2px solid #15803D",
            color: "white",
            boxShadow:
              launchStatus === "launching"
                ? "0 6px 20px rgba(107,114,128,0.4)"
                : "0 6px 20px rgba(34,197,94,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
            cursor: launchStatus === "launching" ? "wait" : "pointer",
          }}
        >
          <span style={{ fontSize: 16 }}>▶</span>
          <span>
            {launchStatus === "launching"
              ? "Launching…"
              : launchStatus === "failed"
              ? "Failed — try again"
              : "Play in Voxelio App"}
          </span>
        </button>
      </div>

      {/* ===== NOT-INSTALLED POPUP ===== */}
      {launchStatus === "not-installed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={() => setLaunchStatus("idle")}
        >
          <div
            className="rounded-2xl p-6 max-w-md mx-4 text-center"
            style={{
              background:
                "linear-gradient(160deg, #1A1A2E 0%, #0F0F22 50%, #0A0A1E 100%)",
              border: "2px solid rgba(139, 95, 255, 0.4)",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(139,95,255,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎮</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "white",
                marginBottom: 8,
              }}
            >
              Voxelio Player Not Installed
            </div>
            <div
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.65)",
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              To play Voxelio games in full-screen, download the Voxelio Player app.
            </div>
            <div className="flex gap-2 justify-center">
              <Link
                href="/download"
                className="rounded-lg font-black text-sm px-5 py-2.5 no-underline"
                style={{
                  background:
                    "linear-gradient(180deg, #8B5FFF 0%, #6C3CE0 50%, #5A2FC7 100%)",
                  border: "2px solid #4A1FA8",
                  color: "white",
                  boxShadow:
                    "0 6px 20px rgba(108,60,224,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                ⬇ Download App
              </Link>
              <button
                onClick={() => setLaunchStatus("idle")}
                className="rounded-lg font-bold text-sm px-5 py-2.5"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.8)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-3 right-3 flex items-center gap-2 z-30">
        <button onClick={handleLike} disabled={liking} title={liked ? "Unlike this world" : "Like this world"}
          className={`backdrop-blur px-3 py-2 rounded border text-white text-xs font-bold flex items-center gap-2 transition ${liked ? "bg-pink-500/80 border-pink-300 hover:bg-pink-500" : "bg-black/60 border-white/20 hover:bg-black/80"} ${liking ? "opacity-70 cursor-wait" : ""}`}>
          <span>{liked ? "❤️" : "🤍"}</span><span className="hidden sm:inline">{likeCount}</span>
        </button>
        <div className="bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-xs flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /><strong>{onlineCount}</strong>
        </div>
        {isTouchDevice && (
          <button onClick={() => setChatOpen(true)} className="bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-xs font-bold" title="Open chat">💬</button>
        )}
        <div className="hidden md:flex bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-xs items-center gap-2">
          <span className="font-bold inline-flex items-center">{user.username}<AccountBadge username={user.username} userId={user.id} size={12} /></span>
          <span className="text-[#FFD700] font-bold">{formatVoxbux(user.voxbux)}</span>
        </div>
      </div>

      {world.layout !== "obby" && world.layout !== "lumberyard" && world.layout !== "chaos-coliseum" && (
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-[11px] space-y-1 hidden md:block z-30">
          <p className="font-bold mb-1">🎮 Controls</p>
          <p><kbd className="bg-white/10 px-1 rounded">W</kbd> <kbd className="bg-white/10 px-1 rounded">A</kbd> <kbd className="bg-white/10 px-1 rounded">S</kbd> <kbd className="bg-white/10 px-1 rounded">D</kbd> — Move</p>
          <p><kbd className="bg-white/10 px-1 rounded">Space</kbd> — Jump</p>
          <p className="text-white/70">🖱️ <strong>Right-click drag</strong> to look around · <strong>Scroll</strong> to zoom</p>
          <p><kbd className="bg-white/10 px-1 rounded">T</kbd> — Chat</p>
        </div>
      )}

      {others.length > 0 && (
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-[11px] space-y-1 max-w-[180px] hidden md:block z-30">
          <p className="font-bold mb-1">👥 In this world</p>
          {others.slice(0, 8).map((p) => (
            <p key={p.id} className="truncate text-white/80 flex items-center gap-1"><span className="truncate">• {p.username}</span><AccountBadge username={p.username} userId={p.id} size={11} /></p>
          ))}
          {others.length > 8 && <p className="text-white/50">+{others.length - 8} more</p>}
        </div>
      )}

      {systemMessage && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-red-600/90 backdrop-blur px-4 py-2 rounded-lg text-white text-sm font-bold shadow-2xl border border-red-300">
            {systemMessage}
          </div>
        </div>
      )}

      {chatOpen && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[min(560px,90vw)] z-40">
          <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="bg-black/85 backdrop-blur border-2 border-[#6C3CE0] rounded-lg px-3 py-2 flex items-center gap-2 shadow-2xl">
            <span className="text-[#00E5FF] font-bold text-sm flex-shrink-0">💬</span>
            <input ref={inputRef} type="text" value={draft} onChange={(e) => setDraft(e.target.value.slice(0, CHAT_MAX_LENGTH))} placeholder="Type a message…" className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40" maxLength={CHAT_MAX_LENGTH} autoComplete="off" />
            <button type="submit" className="text-white bg-[#6C3CE0] hover:bg-[#5A2FC7] text-xs font-bold px-3 py-1.5 rounded flex-shrink-0">Send</button>
            <button type="button" onClick={cancelChat} className="text-white/60 hover:text-white text-sm flex-shrink-0" title="Cancel (Esc)">✕</button>
          </form>
          <p className="text-[10px] text-white/50 text-center mt-1">Esc to cancel</p>
        </div>
      )}

      {!chatOpen && !isTouchDevice && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <div className="bg-black/40 backdrop-blur px-3 py-1 rounded-full text-white/50 text-[10px]">Press <kbd className="bg-white/10 px-1 rounded">T</kbd> to chat</div>
        </div>
      )}
    </div>
  );
}