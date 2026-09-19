// ============================================================
// VOXELIO AUTH — Client-side account storage
// ============================================================

import { OWNER_ID } from "./badges";
import { filterMessage } from "./chatFilter";
import { DEFAULT_BODY_PARTS, type BodyPartSlot } from "./bodyParts";

export type BodyPartColors = {
  head?: string;
  torso?: string;
  leftArm?: string;
  rightArm?: string;
  leftLeg?: string;
  rightLeg?: string;
};

export type AvatarConfig = {
  skinTone: string;
  shirtColor: string;
  pantsColor: string;
  hat: string;
  shirt: string;
  bodyParts: Record<BodyPartSlot, string>;
  partColors: BodyPartColors;
};

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinTone: "#F5C6A5",
  shirtColor: "#7B2FF7",
  pantsColor: "#1A1A2E",
  hat: "",
  shirt: "",
  bodyParts: { ...DEFAULT_BODY_PARTS },
  partColors: {},
};

export const DEFAULT_VOXBUX = 0;

// ============================================================
// INDEV CLUB
// ============================================================
export type IndevTier = "monthly" | "yearly";

export type IndevClub = {
  tier: IndevTier;
  startedAt: number;
  expiresAt: number;
};

export const INDEV_PRICING: Record<IndevTier, {
  name: string;
  price: number;
  durationMs: number;
  stipend: number;
  description: string;
}> = {
  monthly: {
    name: "Monthly",
    price: 1000,
    durationMs: 30 * 24 * 60 * 60 * 1000,
    stipend: 500,
    description: "30 days of membership",
  },
  yearly: {
    name: "Yearly",
    price: 10000,
    durationMs: 365 * 24 * 60 * 60 * 1000,
    stipend: 6000,
    description: "365 days of membership — best value",
  },
};

// ============================================================
// USER
// ============================================================
export type User = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  birthday: string;
  joined: string;
  status: "online" | "offline";
  bio: string;
  avatar: string;
  avatarConfig: AvatarConfig;
  friends: number;
  friendIds: string[];
  incomingRequests: string[];
  outgoingRequests: string[];
  voxbux: number;
  ownedItems: string[];
  bannedUntil?: number | null;
  banReason?: string;
  indevClub?: IndevClub | null;
};

// ============================================================
// MESSAGES
// ============================================================
export type Message = {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  sentAt: number;
  read: boolean;
};

const USERS_KEY = "voxelio_users";
const CURRENT_USER_KEY = "voxelio_current_user";
const COUNTER_KEY = "voxelio_next_account_id";
const USED_USERNAMES_KEY = "voxelio_used_usernames";
const USED_EMAILS_KEY = "voxelio_used_emails";
const MESSAGES_KEY = "voxelio_messages";

export function hashPassword(password: string): string {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return "vx_" + (hash >>> 0).toString(36) + "_" + password.length;
}

// ============ BODY PARTS MIGRATION ============
function normalizeAvatarConfig(raw: any): AvatarConfig {
  const bodyParts = { ...DEFAULT_BODY_PARTS };
  const rawBodyParts = raw?.bodyParts;
  if (rawBodyParts && typeof rawBodyParts === "object") {
    for (const slot of Object.keys(DEFAULT_BODY_PARTS) as BodyPartSlot[]) {
      if (typeof rawBodyParts[slot] === "string" && rawBodyParts[slot].length > 0) {
        bodyParts[slot] = rawBodyParts[slot];
      }
    }
  }

  const partColors: BodyPartColors = {};
  const rawPartColors = raw?.partColors;
  if (rawPartColors && typeof rawPartColors === "object") {
    for (const slot of Object.keys(DEFAULT_BODY_PARTS) as BodyPartSlot[]) {
      if (typeof rawPartColors[slot] === "string" && rawPartColors[slot].length > 0) {
        partColors[slot] = rawPartColors[slot];
      }
    }
  }

  return {
    skinTone: raw?.skinTone || DEFAULT_AVATAR_CONFIG.skinTone,
    shirtColor: raw?.shirtColor || DEFAULT_AVATAR_CONFIG.shirtColor,
    pantsColor: raw?.pantsColor || DEFAULT_AVATAR_CONFIG.pantsColor,
    hat: raw?.hat || "",
    shirt: raw?.shirt || "",
    bodyParts,
    partColors,
  };
}

