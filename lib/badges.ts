// ============================================================
// VOXELIO BADGES — Who gets what badge
// ============================================================
//
// Badges are assigned by USERNAME now (accounts use UUIDs internally,
// but usernames are stable and readable).
//
// CHANGING THE OWNER:
//   Change OWNER_USERNAME. Save. Refresh.
//
// PROMOTING SOMEONE:
//   Add their username to ADMIN_USERNAMES or MODERATOR_USERNAMES.

export const OWNER_USERNAME = "voxelio";
export const ADMIN_USERNAMES: string[] = [];
export const MODERATOR_USERNAMES: string[] = [];

// Kept for compatibility in case any code still imports it.
// Not used for badge logic anymore.
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

export function getBadgeLabel(username: string | null | undefined): string | null {
  const badge = getAccountBadge(username);
  if (badge === "owner") return "Voxelio Owner";
  if (badge === "admin") return "Voxelio Admin";
  if (badge === "moderator") return "Voxelio Moderator";
  return null;
}