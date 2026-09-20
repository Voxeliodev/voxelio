"use client";

import { supabase } from "./supabase";
import { OWNER_USERNAME } from "./badges";
import { filterMessage } from "./chatFilter";
import { DEFAULT_BODY_PARTS, type BodyPartSlot } from "./bodyParts";
import { getItem } from "./items";

export type BodyPartColors = {
  head?: string; torso?: string; leftArm?: string; rightArm?: string;
  leftLeg?: string; rightLeg?: string;
};

export type AvatarConfig = {
  skinTone: string; shirtColor: string; pantsColor: string; hat: string; shirt: string;
  accessory?: string;
  face?: string;
  hair?: string;
  bodyParts: Record<BodyPartSlot, string>; partColors: BodyPartColors;
};

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinTone: "#F5C6A5", shirtColor: "#7B2FF7", pantsColor: "#1A1A2E",
  hat: "", shirt: "", accessory: "", face: "", hair: "",
  bodyParts: { ...DEFAULT_BODY_PARTS }, partColors: {},
};

export const DEFAULT_VOXBUX = 0;

export type IndevTier = "monthly" | "yearly";
export type IndevClub = { tier: IndevTier; startedAt: number; expiresAt: number };

export const INDEV_PRICING: Record<IndevTier, { name: string; price: number; durationMs: number; stipend: number; description: string }> = {
  monthly: { name: "Monthly", price: 1000, durationMs: 30*24*60*60*1000, stipend: 500, description: "30 days of membership" },
  yearly: { name: "Yearly", price: 10000, durationMs: 365*24*60*60*1000, stipend: 6000, description: "365 days of membership — best value" },
};

export type User = {
  id: string;
  displayId?: number | null;
  username: string; email: string; passwordHash: string; birthday: string;
  joined: string; status: "online" | "offline"; bio: string; avatar: string;
  avatarConfig: AvatarConfig; friends: number; friendIds: string[];
  incomingRequests: string[]; outgoingRequests: string[]; voxbux: number;
  ownedItems: string[]; bannedUntil?: number | null; banReason?: string;
  indevClub?: IndevClub | null; lastSeen?: number;
};

export type Message = {
  id: string; fromId: string; toId: string; text: string; sentAt: number; read: boolean;
};

