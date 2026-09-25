"use client";

import { useMemo, useEffect, useState } from "react";
import * as THREE from "three";

// ============================================================
// VOXELIO SHIRTS
//  - Named shirts (Vox Cooks, Suit, I Heart Vox): flat decal planes
//  - Community shirts (labeled 3×3 templates): UV-mapped torso box
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
// NAMED SHIRT (existing flat decal behaviour)
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
// COMMUNITY SHIRT — labeled 3×3 template
// ============================================================

const TEMPLATE_W = 1250;
const TEMPLATE_H = 1250;

function rectToUV(
  x: number,
  y: number,
  w: number,
  h: number
): { u0: number; v0: number; u1: number; v1: number } {
  const u0 = x / TEMPLATE_W;
  const u1 = (x + w) / TEMPLATE_W;
  const v0 = 1 - (y + h) / TEMPLATE_H;
  const v1 = 1 - y / TEMPLATE_H;
  return { u0, v0, u1, v1 };
}

const CELL = 1250 / 3;
const LABEL_OFFSET_Y = 60;
const BORDER = 15;

function cellRegion(col: 0 | 1 | 2, row: 0 | 1 | 2) {
  const x = col * CELL + BORDER;
  const y = row * CELL + LABEL_OFFSET_Y;
  const w = CELL - BORDER * 2;
  const h = CELL - LABEL_OFFSET_Y - BORDER;
  return rectToUV(x, y, w, h);
}

const REGIONS = {
  front: cellRegion(1, 1), // BACK TORSO cell → front of 3D model
  back: cellRegion(1, 0),  // FRONT TORSO cell → back of 3D model
  left: cellRegion(0, 0),
  right: cellRegion(2, 0),
  top: cellRegion(0, 1),
  bottom: cellRegion(0, 2),
};

type UVRect = { u0: number; v0: number; u1: number; v1: number };

function buildBoxUVs(regions: {
  right: UVRect;
  left: UVRect;
  top: UVRect;
  bottom: UVRect;
  front: UVRect;
  back: UVRect;
}): Float32Array {
  const uvs = new Float32Array(24 * 2);

  const setFace = (faceIndex: number, r: UVRect) => {
    const base = faceIndex * 8;
    uvs[base + 0] = r.u0; uvs[base + 1] = r.v0;
    uvs[base + 2] = r.u1; uvs[base + 3] = r.v0;
    uvs[base + 4] = r.u0; uvs[base + 5] = r.v1;
    uvs[base + 6] = r.u1; uvs[base + 7] = r.v1;
  };

  setFace(0, regions.right);
  setFace(1, regions.left);
  setFace(2, regions.top);
  setFace(3, regions.bottom);
  setFace(4, regions.front);
  setFace(5, regions.back);

  return uvs;
}

export function CommunityShirt3D({
  imageUrl,
  torsoSize = [0.9, 1, 0.5],
  torsoPosition = [0, 0.5, 0],
}: {
  imageUrl: string;
  torsoSize?: [number, number, number];
  torsoPosition?: [number, number, number];
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;

    // 🔍 DEBUG: confirm the component is mounting and what URL it's loading
    console.log("🎨 CommunityShirt3D mounting. imageUrl =", imageUrl);

    if (!imageUrl) {
      console.error("❌ CommunityShirt3D got an empty imageUrl");
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
    };

    img.onerror = (err) => {
      console.error("❌ Image failed to load:", imageUrl, err);
    };

    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(...torsoSize);
    const uvs = buildBoxUVs(REGIONS);
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.attributes.uv.needsUpdate = true;
    return geo;
  }, [torsoSize[0], torsoSize[1], torsoSize[2]]);

  return (
    <mesh geometry={geometry} position={torsoPosition} castShadow>
      <meshStandardMaterial
        map={texture || undefined}
        color={texture ? "#ffffff" : "#d1d5db"}
        roughness={0.7}
      />
    </mesh>
  );
}