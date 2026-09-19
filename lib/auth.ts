"use client";

import { supabase } from "./supabase";
import { OWNER_ID } from "./badges";
import { filterMessage } from "./chatFilter";
import { DEFAULT_BODY_PARTS, type BodyPartSlot } from "./bodyParts";

export type BodyPartColors = {
  head?: string; torso?: string; leftArm?: string; rightArm?: string;
  leftLeg?: string; rightLeg?: string;
};

export type AvatarConfig = {
  skinTone: string; shirtColor: string; pantsColor: string; hat: string; shirt: string;
  bodyParts: Record<BodyPartSlot, string>; partColors: BodyPartColors;
};

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinTone: "#F5C6A5", shirtColor: "#7B2FF7", pantsColor: "#1A1A2E",
  hat: "", shirt: "", bodyParts: { ...DEFAULT_BODY_PARTS }, partColors: {},
};

export const DEFAULT_VOXBUX = 0;

export type IndevTier = "monthly" | "yearly";
export type IndevClub = { tier: IndevTier; startedAt: number; expiresAt: number };

export const INDEV_PRICING: Record<IndevTier, { name: string; price: number; durationMs: number; stipend: number; description: string }> = {
  monthly: { name: "Monthly", price: 1000, durationMs: 30*24*60*60*1000, stipend: 500, description: "30 days of membership" },
  yearly: { name: "Yearly", price: 10000, durationMs: 365*24*60*60*1000, stipend: 6000, description: "365 days of membership — best value" },
};

export type User = {
  id: string; username: string; email: string; passwordHash: string; birthday: string;
  joined: string; status: "online" | "offline"; bio: string; avatar: string;
  avatarConfig: AvatarConfig; friends: number; friendIds: string[];
  incomingRequests: string[]; outgoingRequests: string[]; voxbux: number;
  ownedItems: string[]; bannedUntil?: number | null; banReason?: string;
  indevClub?: IndevClub | null;
};

export type Message = {
  id: string; fromId: string; toId: string; text: string; sentAt: number; read: boolean;
};

// ============================================================
// CACHE
// ============================================================
let usersCache: User[] = [];
let currentUserCache: User | null = null;
let hydrated = false;
const listeners = new Set<() => void>();
function notify() { for (const fn of listeners) fn(); }

