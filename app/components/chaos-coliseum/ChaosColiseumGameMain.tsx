"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Sky } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { AvatarConfig } from "../../../lib/auth";
import type { World } from "../../../lib/worlds";
import { supabase } from "../../../lib/supabase";
import ChaosColiseumPlayer, { type ChaosPlayerApi, type PlayerState } from "./ChaosColiseumPlayer";
import RemoteChaosPlayer, { type RemoteChaosData } from "./RemoteChaosPlayer";
import ChaosColiseumHud, { type KillFeedEntry } from "./ChaosColiseumHud";
import {
  COLISEUM_PLATFORMS,
  COLISEUM_WALLS,
  COLISEUM_TIERS,
  COLISEUM_SPAWNS,
  SWORD_DAMAGE,
  SWORD_RANGE,
  SWORD_ARC_DEGREES,
  PLAYER_MAX_HP,
  RESPAWN_DELAY_MS,
  ROUND_DURATION_MS,
  COLISEUM_MAX_PLAYERS,
  pickRandomSpawn,
} from "../../../lib/chaosColiseum";
import {
  loadColiseumProgress,
  saveColiseumProgress,
  recordKill,
  recordDeath,
  recordRoundEnd,
  type ColiseumProgress,
} from "../../../lib/chaosColiseumProgress";
import {
  playSwordHit,
  playKillConfirm,
  playStreakSound,
  playCountdownBeep,
  playGoBeep,
  playRoundWin,
  playRoundLose,
  startColiseumMusic,
  stopColiseumMusic,
} from "../../../lib/sounds";

// ============================================================
// CHAOS COLISEUM — MAIN GAME COMPONENT
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

type Props = {
  config: AvatarConfig;
  userId: string;
  username: string;
  world: World;
  inputDisabled: boolean;
  isTouchDevice: boolean;
};

type RoundPhase = "waiting" | "countdown" | "playing" | "over";

