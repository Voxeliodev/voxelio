"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Sky } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { AvatarConfig } from "../../../lib/auth";
import type { World } from "../../../lib/worlds";
import { supabase } from "../../../lib/supabase";
import LumberyardPlayer from "./LumberyardPlayer";
import RemoteLumberPlayer, { type RemoteLumberData } from "./RemoteLumberPlayer";
import LumberHud from "./LumberHud";
import Shop from "./Shop";
import Tree from "./Tree";
import Log, { type LogData } from "./Log";
import Sawmill from "./Sawmill";
import {
  TREE_SPAWNS,
  getTreeType,
  getAxe,
  LUMBERYARD_SPAWN,
  SAWMILL_POSITION,
  SAWMILL_RADIUS,
  WORLD_BOUNDS,
  LOG_PICKUP_RADIUS,
  type AxeId,
} from "../../../lib/lumberyard";
import {
  loadProgress,
  saveProgress,
  buyAxe,
  formatCoins,
  type LumberyardProgress,
} from "../../../lib/lumberyardProgress";
import {
  playChop,
  playTreeFall,
  playCoin,
  playPickup,
  playError,
  startAmbientMusic,
  stopAmbientMusic,
} from "../../../lib/sounds";

// ============================================================
// GLOBAL CHANNEL MANAGER — module-level, runs once per tab
// ============================================================

type ChannelState = {
  channel: any;
  name: string;
  subscribers: Set<(data: RemoteLumberData) => void>;
  presenceSubscribers: Set<(count: number) => void>;
  initialized: boolean;
  subscribed: boolean;
};

const channels = new Map<string, ChannelState>();

function ensureChannel(
  channelName: string,
  selfUserId: string,
  selfUsername: string,
  selfConfig: AvatarConfig,
  getSelfState: () => {
    pos: [number, number, number];
    rotY: number;
    axeId: AxeId;
  },
  worldId: string
): ChannelState {
  // First: do we already have this channel in our module cache?
  const existing = channels.get(channelName);
  if (existing && existing.subscribed) {
    return existing;
  }

  // Second: does Supabase already have a channel with this exact name?
  // If so, we CANNOT call .on() on it — but we can still borrow it
  // for broadcasting. We just won't receive messages on it.
  // (This shouldn't happen normally, but protects against hot-reload bugs.)
  const supabaseChannels = supabase.getChannels();
  const alreadyInSupabase = supabaseChannels.find(
    (c: any) => c.topic === `realtime:${channelName}` || c.topic === channelName
  );

  if (alreadyInSupabase) {
    // Reuse whatever listeners were registered on it originally.
    // We just wrap it in our own state and return.
    const reused: ChannelState = {
      channel: alreadyInSupabase,
      name: channelName,
      subscribers: existing?.subscribers || new Set(),
      presenceSubscribers: existing?.presenceSubscribers || new Set(),
      initialized: true,
      subscribed: true,
    };
    channels.set(channelName, reused);
    return reused;
  }

  // Third: fresh channel. Build + chain + subscribe exactly once.
  const state: ChannelState = {
    channel: null,
    name: channelName,
    subscribers: existing?.subscribers || new Set(),
    presenceSubscribers: existing?.presenceSubscribers || new Set(),
    initialized: false,
    subscribed: false,
  };

  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { key: selfUserId },
    },
  });

  channel.on("broadcast", { event: "lumber-move" }, ({ payload }: any) => {
    if (!payload || payload.id === selfUserId) return;
    const data: RemoteLumberData = {
      id: payload.id,
      username: payload.username,
      displayId: payload.displayId ?? null,
      avatarConfig: payload.avatarConfig,
      currentAxeId: payload.currentAxeId,
      targetPos: payload.pos,
      targetRotY: payload.rotY,
      lastSeen: Date.now(),
    };
    state.subscribers.forEach((fn) => fn(data));
  });

  channel.on("presence", { event: "sync" }, () => {
    const presenceState = channel.presenceState();
    const count = Math.max(1, Object.keys(presenceState).length);
    state.presenceSubscribers.forEach((fn) => fn(count));

    const s = getSelfState();
    channel.send({
      type: "broadcast",
      event: "lumber-move",
      payload: {
        id: selfUserId,
        username: selfUsername,
        displayId: null,
        avatarConfig: selfConfig,
        currentAxeId: s.axeId,
        pos: s.pos,
        rotY: s.rotY,
      },
    });
  });

  channel.on("presence", { event: "leave" }, () => {
    const presenceState = channel.presenceState();
    const count = Math.max(1, Object.keys(presenceState).length);
    state.presenceSubscribers.forEach((fn) => fn(count));
  });

  channel.subscribe((status: string) => {
    if (status === "SUBSCRIBED") {
      state.subscribed = true;
      channel.track({
        id: selfUserId,
        username: selfUsername,
        worldId,
        joinedAt: Date.now(),
      });
    }
  });

  state.channel = channel;
  state.initialized = true;
  channels.set(channelName, state);

  return state;
}