// ============ INDEV HELPERS ============
export function isIndevMember(user: User | null | undefined): boolean {
  if (!user || !user.indevClub) return false;
  return user.indevClub.expiresAt > Date.now();
}

export function isIndevMemberById(userId: string): boolean {
  const user = findUserById(userId);
  return isIndevMember(user);
}

export function getIndevDaysRemaining(user: User): number {
  if (!isIndevMember(user) || !user.indevClub) return 0;
  const ms = user.indevClub.expiresAt - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

// ============ BAN HELPERS ============
export function isUserBanned(user: User | null | undefined): boolean {
  if (!user || !user.bannedUntil) return false;
  if (user.bannedUntil === -1) return true;
  return user.bannedUntil > Date.now();
}

export function getBanStatusLabel(user: User): { text: string; tone: "ok" | "warn" | "danger" } {
  if (!isUserBanned(user)) return { text: "Active", tone: "ok" };
  if (user.bannedUntil === -1) return { text: "Permanently banned", tone: "danger" };
  const d = new Date(user.bannedUntil!);
  return { text: `Banned until ${d.toLocaleString()}`, tone: "warn" };
}

// ============ ID HELPERS ============
function isNumericId(id: string): boolean {
  return /^\d+$/.test(id);
}

function getHighestExistingId(users: any[]): number {
  let max = 0;
  for (const u of users) {
    if (typeof u.id === "string" && isNumericId(u.id)) {
      const n = parseInt(u.id, 10);
      if (n > max) max = n;
    }
  }
  return max;
}

function getNextAccountId(): string {
  if (typeof window === "undefined") return "1";
  const users = getUsers();
  const highestExisting = getHighestExistingId(users);
  const storedCounter = localStorage.getItem(COUNTER_KEY);
  const storedNum = storedCounter ? parseInt(storedCounter, 10) : 0;
  let candidate = Math.max(highestExisting, storedNum) + 1;
  const usedIds = new Set(users.map((u) => u.id));
  while (usedIds.has(String(candidate))) candidate++;
  localStorage.setItem(COUNTER_KEY, String(candidate));
  return String(candidate);
}

// ============ USED USERNAMES / EMAILS ============
export function getUsedUsernames(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USED_USERNAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((n) => String(n).toLowerCase()) : [];
  } catch { return []; }
}

export function getUsedEmails(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USED_EMAILS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((e) => String(e).toLowerCase()) : [];
  } catch { return []; }
}

function saveUsedUsernames(list: string[]): void {
  if (typeof window === "undefined") return;
  const unique = Array.from(new Set(list.map((n) => n.toLowerCase())));
  localStorage.setItem(USED_USERNAMES_KEY, JSON.stringify(unique));
}

function saveUsedEmails(list: string[]): void {
  if (typeof window === "undefined") return;
  const unique = Array.from(new Set(list.map((e) => e.toLowerCase())));
  localStorage.setItem(USED_EMAILS_KEY, JSON.stringify(unique));
}

function recordUsername(username: string): void {
  if (typeof window === "undefined") return;
  const list = getUsedUsernames();
  const lower = username.toLowerCase();
  if (!list.includes(lower)) { list.push(lower); saveUsedUsernames(list); }
}

function recordEmail(email: string): void {
  if (typeof window === "undefined") return;
  const list = getUsedEmails();
  const lower = email.toLowerCase();
  if (!list.includes(lower)) { list.push(lower); saveUsedEmails(list); }
}

function syncUsedFromUsers(users: any[]): void {
  if (typeof window === "undefined") return;
  const usernames = getUsedUsernames();
  const emails = getUsedEmails();
  let changedU = false;
  let changedE = false;
  for (const u of users) {
    if (u.username && !usernames.includes(u.username.toLowerCase())) {
      usernames.push(u.username.toLowerCase()); changedU = true;
    }
    if (u.email && !emails.includes(u.email.toLowerCase())) {
      emails.push(u.email.toLowerCase()); changedE = true;
    }
  }
  if (changedU) saveUsedUsernames(usernames);
  if (changedE) saveUsedEmails(emails);
}

// ============ MIGRATION ============
function migrateUserIds(users: any[]): any[] {
  let changed = false;
  const usedIds = new Set<string>();
  for (const u of users) {
    if (typeof u.id === "string" && isNumericId(u.id)) usedIds.add(u.id);
  }
  let counter = 1;
  const result = users.map((u) => {
    if (typeof u.id === "string" && isNumericId(u.id)) return u;
    changed = true;
    while (usedIds.has(String(counter))) counter++;
    const newId = String(counter);
    usedIds.add(newId);
    counter++;
    return { ...u, id: newId };
  });
  return changed ? result : users;
}