export default function ChaosColiseumGameMain({
  config,
  userId,
  username,
  world,
  inputDisabled,
  isTouchDevice,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState<ColiseumProgress | null>(null);

  // ===== Local player state =====
  const [localHp, setLocalHp] = useState(PLAYER_MAX_HP);
  const [localAlive, setLocalAlive] = useState(true);
  const [localKills, setLocalKills] = useState(0);
  const [localDeaths, setLocalDeaths] = useState(0);
  const [respawnAt, setRespawnAt] = useState(0);
  const [spawnPosition, setSpawnPosition] = useState<[number, number, number]>(() => [...COLISEUM_SPAWNS[0]]);

  // ===== Remote players =====
  const [others, setOthers] = useState<RemoteChaosData[]>([]);

  // ===== Kill feed =====
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);

  // ===== Round phase =====
  const [phase, setPhase] = useState<RoundPhase>("countdown");
  const [roundStartAt, setRoundStartAt] = useState(Date.now() + 3000); // 3s countdown
  const [roundTimeLeft, setRoundTimeLeft] = useState(ROUND_DURATION_MS / 1000);
  const [roundOver, setRoundOver] = useState(false);
  const [localWon, setLocalWon] = useState(false);
  const [countdownLeft, setCountdownLeft] = useState(3);

  // ===== Refs =====
  const channelRef = useRef<any>(null);
  const localPlayerApiRef = useRef<ChaosPlayerApi | null>(null);
  const localPosRef = useRef<[number, number, number]>([0, 1.2, 0]);
  const localRotRef = useRef(0);
  const localHpRef = useRef(PLAYER_MAX_HP);
  const localAliveRef = useRef(true);
  const othersRef = useRef<RemoteChaosData[]>([]);
  const lastSwingBroadcastRef = useRef(0);
  const lastSwingingRef = useRef(false);

  // Sync local state to refs so broadcast/frame loops can read fresh values
  useEffect(() => { localHpRef.current = localHp; }, [localHp]);
  useEffect(() => { localAliveRef.current = localAlive; }, [localAlive]);
  useEffect(() => { othersRef.current = others; }, [others]);

  // ============================================================
  // LOAD PROGRESS
  // ============================================================
  useEffect(() => {
    (async () => {
      const p = await loadColiseumProgress();
      setProgress(p);
      setLoaded(true);
    })();
  }, []);

  // ============================================================
  // START MUSIC ON FIRST GESTURE
  // ============================================================
  useEffect(() => {
    const start = () => {
      startColiseumMusic();
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
      stopColiseumMusic();
    };
  }, []);

  // ============================================================
  // COUNTDOWN
  // ============================================================
  useEffect(() => {
    if (phase !== "countdown") return;
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((roundStartAt - now) / 1000));
      if (remaining !== countdownLeft) {
        setCountdownLeft(remaining);
        if (remaining === 3 || remaining === 2 || remaining === 1) {
          playCountdownBeep();
        }
      }
      if (remaining <= 0) {
        setPhase("playing");
        playGoBeep();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [phase, roundStartAt, countdownLeft]);

  // ============================================================
  // ROUND TIMER
  // ============================================================
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - roundStartAt;
      const remaining = Math.max(0, (ROUND_DURATION_MS - elapsed) / 1000);
      setRoundTimeLeft(remaining);

      if (remaining <= 0) {
        // Round over — determine winner
        setRoundOver(true);
        setPhase("over");

        // Winner = highest kills. If tie, no winner.
        const allPlayers = [
          { id: userId, username, kills: localKills, deaths: localDeaths, alive: localAlive },
          ...othersRef.current.map((o) => ({
            id: o.id, username: o.username, kills: 0, deaths: 0, alive: o.alive,
          })),
        ];
        // Note: we track remote players' kills via kill feed / broadcasts.
        // For simplicity, we compare against our local kill count.
        // If we have the most kills, we win.
        const maxKills = Math.max(...allPlayers.map((p) => p.kills));
        const won = localKills > 0 && localKills >= maxKills;
        setLocalWon(won);
        if (won) playRoundWin(); else playRoundLose();

        // Save progress
        if (progress) {
          recordRoundEnd(won).then(setProgress);
        }
      }
    }, 200);
    return () => clearInterval(interval);
  }, [phase, roundStartAt, localKills, localDeaths, localAlive, userId, username, progress]);

  // ============================================================
  // RESPAWN TIMER
  // ============================================================
  useEffect(() => {
    if (localAlive) return;
    if (phase !== "playing") return;

    const interval = setInterval(() => {
      if (Date.now() >= respawnAt) {
        // Respawn
        const newSpawn = pickRandomSpawn();
        setSpawnPosition(newSpawn);
        localPlayerApiRef.current?.teleport(newSpawn);
        setLocalHp(PLAYER_MAX_HP);
        setLocalAlive(true);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [localAlive, respawnAt, phase]);

  // ============================================================
  // MULTIPLAYER CHANNEL
  // ============================================================
  useEffect(() => {
    if (!world?.id || !userId) return;

    const channelName = `chaos-coliseum-${world.id}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: userId },
      },
    });

    // ===== POSITION/STATE BROADCAST =====
    channel.on("broadcast", { event: "state" }, ({ payload }: any) => {
      if (!payload || payload.id === userId) return;
      const data: RemoteChaosData = {
        id: payload.id,
        username: payload.username,
        displayId: payload.displayId ?? null,
        avatarConfig: payload.avatarConfig,
        targetPos: payload.pos,
        targetRotY: payload.rotY,
        hp: payload.hp,
        alive: payload.alive,
        swinging: payload.swinging,
        lastSeen: Date.now(),
      };
      setOthers((prev) => {
        const existing = prev.findIndex((p) => p.id === payload.id);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = data;
          return copy;
        }
        return [...prev, data];
      });
    });

    // ===== SWORD HIT =====
    channel.on("broadcast", { event: "hit" }, ({ payload }: any) => {
      if (!payload || payload.targetId !== userId) return;
      // We were hit!
      const fromPos = payload.attackerPos as [number, number, number];
      localPlayerApiRef.current?.applyDamage(SWORD_DAMAGE, fromPos);
    });

    // ===== KILL CONFIRMATION =====
    channel.on("broadcast", { event: "kill" }, ({ payload }: any) => {
      if (!payload) return;
      // Add to kill feed
      const entry: KillFeedEntry = {
        id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        killerName: payload.killerName,
        victimName: payload.victimName,
        timestamp: Date.now(),
      };
      setKillFeed((prev) => [...prev.slice(-4), entry]);

      // If we're the killer, count it
      if (payload.killerId === userId) {
        setLocalKills((k) => k + 1);
        playKillConfirm();
        // Play streak sound at 3, 5, 7, etc.
        const newKills = localKills + 1;
        if (newKills >= 3 && newKills % 2 === 1) {
          playStreakSound(newKills);
        }
        recordKill().then(setProgress);
      }
    });

    // ===== PRESENCE =====
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        // Clean up stale players
        const now = Date.now();
        setOthers((prev) => prev.filter((p) => now - p.lastSeen < STALE_TIMEOUT));
      })
      .subscribe((status: string) => {
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

    // Stale cleanup
    const staleTimer = setInterval(() => {
      const now = Date.now();
      setOthers((prev) => prev.filter((p) => now - p.lastSeen < STALE_TIMEOUT));
      setKillFeed((prev) => prev.filter((e) => now - e.timestamp < 5000));
    }, 1500);

    return () => {
      clearInterval(staleTimer);
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [world?.id, userId, username, localKills]);

  // ============================================================
  // PERIODIC STATE BROADCAST
  // ============================================================
  useEffect(() => {
    if (!userId || phase === "over") return;
    const interval = setInterval(() => {
      const channel = channelRef.current;
      if (!channel) return;
      const pos = localPlayerApiRef.current?.getPosition() || localPosRef.current;
      const rotY = localPlayerApiRef.current?.getRotationY() || localRotRef.current;

      channel.send({
        type: "broadcast",
        event: "state",
        payload: {
          id: userId,
          username,
          displayId: null,
          avatarConfig: config,
          pos,
          rotY,
          hp: localHpRef.current,
          alive: localAliveRef.current,
          swinging: lastSwingingRef.current,
        },
      });
    }, BROADCAST_INTERVAL);
    return () => clearInterval(interval);
  }, [userId, username, config, phase]);

  // ============================================================
  // HANDLE PLAYER POSITION UPDATE
  // ============================================================
  const handlePositionUpdate = useCallback((state: PlayerState) => {
    localPosRef.current = state.pos;
    localRotRef.current = state.rotY;
    lastSwingingRef.current = state.swinging;
  }, []);

  // ============================================================
  // HANDLE SWING (from local player)
  // ============================================================
  const handleSwing = useCallback(
    (attackerPos: [number, number, number], attackerRotY: number) => {
      if (phase !== "playing") return;

      // Check every remote player within SWORD_RANGE in the swing arc
      const [ax, ay, az] = attackerPos;
      const halfArcRad = (SWORD_ARC_DEGREES / 2) * (Math.PI / 180);

      for (const other of othersRef.current) {
        if (!other.alive) continue;

        const [ox, oy, oz] = other.targetPos;
        const dx = ox - ax;
        const dz = oz - az;
        const dist = Math.hypot(dx, dz);

        if (dist > SWORD_RANGE) continue;

        // Check Y-level (must be within ~2 units vertically)
        if (Math.abs(oy - ay) > 2.5) continue;

        // Check arc
        const angleToTarget = Math.atan2(dx, dz);
        let diff = angleToTarget - attackerRotY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) > halfArcRad) continue;

        // Hit! Send broadcast to the target
        const channel = channelRef.current;
        if (channel) {
          channel.send({
            type: "broadcast",
            event: "hit",
            payload: {
              targetId: other.id,
              attackerId: userId,
              attackerName: username,
              attackerPos,
              damage: SWORD_DAMAGE,
            },
          });

          // If this hit is lethal, announce the kill
          if (other.hp <= SWORD_DAMAGE) {
            channel.send({
              type: "broadcast",
              event: "kill",
              payload: {
                killerId: userId,
                killerName: username,
                victimId: other.id,
                victimName: other.username,
              },
            });
          }
          playSwordHit();
        }
        // Only hit one player per swing
        break;
      }
    },
    [phase, userId, username]
  );

  // ============================================================
  // REGISTER LOCAL PLAYER API
  // ============================================================
  const registerApi = useCallback((api: ChaosPlayerApi) => {
    localPlayerApiRef.current = api;
  }, []);

  // ============================================================
  // DEATH HANDLER
  // ============================================================
  const handleLocalDeath = useCallback(() => {
    setLocalAlive(false);
    setLocalDeaths((d) => d + 1);
    setRespawnAt(Date.now() + RESPAWN_DELAY_MS);
    recordDeath().then(setProgress);
  }, []);

  // ============================================================
  // RESTART
  // ============================================================
  const handleRestart = useCallback(() => {
    setLocalHp(PLAYER_MAX_HP);
    setLocalAlive(true);
    setLocalKills(0);
    setLocalDeaths(0);
    setRespawnAt(0);
    setRoundOver(false);
    setLocalWon(false);
    setPhase("countdown");
    setRoundStartAt(Date.now() + 3000);
    setCountdownLeft(3);
    setRoundTimeLeft(ROUND_DURATION_MS / 1000);
    setSpawnPosition([...COLISEUM_SPAWNS[0]]);
    setKillFeed([]);
    setOthers([]);
  }, []);

  // ============================================================
  // BUILD PLAYER SCORE LIST FOR HUD
  // ============================================================
  const playerScores = [
    {
      id: userId,
      username,
      kills: localKills,
      deaths: localDeaths,
      alive: localAlive,
    },
    ...others.map((o) => ({
      id: o.id,
      username: o.username,
      kills: 0, // remote kills tracked via kill feed only
      deaths: 0,
      alive: o.alive,
    })),
  ];

  // ============================================================
  // RESPAWN COUNTDOWN (seconds)
  // ============================================================
  const respawnSecondsLeft = localAlive
    ? 0
    : Math.max(0, (respawnAt - Date.now()) / 1000);

  // ============================================================
  // LOADING
  // ============================================================
  if (!loaded) {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center text-white">
        Loading Chaos Coliseum…
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
          camera={{ position: [0, 6, 20], fov: 60 }}
          dpr={[1, 2]}
          style={{ background: "#1E1B4B" }}
        >
          <Physics gravity={[0, -30, 0]} timeStep="vary">
            <Suspense fallback={null}>
              {/* ===== Sky & lighting ===== */}
              <Sky sunPosition={[100, 50, 100]} />
              <ambientLight intensity={0.55} />
              <directionalLight
                position={[20, 40, 20]}
                intensity={1.15}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-left={-60}
                shadow-camera-right={60}
                shadow-camera-top={60}
                shadow-camera-bottom={-60}
              />
              <hemisphereLight args={["#FFE4B5", "#4A2E1A", 0.35]} />

              {/* ===== Arena platforms ===== */}
              {COLISEUM_PLATFORMS.map((p, i) => (
                <RigidBody key={`plat-${i}`} type="fixed" position={p.position} colliders="cuboid" friction={0.9}>
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={p.size} />
                    <meshStandardMaterial color={p.color} roughness={0.85} />
                  </mesh>
                </RigidBody>
              ))}

              {/* ===== Boundary walls ===== */}
              {COLISEUM_WALLS.map((w, i) => (
                <RigidBody key={`wall-${i}`} type="fixed" position={w.position} colliders="cuboid">
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={w.size} />
                    <meshStandardMaterial color={w.color} roughness={0.9} />
                  </mesh>
                </RigidBody>
              ))}

              {/* ===== Visual tiered seating (no collision) ===== */}
              {COLISEUM_TIERS.map((t, i) => (
                <mesh key={`tier-${i}`} position={t.position} receiveShadow>
                  <boxGeometry args={t.size} />
                  <meshStandardMaterial color={t.color} roughness={0.9} />
                </mesh>
              ))}

              {/* ===== Local player ===== */}
              {phase === "playing" || phase === "countdown" ? (
                <ChaosColiseumPlayer
                  config={config}
                  spawnPosition={spawnPosition}
                  inputDisabled={inputDisabled || phase !== "playing"}
                  isTouchDevice={isTouchDevice}
                  onPositionUpdate={handlePositionUpdate}
                  onSwing={handleSwing}
                  hp={localHp}
                  alive={localAlive}
                  onHpChange={setLocalHp}
                  onDeath={handleLocalDeath}
                  onRespawnRequest={() => {}}
                  registerApi={registerApi}
                />
              ) : null}

              {/* ===== Remote players ===== */}
              {others.map((p) => (
                <RemoteChaosPlayer key={p.id} data={p} />
              ))}
            </Suspense>
          </Physics>
        </Canvas>
      </KeyboardControls>

      {/* ===== Countdown overlay ===== */}
      {phase === "countdown" && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ background: "radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.85) 80%)" }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 100, fontWeight: 900, color: "#FFD700", textShadow: "0 0 30px rgba(255,215,0,0.8)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {countdownLeft > 0 ? countdownLeft : "GO!"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "white", marginTop: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Get Ready
            </div>
          </div>
        </div>
      )}

      {/* ===== HUD ===== */}
      <ChaosColiseumHud
        localUsername={username}
        localHp={localHp}
        localAlive={localAlive}
        localKills={localKills}
        localDeaths={localDeaths}
        respawnSecondsLeft={respawnSecondsLeft}
        players={playerScores}
        killFeed={killFeed}
        roundTimeLeft={roundTimeLeft}
        roundOver={roundOver}
        localWon={localWon}
        onRestart={handleRestart}
      />
    </div>
  );
}