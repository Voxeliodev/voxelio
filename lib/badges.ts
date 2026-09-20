// ============================================================
// VOXELIO BADGES — Who gets what badge
// ============================================================
//
// Badges are assigned by USERNAME for account roles (owner/admin/mod)
// and auto-awarded based on user data for milestone badges.
//
// CHANGING THE OWNER:
//   Change OWNER_USERNAME. Save. Refresh.
//
// PROMOTING SOMEONE:
//   Add their username to ADMIN_USERNAMES or MODERATOR_USERNAMES.
//   Case-insensitive. Example: ["CrazyVox", "AnotherUser"]
//
// DEMOTING SOMEONE:
//   Remove their username from the list. Save. Refresh.
// ------------------------------------------------------------

export const OWNER_USERNAME = "voxelio";
export const ADMIN_USERNAMES: string[] = ["CrazyVox"];
export const MODERATOR_USERNAMES: string[] = ["Testerrdw"];

// Kept for backwards compatibility in case something still imports it.
export const OWNER_ID: string = OWNER_USERNAME;

export type BadgeType = "owner" | "admin" | "moderator" | null;

export function getAccountBadge(username: string | null | undefined): BadgeType {
  if (!username) return null;
  const lower = username.toLowerCase();
  if (lower === OWNER_USERNAME.toLowerCase()) return "owner";
  if (ADMIN_USERNAMES.map((u) => u.toLowerCase()).includes(lower)) return "admin";
  if (MODERATOR_USERNAMES.map((u) => u.toLowerCase()).includes(lower)) return "moderator";
  return null;
}

export function isOwnerAccount(username: string | null | undefined): boolean {
  return getAccountBadge(username) === "owner";
}

export function isAdminAccount(username: string | null | undefined): boolean {
  return getAccountBadge(username) === "admin";
}

export function isModeratorAccount(username: string | null | undefined): boolean {
  return getAccountBadge(username) === "moderator";
}

// Handy: get a human-readable label for the badge
export function getBadgeLabel(username: string | null | undefined): string | null {
  const badge = getAccountBadge(username);
  if (badge === "owner") return "Voxelio Owner";
  if (badge === "admin") return "Voxelio Admin";
  if (badge === "moderator") return "Voxelio Moderator";
  return null;
}

// ============================================================
// PROFILE BADGES — the full list a user has earned
// ============================================================

export type ProfileBadge = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string; // hex, used for the tile's accent
};

// Minimal shape we need from a User — avoids importing the full type
// (prevents a circular import with lib/auth.ts)
type BadgeUser = {
  username?: string | null;
  displayId?: number | null;
  joined?: string;
  voxbux?: number;
  ownedItems?: string[];
  indevClub?: { expiresAt: number } | null;
};

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function parseJoined(joined?: string): number | null {
  if (!joined) return null;
  const t = new Date(joined).getTime();
  return isNaN(t) ? null : t;
}

export function getUserBadges(user: BadgeUser | null | undefined): ProfileBadge[] {
  if (!user) return [];

  const badges: ProfileBadge[] = [];
  const role = getAccountBadge(user.username);

  // ---- Role badges ----
  if (role === "owner") {
    badges.push({
      id: "owner",
      name: "Owner",
      emoji: "👑",
      description: "Created and runs Voxelio.",
      color: "#FFD700",
    });
  }
  if (role === "admin") {
    badges.push({
      id: "admin",
      name: "Admin",
      emoji: "🛡️",
      description: "Has full administrative access.",
      color: "#3B82F6",
    });
  }
  if (role === "moderator") {
    badges.push({
      id: "moderator",
      name: "Moderator",
      emoji: "✅",
      description: "Helps keep Voxelio safe.",
      color: "#22C55E",
    });
  }

  // ---- INDEV Club ----
  if (user.indevClub && user.indevClub.expiresAt > Date.now()) {
    badges.push({
      id: "indev",
      name: "INDEV Club",
      emoji: "💎",
      description: "Active INDEV Club member.",
      color: "#A855F7",
    });
  }

  // ---- Rich ----
  if ((user.voxbux ?? 0) >= 1_000_000) {
    badges.push({
      id: "rich",
      name: "Rich",
      emoji: "🏆",
      description: "Has over 1,000,000 Voxbux.",
      color: "#F59E0B",
    });
  }

  // ---- Collector ----
  if ((user.ownedItems?.length ?? 0) >= 5) {
    badges.push({
      id: "collector",
      name: "Collector",
      emoji: "🧢",
      description: "Owns 5 or more items.",
      color: "#EC4899",
    });
  }

  // ---- Veteran ----
  const joined = parseJoined(user.joined);
  if (joined && Date.now() - joined >= ONE_YEAR_MS) {
    badges.push({
      id: "veteran",
      name: "Veteran",
      emoji: "⭐",
      description: "Has been on Voxelio for over a year.",
      color: "#00E5FF",
    });
  }

  // ---- Early User ----
  if (typeof user.displayId === "number" && user.displayId > 0 && user.displayId <= 100) {
    badges.push({
      id: "early",
      name: "Early User",
      emoji: "🎉",
      description: "Joined among the first 100 accounts.",
      color: "#8B5CF6",
    });
  }

  return badges;
}