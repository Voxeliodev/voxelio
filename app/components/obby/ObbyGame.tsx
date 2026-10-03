"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Sky } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import type { AvatarConfig } from "../../../lib/auth";
import type { World } from "../../../lib/worlds";
import ObbyPlayer from "./ObbyPlayer";
import ObbyHud from "./ObbyHud";
import {
  OBBY_PLATFORMS,
  OBBY_MOVING_PLATFORMS,
  OBBY_CHECKPOINTS,
  OBBY_SPINNERS,
  OBBY_FINISH,
  OBBY_FINISH_BASE,
  OBBY_START_SPAWN,
} from "../../../lib/obbyLevel";

// ============================================================
// IMPOSSIBLE OBBY — main game component
// ============================================================

const KEY_MAP = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
  { name: "jump", keys: [" ", "Space"] },
];

const touchState = { moveX: 0, moveZ: 0, jumpQueued: false };

const PLAYER_RB_NAME = "obby-player";

// ============================================================
// Moving platform
// ============================================================
function MovingPlatform({
  from,
  to,
  size,
  speed,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  size: [number, number, number];
  speed: number;
  color: string;
}) {
  const bodyRef = useRef<any>(null);

  useEffect(() => {
    if (!bodyRef.current) return;

    const totalDist = Math.sqrt(
      Math.pow(to[0] - from[0], 2) +
        Math.pow(to[1] - from[1], 2) +
        Math.pow(to[2] - from[2], 2)
    );
    const period = (totalDist * 2) / speed;
    const startTime = performance.now() / 1000;

    const interval = setInterval(() => {
      if (!bodyRef.current) return;
      const elapsed = performance.now() / 1000 - startTime;
      const cycle = (elapsed % period) / period;
      const t = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;

      bodyRef.current.setNextKinematicTranslation({
        x: from[0] + (to[0] - from[0]) * t,
        y: from[1] + (to[1] - from[1]) * t,
        z: from[2] + (to[2] - from[2]) * t,
      });
    }, 16);

    return () => clearInterval(interval);
  }, [from, to, speed]);

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      position={from}
      colliders="cuboid"
      friction={0.9}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </RigidBody>
  );
}

// ============================================================
// Spinning blade
// ============================================================
function SpinningBlade({
  position,
  length,
  speed,
  color,
}: {
  position: [number, number, number];
  length: number;
  speed: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Group>(null);

  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (meshRef.current) {
        meshRef.current.rotation.y += speed * dt;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [speed]);

  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <group ref={meshRef}>
        <mesh castShadow>
          <boxGeometry args={[length, 0.4, 0.4]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      </group>
    </RigidBody>
  );
}

// ============================================================
// Checkpoint sensor — listens for player entry
// ============================================================
function CheckpointSensor({
  index,
  position,
  unlocked,
  onTrigger,
}: {
  index: number;
  position: [number, number, number];
  unlocked: boolean;
  onTrigger: (i: number) => void;
}) {
  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders={false}
      sensor
    >
      {/* Sensor collider — invisible trigger zone */}
      <CuboidCollider
        args={[1.5, 2, 1.5]}
        sensor
        onIntersectionEnter={(payload) => {
          const otherName = payload.other?.rigidBodyObject?.name;
          if (otherName === PLAYER_RB_NAME) {
            onTrigger(index);
          }
        }}
      />

      {/* Visual ring marker */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.85, 32]} />
        <meshBasicMaterial
          color={unlocked ? "#22C55E" : "#FBBF24"}
          side={THREE.DoubleSide}
          transparent
          opacity={unlocked ? 0.9 : 0.6}
        />
      </mesh>

      {/* Floating pillar of light */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 3, 8]} />
        <meshBasicMaterial
          color={unlocked ? "#22C55E" : "#FBBF24"}
          transparent
          opacity={unlocked ? 0.35 : 0.2}
        />
      </mesh>
    </RigidBody>
  );
}

// ============================================================
// Finish sensor — listens for player entry
// ============================================================
function FinishSensor({
  position,
  size,
  canFinish,
  onFinish,
}: {
  position: [number, number, number];
  size: [number, number, number];
  canFinish: boolean;
  onFinish: () => void;
}) {
  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders={false}
      sensor
    >
      <CuboidCollider
        args={[size[0] / 2, size[1] / 2 + 1.5, size[2] / 2]}
        sensor
        onIntersectionEnter={(payload) => {
          const otherName = payload.other?.rigidBodyObject?.name;
          if (otherName === PLAYER_RB_NAME) {
            if (canFinish) {
              onFinish();
            }
          }
        }}
      />
    </RigidBody>
  );
}