export function subscribeAuth(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function hydrateAuth(): Promise<void> {
  if (typeof window === "undefined" || hydrated) return;

  const { data: { session } } = await supabase.auth.getSession();
  const { data: profiles, error } = await supabase.from("profiles").select("*");
  if (!error && profiles) usersCache = profiles.map(rowToUser);

  if (session?.user) {
    currentUserCache = usersCache.find((u) => u.id === session.user.id) || null;
  }

  hydrated = true;
  notify();

  supabase.auth.onAuthStateChange((_e, session) => {
    currentUserCache = session?.user
      ? usersCache.find((u) => u.id === session.user.id) || null
      : null;
    notify();
  });
}

// ============================================================
// ROW CONVERSION
// ============================================================
function normalizeAvatarConfig(raw: any): AvatarConfig {
  const bodyParts = { ...DEFAULT_BODY_PARTS };
  if (raw?.bodyParts && typeof raw.bodyParts === "object") {
    for (const slot of Object.keys(DEFAULT_BODY_PARTS) as BodyPartSlot[]) {
      if (typeof raw.bodyParts[slot] === "string" && raw.bodyParts[slot].length > 0) bodyParts[slot] = raw.bodyParts[slot];
    }
  }
  const partColors: BodyPartColors = {};
  if (raw?.partColors && typeof raw.partColors === "object") {
    for (const slot of Object.keys(DEFAULT_BODY_PARTS) as BodyPartSlot[]) {
      if (typeof raw.partColors[slot] === "string" && raw.partColors[slot].length > 0) partColors[slot] = raw.partColors[slot];
    }
  }
  return {
    skinTone: raw?.skinTone || DEFAULT_AVATAR_CONFIG.skinTone,
    shirtColor: raw?.shirtColor || DEFAULT_AVATAR_CONFIG.shirtColor,
    pantsColor: raw?.pantsColor || DEFAULT_AVATAR_CONFIG.pantsColor,
    hat: raw?.hat || "", shirt: raw?.shirt || "",
    bodyParts, partColors,
  };
}

function rowToUser(row: any): User {
  const d = row.data || {};
  const friendIds = Array.isArray(d.friendIds) ? d.friendIds : [];
  return {
    id: row.id, username: row.username, email: row.email, passwordHash: "",
    birthday: d.birthday || "", joined: d.joined || "",
    status: d.status === "online" ? "online" : "offline",
    bio: d.bio || "New Voxelio member!", avatar: d.avatar || "🎨",
    avatarConfig: normalizeAvatarConfig(d.avatarConfig),
    friends: friendIds.length, friendIds,
    incomingRequests: Array.isArray(d.incomingRequests) ? d.incomingRequests : [],
    outgoingRequests: Array.isArray(d.outgoingRequests) ? d.outgoingRequests : [],
    voxbux: typeof d.voxbux === "number" ? d.voxbux : DEFAULT_VOXBUX,
    ownedItems: Array.isArray(d.ownedItems) ? d.ownedItems : [],
    bannedUntil: typeof d.bannedUntil === "number" ? d.bannedUntil : null,
    banReason: typeof d.banReason === "string" ? d.banReason : undefined,
    indevClub: d.indevClub && typeof d.indevClub === "object" ? d.indevClub : null,
  };
}

function userToRow(u: User) {
  return {
    id: u.id, username: u.username, email: u.email,
    data: {
      birthday: u.birthday, joined: u.joined, status: u.status, bio: u.bio,
      avatar: u.avatar, avatarConfig: u.avatarConfig,
      friendIds: u.friendIds, incomingRequests: u.incomingRequests,
      outgoingRequests: u.outgoingRequests, voxbux: u.voxbux,
      ownedItems: u.ownedItems, bannedUntil: u.bannedUntil,
      banReason: u.banReason, indevClub: u.indevClub,
    },
  };
}

// ============================================================
// INDEV / BAN HELPERS
// ============================================================
export function isIndevMember(user: User | null | undefined): boolean {
  if (!user || !user.indevClub) return false;
  return user.indevClub.expiresAt > Date.now();
}
export function isIndevMemberById(userId: string): boolean {
  return isIndevMember(findUserById(userId));
}
export function getIndevDaysRemaining(user: User): number {
  if (!isIndevMember(user) || !user.indevClub) return 0;
  return Math.max(0, Math.ceil((user.indevClub.expiresAt - Date.now()) / (24*60*60*1000)));
}
export function isUserBanned(user: User | null | undefined): boolean {
  if (!user || !user.bannedUntil) return false;
  if (user.bannedUntil === -1) return true;
  return user.bannedUntil > Date.now();
}
export function getBanStatusLabel(user: User): { text: string; tone: "ok" | "warn" | "danger" } {
  if (!isUserBanned(user)) return { text: "Active", tone: "ok" };
  if (user.bannedUntil === -1) return { text: "Permanently banned", tone: "danger" };
  return { text: `Banned until ${new Date(user.bannedUntil!).toLocaleString()}`, tone: "warn" };
}

// ============================================================
// READ
// ============================================================
export function getUsers(): User[] {
  return usersCache.map((u) => ({ ...u, friends: u.friendIds.length }));
}
export function findUserByUsername(username: string): User | undefined {
  return getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
}
export function findUserByEmail(email: string): User | undefined {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}
export function findUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}
export function findUserByUsernameOrId(query: string): User | undefined {
  const q = query.trim(); if (!q) return undefined;
  return findUserById(q) || findUserByUsername(q);
}
export function isUsernameTaken(username: string): boolean {
  if (!username) return false;
  return getUsers().some((u) => u.username.toLowerCase() === username.toLowerCase());
}
export function isEmailTaken(email: string): boolean {
  if (!email) return false;
  return getUsers().some((u) => u.email.toLowerCase() === email.toLowerCase());
}
export function getUsedUsernames(): string[] { return getUsers().map((u) => u.username.toLowerCase()); }
export function getUsedEmails(): string[] { return getUsers().map((u) => u.email.toLowerCase()); }

