"use client";

import { Suspense, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Sky } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import type { AvatarConfig } from "../../../lib/auth";
import type { World } from "../../../lib/worlds";
import { supabase } from "../../../lib/supabase";
import PizzaPlot from "./PizzaPlot";
import PizzaEmpirePlayer from "./PizzaEmpirePlayer";
import RemotePizzaPlayer, { type RemotePizzaData } from "./RemotePizzaPlayer";
import PizzaEmpireHud from "./PizzaEmpireHud";
import {
  loadProgress,
  saveProgress,
  resetProgress,
  tryBuyNextOven,
  tryUpgradeOven,
  calculateIncomePerSecond,
  countOwnedOvens,
  applyIncomeTick,
  createDefaultProgress,
  type PizzaEmpireProgress,
} from "../../../lib/pizzaEmpireProgress";
import {
  ARENA_SIZE,
  ARENA_RADIUS,
  ARENA_WALL_HEIGHT,
  PLOT_POSITIONS,
  PLOT_SPAWNS,
  MAX_OVENS,
  TICK_INTERVAL_MS,
} from "../../../lib/pizzaEmpire";
import {
  playPurchase,
  playUpgradeFanfare,
  playError,
  playOvenDing,
  startPizzeriaMusic,
  stopPizzeriaMusic,
} from "../../../lib/sounds";

// ============================================================
// PIZZA EMPIRE TYCOON — main game component
// ============================================================

const KEY_MAP = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
  { name: "jump", keys: [" ", "Space"] },
];

const touchState = { moveX: 0, moveZ: 0, jumpQueued: false };

const BROADCAST_INTERVAL = 66;
const STALE_TIMEOUT = 3000;

type Props = {
  config: AvatarConfig;
  userId: string;
  username: string;
  world: World;
  inputDisabled: boolean;
  isTouchDevice: boolean;
};

type RemoteState = {
  id: string;
  username: string;
  displayId?: number | null;
  avatarConfig: AvatarConfig;
  pos: [number, number, number];
  rotY: number;
  coins: number;
  lastSeen: number;
};

// ============================================================
// ARENA FLOOR + WALLS — with explicit colliders
// ============================================================
function Arena() {
  const floorSize = ARENA_SIZE + 4;
  const FLOOR_THICKNESS = 1;
  const FLOOR_TOP_Y = -0.5; // top surface of the arena floor
  const FLOOR_CENTER_Y = FLOOR_TOP_Y - FLOOR_THICKNESS / 2;

  return (
    <>
      {/* Ground floor beneath the plots */}
      <RigidBody type="fixed" colliders={false} friction={0.9}>
        <CuboidCollider
          args={[floorSize / 2, FLOOR_THICKNESS / 2, floorSize / 2]}
          position={[0, FLOOR_CENTER_Y, 0]}
        />
        <mesh position={[0, FLOOR_CENTER_Y, 0]} receiveShadow>
          <boxGeometry args={[floorSize, FLOOR_THICKNESS, floorSize]} />
          <meshStandardMaterial color="#1A1008" roughness={0.95} />
        </mesh>
      </RigidBody>

      {/* Boundary walls */}
      {(
        [
          [0, -ARENA_RADIUS, true],
          [0, ARENA_RADIUS, true],
          [-ARENA_RADIUS, 0, false],
          [ARENA_RADIUS, 0, false],
        ] as [number, number, boolean][]
      ).map(([x, z, isHorizontal], i) => {
        const size: [number, number, number] = isHorizontal
          ? [floorSize, ARENA_WALL_HEIGHT, 1]
          : [1, ARENA_WALL_HEIGHT, floorSize];
        const centerY = ARENA_WALL_HEIGHT / 2;

        return (
          <RigidBody
            key={i}
            type="fixed"
            colliders={false}
            position={[x, 0, z]}
          >
            <CuboidCollider
              args={[size[0] / 2, size[1] / 2, size[2] / 2]}
              position={[0, centerY, 0]}
            />
            <mesh position={[0, centerY, 0]} castShadow receiveShadow>
              <boxGeometry args={size} />
              <meshStandardMaterial color="#3A2416" roughness={0.9} />
            </mesh>
          </RigidBody>
        );
      })}
    </>
  );
}

