"use client";

import { useMemo, Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, useGLTF } from "@react-three/drei";
import type { AvatarConfig } from "../../lib/auth";
import type { Item } from "../../lib/items";
import { Hat3D } from "./Hats3D";
import { Shirt3D, CommunityShirt3D } from "./Shirts3D";
import { Accessory3DGeometry } from "./Accessories3D";
import { Face3D, DefaultFace3D } from "./Faces3D";
import { Hair3D } from "./Hair3D";
import { getItem } from "../../lib/items";
import { findCommunityShirt } from "../../lib/communityShirts";
import { getBodyPart, type BodyPartSlot } from "../../lib/bodyParts";

// ============================================================
// VOXELIO 3D AVATAR
// ============================================================

const HELD_ACCESSORIES = ["accessory-vox-sword"];

// Shared UV cell math for community shirt templates
const CELL_W = 1 / 3;
const CELL_H = 1 / 3;
const INSET_X = 0.10;
const INSET_TOP = 0.22;
const INSET_BOT = 0.10;

function applyCellUV(tex: THREE.Texture, col: 0 | 1 | 2, row: 0 | 1 | 2) {
  const u0 = col * CELL_W + INSET_X * CELL_W;
  const u1 = (col + 1) * CELL_W - INSET_X * CELL_W;

  const rowFromBottom = 2 - row;
  const cellV0 = rowFromBottom * CELL_H;
  const cellV1 = (rowFromBottom + 1) * CELL_H;

  const topInset = INSET_TOP * CELL_H;
  const botInset = INSET_BOT * CELL_H;

  const v0 = cellV0 + botInset;
  const v1 = cellV1 - topInset;

  tex.offset.set(u0, v0);
  tex.repeat.set(u1 - u0, v1 - v0);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
}

function SceneExporter({
  onSceneReady,
}: {
  onSceneReady?: (scene: THREE.Scene) => void;
}) {
  const { scene } = useThree();
  useEffect(() => {
    if (onSceneReady) onSceneReady(scene);
  }, [scene, onSceneReady]);
  return null;
}

function DefaultHead({ skinTone, hideFace }: { skinTone: string; hideFace?: boolean }) {
  return (
    <group position={[0, 1.4, 0]}>
      <RoundedBox args={[0.85, 0.85, 0.85]} radius={0.16} smoothness={6} castShadow>
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </RoundedBox>
      {!hideFace && <DefaultFace3D headType="default" />}
    </group>
  );
}

function RoundHead({ skinTone, hideFace }: { skinTone: string; hideFace?: boolean }) {
  return (
    <group position={[0, 1.4, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.52, 48, 48]} />
        <meshStandardMaterial color={skinTone} roughness={0.65} />
      </mesh>
      {!hideFace && <DefaultFace3D headType="round" />}
    </group>
  );
}

function HeadlessHead() {
  return null;
}

function HeadFor({
  partId,
  skinTone,
  hideFace,
}: {
  partId: string | undefined;
  skinTone: string;
  hideFace?: boolean;
}) {
  if (partId === "head-round") {
    return <RoundHead key="head-round" skinTone={skinTone} hideFace={hideFace} />;
  }
  if (partId === "head-headless") {
    return <HeadlessHead key="head-headless" />;
  }
  if (partId && partId !== "default") {
    const part = getBodyPart(partId);
    if (part?.modelPath) return <CustomBodyPart key={partId} partId={partId} />;
  }
  return <DefaultHead key="default" skinTone={skinTone} hideFace={hideFace} />;
}

function LoadedBodyPart({
  part,
}: {
  part: NonNullable<ReturnType<typeof getBodyPart>>;
}) {
  const gltf = useGLTF(part.modelPath!);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const scale = part.modelScale ?? 1;
  const offset = part.modelOffset ?? [0, 0, 0];
  const rotation = part.modelRotation ?? [0, 0, 0];

  return (
    <primitive
      object={scene}
      scale={scale}
      position={offset}
      rotation={rotation}
      castShadow
    />
  );
}

function CustomBodyPart({ partId }: { partId: string }) {
  const part = getBodyPart(partId);
  if (!part || !part.modelPath) return null;
  return (
    <Suspense fallback={null}>
      <LoadedBodyPart part={part} />
    </Suspense>
  );
}

