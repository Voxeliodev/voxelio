"use client";

import { useMemo, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import { getItem, type Item } from "../../lib/items";

function ModelBackAccessory({ item }: { item: Item }) {
  if (!item.modelPath) return null;
  const gltf = useGLTF(item.modelPath);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const scale = item.modelScale ?? 1;
  const offset = item.modelOffset ?? [0, 0, 0];
  const rotation = item.modelRotation ?? [0, 0, 0];

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

export function BackAccessory3DGeometry({ backAccessoryId }: { backAccessoryId: string }) {
  const item = getItem(backAccessoryId);
  if (!item) return null;

  if (item.modelPath) {
    return (
      <Suspense fallback={null}>
        <ModelBackAccessory item={item} />
      </Suspense>
    );
  }

  return null;
}

export function BackAccessory3D({ backAccessoryId }: { backAccessoryId: string }) {
  if (!backAccessoryId) return null;

  return (
    <group position={[0, 0.5, -0.28]}> 
      <BackAccessory3DGeometry backAccessoryId={backAccessoryId} />
    </group>
  );
}