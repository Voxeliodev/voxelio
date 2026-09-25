"use client";

import { useMemo, useEffect, useState } from "react";
import * as THREE from "three";

// ============================================================
// VOXELIO SHIRTS
//  - Named shirts: flat decal planes
//  - Community shirts: torso + arms with template textures
// ============================================================

const SHIRT_Z = 0.262;
const SHIRT_W = 0.78;
const SHIRT_H = 0.86;

// ---------- Vox Cooks Tee ----------
function makeVoxCooksTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 1024, 1024);

  ctx.font = "900 110px 'Arial Black', Arial, Helvetica, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";

  ctx.lineWidth = 8;
  ctx.strokeStyle = "#000000";
  ctx.lineJoin = "round";
  ctx.strokeText("Vox", 990, 40);
  ctx.strokeText("Cooks", 990, 170);

  ctx.fillStyle = "#A855F7";
  ctx.fillText("Vox", 990, 40);
  ctx.fillText("Cooks", 990, 170);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------- Business Suit ----------
function makeBusinessSuitTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const W = 1024;
  const H = 1024;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;

  const shirtTopY = 30;
  const shirtBottomY = H;
  const shirtTopHalf = 300;
  const shirtBottomHalf = 190;

  ctx.fillStyle = "#F8F8FA";
  ctx.beginPath();
  ctx.moveTo(cx - shirtTopHalf, shirtTopY);
  ctx.lineTo(cx + shirtTopHalf, shirtTopY);
  ctx.lineTo(cx + shirtBottomHalf, shirtBottomY);
  ctx.lineTo(cx - shirtBottomHalf, shirtBottomY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
  ctx.beginPath();
  ctx.moveTo(cx - shirtTopHalf, shirtTopY);
  ctx.lineTo(cx - shirtTopHalf + 40, shirtTopY);
  ctx.lineTo(cx - shirtBottomHalf + 40, shirtBottomY);
  ctx.lineTo(cx - shirtBottomHalf, shirtBottomY);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + shirtTopHalf, shirtTopY);
  ctx.lineTo(cx + shirtTopHalf - 40, shirtTopY);
  ctx.lineTo(cx + shirtBottomHalf - 40, shirtBottomY);
  ctx.lineTo(cx + shirtBottomHalf, shirtBottomY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#EDEDF2";
  ctx.beginPath();
  ctx.moveTo(cx - 200, shirtTopY - 10);
  ctx.lineTo(cx - 30, shirtTopY + 90);
  ctx.lineTo(cx - 210, shirtTopY + 240);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 200, shirtTopY - 10);
  ctx.lineTo(cx + 30, shirtTopY + 90);
  ctx.lineTo(cx + 210, shirtTopY + 240);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.20)";
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(cx - 30, shirtTopY + 90);
  ctx.lineTo(cx - 210, shirtTopY + 240);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 30, shirtTopY + 90);
  ctx.lineTo(cx + 210, shirtTopY + 240);
  ctx.stroke();

  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.fillRect(cx - 4, shirtTopY + 240, 8, shirtBottomY - shirtTopY - 240);

  ctx.fillStyle = "#D8D8DC";
  for (const by of [720, 810, 900]) {
    ctx.beginPath();
    ctx.arc(cx, by, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  const tieTopY = shirtTopY + 90;
  const tieKnotBottomY = tieTopY + 110;
  const tieWidestY = 640;
  const tiePointY = 760;

  ctx.fillStyle = "#991717";
  ctx.beginPath();
  ctx.moveTo(cx - 55, tieTopY);
  ctx.lineTo(cx + 55, tieTopY);
  ctx.lineTo(cx + 75, tieKnotBottomY);
  ctx.lineTo(cx - 75, tieKnotBottomY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#DC2626";
  ctx.beginPath();
  ctx.moveTo(cx - 75, tieKnotBottomY);
  ctx.lineTo(cx + 75, tieKnotBottomY);
  ctx.lineTo(cx + 110, tieWidestY);
  ctx.lineTo(cx, tiePointY);
  ctx.lineTo(cx - 110, tieWidestY);
  ctx.closePath();
  ctx.fill();

  const highlight = ctx.createLinearGradient(cx - 110, 0, cx + 110, 0);
  highlight.addColorStop(0, "rgba(0, 0, 0, 0.20)");
  highlight.addColorStop(0.5, "rgba(255, 255, 255, 0.18)");
  highlight.addColorStop(1, "rgba(0, 0, 0, 0.20)");

  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.moveTo(cx - 75, tieKnotBottomY);
  ctx.lineTo(cx + 75, tieKnotBottomY);
  ctx.lineTo(cx + 110, tieWidestY);
  ctx.lineTo(cx, tiePointY);
  ctx.lineTo(cx - 110, tieWidestY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#7F1D1D";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx - 75, tieKnotBottomY);
  ctx.lineTo(cx + 75, tieKnotBottomY);
  ctx.lineTo(cx + 110, tieWidestY);
  ctx.lineTo(cx, tiePointY);
  ctx.lineTo(cx - 110, tieWidestY);
  ctx.closePath();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------- I HEART VOX ----------
function makeIHeartVoxTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const W = 1024;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2 - 40;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "900 150px 'Arial Black', Arial, Helvetica, sans-serif";

  const segments = [
    { text: "I", color: "#000000" },
    { text: " HEART", color: "#E11D48" },
    { text: " VOX", color: "#7B2FF7" },
  ];

  const widths = segments.map((s) => ctx.measureText(s.text).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0);

  let x = cx - totalWidth / 2;
  segments.forEach((seg, i) => {
    ctx.fillStyle = seg.color;
    ctx.fillText(seg.text, x, cy);
    x += widths[i];
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------- Router for named shirts ----------
function buildTexture(shirtId: string): THREE.CanvasTexture | null {
  if (shirtId === "shirt-vox-cooks") return makeVoxCooksTexture();
  if (shirtId === "shirt-suit") return makeBusinessSuitTexture();
  if (shirtId === "shirt-i-love-vox") return makeIHeartVoxTexture();
  return null;
}

// ============================================================
// NAMED SHIRT (flat decal overlay)
// ============================================================
export function Shirt3D({
  shirtId,
  skinTone,
}: {
  shirtId: string;
  skinTone?: string;
}) {
  const texture = useMemo(() => buildTexture(shirtId), [shirtId]);
  if (!texture) return null;

  return (
    <mesh position={[0, 0.5, SHIRT_Z]} renderOrder={1}>
      <planeGeometry args={[SHIRT_W, SHIRT_H]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

// ============================================================
// COMMUNITY SHIRT — torso + arms with template textures
// ============================================================
//
// Template layout (labeled 3×3 grid):
//   ┌─────────────┬─────────────┬─────────────┐
//   │ LEFT SLEEVE │ FRONT TORSO │RIGHT SLEEVE │  ← row 0
//   ├─────────────┼─────────────┼─────────────┤
//   │    TOP      │ BACK TORSO  │    TOP      │  ← row 1
//   ├─────────────┼─────────────┼─────────────┤
//   │   BOTTOM    │             │   BOTTOM    │  ← row 2
//   └─────────────┴─────────────┴─────────────┘
//
// Community shirt renders:
//   - Torso box with 6 textured faces
//   - Left arm box (long) with LEFT SLEEVE texture
//   - Right arm box (long) with RIGHT SLEEVE texture
// ============================================================

export function CommunityShirt3D({
  imageUrl,
  torsoSize = [0.9, 1, 0.5],
  torsoPosition = [0, 0.5, 0],
  armSize = [0.3, 1, 0.3],
  armOffsetX = 0.6,
  armOffsetY = 0.5,
}: {
  imageUrl: string;
  torsoSize?: [number, number, number];
  torsoPosition?: [number, number, number];
  armSize?: [number, number, number];
  armOffsetX?: number;
  armOffsetY?: number;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    console.log("🎨 CommunityShirt3D mounting. imageUrl =", imageUrl);

    if (!imageUrl) {
      console.error("❌ CommunityShirt3D got an empty imageUrl");
      setError("No image URL provided");
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      console.log("✅ Image loaded:", imageUrl, "size:", img.width, "x", img.height);

      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      setTexture(tex);
      setError(null);
    };

    img.onerror = (err) => {
      if (cancelled) return;
      console.error("❌ Image failed to load:", imageUrl, err);
      setError("Image failed to load (CORS or 404)");
    };

    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const [w, h, d] = torsoSize;
  const [px, py, pz] = torsoPosition;
  const [aw, ah, ad] = armSize;

  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  // Loading state
  if (!texture) {
    return (
      <group position={[px, py, pz]}>
        <mesh castShadow>
          <boxGeometry args={torsoSize} />
          <meshStandardMaterial
            color={error ? "#dc2626" : "#d1d5db"}
            roughness={0.7}
          />
        </mesh>
      </group>
    );
  }

  const CELL_W = 1 / 3;
  const CELL_H = 1 / 3;
  const INSET_X = 0.10;
  const INSET_TOP = 0.22;
  const INSET_BOT = 0.10;

  function makeFaceTexture(col: 0 | 1 | 2, row: 0 | 1 | 2): THREE.Texture {
    const tex = texture!.clone();
    tex.needsUpdate = true;

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

    return tex;
  }

  const frontTex = makeFaceTexture(1, 1);  // BACK TORSO → front of model
  const backTex = makeFaceTexture(1, 0);   // FRONT TORSO → back of model
  const leftTex = makeFaceTexture(0, 0);   // LEFT SLEEVE
  const rightTex = makeFaceTexture(2, 0);  // RIGHT SLEEVE
  const topTex = makeFaceTexture(0, 1);
  const bottomTex = makeFaceTexture(0, 2);

  return (
    <group position={[px, py, pz]}>
      {/* ===== TORSO ===== */}
      <mesh castShadow>
        <boxGeometry args={torsoSize} />
        <meshStandardMaterial color="#111111" roughness={0.9} />
      </mesh>

      <mesh position={[0, 0, hd + 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={frontTex} roughness={0.7} />
      </mesh>

      <mesh position={[0, 0, -hd - 0.002]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={backTex} roughness={0.7} />
      </mesh>

      <mesh position={[hw + 0.002, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial map={rightTex} roughness={0.7} />
      </mesh>

      <mesh position={[-hw - 0.002, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial map={leftTex} roughness={0.7} />
      </mesh>

      <mesh position={[0, hh + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={topTex} roughness={0.7} />
      </mesh>

      <mesh position={[0, -hh - 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={bottomTex} roughness={0.7} />
      </mesh>

      {/* ===== LEFT ARM (upper portion, sleeve texture) ===== */}
      <group position={[-armOffsetX, armOffsetY - hh, 0]}>
        <mesh castShadow>
          <boxGeometry args={[aw, ah, ad]} />
          <meshStandardMaterial map={leftTex} roughness={0.7} />
        </mesh>
      </group>

      {/* ===== RIGHT ARM (upper portion, sleeve texture) ===== */}
      <group position={[armOffsetX, armOffsetY - hh, 0]}>
        <mesh castShadow>
          <boxGeometry args={[aw, ah, ad]} />
          <meshStandardMaterial map={rightTex} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}