// ============================================================
// DETERMINISTIC PLAYER → PLOT ASSIGNMENT
// ============================================================
function assignPlotIndices(
  userId: string,
  otherIds: string[]
): {
  myPlotIndex: number;
  plotOwnerMap: Record<string, number>;
} {
  const allIds = [userId, ...otherIds].sort();
  const plotOwnerMap: Record<string, number> = {};
  allIds.forEach((id, i) => {
    plotOwnerMap[id] = i % PLOT_POSITIONS.length;
  });
  return {
    myPlotIndex: plotOwnerMap[userId] ?? 0,
    plotOwnerMap,
  };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PizzaEmpireGameMain({
  config,
  userId,
  username,
  world,
  inputDisabled,
  isTouchDevice,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState<PizzaEmpireProgress>(() =>
    createDefaultProgress()
  );
  const [others, setOthers] = useState<Record<string, RemoteState>>({});

  const channelRef = useRef<any>(null);
  const progressRef = useRef(progress);
  const localPosRef = useRef<[number, number, number]>([0, 1.6, 0]);
  const localRotRef = useRef(0);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const myPlotIndex = useMemo(() => {
    const otherIds = Object.keys(others);
    return assignPlotIndices(userId, otherIds).myPlotIndex;
  }, [userId, others]);

  const mySpawn = PLOT_SPAWNS[myPlotIndex] || PLOT_SPAWNS[0];

  const incomePerSecond = useMemo(
    () => calculateIncomePerSecond(progress.ovens),
    [progress.ovens]
  );
  const ownedOvens = useMemo(
    () => countOwnedOvens(progress.ovens),
    [progress.ovens]
  );

  // ============================================================
  // LOAD PROGRESS
  // ============================================================
  useEffect(() => {
    (async () => {
      const p = await loadProgress();
      setProgress(p);
      setLoaded(true);
    })();
  }, []);

  // ============================================================
  // MUSIC
  // ============================================================
  useEffect(() => {
    const start = () => {
      startPizzeriaMusic();
      window.removeEventListener("click", start);
      window.removeEventListener("keydown", start);
      window.removeEventListener("touchstart", start);
    };
    window.addEventListener("click", start);
    window.addEventListener("keydown", start);
    window.addEventListener("touchstart", start);

    return () => {
      window.removeEventListener("click", start);
      window.removeEventListener("keydown", start);
      window.removeEventListener("touchstart", start);
      stopPizzeriaMusic();
    };
  }, []);

  // ============================================================
  // MULTIPLAYER CHANNEL
  // ============================================================
  useEffect(() => {
    if (!world?.id || !userId) return;

    const channelName = `pizza-empire-${world.id}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: userId },
      },
    });

    channel.on("broadcast", { event: "pizza-state" }, ({ payload }: any) => {
      if (!payload || payload.id === userId) return;
      setOthers((prev) => ({
        ...prev,
        [payload.id]: {
          id: payload.id,
          username: payload.username,
          displayId: payload.displayId ?? null,
          avatarConfig: payload.avatarConfig,
          pos: payload.pos,
          rotY: payload.rotY,
          coins: payload.coins,
          lastSeen: Date.now(),
        },
      }));
    });

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        channel.track({
          id: userId,
          username,
          worldId: world.id,
          joinedAt: Date.now(),
        });
      }
    });

    channelRef.current = channel;

    const staleTimer = setInterval(() => {
      const now = Date.now();
      setOthers((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of Object.keys(next)) {
          if (now - next[id].lastSeen >= STALE_TIMEOUT) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1500);

    return () => {
      clearInterval(staleTimer);
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [world?.id, userId, username]);

  // ============================================================
  // STATE BROADCAST
  // ============================================================
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      const channel = channelRef.current;
      if (!channel) return;
      channel.send({
        type: "broadcast",
        event: "pizza-state",
        payload: {
          id: userId,
          username,
          displayId: null,
          avatarConfig: config,
          pos: localPosRef.current,
          rotY: localRotRef.current,
          coins: progressRef.current.coins,
        },
      });
    }, BROADCAST_INTERVAL);

    return () => clearInterval(interval);
  }, [userId, username, config]);

  // ============================================================
  // ECONOMY TICK
  // ============================================================
  useEffect(() => {
    if (!loaded) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const income = calculateIncomePerSecond(prev.ovens);
        if (income <= 0) return prev;
        const delta = TICK_INTERVAL_MS / 1000;
        return applyIncomeTick(prev, delta, income);
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loaded]);

  // ---- Autosave ----
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      saveProgress(progressRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [loaded]);

  // ---- Oven ding every 4-6s while earning ----
  useEffect(() => {
    if (ownedOvens === 0) return;
    const interval = setInterval(() => {
      playOvenDing();
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [ownedOvens]);

  // ============================================================
  // ACTIONS
  // ============================================================
  const handleBuyOven = useCallback(() => {
    setProgress((prev) => {
      const updated = tryBuyNextOven(prev);
      if (!updated) {
        playError();
        return prev;
      }
      playPurchase();
      saveProgress(updated);
      return updated;
    });
  }, []);

  const handleUpgradeOven = useCallback((slotIndex: number) => {
    setProgress((prev) => {
      const updated = tryUpgradeOven(prev, slotIndex);
      if (!updated) {
        playError();
        return prev;
      }
      playUpgradeFanfare();
      saveProgress(updated);
      return updated;
    });
  }, []);

  const handleReset = useCallback(async () => {
    const fresh = await resetProgress();
    setProgress(fresh);
  }, []);

  const handlePositionUpdate = useCallback(
    (pos: [number, number, number], rotY: number) => {
      localPosRef.current = pos;
      localRotRef.current = rotY;
    },
    []
  );

  // ============================================================
  // PLOTS
  // ============================================================
  const plots = useMemo(() => {
    const otherIds = Object.keys(others);
    const { plotOwnerMap } = assignPlotIndices(userId, otherIds);
    const ownerByPlot: (string | null)[] = PLOT_POSITIONS.map(() => null);
    for (const [id, idx] of Object.entries(plotOwnerMap)) {
      ownerByPlot[idx] = id;
    }

    return PLOT_POSITIONS.map((pos, i) => ({
      plotIndex: i,
      position: pos,
      ownerId: ownerByPlot[i],
      isOwnedByMe: ownerByPlot[i] === userId,
    }));
  }, [userId, others]);

  // ============================================================
  // LOADING
  // ============================================================
  if (!loaded) {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center text-white">
        Loading pizza empire…
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="absolute inset-0">
      <KeyboardControls map={KEY_MAP}>
        <Canvas
          shadows
          camera={{ position: [0, 8, 20], fov: 55 }}
          dpr={[1, 2]}
          style={{ background: "#1E1B4B" }}
        >
          <Physics gravity={[0, -30, 0]} timeStep="vary">
            <Suspense fallback={null}>
              <Sky sunPosition={[100, 50, 100]} />
              <ambientLight intensity={0.55} />
              <directionalLight
                position={[20, 40, 20]}
                intensity={1.1}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-left={-50}
                shadow-camera-right={50}
                shadow-camera-top={50}
                shadow-camera-bottom={-50}
              />
              <hemisphereLight args={["#FFE4B5", "#3A2416", 0.35]} />

              <Arena />

              {plots.map((p) => (
                <PizzaPlot
                  key={p.plotIndex}
                  plotIndex={p.plotIndex}
                  position={p.position}
                  ovens={
                    p.isOwnedByMe
                      ? progress.ovens
                      : Array.from({ length: MAX_OVENS }, () => ({
                          owned: false,
                          level: 0,
                        }))
                  }
                  coins={p.isOwnedByMe ? progress.coins : 0}
                  isOwnedByMe={p.isOwnedByMe}
                  onBuyOven={handleBuyOven}
                  onUpgradeOven={handleUpgradeOven}
                />
              ))}

              <PizzaEmpirePlayer
                config={config}
                spawnPosition={mySpawn}
                inputDisabled={inputDisabled}
                isTouchDevice={isTouchDevice}
                touchState={touchState}
                onPositionUpdate={handlePositionUpdate}
              />

              {Object.values(others).map((r) => (
                <RemotePizzaPlayer
                  key={r.id}
                  data={
                    {
                      id: r.id,
                      username: r.username,
                      displayId: r.displayId,
                      avatarConfig: r.avatarConfig,
                      targetPos: r.pos,
                      targetRotY: r.rotY,
                      coins: r.coins,
                      lastSeen: r.lastSeen,
                    } as RemotePizzaData
                  }
                />
              ))}
            </Suspense>
          </Physics>
        </Canvas>
      </KeyboardControls>

      <PizzaEmpireHud
        progress={progress}
        incomePerSecond={incomePerSecond}
        ownedOvens={ownedOvens}
        totalOvens={MAX_OVENS}
        onReset={handleReset}
      />

      {isTouchDevice && !inputDisabled && <PizzaTouchControls />}
    </div>
  );
}

// ============================================================
// TOUCH CONTROLS
// ============================================================
function PizzaTouchControls() {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const baseCenterRef = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const maxDist = 55;

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    baseCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    pointerIdRef.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    update(e.clientX, e.clientY);
  };
  const move = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    update(e.clientX, e.clientY);
  };
  const up = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    touchState.moveX = 0;
    touchState.moveZ = 0;
  };
  const update = (cx: number, cy: number) => {
    const dx = cx - baseCenterRef.current.x;
    const dy = cy - baseCenterRef.current.y;
    const d = Math.hypot(dx, dy);
    const clamped = Math.min(d, maxDist);
    const nx = d > 0 ? (dx / d) * clamped : 0;
    const ny = d > 0 ? (dy / d) * clamped : 0;
    setKnob({ x: nx, y: ny });
    touchState.moveX = nx / maxDist;
    touchState.moveZ = ny / maxDist;
  };

  return (
    <>
      <div
        ref={baseRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="fixed bottom-6 left-6 rounded-full border-2 border-white/30 backdrop-blur touch-none select-none z-30"
        style={{ width: 140, height: 140, background: "rgba(0,0,0,0.35)" }}
      >
        <div
          className="absolute rounded-full bg-white/80 shadow-lg pointer-events-none"
          style={{
            width: 60,
            height: 60,
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          }}
        />
      </div>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          touchState.jumpQueued = true;
        }}
        className="fixed bottom-6 right-6 rounded-full border-2 border-white/30 backdrop-blur touch-none select-none z-30 flex items-center justify-center text-white text-2xl font-black bg-black/40 active:scale-95"
        style={{ width: 90, height: 90 }}
      >
        ⬆️
      </button>
    </>
  );
}