"use client";

import { useMemo, Suspense } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, RoundedBox, useGLTF } from "@react-three/drei";
import type { AvatarConfig } from "../../lib/auth";
import { Hat3D } from "./Hats3D";
import { Shirt3D } from "./Shirts3D";
import { getItem } from "../../lib/items";
import { getBodyPart, type BodyPartSlot } from "../../lib/bodyParts";

// ============================================================
// VOXELIO 3D AVATAR
// ============================================================

function Face({ eyeZ, mouthZ }: { eyeZ: number; mouthZ: number }) {
  const eyeColor = "#1A1A2E";
  const mouthColor = "#1A1A2E";

  return (
    <group>
      <mesh position={[-0.18, 0.1, eyeZ]}>
        <boxGeometry args={[0.09, 0.12, 0.03]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>
      <mesh position={[0.18, 0.1, eyeZ]}>
        <boxGeometry args={[0.09, 0.12, 0.03]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>
      <mesh position={[0, -0.16, mouthZ]}>
        <boxGeometry args={[0.2, 0.04, 0.03]} />
        <meshStandardMaterial color={mouthColor} />
      </mesh>
    </group>
  );
}

function DefaultHead({ skinTone }: { skinTone: string }) {
  return (
    <group position={[0, 1.4, 0]}>
      <RoundedBox args={[0.85, 0.85, 0.85]} radius={0.16} smoothness={6} castShadow>
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </RoundedBox>
      <Face eyeZ={0.44} mouthZ={0.44} />
    </group>
  );
}

function RoundHead({ skinTone }: { skinTone: string }) {
  return (
    <group position={[0, 1.4, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.52, 48, 48]} />
        <meshStandardMaterial color={skinTone} roughness={0.65} />
      </mesh>
      <Face eyeZ={0.5} mouthZ={0.5} />
    </group>
  );
}

function HeadlessHead() {
  return null;
}

function HeadFor({
  partId,
  skinTone,
}: {
  partId: string | undefined;
  skinTone: string;
}) {
  if (partId === "head-round") {
    return <RoundHead key="head-round" skinTone={skinTone} />;
  }
  if (partId === "head-headless") {
    return <HeadlessHead key="head-headless" />;
  }
  if (partId && partId !== "default") {
    const part = getBodyPart(partId);
    if (part?.modelPath) return <CustomBodyPart key={partId} partId={partId} />;
  }
  return <DefaultHead key="default" skinTone={skinTone} />;
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
// SHIRT TEXT OVERLAY
// Renders multi-colored text on the front of the torso.
// Each segment can have its own colour.
// ============================================================
function ShirtTextOverlay({
  segments,
}: {
  segments: { text: string; color: string }[];
}) {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = 'bold 160px "Segoe UI", Arial, sans-serif';

    // Measure all segments first so we can centre the full line
    const widths = segments.map((s) => ctx.measureText(s.text).width);
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    let x = (canvas.width - totalWidth) / 2;
    const y = canvas.height / 2;

    // Draw each segment in its own colour
    segments.forEach((seg, i) => {
      ctx.fillStyle = seg.color;
      ctx.fillText(seg.text, x, y);
      x += widths[i];
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    tex.anisotropy = 8;
    return tex;
  }, [segments]);

  if (!texture) return null;

  return (
    <mesh position={[0, 0.62, 0.28]} renderOrder={999}>
      <planeGeometry args={[0.85, 0.42]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function Character({ config }: { config: AvatarConfig }) {
  const skin = config.skinTone;
  const pants = config.pantsColor;
  const bodyParts = config.bodyParts;
  const partColors = config.partColors || {};

  const shirtItem = config.shirt ? getItem(config.shirt) : null;
  const shirtOverride = shirtItem?.shirtColorOverride || null;

  const torsoColor = shirtOverride || partColors.torso || config.shirtColor;
  const leftArmColor = shirtOverride || partColors.leftArm || config.shirtColor;
  const rightArmColor = shirtOverride || partColors.rightArm || config.shirtColor;

  const headColor = partColors.head || skin;
  const leftLegColor = partColors.leftLeg || pants;
  const rightLegColor = partColors.rightLeg || pants;

  const leftHandColor = skin;
  const rightHandColor = skin;

  const isHeadless = bodyParts?.head === "head-headless";

  return (
    <group position={[0, -0.6, 0]}>
      {!isHeadless && <HeadFor partId={bodyParts?.head} skinTone={headColor} />}
      {config.hat && <Hat3D hatId={config.hat} />}

      <BodyPart slot="torso" partId={bodyParts?.torso}>
        <RoundedBox
          args={[0.9, 1, 0.5]}
          radius={0.06}
          smoothness={4}
          position={[0, 0.5, 0]}
          castShadow
        >
          <meshStandardMaterial color={torsoColor} roughness={0.7} />
        </RoundedBox>
      </BodyPart>

      {/* Shirt 3D detail layer (e.g. logo decals) */}
      {config.shirt && <Shirt3D shirtId={config.shirt} skinTone={skin} />}

      {/* Multi-colour text overlay */}
      {shirtItem?.shirtTextSegments && shirtItem.shirtTextSegments.length > 0 && (
        <ShirtTextOverlay segments={shirtItem.shirtTextSegments} />
      )}

      <BodyPart slot="leftArm" partId={bodyParts?.leftArm}>
        <group>
          <RoundedBox
            args={[0.3, 1, 0.3]}
            radius={0.06}
            smoothness={4}
            position={[-0.6, 0.5, 0]}
            castShadow
          >
            <meshStandardMaterial color={leftArmColor} roughness={0.7} />
          </RoundedBox>
          <RoundedBox
            args={[0.3, 0.3, 0.3]}
            radius={0.06}
            smoothness={4}
            position={[-0.6, -0.15, 0]}
            castShadow
          >
            <meshStandardMaterial color={leftHandColor} roughness={0.6} />
          </RoundedBox>
        </group>
      </BodyPart>

      <BodyPart slot="rightArm" partId={bodyParts?.rightArm}>
        <group>
          <RoundedBox
            args={[0.3, 1, 0.3]}
            radius={0.06}
            smoothness={4}
            position={[0.6, 0.5, 0]}
            castShadow
          >
            <meshStandardMaterial color={rightArmColor} roughness={0.7} />
          </RoundedBox>
          <RoundedBox
            args={[0.3, 0.3, 0.3]}
            radius={0.06}
            smoothness={4}
            position={[0.6, -0.15, 0]}
            castShadow
          >
            <meshStandardMaterial color={rightHandColor} roughness={0.6} />
          </RoundedBox>
        </group>
      </BodyPart>

      <BodyPart slot="leftLeg" partId={bodyParts?.leftLeg}>
        <group>
          <RoundedBox
            args={[0.35, 0.8, 0.4]}
            radius={0.05}
            smoothness={4}
            position={[-0.25, -0.4, 0]}
            castShadow
          >
            <meshStandardMaterial color={leftLegColor} roughness={0.7} />
          </RoundedBox>
          <RoundedBox
            args={[0.35, 0.2, 0.55]}
            radius={0.05}
            smoothness={4}
            position={[-0.25, -0.9, 0.08]}
            castShadow
          >
            <meshStandardMaterial color={leftLegColor} roughness={0.7} />
          </RoundedBox>
        </group>
      </BodyPart>

      <BodyPart slot="rightLeg" partId={bodyParts?.rightLeg}>
        <group>
          <RoundedBox
            args={[0.35, 0.8, 0.4]}
            radius={0.05}
            smoothness={4}
            position={[0.25, -0.4, 0]}
            castShadow
          >
            <meshStandardMaterial color={rightLegColor} roughness={0.7} />
          </RoundedBox>
          <RoundedBox
            args={[0.35, 0.2, 0.55]}
            radius={0.05}
            smoothness={4}
            position={[0.25, -0.9, 0.08]}
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
}: {
  config: AvatarConfig;
  size?: number;
  interactive?: boolean;
}) {
  const cameraPosition = useMemo(() => computeCameraPosition(config), [config]);

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

        <Character config={config} />

        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minDistance={2.5}
            maxDistance={10}
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