"use client";

import type { AvatarConfig } from "../../lib/auth";

function shade(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

export default function Avatar2D({
  config,
  size = 200,
}: {
  config: AvatarConfig;
  size?: number;
}) {
  const dx = 10;
  const dy = 8;

  const skin = config.skinTone;
  const skinTop = shade(skin, 22);
  const skinSide = shade(skin, -26);

  const shirt = config.shirtColor;
  const shirtTop = shade(shirt, 22);
  const shirtSide = shade(shirt, -26);

  const pants = config.pantsColor;
  const pantsTop = shade(pants, 22);
  const pantsSide = shade(pants, -26);

  const shoe = shade(config.pantsColor, -15);
  const shoeTop = shade(shoe, 22);
  const shoeSide = shade(shoe, -26);

  const eyeColor = "#1A1A2E";
  const mouthColor = "#1A1A2E";
  const line = "#1A1A2E";

  const Box = ({
    x, y, w, h,
    front, top, side,
  }: {
    x: number; y: number; w: number; h: number;
    front: string; top: string; side: string;
  }) => (
    <g>
      <polygon
        points={`${x},${y} ${x + dx},${y - dy} ${x + w + dx},${y - dy} ${x + w},${y}`}
        fill={top}
        stroke={line}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <polygon
        points={`${x + w},${y} ${x + w + dx},${y - dy} ${x + w + dx},${y + h - dy} ${x + w},${y + h}`}
        fill={side}
        stroke={line}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={front}
        stroke={line}
        strokeWidth={1.4}
      />
    </g>
  );

  const headX = 60, headY = 30, headW = 80, headH = 80;
  const torsoX = 72, torsoY = 118, torsoW = 56, torsoH = 78;
  const armW = 18, armH = 74;
  const armY = 120;
  const leftArmX = 50;
  const rightArmX = 132;
  const legW = 24, legH = 62;
  const legY = 200;
  const leftLegX = 74;
  const rightLegX = 102;
  const footW = 34, footH = 14;
  const footY = 262;
  const leftFootX = 70;
  const rightFootX = 98;

  return (
    <svg
      width={size}
      height={size * 1.45}
      viewBox="0 0 220 320"
      style={{ display: "block", overflow: "visible" }}
    >
      <ellipse cx="105" cy="290" rx="58" ry="6" fill="rgba(0,0,0,0.22)" />

      <Box x={leftLegX}  y={legY} w={legW} h={legH} front={pants} top={pantsTop} side={pantsSide} />
      <Box x={rightLegX} y={legY} w={legW} h={legH} front={pants} top={pantsTop} side={pantsSide} />

      <Box x={leftFootX}  y={footY} w={footW} h={footH} front={shoe} top={shoeTop} side={shoeSide} />
      <Box x={rightFootX} y={footY} w={footW} h={footH} front={shoe} top={shoeTop} side={shoeSide} />

      <Box x={torsoX} y={torsoY} w={torsoW} h={torsoH} front={shirt} top={shirtTop} side={shirtSide} />

      <Box x={leftArmX}  y={armY} w={armW} h={armH} front={shirt} top={shirtTop} side={shirtSide} />
      <Box x={rightArmX} y={armY} w={armW} h={armH} front={shirt} top={shirtTop} side={shirtSide} />

      <Box x={leftArmX}  y={armY + armH} w={armW} h={14} front={skin} top={skinTop} side={skinSide} />
      <Box x={rightArmX} y={armY + armH} w={armW} h={14} front={skin} top={skinTop} side={skinSide} />

      <Box x={headX} y={headY} w={headW} h={headH} front={skin} top={skinTop} side={skinSide} />

      <rect
        x={headX + headW / 2 - 22}
        y={headY + headH / 2 - 6}
        width={9}
        height={12}
        fill={eyeColor}
        rx="1"
      />
      <rect
        x={headX + headW / 2 + 13}
        y={headY + headH / 2 - 6}
        width={9}
        height={12}
        fill={eyeColor}
        rx="1"
      />
      <rect
        x={headX + headW / 2 - 12}
        y={headY + headH / 2 + 22}
        width={24}
        height={4}
        fill={mouthColor}
        rx="1"
      />
    </svg>
  );
}