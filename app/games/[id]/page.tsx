"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls, Sky, Html } from "@react-three/drei";
import { Character } from "../../components/Avatar";
import AccountBadge from "../../components/AccountBadge";
import { getCurrentUser, formatVoxbux, type User, type AvatarConfig } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import {
  fetchWorldById,
  incrementWorldVisits,
  hasLikedWorld,
  likeWorld,
  unlikeWorld,
  type World,
} from "../../../lib/worlds";
import { getLayout, type BlockData } from "../../../lib/worldLayouts";

// ============================================================
// VOXELIO MULTIPLAYER WORLD
// ============================================================

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
const CHAT_MAX_LENGTH = 120;

// ============================================================
// TYPES
// ============================================================
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

// ============================================================
// SAFE SPAWN
// ============================================================
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

// ============================================================
// COLLISION
// ============================================================
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

      if (
        pMaxX <= bMinX ||
        pMinX >= bMaxX ||
        pTopY <= bMinY ||
        pFeetY >= bMaxY ||
        pMaxZ <= bMinZ ||
        pMinZ >= bMaxZ
      ) {
        continue;
      }

      const penX = Math.min(pMaxX - bMinX, bMaxX - pMinX);
      const penY = Math.min(pTopY - bMinY, bMaxY - pFeetY);
      const penZ = Math.min(pMaxZ - bMinZ, bMaxZ - pMinZ);

      if (penX <= penY && penX <= penZ) {
        pos.x += pos.x < bx ? -penX : penX;
      } else if (penY <= penZ) {
        pos.y += pos.y < by + CHARACTER_Y_OFFSET ? -penY : penY;
      } else {
        pos.z += pos.z < bz ? -penZ : penZ;
      }

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
    if (
      Math.abs(feetY - topY) < 0.15 &&
      Math.abs(pos.x - b.position[0]) < b.size[0] / 2 + PLAYER_RADIUS * 0.7 &&
      Math.abs(pos.z - b.position[2]) < b.size[2] / 2 + PLAYER_RADIUS * 0.7
    ) {
      return true;
    }
  }
  return false;
}

function resolvePlayerCollisions(
  pos: THREE.Vector3,
  myId: string,
  remotePositions: Map<string, THREE.Vector3>
): void {
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
    if (dist < 0.001) {
      pos.x += minDist * 0.5;
      continue;
    }

    const overlap = minDist - dist;
    pos.x += (dx / dist) * overlap;
    pos.z += (dz / dist) * overlap;
  }
}

