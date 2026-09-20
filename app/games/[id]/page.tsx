"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls, Sky, Text } from "@react-three/drei";
import { Character } from "../../components/Avatar";
import AccountBadge from "../../components/AccountBadge";
import { getCurrentUser, formatVoxbux, type User, type AvatarConfig } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import { fetchWorldById, incrementWorldVisits, type World } from "../../../lib/worlds";

// ============================================================
// VOXELIO MULTIPLAYER WORLD
// ============================================================

const KEY_MAP = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
];

const MOVE_SPEED = 6;
const CAMERA_DISTANCE = 8;
const CAMERA_HEIGHT = 4;
const CAMERA_LOOK_HEIGHT = 1.2;
const ROTATION_LERP = 12;
const CHARACTER_Y_OFFSET = 1.6;

const BROADCAST_INTERVAL = 50; // ms between position broadcasts (~20/s)
const STALE_TIMEOUT = 5000; // remove a player if we haven't heard from them for 5s

// ============================================================
// REMOTE PLAYER — interpolates toward the last received position
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

function RemotePlayer({ data }: { data: RemotePlayerData }) {
  const groupRef = useRef<THREE.Group>(null);
  const currentRef = useRef(new THREE.Vector3(...data.targetPos));
  const currentRotRef = useRef(data.targetRotY);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Lerp position toward target
    const lerp = Math.min(1, delta * 10);
    currentRef.current.lerp(new THREE.Vector3(...data.targetPos), lerp);
    groupRef.current.position.copy(currentRef.current);

    // Lerp rotation — handle wrap-around
    let diff = data.targetRotY - currentRotRef.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentRotRef.current += diff * Math.min(1, delta * 12);
    groupRef.current.rotation.y = currentRotRef.current;
  });

  return (
    <group ref={groupRef} position={data.targetPos}>
      {/* Nametag */}
      <group position={[0, 2.6, 0]}>
        <Text
          fontSize={0.28}
          color="#FFFFFF"
          outlineWidth={0.02}
          outlineColor="#000000"
          anchorX="center"
          anchorY="middle"
        >
          {data.username}
        </Text>
      </group>

      <Character config={data.avatarConfig} />
    </group>
  );
}

// ============================================================
// LOCAL PLAYER — WASD movement + broadcasts position
// ============================================================
function LocalPlayer({
  config,
  onMove,
}: {
  config: AvatarConfig;
  onMove: (pos: [number, number, number], rotY: number) => void;
}) {
  const [, getKeys] = useKeyboardControls();
  const groupRef = useRef<THREE.Group>(null);
  const positionRef = useRef(new THREE.Vector3(0, CHARACTER_Y_OFFSET, 0));
  const facingRef = useRef(0);
  const lastBroadcastRef = useRef(0);
  const needsBroadcastRef = useRef(false);

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

      const speed = MOVE_SPEED;
      const targetAngle = Math.atan2(dx, dz);

      const current = groupRef.current.rotation.y;
      let diff = targetAngle - current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y = current + diff * Math.min(1, delta * ROTATION_LERP);
      facingRef.current = groupRef.current.rotation.y;

      positionRef.current.x += Math.sin(facingRef.current) * speed * delta;
      positionRef.current.z += Math.cos(facingRef.current) * speed * delta;

      // Clamp to world bounds
      const bound = 95;
      positionRef.current.x = Math.max(-bound, Math.min(bound, positionRef.current.x));
      positionRef.current.z = Math.max(-bound, Math.min(bound, positionRef.current.z));

      needsBroadcastRef.current = true;
    }

    groupRef.current.position.copy(positionRef.current);

    // Camera follow
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

    // Broadcast position at ~20fps
    const now = performance.now();
    if (
      needsBroadcastRef.current &&
      now - lastBroadcastRef.current >= BROADCAST_INTERVAL
    ) {
      lastBroadcastRef.current = now;
      needsBroadcastRef.current = false;
      onMove(
        [positionRef.current.x, positionRef.current.y, positionRef.current.z],
        facingRef.current
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, CHARACTER_Y_OFFSET, 0]}>
      <Character config={config} />
    </group>
  );
}