function BodyPart({
  slot,
  partId,
  children,
}: {
  slot: BodyPartSlot;
  partId: string | undefined;
  children: React.ReactNode;
}) {
  const isDefault = !partId || partId === "default";
  if (isDefault) return <>{children}</>;

  const part = getBodyPart(partId);
  if (part?.modelPath) {
    return <CustomBodyPart key={partId} partId={partId} />;
  }
  return <>{children}</>;
}

// ============================================================
// SHARED TEXTURE LOADER
// ============================================================
let sharedShirtTextureCache: Record<string, THREE.Texture> = {};

function useShirtTexture(imageUrl: string | undefined): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(() => {
    if (!imageUrl) return null;
    return sharedShirtTextureCache[imageUrl] || null;
  });

  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      return;
    }
    if (sharedShirtTextureCache[imageUrl]) {
      setTexture(sharedShirtTextureCache[imageUrl]);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      sharedShirtTextureCache[imageUrl] = tex;
      setTexture(tex);
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return texture;
}

// ============================================================
// SLEEVE OVERLAY — textures the upper arm with the sleeve cell
// ============================================================
function SleeveOverlay({
  texture,
  side,
  armSize,
  armOffset,
}: {
  texture: THREE.Texture;
  side: "left" | "right";
  armSize: [number, number, number];
  armOffset: [number, number, number];
}) {
  const [w, h, d] = armSize;
  const [ox, oy, oz] = armOffset;

  // LEFT SLEEVE is cell (0,0) → texture for LEFT arm
  // RIGHT SLEEVE is cell (2,0) → texture for RIGHT arm
  const col: 0 | 2 = side === "left" ? 0 : 2;
  const row = 0;

  const tex = useMemo(() => {
    const t = texture.clone();
    applyCellUV(t, col, row);
    t.needsUpdate = true;
    return t;
  }, [texture, col]);

  return (
    <mesh position={[ox, oy, oz]}>
      <boxGeometry args={[w + 0.004, h + 0.004, d + 0.004]} />
      <meshStandardMaterial map={tex} roughness={0.7} />
    </mesh>
  );
}

