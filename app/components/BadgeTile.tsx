"use client";

import type { ProfileBadge } from "../../lib/badges";

export default function BadgeTile({ badge }: { badge: ProfileBadge }) {
  return (
    <div
      className="relative flex flex-col items-center justify-center gap-1 rounded border-2 bg-white p-3 transition hover:scale-[1.03]"
      style={{ borderColor: badge.color }}
      title={badge.description}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
        style={{ backgroundColor: badge.color + "22" }}
      >
        <span>{badge.emoji}</span>
      </div>
      <p
        className="text-center text-[11px] font-black uppercase tracking-wide"
        style={{ color: badge.color }}
      >
        {badge.name}
      </p>
    </div>
  );
}