// ============ READ / WRITE ============
export function getUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const migrated = migrateUserIds(parsed);
    if (migrated !== parsed) {
      localStorage.setItem(USERS_KEY, JSON.stringify(migrated));
      const highest = getHighestExistingId(migrated);
      localStorage.setItem(COUNTER_KEY, String(highest));
    }
    syncUsedFromUsers(migrated);
    return migrated.map((u: any) => {
      const friendIds = Array.isArray(u.friendIds) ? u.friendIds : [];
      return {
        ...u,
        avatarConfig: normalizeAvatarConfig(u.avatarConfig),
        friends: friendIds.length,
        friendIds,
        incomingRequests: Array.isArray(u.incomingRequests) ? u.incomingRequests : [],
        outgoingRequests: Array.isArray(u.outgoingRequests) ? u.outgoingRequests : [],
        voxbux: typeof u.voxbux === "number" ? u.voxbux : DEFAULT_VOXBUX,
        ownedItems: Array.isArray(u.ownedItems) ? u.ownedItems : [],
        bannedUntil: typeof u.bannedUntil === "number" ? u.bannedUntil : null,
        banReason: typeof u.banReason === "string" ? u.banReason : undefined,
        indevClub: u.indevClub && typeof u.indevClub === "object" ? u.indevClub : null,
      };
    });
  } catch { return []; }
}

export function saveUsers(users: User[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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
  const q = query.trim();
  if (!q) return undefined;
  if (/^\d+$/.test(q)) {
    const byId = findUserById(q);
    if (byId) return byId;
  }
  return findUserByUsername(q);
}

export function isUsernameTaken(username: string): boolean {
  if (!username) return false;
  return getUsedUsernames().includes(username.toLowerCase());
}

export function isEmailTaken(email: string): boolean {
  if (!email) return false;
  return getUsedEmails().includes(email.toLowerCase());
}

// ============ CREATE ACCOUNT ============
export function createUser(data: {
  username: string; email: string; password: string; birthday: string;
}): { success: boolean; error?: string; user?: User } {
  if (typeof window === "undefined") return { success: false, error: "Cannot create account right now." };
  syncUsedFromUsers(getUsers());
  if (isUsernameTaken(data.username)) return { success: false, error: "That username is already taken." };
  if (isEmailTaken(data.email)) return { success: false, error: "An account with that email already exists." };
  if (findUserByUsername(data.username)) return { success: false, error: "That username is already taken." };
  if (findUserByEmail(data.email)) return { success: false, error: "An account with that email already exists." };

  const avatars = ["🎨", "🚀", "🏎️", "👻", "⚔️", "🏝️", "🎢", "🧟", "🍕", "🚁", "🏗️", "🐉"];
  const avatar = avatars[Math.floor(Math.random() * avatars.length)];
  const newId = getNextAccountId();

  const newUser: User = {
    id: newId,
    username: data.username,
    email: data.email,
    passwordHash: hashPassword(data.password),
    birthday: data.birthday,
    joined: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    status: "online",
    bio: "New Voxelio member!",
    avatar,
    avatarConfig: {
      ...DEFAULT_AVATAR_CONFIG,
      bodyParts: { ...DEFAULT_BODY_PARTS },
      partColors: {},
    },
    friends: 0,
    friendIds: [],
    incomingRequests: [],
    outgoingRequests: [],
    voxbux: DEFAULT_VOXBUX,
    ownedItems: [],
    bannedUntil: null,
    indevClub: null,
  };

  recordUsername(data.username);
  recordEmail(data.email);
  const users = getUsers();
  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);
  return { success: true, user: newUser };
}