// ============================================================
// LUMBERYARD INC
// ============================================================

const KEY_MAP = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
  { name: "jump", keys: [" ", "Space"] },
];

const STALE_TIMEOUT = 3000;
const BROADCAST_INTERVAL = 66;

type TreeState = {
  spawnId: string;
  damage: number;
  deadAt: number | null;
};

type Props = {
  config: AvatarConfig;
  userId: string;
  username: string;
  world: World;
  inputDisabled: boolean;
  isTouchDevice: boolean;
};

export default function LumberyardGame({
  config,
  userId,
  username,
  world,
  inputDisabled,
  isTouchDevice,
}: Props) {
  const [progress, setProgress] = useState<LumberyardProgress>({
    lumbercoins: 0,
    currentAxe: "rusty",
    treesChopped: 0,
    logsSold: 0,
  });
  const [loaded, setLoaded] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

  const [trees, setTrees] = useState<TreeState[]>(
    TREE_SPAWNS.map((s) => ({ spawnId: s.id, damage: 0, deadAt: null }))
  );

  const [logs, setLogs] = useState<LogData[]>([]);

  const [equippedLog, setEquippedLog] = useState<{
    id: string;
    value: number;
    treeType: string;
  } | null>(null);

  const playerPosRef = useRef<[number, number, number]>(LUMBERYARD_SPAWN);
  const playerRotYRef = useRef(0);

  const [shopOpen, setShopOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const swingTriggerRef = useRef(0);

  const currentAxe = getAxe(progress.currentAxe);
  const currentAxeIdRef = useRef<AxeId>(progress.currentAxe);

  useEffect(() => {
    currentAxeIdRef.current = progress.currentAxe;
  }, [progress.currentAxe]);

  const [others, setOthers] = useState<RemoteLumberData[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const p = await loadProgress();
      setProgress(p);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (musicOn) startAmbientMusic();
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      stopAmbientMusic();
    };
  }, [musicOn]);

  const showMessage = useCallback((text: string, durationMs = 1800) => {
    setMessage(text);
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => setMessage(null), durationMs);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTrees((prev) =>
        prev.map((t) => {
          if (
            t.deadAt &&
            now - t.deadAt >=
              getTreeType(
                TREE_SPAWNS.find((s) => s.id === t.spawnId)?.type || "small"
              ).regrowMs
          ) {
            return { ...t, damage: 0, deadAt: null };
          }
          return t;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Multiplayer attach
  useEffect(() => {
    if (!world?.id || !userId) return;

    const channelName = `world-${world.id}`;

    const state = ensureChannel(
      channelName,
      userId,
      username,
      config,
      () => ({
        pos: playerPosRef.current,
        rotY: playerRotYRef.current,
        axeId: currentAxeIdRef.current,
      }),
      world.id
    );

    channelRef.current = state.channel;

    const onPlayer = (data: RemoteLumberData) => {
      setOthers((prev) => {
        const existing = prev.findIndex((p) => p.id === data.id);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = data;
          return copy;
        }
        return [...prev, data];
      });
    };

    const onPresence = (count: number) => {
      setOnlineCount(count);
    };

    state.subscribers.add(onPlayer);
    state.presenceSubscribers.add(onPresence);

    const staleTimer = setInterval(() => {
      const now = Date.now();
      setOthers((prev) => prev.filter((p) => now - p.lastSeen < STALE_TIMEOUT));
    }, 1500);

    return () => {
      clearInterval(staleTimer);
      state.subscribers.delete(onPlayer);
      state.presenceSubscribers.delete(onPresence);
    };
  }, [world?.id, userId, username, config]);

  // Position broadcast
  useEffect(() => {
    const interval = setInterval(() => {
      const channel = channelRef.current;
      if (!channel) return;
      channel.send({
        type: "broadcast",
        event: "lumber-move",
        payload: {
          id: userId,
          username,
          displayId: null,
          avatarConfig: config,
          currentAxeId: currentAxeIdRef.current,
          pos: playerPosRef.current,
          rotY: playerRotYRef.current,
        },
      });
    }, BROADCAST_INTERVAL);

    return () => clearInterval(interval);
  }, [userId, username, config]);

  const handleChop = useCallback(
    (spawnId: string) => {
      const spawn = TREE_SPAWNS.find((s) => s.id === spawnId);
      if (!spawn) return;

      const tree = trees.find((t) => t.spawnId === spawnId);
      if (!tree || tree.deadAt) return;

      const type = getTreeType(spawn.type);
      const axeIndex = ["rusty", "iron", "steel", "gold", "diamond"].indexOf(
        progress.currentAxe
      );
      const minIndex = ["rusty", "iron", "steel", "gold", "diamond"].indexOf(
        type.minAxe
      );

      if (axeIndex < minIndex) {
        showMessage(`🔒 Need a ${getAxe(type.minAxe).name} to chop ${type.name}!`);
        playError();
        return;
      }

      swingTriggerRef.current += 1;
      playChop();

      const channel = channelRef.current;
      if (channel) {
        channel.send({
          type: "broadcast",
          event: "lumber-chop",
          payload: { id: userId },
        });
      }

      const newDamage = tree.damage + currentAxe.damage;
      const isDead = newDamage >= type.hp;

      setTrees((prev) =>
        prev.map((t) =>
          t.spawnId === spawnId
            ? { ...t, damage: newDamage, deadAt: isDead ? Date.now() : null }
            : t
        )
      );

      if (isDead) {
        setTimeout(() => playTreeFall(), 150);

        const logId = `log-${spawnId}-${Date.now()}`;
        const logPos: [number, number, number] = [
          spawn.position[0] + (Math.random() - 0.5) * 2,
          0.4,
          spawn.position[2] + (Math.random() - 0.5) * 2,
        ];

        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            position: logPos,
            value: type.logValue,
            treeType: type.name,
          },
        ]);

        const newProgress = {
          ...progress,
          treesChopped: progress.treesChopped + 1,
        };
        setProgress(newProgress);
        saveProgress(newProgress);

        showMessage(`🌲 ${type.name} chopped! +1 log`);
      }
    },
    [trees, progress, currentAxe, showMessage, userId]
  );

  const tryPickupLog = useCallback(() => {
    if (equippedLog) {
      showMessage("🪵 Already carrying a log — sell it first!");
      return;
    }

    const [px, , pz] = playerPosRef.current;

    let nearest: LogData | null = null;
    let nearestDist = LOG_PICKUP_RADIUS;
    for (const log of logs) {
      const dx = log.position[0] - px;
      const dz = log.position[2] - pz;
      const d = Math.hypot(dx, dz);
      if (d < nearestDist) {
        nearest = log;
        nearestDist = d;
      }
    }

    if (!nearest) {
      showMessage("🚶 Walk closer to a log to pick it up");
      return;
    }

    setEquippedLog({
      id: nearest.id,
      value: nearest.value,
      treeType: nearest.treeType,
    });
    setLogs((prev) => prev.filter((l) => l.id !== nearest!.id));
    showMessage(`🪵 Picked up ${nearest.treeType} log`);
    playPickup();
  }, [equippedLog, logs, showMessage]);

  const trySellLog = useCallback(() => {
    if (!equippedLog) {
      showMessage("🪵 You're not carrying a log");
      return;
    }

    const [px, , pz] = playerPosRef.current;
    const [sx, , sz] = SAWMILL_POSITION;
    const dist = Math.hypot(px - sx, pz - sz);

    if (dist > SAWMILL_RADIUS) {
      showMessage("🏭 Walk to the sawmill to sell");
      return;
    }

    const earned = equippedLog.value;
    const newProgress: LumberyardProgress = {
      ...progress,
      lumbercoins: progress.lumbercoins + earned,
      logsSold: progress.logsSold + 1,
    };
    setProgress(newProgress);
    saveProgress(newProgress);
    showMessage(`💰 Sold ${equippedLog.treeType} for ${formatCoins(earned)} 🪙`);
    playCoin();
    setEquippedLog(null);
  }, [equippedLog, progress, showMessage]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (inputDisabled) return;
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
      )
        return;

      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        if (equippedLog) trySellLog();
        else tryPickupLog();
      }
      if (e.key === "Escape") setShopOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inputDisabled, equippedLog, tryPickupLog, trySellLog]);

  const handleBuy = useCallback(
    async (axeId: AxeId, price: number) => {
      const result = await buyAxe(axeId, price);
      if (result.success && result.progress) {
        setProgress(result.progress);
        showMessage(`✅ Bought ${getAxe(axeId).name}!`);
        playCoin();
        setShopOpen(false);
      } else {
        showMessage(`❌ ${result.error}`);
        playError();
      }
    },
    [showMessage]
  );

  const handlePositionUpdate = useCallback(
    (pos: [number, number, number], rotY: number) => {
      playerPosRef.current = pos;
      playerRotYRef.current = rotY;
    },
    []
  );

  const canDamageTree = useCallback(
    (typeId: string) => {
      const type = getTreeType(typeId);
      const axeIndex = ["rusty", "iron", "steel", "gold", "diamond"].indexOf(
        progress.currentAxe
      );
      const minIndex = ["rusty", "iron", "steel", "gold", "diamond"].indexOf(
        type.minAxe
      );
      return axeIndex >= minIndex;
    },
    [progress.currentAxe]
  );

  const toggleMusic = () => {
    if (musicOn) {
      stopAmbientMusic();
      setMusicOn(false);
    } else {
      startAmbientMusic();
      setMusicOn(true);
    }
  };

  if (!loaded) {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center text-white">
        Loading lumberyard…
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <KeyboardControls map={KEY_MAP}>
        <Canvas
          shadows
          camera={{ position: [0, 6, 30], fov: 60 }}
          dpr={[1, 2]}
          style={{ background: "#87CEEB" }}
        >
          <Physics gravity={[0, -30, 0]} timeStep="vary">
            <Suspense fallback={null}>
              <Sky sunPosition={[100, 50, 100]} />
              <ambientLight intensity={0.6} />
              <directionalLight
                position={[20, 40, 20]}
                intensity={1.2}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-left={-80}
                shadow-camera-right={80}
                shadow-camera-top={80}
                shadow-camera-bottom={-80}
              />
              <hemisphereLight args={["#ffffff", "#88aa88", 0.4]} />

              <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[0, -0.5, 0]} receiveShadow>
                  <boxGeometry
                    args={[WORLD_BOUNDS * 2, 1, WORLD_BOUNDS * 2]}
                  />
                  <meshStandardMaterial color="#65A30D" roughness={0.95} />
                </mesh>
              </RigidBody>

              {TREE_SPAWNS.map((spawn) => {
                const state = trees.find((t) => t.spawnId === spawn.id);
                if (!state || state.deadAt) return null;
                return (
                  <Tree
                    key={spawn.id}
                    spawn={spawn}
                    currentDamage={state.damage}
                    onClick={handleChop}
                    canDamage={canDamageTree(spawn.type)}
                  />
                );
              })}

              {logs.map((log) => {
                const [px, , pz] = playerPosRef.current;
                const d = Math.hypot(
                  log.position[0] - px,
                  log.position[2] - pz
                );
                return (
                  <Log
                    key={log.id}
                    log={log}
                    canPickup={d < LOG_PICKUP_RADIUS && !equippedLog}
                    onPickup={() => {}}
                  />
                );
              })}

              <Sawmill />

              <LumberyardPlayer
                config={config}
                spawnPosition={LUMBERYARD_SPAWN}
                inputDisabled={inputDisabled || shopOpen}
                isTouchDevice={isTouchDevice}
                currentAxeId={progress.currentAxe}
                onPositionUpdate={handlePositionUpdate}
                swingTriggerRef={swingTriggerRef}
              />

              {others.map((p) => (
                <RemoteLumberPlayer key={p.id} data={p} />
              ))}
            </Suspense>
          </Physics>
        </Canvas>
      </KeyboardControls>

      <LumberHud
        lumbercoins={progress.lumbercoins}
        currentAxe={progress.currentAxe}
        equippedLog={equippedLog}
        onOpenShop={() => setShopOpen(true)}
        message={message}
      />

      <div className="absolute top-3 right-3 z-30 flex flex-col gap-2 items-end">
        <div className="bg-black/70 backdrop-blur px-3 py-2 rounded border border-white/20 text-white text-xs flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <strong>{onlineCount}</strong>
          <span className="text-white/60">online</span>
        </div>
        {others.length > 0 && (
          <div className="bg-black/70 backdrop-blur rounded border border-white/20 px-3 py-2 text-white/80 text-[11px] max-w-[180px] space-y-1">
            <p className="font-bold text-white/60 mb-1">In this world</p>
            {others.slice(0, 6).map((p) => (
              <p key={p.id} className="truncate">
                • {p.username}
              </p>
            ))}
            {others.length > 6 && (
              <p className="text-white/40">+{others.length - 6} more</p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={toggleMusic}
        className="fixed bottom-6 right-6 md:bottom-6 md:right-6 z-40 w-12 h-12 rounded-full bg-black/70 border-2 border-white/30 backdrop-blur flex items-center justify-center text-xl hover:bg-black/90 transition"
        title={musicOn ? "Mute music" : "Unmute music"}
      >
        {musicOn ? "🔊" : "🔇"}
      </button>

      <Shop
        open={shopOpen}
        onClose={() => setShopOpen(false)}
        currentAxe={progress.currentAxe}
        lumbercoins={progress.lumbercoins}
        onBuy={handleBuy}
      />

      {isTouchDevice && (
        <button
          onClick={() => {
            if (equippedLog) trySellLog();
            else tryPickupLog();
          }}
          className="fixed bottom-24 right-6 z-40 w-20 h-20 rounded-full bg-gradient-to-b from-[#FBBF24] to-[#E08A1C] border-4 border-[#A8680C] text-[#1A1A2E] text-3xl font-black active:scale-95 shadow-2xl"
        >
          E
        </button>
      )}
    </div>
  );
}