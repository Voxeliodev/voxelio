// ============================================================
// VOXELIO BADGES — Who gets what badge
// ============================================================
//
// This is the ONLY file you need to edit to manage badges.
//
// HOW IT WORKS:
//   Badges are assigned by ACCOUNT ID (a number as a string).
//   You can find a user's ID on their profile page under their name,
//   or in the debug panel on the signin page.
//
// EXAMPLES:
//   const OWNER_ID      = "1";              // Account #1 is the owner
//   const ADMIN_IDS     = ["2", "5", "9"];  // Accounts #2, #5, #9 are admins
//   const MODERATOR_IDS = ["3", "7"];       // Accounts #3, #7 are moderators
//
// CHANGING THE OWNER:
//   Just change OWNER_ID to a different number. Save the file. Refresh.
//   The new owner gets the gold diamond; the old one loses it.
//
// PROMOTING SOMEONE:
//   Add their ID to ADMIN_IDS or MODERATOR_IDS. Save. Refresh.
//
// DEMOTING SOMEONE:
//   Remove their ID from the list. Save. Refresh.
// ------------------------------------------------------------

export const OWNER_ID: string = "1";
export const ADMIN_IDS: string[] = ["2"];
export const MODERATOR_IDS: string[] = [];

export type BadgeType = "owner" | "admin" | "moderator" | null;

export function getAccountBadge(userId: string): BadgeType {
  if (!userId) return null;
  if (userId === OWNER_ID) return "owner";
  if (ADMIN_IDS.includes(userId)) return "admin";
  if (MODERATOR_IDS.includes(userId)) return "moderator";
  return null;
}

export function isOwnerAccount(userId: string): boolean {
  return getAccountBadge(userId) === "owner";
}

export function isAdminAccount(userId: string): boolean {
  return getAccountBadge(userId) === "admin";
}

export function isModeratorAccount(userId: string): boolean {
  return getAccountBadge(userId) === "moderator";
}

// Handy: get a human-readable label for the badge
export function getBadgeLabel(userId: string): string | null {
  const badge = getAccountBadge(userId);
  if (badge === "owner") return "Voxelio Owner";
  if (badge === "admin") return "Voxelio Admin";
  if (badge === "moderator") return "Voxelio Moderator";
  return null;
}