// ============================================================
// NAMETAG
// ============================================================
function Nametag({
  username,
  userId,
}: {
  username: string;
  userId: string;
}) {
  return (
    <Html
      position={[0, 2.55, 0]}
      center
      distanceFactor={10}
      zIndexRange={[10, 0]}
      style={{ pointerEvents: "none", overflow: "visible" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <span
          style={{
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 14,
            lineHeight: 1,
            textShadow:
              "0 0 2px #000, 0 0 2px #000, 0 0 2px #000, 0 0 2px #000",
          }}
        >
          {username}
        </span>
        <AccountBadge username={username} userId={userId} size={16} />
      </div>
    </Html>
  );
}

// ============================================================
// CHAT BUBBLE
// ============================================================
function ChatBubble({ text }: { text: string }) {
  return (
    <Html
      position={[0, 3.2, 0]}
      center
      distanceFactor={10}
      zIndexRange={[15, 10]}
      style={{ pointerEvents: "none", overflow: "visible" }}
    >
      <div
        style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          background: "rgba(26, 26, 46, 0.92)",
          color: "#FFFFFF",
          padding: "6px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.2)",
          fontSize: 14,
          lineHeight: 1.2,
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {text}
      </div>
    </Html>
  );
}

// ============================================================
// REMOTE PLAYER
// ============================================================
function RemotePlayer({
  data,
  chatMessage,
  remotePositions,
}: {
  data: RemotePlayerData;
  chatMessage?: ChatMessage | null;
  remotePositions: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const currentRef = useRef(new THREE.Vector3(...data.targetPos));
  const currentRotRef = useRef(data.targetRotY);
  const walkingRef = useRef(false);

  useEffect(() => {
    remotePositions.current.set(data.id, currentRef.current);
    return () => {
      remotePositions.current.delete(data.id);
    };
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
      {chatMessage && <ChatBubble text={chatMessage.text} />}
      <Character config={data.avatarConfig} hideAccessory walking={walkingRef.current} />
    </group>
  );
}

// ============================================================
// LOCAL PLAYER
// ============================================================
function LocalPlayer({
  config,
  myId,
  blocks,
  onMove,
  chatMessage,
  inputDisabled,
  remotePositions,
}: {
  config: AvatarConfig;
  myId: string;
  blocks: BlockData[];
  onMove: (pos: [number, number, number], rotY: number) => void;
  chatMessage?: ChatMessage | null;
  inputDisabled: boolean;
  remotePositions: React.MutableRefObject<Map<string, THREE.Vector3>>;
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
    const canvas = gl.domElement;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
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
      cameraPitchRef.current = Math.max(
        CAMERA_MIN_PITCH,
        Math.min(CAMERA_MAX_PITCH, cameraPitchRef.current + dy * 0.005)
      );
    };

    const onMouseUp = () => {
      if (dragging) {
        dragging = false;
        canvas.style.cursor = "grab";
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistRef.current = Math.max(
        CAMERA_MIN_DIST,
        Math.min(CAMERA_MAX_DIST, cameraDistRef.current + e.deltaY * 0.01)
      );
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
  }, [gl]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const keys = getKeys();

    let localX = 0;
    let localZ = 0;
    if (!inputDisabled) {
      if (keys.forward) localZ += 1;
      if (keys.backward) localZ -= 1;
      if (keys.left) localX += 1;
      if (keys.right) localX -= 1;
    }

    const inputLen = Math.hypot(localX, localZ);
    const hasInput = inputLen > 0.001;

    if (hasInput) {
      localX /= inputLen;
      localZ /= inputLen;
    }

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

    if (!inputDisabled && keys.jump && groundedRef.current) {
      velocityYRef.current = JUMP_VELOCITY;
      groundedRef.current = false;
    }

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
    if (grounded && velocityYRef.current < 0) {
      velocityYRef.current = 0;
    }

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
      onMove(
        [positionRef.current.x, positionRef.current.y, positionRef.current.z],
        facingRef.current
      );
    }
  });

  return (
    <group ref={groupRef} position={safeSpawn}>
      {chatMessage && <ChatBubble text={chatMessage.text} />}
      <Character config={config} hideAccessory walking={walking} />
    </group>
  );
}

// ============================================================
// SCENE
// ============================================================
function Ground({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

function WorldScene({
  config,
  userId,
  username,
  world,
  others,
  chatMessages,
  onMove,
  inputDisabled,
}: {
  config: AvatarConfig;
  userId: string;
  username: string;
  world: World;
  others: RemotePlayerData[];
  chatMessages: ChatMessage[];
  onMove: (pos: [number, number, number], rotY: number) => void;
  inputDisabled: boolean;
}) {
  const layout = getLayout(world.layout);
  const blocks = layout.blocks;

  const remotePositions = useRef<Map<string, THREE.Vector3>>(new Map());

  const latestFor = (id: string): ChatMessage | null => {
    let best: ChatMessage | null = null;
    for (const m of chatMessages) {
      if (m.userId !== id) continue;
      if (!best || m.expiresAt > best.expiresAt) best = m;
    }
    return best;
  };

  return (
    <>
      <Sky sunPosition={[100, 50, 100]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <hemisphereLight args={["#ffffff", "#88aa88", 0.4]} />

      <Ground color={layout.groundColor} />

      {blocks.map((b, i) => (
        <mesh key={i} position={b.position} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} roughness={0.75} />
        </mesh>
      ))}

      <LocalPlayer
        config={config}
        myId={userId}
        blocks={blocks}
        onMove={onMove}
        chatMessage={latestFor(userId)}
        inputDisabled={inputDisabled}
        remotePositions={remotePositions}
      />

      {others.map((p) => (
        <RemotePlayer
          key={p.id}
          data={p}
          chatMessage={latestFor(p.id)}
          remotePositions={remotePositions}
        />
      ))}
    </>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function WorldPage() {
  const params = useParams();
  const worldId = (params.id as string) || "";

  const [user, setUser] = useState<User | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [others, setOthers] = useState<RemotePlayerData[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);

  const channelRef = useRef<any>(null);
  const lobbyRef = useRef<any>(null);
  const localPosRef = useRef<{ pos: [number, number, number]; rotY: number }>({
    pos: [0, CHARACTER_Y_OFFSET, 0],
    rotY: 0,
  });

  // ===== Load user + world =====
  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    setMounted(true);

    fetchWorldById(worldId).then((w) => {
      if (!w) {
        setNotFound(true);
        return;
      }
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

  // ===== Join lobby presence =====
  useEffect(() => {
    if (!user || !worldId) return;

    const lobby = supabase.channel("world-lobby", {
      config: { presence: { key: user.id } },
    });

    lobby.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        lobby.track({
          userId: user.id,
          username: user.username,
          worldId,
          joinedAt: Date.now(),
        });
      }
    });

    lobbyRef.current = lobby;

    return () => {
      lobby.untrack();
      supabase.removeChannel(lobby);
      lobbyRef.current = null;
    };
  }, [user, worldId]);

  // ===== Chat hotkey: T to open, Escape to close =====
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const inInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");

      if ((e.key === "t" || e.key === "T") && !chatOpen && !inInput) {
        e.preventDefault();
        setChatOpen(true);
      } else if (e.key === "Escape" && chatOpen) {
        e.preventDefault();
        setChatOpen(false);
        setDraft("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chatOpen]);

  useEffect(() => {
    if (chatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatOpen]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setChatMessages((prev) => prev.filter((m) => m.expiresAt > now));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const sendChat = useCallback(() => {
    const me = user;
    const text = draft.trim();
    if (!me || !text) {
      setChatOpen(false);
      setDraft("");
      return;
    }

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const msg: ChatMessage = {
      id,
      userId: me.id,
      username: me.username,
      text: text.slice(0, CHAT_MAX_LENGTH),
      expiresAt: Date.now() + CHAT_LIFETIME_MS,
    };

    setChatMessages((prev) => [...prev, msg]);

    const channel = channelRef.current;
    if (channel) {
      channel.send({
        type: "broadcast",
        event: "chat",
        payload: {
          id: msg.id,
          userId: msg.userId,
          username: msg.username,
          text: msg.text,
        },
      });
    }

    setDraft("");
    setChatOpen(false);
  }, [draft, user]);

  const cancelChat = useCallback(() => {
    setChatOpen(false);
    setDraft("");
  }, []);

  const handleLike = useCallback(async () => {
    if (!user || liking) return;
    setLiking(true);

    const wasLiked = liked;
    const prevCount = likeCount;

    setLiked(!wasLiked);
    setLikeCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    const ok = wasLiked
      ? await unlikeWorld(worldId)
      : await likeWorld(worldId);

    if (!ok) {
      setLiked(wasLiked);
      setLikeCount(prevCount);
    }

    setLiking(false);
  }, [user, liking, liked, likeCount, worldId]);

  const handleMove = useCallback(
    (pos: [number, number, number], rotY: number) => {
      localPosRef.current = { pos, rotY };
      const channel = channelRef.current;
      const me = user;
      if (!channel || !me) return;

      channel.send({
        type: "broadcast",
        event: "move",
        payload: {
          id: me.id,
          username: me.username,
          displayId: me.displayId ?? null,
          avatarConfig: me.avatarConfig,
          pos,
          rotY,
        },
      });
    },
    [user]
  );

  useEffect(() => {
    if (!user || !worldId) return;

    const channel = supabase.channel(`world-${worldId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: user.id },
      },
    });

    channel
      .on("broadcast", { event: "move" }, ({ payload }) => {
        if (!payload || payload.id === user.id) return;
        setOthers((prev) => {
          const existing = prev.findIndex((p) => p.id === payload.id);
          const next: RemotePlayerData = {
            id: payload.id,
            username: payload.username,
            displayId: payload.displayId,
            avatarConfig: payload.avatarConfig,
            targetPos: payload.pos,
            targetRotY: payload.rotY,
            lastSeen: Date.now(),
          };
          if (existing >= 0) {
            const copy = [...prev];
            copy[existing] = next;
            return copy;
          }
          return [...prev, next];
        });
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        if (!payload || payload.userId === user.id) return;
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [
            ...prev,
            {
              id: payload.id,
              userId: payload.userId,
              username: payload.username,
              text: payload.text,
              expiresAt: Date.now() + CHAT_LIFETIME_MS,
            },
          ];
        });
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
        const me = localPosRef.current;
        channel.send({
          type: "broadcast",
          event: "move",
          payload: {
            id: user.id,
            username: user.username,
            displayId: user.displayId ?? null,
            avatarConfig: user.avatarConfig,
            pos: me.pos,
            rotY: me.rotY,
          },
        });
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          channel.track({ id: user.id, username: user.username });
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
  }, [user, worldId, handleMove]);

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
        <p className="text-sm text-white/70 mb-6">You need an account to enter worlds.</p>
        <div className="flex gap-2">
          <Link
            href="/signin"
            className="bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
          >
            Sign In
          </Link>
          <Link
            href="/games"
            className="bg-white/10 text-white font-bold text-sm px-6 py-2.5 rounded border border-white/20 hover:bg-white/20 transition"
          >
            ← Back
          </Link>
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
        <Link
          href="/games"
          className="bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
        >
          ← Back to Games
        </Link>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        Loading world…
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <KeyboardControls map={KEY_MAP}>
        <Canvas
          shadows
          camera={{ position: [0, 5, 9], fov: 55 }}
          dpr={[1, 2]}
          style={{ background: "#87CEEB" }}
        >
          <WorldScene
            config={user.avatarConfig}
            userId={user.id}
            username={user.username}
            world={world}
            others={others}
            chatMessages={chatMessages}
            onMove={handleMove}
            inputDisabled={chatOpen}
          />
        </Canvas>
      </KeyboardControls>

      {/* TOP LEFT */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <Link
          href="/games"
          className="bg-black/60 hover:bg-black/80 backdrop-blur text-white text-xs font-bold px-3 py-2 rounded border border-white/20"
        >
          ← Exit
        </Link>
        <div className="bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-xs flex items-center gap-2">
          <span className="text-lg leading-none">{world.thumbnailEmoji}</span>
          <div className="leading-tight">
            <div className="font-bold">{world.name}</div>
            <div className="text-[10px] text-white/60">{world.category}</div>
          </div>
        </div>
      </div>

      {/* TOP RIGHT */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={liking}
          title={liked ? "Unlike this world" : "Like this world"}
          className={`backdrop-blur px-3 py-2 rounded border text-white text-xs font-bold flex items-center gap-2 transition ${
            liked
              ? "bg-pink-500/80 border-pink-300 hover:bg-pink-500"
              : "bg-black/60 border-white/20 hover:bg-black/80"
          } ${liking ? "opacity-70 cursor-wait" : ""}`}
        >
          <span>{liked ? "❤️" : "🤍"}</span>
          <span>{likeCount}</span>
        </button>

        <div className="bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-xs flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <strong>{onlineCount}</strong> online
        </div>

        <div className="bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-xs flex items-center gap-2">
          <span className="font-bold inline-flex items-center">
            {user.username}
            <AccountBadge username={user.username} userId={user.id} size={12} />
          </span>
          <span className="text-[#FFD700] font-bold">{formatVoxbux(user.voxbux)}</span>
        </div>
      </div>

      {/* BOTTOM LEFT — controls */}
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-[11px] space-y-1">
        <p className="font-bold mb-1">🎮 Controls</p>
        <p>
          <kbd className="bg-white/10 px-1 rounded">W</kbd>{" "}
          <kbd className="bg-white/10 px-1 rounded">A</kbd>{" "}
          <kbd className="bg-white/10 px-1 rounded">S</kbd>{" "}
          <kbd className="bg-white/10 px-1 rounded">D</kbd> — Move
        </p>
        <p>
          <kbd className="bg-white/10 px-1 rounded">Space</kbd> — Jump
        </p>
        <p className="text-white/70">
          🖱️ <strong>Drag</strong> to look around · <strong>Scroll</strong> to zoom
        </p>
        <p>
          <kbd className="bg-white/10 px-1 rounded">T</kbd> — Chat
        </p>
      </div>

      {/* BOTTOM RIGHT — players in world */}
      {others.length > 0 && (
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-[11px] space-y-1 max-w-[180px]">
          <p className="font-bold mb-1">👥 In this world</p>
          {others.slice(0, 8).map((p) => (
            <p key={p.id} className="truncate text-white/80 flex items-center gap-1">
              <span className="truncate">• {p.username}</span>
              <AccountBadge username={p.username} userId={p.id} size={11} />
            </p>
          ))}
          {others.length > 8 && (
            <p className="text-white/50">+{others.length - 8} more</p>
          )}
        </div>
      )}

      {/* CHAT INPUT */}
      {chatOpen && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[min(560px,90vw)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChat();
            }}
            className="bg-black/85 backdrop-blur border-2 border-[#6C3CE0] rounded-lg px-3 py-2 flex items-center gap-2 shadow-2xl"
          >
            <span className="text-[#00E5FF] font-bold text-sm flex-shrink-0">💬</span>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, CHAT_MAX_LENGTH))}
              placeholder="Type a message and press Enter…"
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40"
              maxLength={CHAT_MAX_LENGTH}
              autoComplete="off"
            />
            <span className="text-[10px] text-white/40 flex-shrink-0">
              {draft.length}/{CHAT_MAX_LENGTH}
            </span>
            <button
              type="button"
              onClick={cancelChat}
              className="text-white/60 hover:text-white text-sm flex-shrink-0"
              title="Cancel (Esc)"
            >
              ✕
            </button>
          </form>
          <p className="text-[10px] text-white/50 text-center mt-1">
            Enter to send · Esc to cancel
          </p>
        </div>
      )}

      {/* CHAT HINT (when closed) */}
      {!chatOpen && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/40 backdrop-blur px-3 py-1 rounded-full text-white/50 text-[10px]">
            Press <kbd className="bg-white/10 px-1 rounded">T</kbd> to chat
          </div>
        </div>
      )}
    </div>
  );
}