// ============================================================
// CHARACTER
// ============================================================
export function Character({
  config,
  hideAccessory = false,
  walking = false,
  resolvedShirt = null,
}: {
  config: AvatarConfig;
  hideAccessory?: boolean;
  walking?: boolean;
  resolvedShirt?: Item | null;
}) {
  const skin = config.skinTone;
  const pants = config.pantsColor;
  const bodyParts = config.bodyParts;
  const partColors = config.partColors || {};

  const shirtItem =
    resolvedShirt ||
    (config.shirt
      ? (getItem(config.shirt) || findCommunityShirt(config.shirt))
      : null);

  const shirtOverride = shirtItem?.shirtColorOverride || null;
  const shirtImageUrl = shirtItem?.imageUrl;

  // Load the community shirt texture once; reuse for torso + sleeves
  const shirtTexture = useShirtTexture(shirtImageUrl);

  const torsoColor = shirtOverride || partColors.torso || config.shirtColor;
  const leftArmColor = shirtOverride || partColors.leftArm || config.shirtColor;
  const rightArmColor = shirtOverride || partColors.rightArm || config.shirtColor;

  const headColor = partColors.head || skin;
  const leftLegColor = partColors.leftLeg || pants;
  const rightLegColor = partColors.rightLeg || pants;

  const leftHandColor = skin;
  const rightHandColor = skin;

  const isHeadless = bodyParts?.head === "head-headless";
  const isRoundHead = bodyParts?.head === "head-round";

  const isHolding = !hideAccessory
    && Boolean(config.accessory && HELD_ACCESSORIES.includes(config.accessory));

  const rightArmBaseX = isHolding ? -Math.PI / 2 : 0;
  const leftArmBaseX = 0;
  const shoulderY = isHolding ? 0.85 : 1.0;

  const hideDefaultFace = Boolean(config.face);

  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const walkPhaseRef = useRef(0);
  const walkAmountRef = useRef(0);

  useFrame((_, delta) => {
    const targetAmount = walking ? 1 : 0;
    walkAmountRef.current += (targetAmount - walkAmountRef.current) * Math.min(1, delta * 8);

    if (walkAmountRef.current > 0.01) {
      walkPhaseRef.current += delta * 10;
    }

    const swing = Math.sin(walkPhaseRef.current) * 0.75 * walkAmountRef.current;

    if (leftArmRef.current) leftArmRef.current.rotation.x = leftArmBaseX + swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = rightArmBaseX - swing;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = swing;
  });

  return (
    <group name="VoxelioCharacter" position={[0, -0.6, 0]}>
      {!isHeadless && (
        <HeadFor partId={bodyParts?.head} skinTone={headColor} hideFace={hideDefaultFace} />
      )}
      {config.hair && <Hair3D hairId={config.hair} />}
      {config.hat && <Hat3D hatId={config.hat} />}

      {config.face && !isHeadless && (
        <Face3D
          faceId={config.face}
          headType={isRoundHead ? "round" : "default"}
        />
      )}

      {/* TORSO */}
      <BodyPart slot="torso" partId={bodyParts?.torso}>
        {shirtImageUrl ? (
          <CommunityShirt3D
            imageUrl={shirtImageUrl}
            torsoSize={[0.9, 1, 0.5]}
            torsoPosition={[0, 0.5, 0]}
          />
        ) : (
          <RoundedBox
            args={[0.9, 1, 0.5]}
            radius={0.06}
            smoothness={4}
            position={[0, 0.5, 0]}
            castShadow
          >
            <meshStandardMaterial color={torsoColor} roughness={0.7} />
          </RoundedBox>
        )}
      </BodyPart>

      {config.shirt && !shirtImageUrl && (
        <Shirt3D shirtId={config.shirt} skinTone={skin} />
      )}

      {/* LEFT ARM */}
      <BodyPart slot="leftArm" partId={bodyParts?.leftArm}>
        <group ref={leftArmRef} position={[-0.6, 1.0, 0]}>
          <RoundedBox
            args={[0.3, 1, 0.3]}
            radius={0.06}
            smoothness={4}
            position={[0, -0.5, 0]}
            castShadow
          >
            <meshStandardMaterial color={leftArmColor} roughness={0.7} />
          </RoundedBox>

          {/* 👇 Sleeve texture overlay */}
          {shirtTexture && (
            <SleeveOverlay
              texture={shirtTexture}
              side="left"
              armSize={[0.3, 1, 0.3]}
              armOffset={[0, -0.5, 0]}
            />
          )}

          <RoundedBox
            args={[0.3, 0.3, 0.3]}
            radius={0.06}
            smoothness={4}
            position={[0, -1.15, 0]}
            castShadow
          >
            <meshStandardMaterial color={leftHandColor} roughness={0.6} />
          </RoundedBox>
        </group>
      </BodyPart>

      {/* RIGHT ARM */}
      <BodyPart slot="rightArm" partId={bodyParts?.rightArm}>
        <group ref={rightArmRef} position={[0.6, shoulderY, 0]}>
          <RoundedBox
            args={[0.3, 1, 0.3]}
            radius={0.06}
            smoothness={4}
            position={[0, -0.5, 0]}
            castShadow
          >
            <meshStandardMaterial color={rightArmColor} roughness={0.7} />
          </RoundedBox>

          {/* 👇 Sleeve texture overlay */}
          {shirtTexture && (
            <SleeveOverlay
              texture={shirtTexture}
              side="right"
              armSize={[0.3, 1, 0.3]}
              armOffset={[0, -0.5, 0]}
            />
          )}

          <RoundedBox
            args={[0.3, 0.3, 0.3]}
            radius={0.06}
            smoothness={4}
            position={[0, -1.15, 0]}
            castShadow
          >
            <meshStandardMaterial color={rightHandColor} roughness={0.6} />
          </RoundedBox>

          {!hideAccessory && config.accessory && (
            <group
              position={[0, -1.32, 0]}
              rotation={[-rightArmBaseX, 0, 0]}
            >
              <Accessory3DGeometry accessoryId={config.accessory} />
            </group>
          )}
        </group>
      </BodyPart>

      {/* LEFT LEG */}
      <BodyPart slot="leftLeg" partId={bodyParts?.leftLeg}>
        <group ref={leftLegRef} position={[-0.25, 0, 0]}>
          <RoundedBox
            args={[0.35, 0.8, 0.4]}
            radius={0.05}
            smoothness={4}
            position={[0, -0.4, 0]}
            castShadow
          >
            <meshStandardMaterial color={leftLegColor} roughness={0.7} />
          </RoundedBox>
          <RoundedBox
            args={[0.35, 0.2, 0.55]}
            radius={0.05}
            smoothness={4}
            position={[0, -0.9, 0.08]}
            castShadow
          >
            <meshStandardMaterial color={leftLegColor} roughness={0.7} />
          </RoundedBox>
        </group>
      </BodyPart>

      {/* RIGHT LEG */}
      <BodyPart slot="rightLeg" partId={bodyParts?.rightLeg}>
        <group ref={rightLegRef} position={[0.25, 0, 0]}>
          <RoundedBox
            args={[0.35, 0.8, 0.4]}
            radius={0.05}
            smoothness={4}
            position={[0, -0.4, 0]}
            castShadow
          >
            <meshStandardMaterial color={rightLegColor} roughness={0.7} />
          </RoundedBox>
          <RoundedBox
            args={[0.35, 0.2, 0.55]}
            radius={0.05}
            smoothness={4}
            position={[0, -0.9, 0.08]}
            castShadow
          >
            <meshStandardMaterial color={rightLegColor} roughness={0.7} />
          </RoundedBox>
        </group>
      </BodyPart>
    </group>
  );
}