// ============ LOGIN ============
export function verifyLogin(username: string, password: string): { success: boolean; error?: string; user?: User } {
  if (typeof window === "undefined") return { success: false, error: "Cannot sign in right now." };
  const user = findUserByUsername(username);
  if (!user) return { success: false, error: "No account found with that username." };
  if (user.passwordHash !== hashPassword(password)) return { success: false, error: "Incorrect password. Please try again." };
  if (isUserBanned(user)) {
    if (user.bannedUntil === -1) {
      return { success: false, error: `This account has been permanently banned.${user.banReason ? " Reason: " + user.banReason : ""}` };
    }
    const until = new Date(user.bannedUntil!).toLocaleString();
    return { success: false, error: `This account is banned until ${until}.${user.banReason ? " Reason: " + user.banReason : ""}` };
  }
  user.status = "online";
  const users = getUsers().map((u) => (u.id === user.id ? user : u));
  saveUsers(users);
  setCurrentUser(user);
  return { success: true, user };
}

// ============ UPDATE ============
export function updateUser(updatedUser: User): void {
  const users = getUsers().map((u) => (u.id === updatedUser.id ? updatedUser : u));
  saveUsers(users);
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (raw) {
    try {
      const current = JSON.parse(raw);
      if (current.id === updatedUser.id) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
      }
    } catch {}
  }
}

// ============ CURRENT USER ============
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const fresh = findUserById(parsed.id);
    if (!fresh) { localStorage.removeItem(CURRENT_USER_KEY); return null; }
    if (isUserBanned(fresh)) { localStorage.removeItem(CURRENT_USER_KEY); return null; }
    return fresh;
  } catch { return null; }
}

