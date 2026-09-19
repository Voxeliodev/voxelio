"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, RoundedBox, useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { Hat3DGeometry } from "./Hats3D";
import { Shirt3D } from "./Shirts3D";
import { Accessory3DGeometry } from "./Accessories3D";
import type { Item } from "../../lib/items";

// ============================================================
// ItemPreview — reusable 3D preview for any catalog item.
// ============================================================

function AutoFitModel({ item, targetSize = 1.4 }: { item: Item; targetSize?: number }) {
  const gltf = useGLTF(item.modelPath!);

  const wrapper = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    const scale = targetSize / maxDim;

    const center = new THREE.Vector3();
    box.getCenter(center);

    cloned.scale.setScalar(scale);
    cloned.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    const w = new THREE.Group();
    w.add(cloned);
    return w;
  }, [gltf.scene, targetSize]);

  return <primitive object={wrapper} />;
}

function HatPreview({ item, size }: { item: Item; size: number }) {
  const isGLB = Boolean(item.modelPath);

  return (
    <div
      className="w-full bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] cursor-grab active:cursor-grabbing"
      style={{ height: size }}
    >
      <Canvas camera={{ position: [0, 0.2, 2.2], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 5, 4]} intensity={1.15} />
        <directionalLight position={[-3, 2, -3]} intensity={0.5} />
        <hemisphereLight args={["#ffffff", "#666680", 0.5]} />

        {isGLB ? (
          <Suspense fallback={null}>
            <AutoFitModel item={item} targetSize={1.4} />
          </Suspense>
        ) : (
          <group position={[0, -0.05, 0]} scale={[1.4, 1.4, 1.4]}>
            <Hat3DGeometry hatId={item.id} />
          </group>
        )}

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={2}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  );
}

function ShirtPreview({ item, size }: { item: Item; size: number }) {
  const torsoColor = item.shirtColorOverride || "#0A0A0A";
  return (
    <div
      className="w-full bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] cursor-grab active:cursor-grabbing"
      style={{ height: size }}
    >
      <Canvas camera={{ position: [0, 0.15, 1.7], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 5, 4]} intensity={1.15} />
        <directionalLight position={[-3, 2, -3]} intensity={0.45} />
        <hemisphereLight args={["#ffffff", "#666680", 0.4]} />
        <group position={[0, -0.55, 0]}>
          <RoundedBox args={[0.9, 1, 0.5]} radius={0.06} smoothness={4} position={[0, 0.5, 0]} castShadow>
            <meshStandardMaterial color={torsoColor} roughness={0.7} />
          </RoundedBox>
          <RoundedBox args={[0.3, 0.35, 0.3]} radius={0.05} smoothness={4} position={[-0.6, 0.85, 0]} castShadow>
            <meshStandardMaterial color={torsoColor} roughness={0.7} />
          </RoundedBox>
          <RoundedBox args={[0.3, 0.35, 0.3]} radius={0.05} smoothness={4} position={[0.6, 0.85, 0]} castShadow>
            <meshStandardMaterial color={torsoColor} roughness={0.7} />
          </RoundedBox>
          <Shirt3D shirtId={item.id} />
        </group>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={1.5}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  );
}

function HeadPreview({ item, size }: { item: Item; size: number }) {
  const isRound = item.id === "head-round";
  const isHeadless = item.id === "head-headless";

  return (
    <div
      className="w-full bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] cursor-grab active:cursor-grabbing"
      style={{ height: size }}
    >
      <Canvas camera={{ position: [0, 0, 2.2], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 5, 4]} intensity={1.15} />
        <directionalLight position={[-3, 2, -3]} intensity={0.45} />
        <hemisphereLight args={["#ffffff", "#666680", 0.4]} />

        {isRound && (
          <mesh castShadow>
            <sphereGeometry args={[0.7, 48, 48]} />
            <meshStandardMaterial color="#F5C6A5" roughness={0.65} />
          </mesh>
        )}

        {isHeadless && (
          <mesh>
            <sphereGeometry args={[0.7, 24, 24]} />
            <meshBasicMaterial
              color="#7B2FF7"
              wireframe
              transparent
              opacity={0.4}
            />
          </mesh>
        )}

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={1.8}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  );
}

