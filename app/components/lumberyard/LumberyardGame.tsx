"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import type { AvatarConfig } from "../../../lib/auth";
import type { World } from "../../../lib/worlds";
import LumberyardPlayer, { LUMBERYARD_PLAYER_NAME } from "./LumberyardPlayer";
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

// ============================================================
// LUMBERYARD INC — main game
// ============================================================

const KEY_MAP = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
  { name: "jump", keys: [" ", "Space"] },
];

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

  const [shopOpen, setShopOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const swingTriggerRef = useRef(0);

  const currentAxe = getAxe(progress.currentAxe);

  useEffect(() => {
    (async () => {
      const p = await loadProgress();
      setProgress(p);
      setLoaded(true);
    })();
  }, []);

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
          if (t.deadAt && now - t.deadAt >= getTreeType(
            TREE_SPAWNS.find((s) => s.id === t.spawnId)?.type || "small"
          ).regrowMs) {
            return { ...t, damage: 0, deadAt: null };
          }
          return t;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChop = useCallback(
    (spawnId: string) => {
      const spawn = TREE_SPAWNS.find((s) => s.id === spawnId);
      if (!spawn) return;

      const tree = trees.find((t) => t.spawnId === spawnId);
      if (!tree || tree.deadAt) return;

      const type = getTreeType(spawn.type);
      const axeIndex = ["rusty", "iron", "steel", "gold", "diamond"].indexOf(progress.currentAxe);
      const minIndex = ["rusty", "iron", "steel", "gold", "diamond"].indexOf(type.minAxe);

      if (axeIndex < minIndex) {
        showMessage(`🔒 Need a ${getAxe(type.minAxe).name} to chop ${type.name}!`);
        return;
      }

      swingTriggerRef.current += 1;

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
        const logId = `log-${spawnId}-${Date.now()}`;
        const logPos: [number, number, number] = [
          spawn.position[0] + (Math.random() - 0.5) * 2,
          0.4,
          spawn.position[2] + (Math.random() - 0.5) * 2,
        ];

        setLogs((prev) => [
          ...prev,
          { id: logId, position: logPos, value: type.logValue, treeType: type.name },
        ]);

        const newProgress = { ...progress, treesChopped: progress.treesChopped + 1 };
        setProgress(newProgress);
        saveProgress(newProgress);

        showMessage(`🌲 ${type.name} chopped! +1 log`);
      }
    },
    [trees, progress, currentAxe, showMessage]
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
    setEquippedLog(null);
  }, [equippedLog, progress, showMessage]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (inputDisabled) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        if (equippedLog) {
          trySellLog();
        } else {
          tryPickupLog();
        }
      }
      if (e.key === "Escape") {
        setShopOpen(false);
      }
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
        setShopOpen(false);
      } else {
        showMessage(`❌ ${result.error}`);
      }
    },
    [showMessage]
  );

  const handlePositionUpdate = useCallback(
    (pos: [number, number, number]) => {
      playerPosRef.current = pos;
    },
    []
  );

  const canDamageTree = useCallback(
    (typeId: string) => {
      const type = getTreeType(typeId);
      const axeIndex = ["rusty", "iron", "steel", "gold", "diamond"].indexOf(progress.currentAxe);
      const minIndex = ["rusty", "iron", "steel", "gold", "diamond"].indexOf(type.minAxe);
      return axeIndex >= minIndex;
    },
    [progress.currentAxe]
  );

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

              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[WORLD_BOUNDS * 2, WORLD_BOUNDS * 2]} />
                <meshStandardMaterial color="#65A30D" roughness={0.95} />
              </mesh>

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
                const d = Math.hypot(log.position[0] - px, log.position[2] - pz);
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
          className="fixed bottom-6 right-6 z-40 w-20 h-20 rounded-full bg-gradient-to-b from-[#FBBF24] to-[#E08A1C] border-4 border-[#A8680C] text-[#1A1A2E] text-3xl font-black active:scale-95 shadow-2xl"
        >
          E
        </button>
      )}
    </div>
  );
}