// ============================================================
// WRITE (fire-and-forget)
// ============================================================
export function updateUser(updatedUser: User): void {
  const idx = usersCache.findIndex((u) => u.id === updatedUser.id);
  if (idx >= 0) usersCache[idx] = updatedUser; else usersCache.push(updatedUser);
  if (currentUserCache?.id === updatedUser.id) currentUserCache = updatedUser;
  void supabase.from("profiles").upsert(userToRow(updatedUser));
  notify();
}
export function saveUsers(users: User[]): void {
  usersCache = users;
  void supabase.from("profiles").upsert(users.map(userToRow));
  notify();
}

// ============================================================
// CREATE / LOGIN / SIGNOUT (async now!)
// ============================================================
export async function createUser(data: { username: string; email: string; password: string; birthday: string }):
  Promise<{ success: boolean; error?: string; user?: User }> {
  if (isUsernameTaken(data.username)) return { success: false, error: "That username is already taken." };
  if (isEmailTaken(data.email)) return { success: false, error: "An account with that email already exists." };

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email, password: data.password,
  });
  if (authError) return { success: false, error: authError.message };
  if (!authData.user) return { success: false, error: "Signup failed. Please try again." };

  const avatars = ["🎨","🚀","🏎️","👻","⚔️","🏝️","🎢","🧟","🍕","🚁","🏗️","🐉"];
  const newUser: User = {
    id: authData.user.id, username: data.username, email: data.email,
    passwordHash: "", birthday: data.birthday,
    joined: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    status: "online", bio: "New Voxelio member!",
    avatar: avatars[Math.floor(Math.random() * avatars.length)],
    avatarConfig: { ...DEFAULT_AVATAR_CONFIG, bodyParts: { ...DEFAULT_BODY_PARTS }, partColors: {} },
    friends: 0, friendIds: [], incomingRequests: [], outgoingRequests: [],
    voxbux: DEFAULT_VOXBUX, ownedItems: [], bannedUntil: null, indevClub: null,
  };

  const { error: insertError } = await supabase.from("profiles").insert(userToRow(newUser));
  if (insertError) return { success: false, error: insertError.message };

  usersCache.push(newUser);
  currentUserCache = newUser;
  notify();
  return { success: true, user: newUser };
}

export async function verifyLogin(username: string, password: string):
  Promise<{ success: boolean; error?: string; user?: User }> {
  const user = findUserByUsername(username);
  if (!user) return { success: false, error: "No account found with that username." };
  if (isUserBanned(user)) {
    if (user.bannedUntil === -1) return { success: false, error: `This account has been permanently banned.${user.banReason ? " Reason: " + user.banReason : ""}` };
    return { success: false, error: `This account is banned until ${new Date(user.bannedUntil!).toLocaleString()}.` };
  }

  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (error) return { success: false, error: "Incorrect password. Please try again." };

  const updated = { ...user, status: "online" as const };
  updateUser(updated);
  currentUserCache = updated;
  notify();
  return { success: true, user: updated };
}

export function getCurrentUser(): User | null {
  if (!currentUserCache) return null;
  const fresh = usersCache.find((u) => u.id === currentUserCache!.id);
  if (!fresh || isUserBanned(fresh)) return null;
  return fresh;
}
export function setCurrentUser(user: User | null): void { currentUserCache = user; notify(); }
export async function signOut(): Promise<void> {
  const c = getCurrentUser();
  if (c) updateUser({ ...c, status: "offline" });
  await supabase.auth.signOut();
  currentUserCache = null;
  notify();
}