// ============================================================
// Scene — everything inside the physics world
// ============================================================
function Scene({
  config,
  spawnPosition,
  onFall,
  inputDisabled,
  isTouchDevice,
  onFinish,
  onCheckpoint,
  currentCheckpoint,
}: {
  config: AvatarConfig;
  spawnPosition: [number, number, number];
  onFall: () => void;
  inputDisabled: boolean;
  isTouchDevice: boolean;
  onFinish: () => void;
  onCheckpoint: (id: number) => void;
  currentCheckpoint: number;
}) {
  const canFinish = currentCheckpoint >= OBBY_CHECKPOINTS.length - 1;

  return (
    <>
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

      {/* Static platforms */}
      {OBBY_PLATFORMS.map((p, i) => (
        <RigidBody
          key={`plat-${i}`}
          type="fixed"
          position={p.position}
          colliders="cuboid"
          friction={0.9}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={p.size} />
            <meshStandardMaterial color={p.color} roughness={0.75} />
          </mesh>
        </RigidBody>
      ))}

      {/* Finish pad (solid base) */}
      <RigidBody type="fixed" position={OBBY_FINISH_BASE.position} colliders="cuboid">
        <mesh castShadow receiveShadow>
          <boxGeometry args={OBBY_FINISH_BASE.size} />
          <meshStandardMaterial color={OBBY_FINISH_BASE.color} roughness={0.5} />
        </mesh>
      </RigidBody>

      {/* Finish sensor (invisible trigger) */}
      <FinishSensor
        position={[OBBY_FINISH.position[0], OBBY_FINISH.position[1], OBBY_FINISH.position[2]]}
        size={OBBY_FINISH.size}
        canFinish={canFinish}
        onFinish={onFinish}
      />

      {/* Checkpoint sensors */}
      {OBBY_CHECKPOINTS.map((cp, i) => (
        <CheckpointSensor
          key={`cp-${i}`}
          index={i}
          position={[cp.position[0], cp.position[1] + 1.5, cp.position[2]]}
          unlocked={currentCheckpoint >= i}
          onTrigger={onCheckpoint}
        />
      ))}

      {/* Moving platforms */}
      {OBBY_MOVING_PLATFORMS.map((mp) => (
        <MovingPlatform
          key={mp.id}
          from={mp.from}
          to={mp.to}
          size={mp.size}
          speed={mp.speed}
          color={mp.color}
        />
      ))}

      {/* Spinning blades */}
      {OBBY_SPINNERS.map((s) => (
        <SpinningBlade
          key={s.id}
          position={s.position}
          length={s.length}
          speed={s.speed}
          color={s.color}
        />
      ))}

      {/* Player */}
      <ObbyPlayer
        config={config}
        spawnPosition={spawnPosition}
        onFall={onFall}
        inputDisabled={inputDisabled}
        isTouchDevice={isTouchDevice}
        touchState={touchState}
      />
    </>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ObbyGame({
  config,
  userId,
  username,
  world,
  inputDisabled,
  isTouchDevice,
}: {
  config: AvatarConfig;
  userId: string;
  username: string;
  world: World;
  inputDisabled: boolean;
  isTouchDevice: boolean;
}) {
  const [spawn, setSpawn] = useState<[number, number, number]>(OBBY_START_SPAWN);
  const [checkpointIndex, setCheckpointIndex] = useState(-1);
  const [startTime, setStartTime] = useState<number>(() => performance.now());
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Timer
  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setElapsed(performance.now() - startTime);
    }, 50);
    return () => clearInterval(interval);
  }, [startTime, finished]);

  const handleFall = useCallback(() => {
    if (checkpointIndex >= 0) {
      const cp = OBBY_CHECKPOINTS[checkpointIndex];
      setSpawn([...cp.spawn]);
    } else {
      setSpawn([...OBBY_START_SPAWN]);
    }
    setResetKey((k) => k + 1);
  }, [checkpointIndex]);

  const handleCheckpoint = useCallback(
    (id: number) => {
      if (id > checkpointIndex) {
        setCheckpointIndex(id);
      }
    },
    [checkpointIndex]
  );

  const handleFinish = useCallback(() => {
    if (finished) return;
    if (checkpointIndex < OBBY_CHECKPOINTS.length - 1) {
      return;
    }
    const t = performance.now() - startTime;
    setFinalTime(t);
    setFinished(true);
  }, [finished, checkpointIndex, startTime]);

  const handleRestart = useCallback(() => {
    setSpawn([...OBBY_START_SPAWN]);
    setCheckpointIndex(-1);
    setStartTime(performance.now());
    setElapsed(0);
    setFinished(false);
    setFinalTime(0);
    setSubmitted(false);
    setResetKey((k) => k + 1);
  }, []);

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
              <Scene
                key={resetKey}
                config={config}
                spawnPosition={spawn}
                onFall={handleFall}
                inputDisabled={inputDisabled}
                isTouchDevice={isTouchDevice}
                onFinish={handleFinish}
                onCheckpoint={handleCheckpoint}
                currentCheckpoint={checkpointIndex}
              />
            </Suspense>
          </Physics>
        </Canvas>
      </KeyboardControls>

      <ObbyHud
        elapsed={elapsed}
        checkpointCount={checkpointIndex + 1}
        totalCheckpoints={OBBY_CHECKPOINTS.length}
        finished={finished}
        finalTime={finalTime}
        onRestart={handleRestart}
        worldId={world.id}
        submitted={submitted}
        setSubmitted={setSubmitted}
      />

      {isTouchDevice && !inputDisabled && <ObbyTouchControls />}
    </div>
  );
}

// ============================================================
// Touch controls
// ============================================================
function ObbyTouchControls() {
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