// ============================================================
// WORLD SCENE
// ============================================================
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#4ADE80" roughness={0.95} />
    </mesh>
  );
}

function Block({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

function WorldScene({
  config,
  others,
  onMove,
}: {
  config: AvatarConfig;
  others: RemotePlayerData[];
  onMove: (pos: [number, number, number], rotY: number) => void;
}) {
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

      {/* Decorative blocks */}
      <Block position={[5, 1, -5]} size={[2, 2, 2]} color="#7B2FF7" />
      <Block position={[-8, 1.5, -3]} size={[3, 3, 3]} color="#00B8D4" />
      <Block position={[10, 0.75, 8]} size={[1.5, 1.5, 1.5]} color="#FFD700" />
      <Block position={[-4, 2, 6]} size={[4, 4, 4]} color="#EC4899" />
      <Block position={[0, 3, -15]} size={[6, 6, 6]} color="#4B5563" />
      <Block position={[15, 2, 0]} size={[4, 4, 1]} color="#22C55E" />
      <Block position={[-15, 2, -10]} size={[4, 4, 1]} color="#EF4444" />

      <LocalPlayer config={config} onMove={onMove} />

      {others.map((p) => (
        <RemotePlayer key={p.id} data={p} />
      ))}
    </>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function WorldPage() {
  const params = useParams();
  const router = useRouter();
  const worldId = (params.id as string) || "";

  const [user, setUser] = useState<User | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [others, setOthers] = useState<RemotePlayerData[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);

  const channelRef = useRef<any>(null);

  // ===== Load user + world =====
  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    setMounted(true);

    fetchWorldById(worldId).then((w) => {
      if (!w) setNotFound(true);
      else {
        setWorld(w);
        incrementWorldVisits(worldId);
      }
    });
  }, [worldId]);

  // ===== Realtime channel =====
  const handleMove = useCallback(
    (pos: [number, number, number], rotY: number) => {
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
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          // Announce ourselves
          channel.track({ id: user.id, username: user.username });
        }
      });

    channelRef.current = channel;

    // Cleanup old/stale players
    const staleTimer = setInterval(() => {
      const now = Date.now();
      setOthers((prev) => prev.filter((p) => now - p.lastSeen < STALE_TIMEOUT));
    }, 2000);

    // Send initial move so we show up for others quickly
    setTimeout(() => {
      handleMove([0, CHARACTER_Y_OFFSET, 0], 0);
    }, 500);

    return () => {
      clearInterval(staleTimer);
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, worldId, handleMove]);

  // ===== Guards =====
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
          You need an account to enter worlds.
        </p>
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
        <p className="text-sm text-white/70 mb-6">
          This world doesn't exist or was removed.
        </p>
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
          camera={{ position: [0, 4, 8], fov: 55 }}
          dpr={[1, 2]}
          style={{ background: "#87CEEB" }}
        >
          <WorldScene
            config={user.avatarConfig}
            others={others}
            onMove={handleMove}
          />
        </Canvas>
      </KeyboardControls>

      {/* TOP LEFT — World info + exit */}
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

      {/* TOP RIGHT — Player count + balance */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
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

      {/* BOTTOM LEFT — Controls */}
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-[11px] space-y-1">
        <p className="font-bold mb-1">🎮 Controls</p>
        <p>
          <kbd className="bg-white/10 px-1 rounded">W</kbd>{" "}
          <kbd className="bg-white/10 px-1 rounded">A</kbd>{" "}
          <kbd className="bg-white/10 px-1 rounded">S</kbd>{" "}
          <kbd className="bg-white/10 px-1 rounded">D</kbd> — Move
        </p>
      </div>

      {/* BOTTOM RIGHT — Other players in this world */}
      {others.length > 0 && (
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-[11px] space-y-1 max-w-[180px]">
          <p className="font-bold mb-1">👥 In this world</p>
          {others.slice(0, 8).map((p) => (
            <p key={p.id} className="truncate text-white/80">
              • {p.username}
            </p>
          ))}
          {others.length > 8 && (
            <p className="text-white/50">+{others.length - 8} more</p>
          )}
        </div>
      )}
    </div>
  );
}