export function setCurrentUser(user: User | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function signOut(): void {
  const current = getCurrentUser();
  if (current) {
    const users = getUsers().map((u) =>
      u.id === current.id ? { ...u, status: "offline" as const } : u
    );
    saveUsers(users);
  }
  setCurrentUser(null);
}

// ============================================================
// SHOP
// ============================================================
export function ownsItem(userId: string, itemId: string): boolean {
  const user = findUserById(userId);
  return user?.ownedItems.includes(itemId) || false;
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

// ============================================================
// INDEV CLUB
// ============================================================
export function subscribeIndev(userId: string, tier: IndevTier): { success: boolean; error?: string; newBalance?: number; expiresAt?: number } {
  const user = findUserById(userId);
  if (!user) return { success: false, error: "You must be signed in." };
  if (isUserBanned(user)) return { success: false, error: "This account is banned." };
  const pricing = INDEV_PRICING[tier];
  if (user.voxbux < pricing.price) return { success: false, error: `Not enough Voxbux. You need ${pricing.price - user.voxbux} more.` };
  const now = Date.now();
  const base = isIndevMember(user) && user.indevClub ? user.indevClub.expiresAt : now;
  const expiresAt = base + pricing.durationMs;
  const newBalance = user.voxbux - pricing.price + pricing.stipend;
  const updated: User = {
    ...user,
    voxbux: newBalance,
    indevClub: { tier, startedAt: user.indevClub?.startedAt ?? now, expiresAt },
  };
  updateUser(updated);
  return { success: true, newBalance, expiresAt };
}

export function cancelIndev(userId: string): { success: boolean; error?: string } {
  const user = findUserById(userId);
  if (!user) return { success: false, error: "You must be signed in." };
  updateUser({ ...user, indevClub: null });
  return { success: true };
}

// ============================================================
// FRIENDS SYSTEM
// ============================================================
export function areFriends(userAId: string, userBId: string): boolean {
  const a = findUserById(userAId);
  return a?.friendIds.includes(userBId) || false;
}

export function hasIncomingRequestFrom(userId: string, fromId: string): boolean {
  const u = findUserById(userId);
  return u?.incomingRequests.includes(fromId) || false;
}

export function hasOutgoingRequestTo(userId: string, toId: string): boolean {
  const u = findUserById(userId);
  return u?.outgoingRequests.includes(toId) || false;
}

export function sendFriendRequest(fromId: string, toId: string): { success: boolean; error?: string } {
  if (fromId === toId) return { success: false, error: "You can't add yourself." };
  const from = findUserById(fromId);
  const to = findUserById(toId);
  if (!from || !to) return { success: false, error: "User not found." };
  if (from.friendIds.includes(toId)) return { success: false, error: "You're already friends." };
  if (from.outgoingRequests.includes(toId)) return { success: false, error: "Request already sent." };

  if (from.incomingRequests.includes(toId)) {
    return acceptFriendRequest(fromId, toId);
  }

  const updatedFrom: User = { ...from, outgoingRequests: [...from.outgoingRequests, toId] };
  const updatedTo: User = { ...to, incomingRequests: [...to.incomingRequests, fromId] };
  updateUser(updatedFrom);
  updateUser(updatedTo);
  return { success: true };
}

export function cancelFriendRequest(fromId: string, toId: string): { success: boolean } {
  const from = findUserById(fromId);
  const to = findUserById(toId);
  if (!from || !to) return { success: false };
  updateUser({ ...from, outgoingRequests: from.outgoingRequests.filter((id) => id !== toId) });
  updateUser({ ...to, incomingRequests: to.incomingRequests.filter((id) => id !== fromId) });
  return { success: true };
}

export function acceptFriendRequest(userId: string, fromId: string): { success: boolean; error?: string } {
  const user = findUserById(userId);
  const other = findUserById(fromId);
  if (!user || !other) return { success: false, error: "User not found." };

  const updatedUser: User = {
    ...user,
    incomingRequests: user.incomingRequests.filter((id) => id !== fromId),
    friendIds: user.friendIds.includes(fromId) ? user.friendIds : [...user.friendIds, fromId],
  };
  const updatedOther: User = {
    ...other,
    outgoingRequests: other.outgoingRequests.filter((id) => id !== userId),
    friendIds: other.friendIds.includes(userId) ? other.friendIds : [...other.friendIds, userId],
  };
  updatedUser.friends = updatedUser.friendIds.length;
  updatedOther.friends = updatedOther.friendIds.length;
  updateUser(updatedUser);
  updateUser(updatedOther);
  return { success: true };
}

export function declineFriendRequest(userId: string, fromId: string): { success: boolean } {
  const user = findUserById(userId);
  const other = findUserById(fromId);
  if (!user) return { success: false };
  updateUser({ ...user, incomingRequests: user.incomingRequests.filter((id) => id !== fromId) });
  if (other) {
    updateUser({ ...other, outgoingRequests: other.outgoingRequests.filter((id) => id !== userId) });
  }
  return { success: true };
}

export function removeFriend(userId: string, otherId: string): { success: boolean } {
  const user = findUserById(userId);
  const other = findUserById(otherId);
  if (!user) return { success: false };
  const updatedUser: User = { ...user, friendIds: user.friendIds.filter((id) => id !== otherId) };
  updatedUser.friends = updatedUser.friendIds.length;
  updateUser(updatedUser);
  if (other) {
    const updatedOther: User = { ...other, friendIds: other.friendIds.filter((id) => id !== userId) };
    updatedOther.friends = updatedOther.friendIds.length;
    updateUser(updatedOther);
  }
  return { success: true };
}

export function getFriendList(userId: string): User[] {
  const user = findUserById(userId);
  if (!user) return [];
  return user.friendIds
    .map((id) => findUserById(id))
    .filter((u): u is User => Boolean(u));
}

export function getIncomingRequests(userId: string): User[] {
  const user = findUserById(userId);
  if (!user) return [];
  return user.incomingRequests
    .map((id) => findUserById(id))
    .filter((u): u is User => Boolean(u));
}

export function getOutgoingRequests(userId: string): User[] {
  const user = findUserById(userId);
  if (!user) return [];
  return user.outgoingRequests
    .map((id) => findUserById(id))
    .filter((u): u is User => Boolean(u));
}

// ============================================================
// MESSAGES SYSTEM
// ============================================================
export function getMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
  const from = findUserById(fromId);
  const to = findUserById(toId);
  if (!from || !to) return { success: false, error: "User not found." };
  if (!from.friendIds.includes(toId)) return { success: false, error: "You can only message friends." };
  if (isUserBanned(from)) return { success: false, error: "This account is banned." };

  const filtered = filterMessage(trimmed);

  const newMessage: Message = {
    id: "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    fromId,
    toId,
    text: filtered,
    sentAt: Date.now(),
    read: false,
  };
  const messages = getMessages();
  messages.push(newMessage);
  saveMessages(messages);
  return { success: true, message: newMessage };
}

export function getConversation(userAId: string, userBId: string): Message[] {
  return getMessages()
    .filter(
      (m) =>
        (m.fromId === userAId && m.toId === userBId) ||
        (m.fromId === userBId && m.toId === userAId)
    )
    .sort((a, b) => a.sentAt - b.sentAt);
}

export function getConversations(userId: string): { otherId: string; lastMessage: Message; unread: number }[] {
  const messages = getMessages().filter((m) => m.fromId === userId || m.toId === userId);
  const byOther = new Map<string, Message[]>();
  for (const m of messages) {
    const otherId = m.fromId === userId ? m.toId : m.fromId;
    if (!byOther.has(otherId)) byOther.set(otherId, []);
    byOther.get(otherId)!.push(m);
  }
  const result: { otherId: string; lastMessage: Message; unread: number }[] = [];
  for (const [otherId, msgs] of byOther.entries()) {
    msgs.sort((a, b) => a.sentAt - b.sentAt);
    const lastMessage = msgs[msgs.length - 1];
    const unread = msgs.filter((m) => m.toId === userId && !m.read).length;
    result.push({ otherId, lastMessage, unread });
  }
  result.sort((a, b) => b.lastMessage.sentAt - a.lastMessage.sentAt);
  return result;
}

export function getUnreadCount(userId: string): number {
  return getMessages().filter((m) => m.toId === userId && !m.read).length;
}

export function getUnreadFrom(userId: string, fromId: string): number {
  return getMessages().filter((m) => m.toId === userId && m.fromId === fromId && !m.read).length;
}

export function markConversationRead(userId: string, otherId: string): void {
  const messages = getMessages();
  let changed = false;
  for (const m of messages) {
    if (m.toId === userId && m.fromId === otherId && !m.read) {
      m.read = true;
      changed = true;
    }
  }
  if (changed) saveMessages(messages);
}

// ============================================================
// OWNER / DEV TOOLS
// ============================================================
export function giftVoxbux(userId: string, amount: number): { success: boolean; error?: string; newBalance?: number } {
  const user = findUserById(userId);
  if (!user) return { success: false, error: "User not found." };
  if (amount < 0) return { success: false, error: "Amount must be positive." };
  if (amount === 0) return { success: false, error: "Amount must be greater than 0." };
  const updated: User = { ...user, voxbux: user.voxbux + amount };
  updateUser(updated);
  return { success: true, newBalance: updated.voxbux };
}

export function setVoxbux(userId: string, amount: number): { success: boolean; error?: string; newBalance?: number } {
  const user = findUserById(userId);
  if (!user) return { success: false, error: "User not found." };
  if (amount < 0) return { success: false, error: "Amount cannot be negative." };
  const updated: User = { ...user, voxbux: amount };
  updateUser(updated);
  return { success: true, newBalance: updated.voxbux };
}

export function banUser(userId: string, durationMs: number | "permanent", reason?: string): { success: boolean; error?: string; bannedUntil?: number } {
  const user = findUserById(userId);
  if (!user) return { success: false, error: "User not found." };
  if (user.id === OWNER_ID) return { success: false, error: "You cannot ban the owner." };
  const until = durationMs === "permanent" ? -1 : Date.now() + durationMs;
  const updated: User = { ...user, bannedUntil: until, banReason: reason?.trim() || undefined };
  updateUser(updated);
  return { success: true, bannedUntil: until };
}

export function unbanUser(userId: string): { success: boolean; error?: string } {
  const user = findUserById(userId);
  if (!user) return { success: false, error: "User not found." };
  updateUser({ ...user, bannedUntil: null, banReason: undefined });
  return { success: true };
}

export function terminateUser(userId: string): { success: boolean; error?: string } {
  const user = findUserById(userId);
  if (!user) return { success: false, error: "User not found." };
  if (user.id === OWNER_ID) return { success: false, error: "You cannot terminate the owner." };
  const users = getUsers().filter((u) => u.id !== userId);
  saveUsers(users);
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.id === userId) localStorage.removeItem(CURRENT_USER_KEY);
      } catch {}
    }
  }
  return { success: true };
}

// ============ BADGE RE-EXPORTS ============
export {
  getAccountBadge,
  isOwnerAccount,
  isAdminAccount,
  isModeratorAccount,
  getBadgeLabel,
} from "./badges";
export type { BadgeType } from "./badges";

export function formatAccountId(id: string): string {
  return "#" + id;
}

// ============================================================
// VOXBUX FORMATTER
// ============================================================
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
  for (const tier of tiers) {
    if (amount >= tier.value) {
      const divided = amount / tier.value;
      const floored = Math.floor(divided * 10) / 10;
      const display = floored % 1 === 0 ? floored.toString() : floored.toFixed(1);
      const hasRemainder = amount % (tier.value / 10) !== 0;
      return `${display}${tier.suffix}${hasRemainder ? "+" : ""}`;
    }
  }
  return `${amount} V$`;
}