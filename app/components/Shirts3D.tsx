"use client";

import { useMemo } from "react";
import * as THREE from "three";

// ============================================================
// VOXELIO SHIRTS — Front-of-torso text/design overlay
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

  // ============================================================
  // 1. DRESS SHIRT BODY — tapered trapezoid from top edge to
  //    bottom edge of the plane.
  // ============================================================
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

  // Side shading near the edges
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

  // ============================================================
  // 2. COLLAR — two angled flaps meeting at the top center
  // ============================================================
  ctx.fillStyle = "#EDEDF2";
  ctx.beginPath();
  ctx.moveTo(cx - 200, shirtTopY - 10);   // outer top
  ctx.lineTo(cx - 30, shirtTopY + 90);    // inner point
  ctx.lineTo(cx - 210, shirtTopY + 240);  // outer bottom
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 200, shirtTopY - 10);
  ctx.lineTo(cx + 30, shirtTopY + 90);
  ctx.lineTo(cx + 210, shirtTopY + 240);
  ctx.closePath();
  ctx.fill();

  // Collar shadows
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

  // ============================================================
  // 3. BUTTON PLACKET — from the collar down to the bottom edge
  // ============================================================
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.fillRect(cx - 4, shirtTopY + 240, 8, shirtBottomY - shirtTopY - 240);

  // Buttons below the tie
  ctx.fillStyle = "#D8D8DC";
  for (const by of [720, 810, 900]) {
    ctx.beginPath();
    ctx.arc(cx, by, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // ============================================================
  // 4. TIE — knot at the collar, body widens, sharp V point
  // ============================================================
  const tieTopY = shirtTopY + 90;
  const tieKnotBottomY = tieTopY + 110;
  const tieWidestY = 640;
  const tiePointY = 760;

  // Knot
  ctx.fillStyle = "#991717";
  ctx.beginPath();
  ctx.moveTo(cx - 55, tieTopY);
  ctx.lineTo(cx + 55, tieTopY);
  ctx.lineTo(cx + 75, tieKnotBottomY);
  ctx.lineTo(cx - 75, tieKnotBottomY);
  ctx.closePath();
  ctx.fill();

  // Body
  ctx.fillStyle = "#DC2626";
  ctx.beginPath();
  ctx.moveTo(cx - 75, tieKnotBottomY);
  ctx.lineTo(cx + 75, tieKnotBottomY);
  ctx.lineTo(cx + 110, tieWidestY);
  ctx.lineTo(cx, tiePointY);
  ctx.lineTo(cx - 110, tieWidestY);
  ctx.closePath();
  ctx.fill();

  // Highlight gradient
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

  // Tie outline
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

// ---------- Router ----------
function buildTexture(shirtId: string): THREE.CanvasTexture | null {
  if (shirtId === "shirt-vox-cooks") return makeVoxCooksTexture();
  if (shirtId === "shirt-suit") return makeBusinessSuitTexture();
  return null;
}

export function Shirt3D({
  shirtId,
  skinTone,
}: {
  shirtId: string;
  skinTone?: string;
}) {
  // `skinTone` is accepted for forward-compatibility but currently unused.
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