// ============================================================
// SHOP / INDEV
// ============================================================
export function ownsItem(userId: string, itemId: string): boolean {
  return findUserById(userId)?.ownedItems.includes(itemId) || false;
}
export function buyItem(userId: string, itemId: string, price: number): { success: boolean; error?: string; newBalance?: number } {
  const user = findUserById(userId);
  if (!user) return { success: false, error: "You must be signed in." };
  if (isUserBanned(user)) return { success: false, error: "This account is banned." };
  if (user.ownedItems.includes(itemId)) return { success: false, error: "You already own this item." };
  if (user.voxbux < price) return { success: false, error: `Not enough Voxbux. You need ${price - user.voxbux} more.` };
  const updated: User = { ...user, voxbux: user.voxbux - price, ownedItems: [...user.ownedItems, itemId] };
  updateUser(updated);
  return { success: true, newBalance: updated.voxbux };
}
export function subscribeIndev(userId: string, tier: IndevTier): { success: boolean; error?: string; newBalance?: number; expiresAt?: number } {
  const user = findUserById(userId);
  if (!user) return { success: false, error: "You must be signed in." };
  const pricing = INDEV_PRICING[tier];
  if (user.voxbux < pricing.price) return { success: false, error: `Not enough Voxbux.` };
  const now = Date.now();
  const base = isIndevMember(user) && user.indevClub ? user.indevClub.expiresAt : now;
  const expiresAt = base + pricing.durationMs;
  const newBalance = user.voxbux - pricing.price + pricing.stipend;
  updateUser({ ...user, voxbux: newBalance, indevClub: { tier, startedAt: user.indevClub?.startedAt ?? now, expiresAt } });
  return { success: true, newBalance, expiresAt };
}
export function cancelIndev(userId: string): { success: boolean; error?: string } {
  const user = findUserById(userId);
  if (!user) return { success: false, error: "You must be signed in." };
  updateUser({ ...user, indevClub: null });
  return { success: true };
}

// ============================================================
// FRIENDS
// ============================================================
export function areFriends(a: string, b: string): boolean {
  return findUserById(a)?.friendIds.includes(b) || false;
}
export function hasIncomingRequestFrom(userId: string, fromId: string): boolean {
  return findUserById(userId)?.incomingRequests.includes(fromId) || false;
}
export function hasOutgoingRequestTo(userId: string, toId: string): boolean {
  return findUserById(userId)?.outgoingRequests.includes(toId) || false;
}
export function sendFriendRequest(fromId: string, toId: string): { success: boolean; error?: string } {
  if (fromId === toId) return { success: false, error: "You can't add yourself." };
  const from = findUserById(fromId); const to = findUserById(toId);
  if (!from || !to) return { success: false, error: "User not found." };
  if (from.friendIds.includes(toId)) return { success: false, error: "You're already friends." };
  if (from.outgoingRequests.includes(toId)) return { success: false, error: "Request already sent." };
  if (from.incomingRequests.includes(toId)) return acceptFriendRequest(fromId, toId);
  updateUser({ ...from, outgoingRequests: [...from.outgoingRequests, toId] });
  updateUser({ ...to, incomingRequests: [...to.incomingRequests, fromId] });
  return { success: true };
}
export function cancelFriendRequest(fromId: string, toId: string): { success: boolean } {
  const from = findUserById(fromId); const to = findUserById(toId);
  if (!from || !to) return { success: false };
  updateUser({ ...from, outgoingRequests: from.outgoingRequests.filter((id) => id !== toId) });
  updateUser({ ...to, incomingRequests: to.incomingRequests.filter((id) => id !== fromId) });
  return { success: true };
}
export function acceptFriendRequest(userId: string, fromId: string): { success: boolean; error?: string } {
  const user = findUserById(userId); const other = findUserById(fromId);
  if (!user || !other) return { success: false, error: "User not found." };
  const u1: User = { ...user, incomingRequests: user.incomingRequests.filter((id) => id !== fromId),
    friendIds: user.friendIds.includes(fromId) ? user.friendIds : [...user.friendIds, fromId] };
  const u2: User = { ...other, outgoingRequests: other.outgoingRequests.filter((id) => id !== userId),
    friendIds: other.friendIds.includes(userId) ? other.friendIds : [...other.friendIds, userId] };
  u1.friends = u1.friendIds.length; u2.friends = u2.friendIds.length;
  updateUser(u1); updateUser(u2);
  return { success: true };
}
export function declineFriendRequest(userId: string, fromId: string): { success: boolean } {
  const user = findUserById(userId); const other = findUserById(fromId);
  if (!user) return { success: false };
  updateUser({ ...user, incomingRequests: user.incomingRequests.filter((id) => id !== fromId) });
  if (other) updateUser({ ...other, outgoingRequests: other.outgoingRequests.filter((id) => id !== userId) });
  return { success: true };
}
export function removeFriend(userId: string, otherId: string): { success: boolean } {
  const user = findUserById(userId); const other = findUserById(otherId);
  if (!user) return { success: false };
  const u1: User = { ...user, friendIds: user.friendIds.filter((id) => id !== otherId) };
  u1.friends = u1.friendIds.length; updateUser(u1);
  if (other) {
    const u2: User = { ...other, friendIds: other.friendIds.filter((id) => id !== userId) };
    u2.friends = u2.friendIds.length; updateUser(u2);
  }
  return { success: true };
}
export function getFriendList(userId: string): User[] {
  const user = findUserById(userId);
  if (!user) return [];
  return user.friendIds.map((id) => findUserById(id)).filter((u): u is User => Boolean(u));
}
export function getIncomingRequests(userId: string): User[] {
  const user = findUserById(userId);
  if (!user) return [];
  return user.incomingRequests.map((id) => findUserById(id)).filter((u): u is User => Boolean(u));
}
export function getOutgoingRequests(userId: string): User[] {
  const user = findUserById(userId);
  if (!user) return [];
  return user.outgoingRequests.map((id) => findUserById(id)).filter((u): u is User => Boolean(u));
}