// ============================================================
// DATE FORMATTER
// ============================================================
export function formatJoinDate(input: string | number | Date | null | undefined): string {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";

  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";

  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${day}${suffix} ${month} ${d.getFullYear()}`;
}

// ============================================================
// CACHE + HYDRATE
// ============================================================
let usersCache: User[] = [];
let currentUserCache: User | null = null;
let messagesCache: Message[] = [];
let hydrated = false;
const listeners = new Set<() => void>();
function notify() { for (const fn of listeners) fn(); }

export function subscribeAuth(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function hydrateAuth(): Promise<void> {
  if (typeof window === "undefined" || hydrated) return;

  hydrated = true;

  const { data: { session } } = await supabase.auth.getSession();
  const { data: profiles, error } = await supabase.from("profiles").select("*");
  if (!error && profiles) usersCache = profiles.map(rowToUser);

  if (session?.user) {
    currentUserCache = usersCache.find((u) => u.id === session.user.id) || null;
    const { data: msgRows } = await supabase
      .from("messages")
      .select("*")
      .or(`from_id.eq.${session.user.id},to_id.eq.${session.user.id}`);
    if (msgRows) messagesCache = msgRows.map(rowToMessage);
  }

  notify();

  supabase.auth.onAuthStateChange(async (_e, session) => {
    if (session?.user) {
      currentUserCache = usersCache.find((u) => u.id === session.user.id) || null;
      const { data: msgRows } = await supabase
        .from("messages")
        .select("*")
        .or(`from_id.eq.${session.user.id},to_id.eq.${session.user.id}`);
      if (msgRows) messagesCache = msgRows.map(rowToMessage);
    } else {
      currentUserCache = null;
      messagesCache = [];
    }
    notify();
  });

  setInterval(() => {
    if (currentUserCache) {
      updateUser({ ...currentUserCache, lastSeen: Date.now() });
    }
  }, 20000);

  supabase
    .channel("profiles-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles" },
      (payload) => {
        const row = payload.new as any;
        if (!row || !row.id) return;
        const u = rowToUser(row);
        const idx = usersCache.findIndex((x) => x.id === u.id);
        if (idx >= 0) usersCache[idx] = u;
        else usersCache.push(u);
        if (currentUserCache?.id === u.id) currentUserCache = u;
        notify();
      }
    )
    .subscribe();

  supabase
    .channel("messages-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          const m = rowToMessage(payload.new);
          if (!messagesCache.some((x) => x.id === m.id)) {
            messagesCache.push(m);
            notify();
          }
        } else if (payload.eventType === "UPDATE") {
          const m = rowToMessage(payload.new);
          const idx = messagesCache.findIndex((x) => x.id === m.id);
          if (idx >= 0) messagesCache[idx] = m;
          notify();
        } else if (payload.eventType === "DELETE") {
          const old = payload.old as any;
          if (old?.id) {
            messagesCache = messagesCache.filter((x) => x.id !== old.id);
            notify();
          }
        }
      }
    )
    .subscribe();

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      supabase.removeAllChannels();
    });
  }
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
    hat: raw?.hat || "",
    shirt: raw?.shirt || "",
    accessory: raw?.accessory || "",
    face: raw?.face || "",
    hair: raw?.hair || "",
    bodyParts, partColors,
  };
}

function rowToUser(row: any): User {
  const d = row.data || {};
  const friendIds = Array.isArray(d.friendIds) ? d.friendIds : [];
  return {
    id: row.id,
    displayId: typeof row.display_id === "number" ? row.display_id : null,
    username: row.username, email: row.email, passwordHash: "",
    birthday: d.birthday || "",
    joined: row.created_at ? formatJoinDate(row.created_at) : (d.joined || ""),
    status: (typeof d.lastSeen === "number" && Date.now() - d.lastSeen < 60000) ? "online" : "offline",
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
    lastSeen: typeof d.lastSeen === "number" ? d.lastSeen : 0,
  };
}

function userToRow(u: User) {
  return {
    id: u.id,
    display_id: u.displayId ?? undefined,
    username: u.username,
    email: u.email,
    data: {
      birthday: u.birthday, joined: u.joined, status: u.status, bio: u.bio,
      avatar: u.avatar, avatarConfig: u.avatarConfig,
      friendIds: u.friendIds, incomingRequests: u.incomingRequests,
      outgoingRequests: u.outgoingRequests, voxbux: u.voxbux,
      ownedItems: u.ownedItems, bannedUntil: u.bannedUntil,
      banReason: u.banReason, indevClub: u.indevClub,
      lastSeen: u.lastSeen ?? Date.now(),
    },
  };
}

function rowToMessage(row: any): Message {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    text: row.text,
    sentAt: new Date(row.sent_at).getTime(),
    read: Boolean(row.read),
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
  return usersCache.map((u) => {
    const online = typeof u.lastSeen === "number" && Date.now() - u.lastSeen < 60000;
    return { ...u, friends: u.friendIds.length, status: online ? "online" : "offline" };
  });
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
export function findUserByDisplayId(displayId: number): User | undefined {
  return getUsers().find((u) => u.displayId === displayId);
}
export function findUserByUsernameOrId(query: string): User | undefined {
  const q = query.trim(); if (!q) return undefined;
  if (/^\d+$/.test(q)) {
    const byDisplay = findUserByDisplayId(parseInt(q, 10));
    if (byDisplay) return byDisplay;
  }
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
// WRITE
// ============================================================
export function updateUser(updatedUser: User): void {
  const idx = usersCache.findIndex((u) => u.id === updatedUser.id);
  if (idx >= 0) usersCache[idx] = updatedUser; else usersCache.push(updatedUser);
  if (currentUserCache?.id === updatedUser.id) currentUserCache = updatedUser;
  supabase
    .from("profiles")
    .upsert(userToRow(updatedUser))
    .then(({ error }) => {
      if (error) {
        console.error("❌ updateUser FAILED:", error.message, error.details, error.hint);
      }
    });
  notify();
}
export function saveUsers(users: User[]): void {
  usersCache = users;
  supabase
    .from("profiles")
    .upsert(users.map(userToRow))
    .then(({ error }) => {
      if (error) console.error("❌ saveUsers FAILED:", error.message);
    });
  notify();
}

// ============================================================
// CREATE / LOGIN / SIGNOUT
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
    id: authData.user.id, displayId: null,
    username: data.username, email: data.email,
    passwordHash: "", birthday: data.birthday,
    joined: formatJoinDate(new Date()),
    status: "online", bio: "New Voxelio member!",
    avatar: avatars[Math.floor(Math.random() * avatars.length)],
    avatarConfig: { ...DEFAULT_AVATAR_CONFIG, bodyParts: { ...DEFAULT_BODY_PARTS }, partColors: {} },
    friends: 0, friendIds: [], incomingRequests: [], outgoingRequests: [],
    voxbux: DEFAULT_VOXBUX, ownedItems: [], bannedUntil: null, indevClub: null,
    lastSeen: Date.now(),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert(userToRow(newUser))
    .select()
    .single();

  if (insertError) return { success: false, error: insertError.message };

  const finalUser = inserted ? rowToUser(inserted) : newUser;
  usersCache.push(finalUser);
  currentUserCache = finalUser;
  notify();
  return { success: true, user: finalUser };
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

  const updated = { ...user, status: "online" as const, lastSeen: Date.now() };
  updateUser(updated);
  currentUserCache = updated;
  notify();
  return { success: true, user: updated };
}

export function getCurrentUser(): User | null {
  if (!currentUserCache) return null;
  const fresh = usersCache.find((u) => u.id === currentUserCache!.id);
  if (!fresh || isUserBanned(fresh)) return null;
  const online = typeof fresh.lastSeen === "number" && Date.now() - fresh.lastSeen < 60000;
  return { ...fresh, status: online ? "online" : "offline" };
}
export function setCurrentUser(user: User | null): void { currentUserCache = user; notify(); }
export async function signOut(): Promise<void> {
  const c = getCurrentUser();
  if (c) updateUser({ ...c, status: "offline", lastSeen: 0 });
  await supabase.auth.signOut();
  currentUserCache = null;
  messagesCache = [];
  notify();
}

// ============================================================
// ITEM SALES COUNTERS
// ============================================================
export async function fetchItemSales(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("item_sales").select("item_id, sales");
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data) out[row.item_id] = row.sales;
  return out;
}

async function bumpItemSale(itemId: string): Promise<void> {
  await supabase.rpc("increment_item_sale", { p_item_id: itemId });
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

  const item = getItem(itemId);
  if (item && item.forSale === false) {
    return { success: false, error: "This item is no longer for sale." };
  }

  if (user.voxbux < price) return { success: false, error: `Not enough Voxbux. You need ${price - user.voxbux} more.` };
  const updated: User = { ...user, voxbux: user.voxbux - price, ownedItems: [...user.ownedItems, itemId] };
  updateUser(updated);
  bumpItemSale(itemId);
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
// DEV — GRANT / REVOKE ITEMS (atomic via Supabase RPC)
// ============================================================
export async function grantItem(userId: string, itemId: string): Promise<{ success: boolean; error?: string }> {
  const item = getItem(itemId);
  if (!item) return { success: false, error: "Item not found." };

  const { data, error } = await supabase.rpc("grant_item", {
    p_user_id: userId,
    p_item_id: itemId,
  });

  if (error) return { success: false, error: error.message };
  if (!data?.success) return { success: false, error: data?.error || "Grant failed." };

  bumpItemSale(itemId);
  return { success: true };
}

export async function grantItemsBulk(
  userId: string,
  itemIds: string[]
): Promise<{ added: string[]; skipped: string[]; errors: string[] }> {
  const added: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const id of itemIds) {
    if (!getItem(id)) { errors.push(id); continue; }
    const r = await grantItem(userId, id);
    if (r.success) added.push(id);
    else if (r.error === "Already owned.") skipped.push(id);
    else errors.push(id);
  }

  return { added, skipped, errors };
}

export async function revokeItem(userId: string, itemId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("revoke_item", {
    p_user_id: userId,
    p_item_id: itemId,
  });

  if (error) return { success: false, error: error.message };
  if (!data?.success) return { success: false, error: data?.error || "Revoke failed." };
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
// MESSAGES — Supabase-backed
// ============================================================
export function getMessages(): Message[] {
  return [...messagesCache];
}

export function sendMessage(
  fromId: string,
  toId: string,
  text: string
): { success: boolean; error?: string; message?: Message } {
  const trimmed = text.trim();
  if (!trimmed) return { success: false, error: "Message can't be empty." };
  if (trimmed.length > 500) return { success: false, error: "Message too long (max 500 characters)." };

  const from = findUserById(fromId);
  const to = findUserById(toId);
  if (!from || !to) return { success: false, error: "User not found." };
  if (!from.friendIds.includes(toId)) return { success: false, error: "You can only message friends." };
  if (isUserBanned(from)) return { success: false, error: "This account is banned." };

  const filtered = filterMessage(trimmed);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

  const msg: Message = {
    id, fromId, toId, text: filtered, sentAt: Date.now(), read: false,
  };

  messagesCache.push(msg);
  notify();

  supabase
    .from("messages")
    .insert({ id, from_id: fromId, to_id: toId, text: filtered, read: false })
    .then(({ error }) => {
      if (error) console.error("❌ sendMessage FAILED:", error.message);
    });

  return { success: true, message: msg };
}

export function getConversation(a: string, b: string): Message[] {
  return messagesCache
    .filter((m) => (m.fromId === a && m.toId === b) || (m.fromId === b && m.toId === a))
    .sort((x, y) => x.sentAt - y.sentAt);
}

export function getConversations(
  userId: string
): { otherId: string; lastMessage: Message; unread: number }[] {
  const msgs = messagesCache.filter((m) => m.fromId === userId || m.toId === userId);
  const by = new Map<string, Message[]>();
  for (const m of msgs) {
    const o = m.fromId === userId ? m.toId : m.fromId;
    if (!by.has(o)) by.set(o, []);
    by.get(o)!.push(m);
  }
  const out: { otherId: string; lastMessage: Message; unread: number }[] = [];
  for (const [otherId, list] of by.entries()) {
    list.sort((a, b) => a.sentAt - b.sentAt);
    out.push({
      otherId,
      lastMessage: list[list.length - 1],
      unread: list.filter((m) => m.toId === userId && !m.read).length,
    });
  }
  out.sort((a, b) => b.lastMessage.sentAt - a.lastMessage.sentAt);
  return out;
}

export function getUnreadCount(userId: string): number {
  return messagesCache.filter((m) => m.toId === userId && !m.read).length;
}

export function getUnreadFrom(userId: string, fromId: string): number {
  return messagesCache.filter((m) => m.toId === userId && m.fromId === fromId && !m.read).length;
}

export function markConversationRead(userId: string, otherId: string): void {
  const unreadIds: string[] = [];
  messagesCache = messagesCache.map((m) => {
    if (m.toId === userId && m.fromId === otherId && !m.read) {
      unreadIds.push(m.id);
      return { ...m, read: true };
    }
    return m;
  });
  if (unreadIds.length > 0) {
    notify();
    supabase
      .from("messages")
      .update({ read: true })
      .in("id", unreadIds)
      .then(({ error }) => {
        if (error) console.error("❌ markRead FAILED:", error.message);
      });
  }
}

// ============================================================
// REDEEM CODES
// ============================================================
export async function redeemCode(inputCode: string): Promise<{
  success: boolean;
  error?: string;
  rewardType?: string;
  rewardText?: string;
}> {
  const user = getCurrentUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const trimmed = inputCode.trim();
  if (!trimmed) return { success: false, error: "Please enter a code." };

  const { data, error } = await supabase.rpc("redeem_code", {
    input_code: trimmed,
  });

  if (error) {
    console.error("redeem_code RPC failed:", error.message);
    return { success: false, error: "Couldn't process that code. Try again." };
  }

  if (!data || !data.success) {
    return { success: false, error: data?.error || "Couldn't redeem that code." };
  }

  const rewardType = data.reward_type as string;
  const rewardValue = (data.reward_value || {}) as any;
  let rewardText = "";

  if (rewardType === "voxbux") {
    const amount = Number(rewardValue.amount) || 0;
    updateUser({ ...user, voxbux: user.voxbux + amount });
    rewardText = `+${amount.toLocaleString()} Voxbux`;
  } else if (rewardType === "item") {
    const itemId = rewardValue.itemId as string | undefined;
    if (itemId && !user.ownedItems.includes(itemId)) {
      await grantItem(user.id, itemId);
      rewardText = `Item unlocked!`;
    } else {
      rewardText = `Reward granted`;
    }
  } else if (rewardType === "indev") {
    const days = Number(rewardValue.days) || 30;
    const ms = days * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const base = user.indevClub && user.indevClub.expiresAt > now
      ? user.indevClub.expiresAt
      : now;
    updateUser({
      ...user,
      indevClub: {
        tier: user.indevClub?.tier ?? "monthly",
        startedAt: user.indevClub?.startedAt ?? now,
        expiresAt: base + ms,
      },
    });
    rewardText = `INDEV Club +${days} days`;
  } else {
    rewardText = "Reward granted";
  }

  return { success: true, rewardType, rewardText };
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
  if (u.username.toLowerCase() === OWNER_USERNAME.toLowerCase()) return { success: false, error: "You cannot ban the owner." };
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
  if (u.username.toLowerCase() === OWNER_USERNAME.toLowerCase()) return { success: false, error: "You cannot terminate the owner." };
  usersCache = usersCache.filter((x) => x.id !== userId);
  supabase
    .from("profiles")
    .delete()
    .eq("id", userId)
    .then(({ error }) => {
      if (error) console.error("❌ terminate FAILED:", error.message);
    });
  if (currentUserCache?.id === userId) currentUserCache = null;
  notify();
  return { success: true };
}

// ============================================================
// RE-EXPORTS + FORMATTERS
// ============================================================
export { getAccountBadge, isOwnerAccount, isAdminAccount, isModeratorAccount, getBadgeLabel } from "./badges";
export type { BadgeType } from "./badges";

export function formatAccountId(id: string, displayId?: number | null): string {
  if (displayId) return "#" + displayId;
  if (/^\d+$/.test(id)) return "#" + id;
  return "#" + id.slice(0, 8);
}

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