function FacePreview({ item, size }: { item: Item; size: number }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!item.faceImageUrl) return;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      item.faceImageUrl,
      (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      () => {}
    );
    return () => { cancelled = true; };
  }, [item.faceImageUrl]);

  return (
    <div
      className="w-full bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] cursor-grab active:cursor-grabbing"
      style={{ height: size }}
    >
      <Canvas camera={{ position: [0, 0.1, 2.2], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 5, 4]} intensity={1.15} />
        <directionalLight position={[-3, 2, -3]} intensity={0.5} />
        <hemisphereLight args={["#ffffff", "#666680", 0.5]} />

        <group position={[0, -0.1, 0]}>
          <RoundedBox args={[0.85, 0.85, 0.85]} radius={0.16} smoothness={6} castShadow>
            <meshStandardMaterial color="#F5C6A5" roughness={0.6} />
          </RoundedBox>

          {!texture && (
            <>
              <mesh position={[-0.18, 0.1, 0.44]}>
                <boxGeometry args={[0.09, 0.12, 0.03]} />
                <meshStandardMaterial color="#1A1A2E" />
              </mesh>
              <mesh position={[0.18, 0.1, 0.44]}>
                <boxGeometry args={[0.09, 0.12, 0.03]} />
                <meshStandardMaterial color="#1A1A2E" />
              </mesh>
              <mesh position={[0, -0.16, 0.44]}>
                <boxGeometry args={[0.2, 0.04, 0.03]} />
                <meshStandardMaterial color="#1A1A2E" />
              </mesh>
            </>
          )}

          {texture && (
            <mesh position={[0, 0, 0.426]}>
              <planeGeometry args={[0.85, 0.85]} />
              <meshBasicMaterial
                map={texture}
                transparent
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={1.8}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  );
}

function AccessoryPreview({ item, size }: { item: Item; size: number }) {
  const isGLB = Boolean(item.modelPath);

  return (
    <div
      className="w-full bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] cursor-grab active:cursor-grabbing"
      style={{ height: size }}
    >
      <Canvas camera={{ position: [1.2, 0.4, 1.6], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 4]} intensity={1.2} />
        <directionalLight position={[-3, 2, -3]} intensity={0.5} />
        <directionalLight position={[0, 0, 3]} intensity={0.4} />
        <hemisphereLight args={["#ffffff", "#666680", 0.5]} />

        {isGLB ? (
          <Suspense fallback={null}>
            <AutoFitModel item={item} targetSize={1.6} />
          </Suspense>
        ) : (
          <group position={[0, -0.5, 0]} rotation={[0, 0, -0.15]}>
            <Accessory3DGeometry accessoryId={item.id} />
          </group>
        )}

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={2}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.6}
        />
      </Canvas>
    </div>
  );
}

function GenericPreview({ item, size }: { item: Item; size: number }) {
  return (
    <div
      className="w-full bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] flex items-center justify-center"
      style={{ height: size }}
    >
      <span style={{ fontSize: size * 0.4 }}>{item.previewEmoji}</span>
    </div>
  );
}

export default function ItemPreview({ item, size = 160 }: { item: Item; size?: number }) {
  if (item.category === "hats") return <HatPreview item={item} size={size} />;
  if (item.category === "outfits") return <ShirtPreview item={item} size={size} />;
  if (item.category === "heads") return <HeadPreview item={item} size={size} />;
  if (item.category === "accessories") return <AccessoryPreview item={item} size={size} />;
  if (item.category === "faces") return <FacePreview item={item} size={size} />;
  return <GenericPreview item={item} size={size} />;
}