// ============================================================
// MESSAGES (still local per-browser for now)
// ============================================================
const MESSAGES_KEY = "voxelio_messages";
export function getMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}
function saveMessages(msgs: Message[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
}
export function sendMessage(fromId: string, toId: string, text: string): { success: boolean; error?: string; message?: Message } {
  const trimmed = text.trim();
  if (!trimmed) return { success: false, error: "Message can't be empty." };
  if (trimmed.length > 500) return { success: false, error: "Message too long (max 500 characters)." };
  const from = findUserById(fromId); const to = findUserById(toId);
  if (!from || !to) return { success: false, error: "User not found." };
  if (!from.friendIds.includes(toId)) return { success: false, error: "You can only message friends." };
  if (isUserBanned(from)) return { success: false, error: "This account is banned." };
  const filtered = filterMessage(trimmed);
  const msg: Message = { id: "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7),
    fromId, toId, text: filtered, sentAt: Date.now(), read: false };
  const msgs = getMessages(); msgs.push(msg); saveMessages(msgs);
  return { success: true, message: msg };
}
export function getConversation(a: string, b: string): Message[] {
  return getMessages().filter((m) => (m.fromId === a && m.toId === b) || (m.fromId === b && m.toId === a)).sort((x, y) => x.sentAt - y.sentAt);
}
export function getConversations(userId: string): { otherId: string; lastMessage: Message; unread: number }[] {
  const msgs = getMessages().filter((m) => m.fromId === userId || m.toId === userId);
  const by = new Map<string, Message[]>();
  for (const m of msgs) {
    const o = m.fromId === userId ? m.toId : m.fromId;
    if (!by.has(o)) by.set(o, []); by.get(o)!.push(m);
  }
  const out: { otherId: string; lastMessage: Message; unread: number }[] = [];
  for (const [otherId, list] of by.entries()) {
    list.sort((a, b) => a.sentAt - b.sentAt);
    out.push({ otherId, lastMessage: list[list.length - 1],
      unread: list.filter((m) => m.toId === userId && !m.read).length });
  }
  out.sort((a, b) => b.lastMessage.sentAt - a.lastMessage.sentAt);
  return out;
}
export function getUnreadCount(userId: string): number {
  return getMessages().filter((m) => m.toId === userId && !m.read).length;
}
export function getUnreadFrom(userId: string, fromId: string): number {
  return getMessages().filter((m) => m.toId === userId && m.fromId === fromId && !m.read).length;
}
export function markConversationRead(userId: string, otherId: string): void {
  const msgs = getMessages(); let changed = false;
  for (const m of msgs) if (m.toId === userId && m.fromId === otherId && !m.read) { m.read = true; changed = true; }
  if (changed) saveMessages(msgs);
}

// ============================================================
// DEV TOOLS
// ============================================================
export function giftVoxbux(userId: string, amount: number): { success: boolean; error?: string; newBalance?: number } {
  const u = findUserById(userId);
  if (!u) return { success: false, error: "User not found." };
  if (amount <= 0) return { success: false, error: "Amount must be greater than 0." };
  const updated = { ...u, voxbux: u.voxbux + amount };
  updateUser(updated);
  return { success: true, newBalance: updated.voxbux };
}
export function setVoxbux(userId: string, amount: number): { success: boolean; error?: string; newBalance?: number } {
  const u = findUserById(userId);
  if (!u) return { success: false, error: "User not found." };
  if (amount < 0) return { success: false, error: "Amount cannot be negative." };
  const updated = { ...u, voxbux: amount };
  updateUser(updated);
  return { success: true, newBalance: updated.voxbux };
}
export function banUser(userId: string, durationMs: number | "permanent", reason?: string): { success: boolean; error?: string; bannedUntil?: number } {
  const u = findUserById(userId);
  if (!u) return { success: false, error: "User not found." };
  if (u.id === OWNER_ID) return { success: false, error: "You cannot ban the owner." };
  const until = durationMs === "permanent" ? -1 : Date.now() + durationMs;
  updateUser({ ...u, bannedUntil: until, banReason: reason?.trim() || undefined });
  return { success: true, bannedUntil: until };
}
export function unbanUser(userId: string): { success: boolean; error?: string } {
  const u = findUserById(userId);
  if (!u) return { success: false, error: "User not found." };
  updateUser({ ...u, bannedUntil: null, banReason: undefined });
  return { success: true };
}
export function terminateUser(userId: string): { success: boolean; error?: string } {
  const u = findUserById(userId);
  if (!u) return { success: false, error: "User not found." };
  if (u.id === OWNER_ID) return { success: false, error: "You cannot terminate the owner." };
  usersCache = usersCache.filter((x) => x.id !== userId);
  void supabase.from("profiles").delete().eq("id", userId);
  if (currentUserCache?.id === userId) currentUserCache = null;
  notify();
  return { success: true };
}

// ============================================================
// RE-EXPORTS + FORMATTERS
// ============================================================
export { getAccountBadge, isOwnerAccount, isAdminAccount, isModeratorAccount, getBadgeLabel } from "./badges";
export type { BadgeType } from "./badges";

export function formatAccountId(id: string): string { return "#" + id; }

export function hashPassword(password: string): string {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) hash = (hash * 33) ^ password.charCodeAt(i);
  return "vx_" + (hash >>> 0).toString(36) + "_" + password.length;
}

export function formatVoxbux(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) amount = 0;
  amount = Math.floor(amount);
  if (amount < 1000) return `${amount} V$`;
  const tiers = [
    { value: 1_000_000_000_000, suffix: "T" },
    { value: 1_000_000_000, suffix: "B" },
    { value: 1_000_000, suffix: "M" },
    { value: 1_000, suffix: "k" },
  ];
  for (const t of tiers) {
    if (amount >= t.value) {
      const div = amount / t.value;
      const fl = Math.floor(div * 10) / 10;
      const disp = fl % 1 === 0 ? fl.toString() : fl.toFixed(1);
      return `${disp}${t.suffix}`;
    }
  }
  return `${amount} V$`;
}