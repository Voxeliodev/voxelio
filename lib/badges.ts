// ============================================================
// VOXELIO BADGES — Who gets what badge
// ============================================================
//
// Badges are assigned by USERNAME. Accounts use UUIDs internally,
// but usernames are stable and readable.
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
export const MODERATOR_USERNAMES: string[] = [];

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