function getAvatarExtent(config: AvatarConfig): { top: number; bottom: number } {
  const headId = config.bodyParts?.head;
  const isRoundHead = headId === "head-round";
  const isHeadless = headId === "head-headless";

  let top: number;
  if (isHeadless) top = 1.0;
  else if (isRoundHead) top = 1.92;
  else top = 1.825;

  if (config.hat === "hat-vox-sign") {
    top = Math.max(top, 2.625);
  } else if (config.hat === "hat-vox-cooks") {
    top = Math.max(top, 2.15);
  } else if (config.hat === "hat-vox-cooks-beanie") {
    top = Math.max(top, 2.55);
  }

  const bottom = -1.0;
  return { top, bottom };
}

function computeCameraPosition(config: AvatarConfig): [number, number, number] {
  const { top, bottom } = getAvatarExtent(config);
  const topWorld = top - 0.6;
  const bottomWorld = bottom - 0.6;
  const maxAbsY = Math.max(Math.abs(topWorld), Math.abs(bottomWorld));

  const fov = 45;
  const halfFov = (fov / 2) * (Math.PI / 180);
  const padding = 1.25;
  const distance = (maxAbsY / Math.tan(halfFov)) * padding;

  const heightOffset = config.hat === "hat-vox-sign" ? 0.2 : 0.0;

  return [0, heightOffset, distance];
}

export default function Avatar({
  config,
  size = 200,
  interactive = false,
  onSceneReady,
  resolvedShirt = null,
}: {
  config: AvatarConfig;
  size?: number;
  interactive?: boolean;
  onSceneReady?: (scene: THREE.Scene) => void;
  resolvedShirt?: Item | null;
}) {
  const cameraPosition = useMemo(() => computeCameraPosition(config), [config]);

  const cameraDistance = useMemo(
    () =>
      Math.sqrt(
        cameraPosition[0] * cameraPosition[0] +
          cameraPosition[1] * cameraPosition[1] +
          cameraPosition[2] * cameraPosition[2]
      ),
    [cameraPosition]
  );

  const minDist = cameraDistance * 0.4;
  const maxDist = cameraDistance * 2.0;

  return (
    <div
      style={{
        width: size,
        height: size * 1.3,
        cursor: interactive ? "grab" : "default",
      }}
    >
      <Canvas
        camera={{ position: cameraPosition, fov: 45 }}
        shadows
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight
          position={[3, 5, 4]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 2, -3]} intensity={0.35} />
        <hemisphereLight args={["#ffffff", "#666680", 0.4]} />

        <Character config={config} resolvedShirt={resolvedShirt} />

        {onSceneReady && <SceneExporter onSceneReady={onSceneReady} />}

        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            zoomSpeed={0.9}
            minDistance={minDist}
            maxDistance={maxDist}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 1.8}
            autoRotate={true}
            autoRotateSpeed={1.2}
          />
        )}
      </Canvas>
    </div>
  );
}