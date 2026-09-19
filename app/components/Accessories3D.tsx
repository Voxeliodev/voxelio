"use client";

// ============================================================
// VOXELIO 3D ACCESSORIES — Held / worn items
// ============================================================

// ---------- Vox Sword ----------
// A classic voxel sword. The handle sits at y=0 (where the
// character's right hand is), and the blade rises upward.
function VoxSword() {
  return (
    <group>
      {/* ==== HANDLE ==== */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.24, 0.06]} />
        <meshStandardMaterial color="#5A3818" roughness={0.9} />
      </mesh>

      {/* Handle wrap detail (dark bands) */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[0.065, 0.02, 0.065]} />
        <meshStandardMaterial color="#2A1810" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.065, 0.02, 0.065]} />
        <meshStandardMaterial color="#2A1810" roughness={0.9} />
      </mesh>

      {/* ==== POMMEL ==== */}
      <mesh position={[0, -0.16, 0]} castShadow>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#FFD700" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* ==== GUARD (crosspiece) ==== */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.42, 0.06, 0.11]} />
        <meshStandardMaterial color="#3A1580" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Guard end caps (little gold tips) */}
      <mesh position={[-0.22, 0.15, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#FFD700" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0.22, 0.15, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#FFD700" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* ==== BLADE ==== */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.11, 0.85, 0.045]} />
        <meshStandardMaterial color="#C5C8D6" metalness={0.85} roughness={0.22} />
      </mesh>

      {/* Blade bright edge (left) */}
      <mesh position={[-0.055, 0.6, 0]}>
        <boxGeometry args={[0.006, 0.85, 0.046]} />
        <meshStandardMaterial color="#FFFFFF" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Blade bright edge (right) */}
      <mesh position={[0.055, 0.6, 0]}>
        <boxGeometry args={[0.006, 0.85, 0.046]} />
        <meshStandardMaterial color="#FFFFFF" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Blade center groove */}
      <mesh position={[0, 0.6, 0.024]}>
        <boxGeometry args={[0.022, 0.83, 0.002]} />
        <meshStandardMaterial color="#7A7E8C" />
      </mesh>

      {/* ==== TIP ==== */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <coneGeometry args={[0.078, 0.14, 4]} />
        <meshStandardMaterial color="#C5C8D6" metalness={0.85} roughness={0.22} />
      </mesh>
    </group>
  );
}

// ---------- Router ----------
export function Accessory3DGeometry({ accessoryId }: { accessoryId: string }) {
  if (accessoryId === "accessory-vox-sword") return <VoxSword />;
  return null;
}

// ---------- Public API ----------
// Accessories are attached to the character's right hand area.
// The character group is at [0, -0.6, 0] and the right hand is
// at [0.6, -0.15, 0] within that group.
export function Accessory3D({ accessoryId }: { accessoryId: string }) {
  if (!accessoryId) return null;

  return (
    <group position={[0.6, -0.15, 0]} rotation={[0, 0, 0.15]}>
      <Accessory3DGeometry accessoryId={accessoryId} />
    </group>
  );
}