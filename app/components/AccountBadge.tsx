"use client";

import { getAccountBadge } from "../../lib/badges";
import { isIndevMemberById } from "../../lib/auth";

export default function AccountBadge({
  userId,
  size = 14,
}: {
  userId: string;
  size?: number;
}) {
  const badge = getAccountBadge(userId);
  const isIndev = isIndevMemberById(userId);

  if (!badge && !isIndev) return null;

  return (
    <span className="inline-flex items-center gap-1 ml-1.5 flex-shrink-0">
      {/* ===== OWNER — Gold diamond ===== */}
      {badge === "owner" && (
        <span
          className="inline-block align-middle"
          title="Voxelio Owner"
          aria-label="Voxelio Owner"
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 20 20" width={size} height={size}>
            <polygon
              points="10,0.5 19.5,10 10,19.5 0.5,10"
              fill="#FFD700"
              stroke="#8B6914"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <polygon points="10,4 16,10 10,16 4,10" fill="#FFC107" />
            <circle cx="10" cy="10" r="2.2" fill="#FFFFFF" />
            <circle cx="8.5" cy="8.5" r="0.8" fill="#FFFDE7" />
          </svg>
        </span>
      )}

      {/* ===== ADMIN — Blue shield with star ===== */}
      {badge === "admin" && (
        <span
          className="inline-block align-middle"
          title="Voxelio Admin"
          aria-label="Voxelio Admin"
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 20 20" width={size} height={size}>
            <polygon
              points="10,0.5 19.5,10 10,19.5 0.5,10"
              fill="#3B82F6"
              stroke="#1E3A8A"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <polygon points="10,4 16,10 10,16 4,10" fill="#60A5FA" />
            <text
              x="10"
              y="13.2"
              textAnchor="middle"
              fontSize="8"
              fill="#FFFFFF"
              fontWeight="bold"
            >
              ★
            </text>
          </svg>
        </span>
      )}

      {/* ===== MODERATOR — Green shield with check ===== */}
      {badge === "moderator" && (
        <span
          className="inline-block align-middle"
          title="Voxelio Moderator"
          aria-label="Voxelio Moderator"
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 20 20" width={size} height={size}>
            <polygon
              points="10,0.5 19.5,10 10,19.5 0.5,10"
              fill="#22C55E"
              stroke="#15803D"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <polygon points="10,4 16,10 10,16 4,10" fill="#4ADE80" />
            <text
              x="10"
              y="13.2"
              textAnchor="middle"
              fontSize="8"
              fill="#FFFFFF"
              fontWeight="bold"
            >
              ✓
            </text>
          </svg>
        </span>
      )}

      {/* ===== INDEV CLUB — Purple star ===== */}
      {isIndev && (
        <span
          className="inline-block align-middle"
          title="INDEV Club Member"
          aria-label="INDEV Club Member"
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 20 20" width={size} height={size}>
            <defs>
              <linearGradient id={`indev-grad-${userId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#6C3CE0" />
              </linearGradient>
            </defs>
            <polygon
              points="10,1 12.5,7 19,7.5 14,12 15.5,18.5 10,15 4.5,18.5 6,12 1,7.5 7.5,7"
              fill={`url(#indev-grad-${userId})`}
              stroke="#4A1FA8"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="10" r="1.6" fill="#FFD700" />
          </svg>
        </span>
      )}
    </span>
  );
}