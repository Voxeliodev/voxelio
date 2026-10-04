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
  pickRandomSpawn,
} from "../../../lib/chaosColiseum";
import {
  loadColiseumProgress,
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
const MIN_PLAYERS_TO_START = 2;

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

  // Random spawn per player
  const [spawnPosition, setSpawnPosition] = useState<[number, number, number]>(
    () => pickRandomSpawn()
  );

  // ===== Remote players =====
  const [others, setOthers] = useState<RemoteChaosData[]>([]);

  // ===== Per-player kills/deaths tracking =====
  const [remoteKills, setRemoteKills] = useState<Record<string, number>>({});
  const [remoteDeaths, setRemoteDeaths] = useState<Record<string, number>>({});

  // ===== Kill feed =====
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);

  // ===== Round phase =====
  const [phase, setPhase] = useState<RoundPhase>("waiting");
  const [roundStartAt, setRoundStartAt] = useState(0);
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
  const lastSwingingRef = useRef(false);
  const lastDamagerRef = useRef<{ id: string; name: string } | null>(null);
  const phaseRef = useRef<RoundPhase>("waiting");

  useEffect(() => { localHpRef.current = localHp; }, [localHp]);
  useEffect(() => { localAliveRef.current = localAlive; }, [localAlive]);
  useEffect(() => { othersRef.current = others; }, [others]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

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
  // WAITING-FOR-PLAYERS → COUNTDOWN
  // ============================================================
  // When we have at least MIN_PLAYERS_TO_START (2) players in the room
  // (us + 1 other), transition from "waiting" to "countdown".
  useEffect(() => {
    if (phase !== "waiting") return;
    const totalPlayers = 1 + others.length;
    if (totalPlayers >= MIN_PLAYERS_TO_START) {
      setPhase("countdown");
      setRoundStartAt(Date.now() + 3000);
      setCountdownLeft(3);
    }
  }, [phase, others.length]);

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
        setRoundOver(true);
        setPhase("over");

        const allPlayers = [
          { id: userId, username, kills: localKills },
          ...othersRef.current.map((o) => ({
            id: o.id, username: o.username, kills: remoteKills[o.id] || 0,
          })),
        ];
        const maxKills = Math.max(...allPlayers.map((p) => p.kills));
        const myKills = localKills;
        const won = myKills > 0 && myKills >= maxKills;
        setLocalWon(won);
        if (won) playRoundWin(); else playRoundLose();

        if (progress) {
          recordRoundEnd(won).then(setProgress);
        }
      }
    }, 200);
    return () => clearInterval(interval);
  }, [phase, roundStartAt, localKills, userId, username, progress, remoteKills]);

  // ============================================================
  // RESPAWN TIMER
  // ============================================================
  useEffect(() => {
    if (localAlive) return;
    if (phase !== "playing") return;

    const interval = setInterval(() => {
      if (Date.now() >= respawnAt) {
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

    channel.on("broadcast", { event: "hit" }, ({ payload }: any) => {
      if (!payload || payload.targetId !== userId) return;
      lastDamagerRef.current = {
        id: payload.attackerId,
        name: payload.attackerName,
      };
      const fromPos = payload.attackerPos as [number, number, number];
      localPlayerApiRef.current?.applyDamage(SWORD_DAMAGE, fromPos);
    });

    channel.on("broadcast", { event: "kill" }, ({ payload }: any) => {
      if (!payload) return;

      const entry: KillFeedEntry = {
        id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        killerName: payload.killerName,
        victimName: payload.victimName,
        timestamp: Date.now(),
      };
      setKillFeed((prev) => [...prev.slice(-4), entry]);

      // Track kills per remote player
      if (payload.killerId && payload.killerId !== userId) {
        setRemoteKills((prev) => ({
          ...prev,
          [payload.killerId]: (prev[payload.killerId] || 0) + 1,
        }));
      }

      // Track deaths per remote player
      if (payload.victimId && payload.victimId !== userId) {
        setRemoteDeaths((prev) => ({
          ...prev,
          [payload.victimId]: (prev[payload.victimId] || 0) + 1,
        }));
      }

      // If we're the killer, count the kill
      if (payload.killerId === userId) {
        setLocalKills((k) => k + 1);
        playKillConfirm();
        const newKills = localKills + 1;
        if (newKills >= 3 && newKills % 2 === 1) {
          playStreakSound(newKills);
        }
        recordKill().then(setProgress);
      }
    });

    channel
      .on("presence", { event: "sync" }, () => {
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
  // HANDLE POSITION UPDATE
  // ============================================================
  const handlePositionUpdate = useCallback((state: PlayerState) => {
    localPosRef.current = state.pos;
    localRotRef.current = state.rotY;
    lastSwingingRef.current = state.swinging;
  }, []);

  // ============================================================
  // HANDLE SWING
  // ============================================================
  const handleSwing = useCallback(
    (attackerPos: [number, number, number], attackerRotY: number) => {
      if (phaseRef.current !== "playing") return;

      const [ax, ay, az] = attackerPos;
      const halfArcRad = (SWORD_ARC_DEGREES / 2) * (Math.PI / 180);

      for (const other of othersRef.current) {
        if (!other.alive) continue;

        const [ox, oy, oz] = other.targetPos;
        const dx = ox - ax;
        const dz = oz - az;
        const dist = Math.hypot(dx, dz);

        if (dist > SWORD_RANGE) continue;
        if (Math.abs(oy - ay) > 2.5) continue;

        const angleToTarget = Math.atan2(dx, dz);
        let diff = angleToTarget - attackerRotY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) > halfArcRad) continue;

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
          playSwordHit();
        }
        break;
      }
    },
    [userId, username]
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

    const channel = channelRef.current;
    const killer = lastDamagerRef.current;
    if (channel && killer) {
      channel.send({
        type: "broadcast",
        event: "kill",
        payload: {
          killerId: killer.id,
          killerName: killer.name,
          victimId: userId,
          victimName: username,
        },
      });
    }
    lastDamagerRef.current = null;
  }, [userId, username]);

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
    setPhase("waiting");
    setRoundStartAt(0);
    setCountdownLeft(3);
    setRoundTimeLeft(ROUND_DURATION_MS / 1000);
    setSpawnPosition(pickRandomSpawn());
    setKillFeed([]);
    setOthers([]);
    setRemoteKills({});
    setRemoteDeaths({});
    lastDamagerRef.current = null;
  }, []);

  // ============================================================
  // PLAYER SCORES FOR HUD
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
      kills: remoteKills[o.id] || 0,
      deaths: remoteDeaths[o.id] || 0,
      alive: o.alive,
    })),
  ];

  const respawnSecondsLeft = localAlive
    ? 0
    : Math.max(0, (respawnAt - Date.now()) / 1000);

  const totalPlayers = 1 + others.length;

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

              {COLISEUM_PLATFORMS.map((p, i) => (
                <RigidBody key={`plat-${i}`} type="fixed" position={p.position} colliders="cuboid" friction={0.9}>
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={p.size} />
                    <meshStandardMaterial color={p.color} roughness={0.85} />
                  </mesh>
                </RigidBody>
              ))}

              {COLISEUM_WALLS.map((w, i) => (
                <RigidBody key={`wall-${i}`} type="fixed" position={w.position} colliders="cuboid">
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={w.size} />
                    <meshStandardMaterial color={w.color} roughness={0.9} />
                  </mesh>
                </RigidBody>
              ))}

              {COLISEUM_TIERS.map((t, i) => (
                <mesh key={`tier-${i}`} position={t.position} receiveShadow>
                  <boxGeometry args={t.size} />
                  <meshStandardMaterial color={t.color} roughness={0.9} />
                </mesh>
              ))}

              {/* Local player (renders in every phase except "over") */}
              {phase !== "over" ? (
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

              {others.map((p) => (
                <RemoteChaosPlayer key={p.id} data={p} />
              ))}
            </Suspense>
          </Physics>
        </Canvas>
      </KeyboardControls>

      {/* ===== WAITING FOR PLAYERS overlay ===== */}
      {phase === "waiting" && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ background: "radial-gradient(circle at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.85) 80%)" }}
        >
          <div style={{ textAlign: "center", padding: "0 24px" }}>
            <div style={{ fontSize: 64, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(255,215,0,0.5))" }}>
              ⚔️
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#FFD700",
                letterSpacing: "0.05em",
                textShadow: "0 0 20px rgba(255,215,0,0.6)",
              }}
            >
              WAITING FOR PLAYERS
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.7)",
                marginTop: 12,
                fontWeight: 700,
              }}
            >
              {totalPlayers} / {MIN_PLAYERS_TO_START} players
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.45)",
                marginTop: 16,
              }}
            >
              The round will begin when {MIN_PLAYERS_TO_START} players are ready.
            </div>
          </div>
        </div>
      )}

      {/* ===== COUNTDOWN overlay ===== */}
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
      {/* Hide the full HUD during waiting so the overlay is clean. */}
      {phase !== "waiting" && (
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
      )}
    </div>
  );
}