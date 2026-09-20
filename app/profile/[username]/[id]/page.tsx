"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getCurrentUser,
  signOut,
  findUserByUsername,
  formatAccountId,
  formatVoxbux,
  updateUser,
  sendFriendRequest,
  acceptFriendRequest,
  cancelFriendRequest,
  areFriends,
  hasIncomingRequestFrom,
  hasOutgoingRequestTo,
  getUnreadCount,
  subscribeAuth,
  type User,
} from "../../../../lib/auth";
import { isOwnerAccount, getUserBadges } from "../../../../lib/badges";
import Avatar from "../../../components/Avatar";
import AccountBadge from "../../../components/AccountBadge";
import NavLink from "../../../components/NavLink";
import BadgeTile from "../../../components/BadgeTile";

const MAX_BIO_LENGTH = 200;

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = decodeURIComponent((params.username as string) || "");
  const id = (params.id as string) || "";

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const [view3D, setView3D] = useState(true);

  const refresh = () => {
    const byName = findUserByUsername(username);
    if (byName) {
      if (byName.id !== id) {
        router.replace(`/profile/${byName.username}/${byName.id}`);
      }
      setProfileUser(byName);
      setBioDraft((prev) => (editingBio ? prev : byName.bio));
    } else {
      setNotFound(true);
    }
    setCurrentUser(getCurrentUser());
  };

  useEffect(() => {
    refresh();
    const unsub = subscribeAuth(() => refresh());
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, id]);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const isOwnProfile = currentUser?.id === profileUser?.id;

  const handleStartEdit = () => {
    if (!profileUser) return;
    setBioDraft(profileUser.bio);
    setEditingBio(true);
  };

  const handleCancelEdit = () => {
    setEditingBio(false);
    setBioDraft(profileUser?.bio || "");
  };

  const handleSaveBio = () => {
    if (!profileUser) return;
    const trimmed = bioDraft.trim();
    const finalBio = trimmed.length === 0 ? "New Voxelio member!" : trimmed.slice(0, MAX_BIO_LENGTH);
    const updated: User = { ...profileUser, bio: finalBio };
    updateUser(updated);
    setProfileUser(updated);
    setCurrentUser(getCurrentUser());
    setEditingBio(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleAddFriend = () => {
    if (!currentUser || !profileUser) {
      showToast("error", "Sign in to add friends.");
      return;
    }
    const result = sendFriendRequest(currentUser.id, profileUser.id);
    if (result.success) {
      showToast("success", "Friend request sent!");
      refresh();
    } else {
      showToast("error", result.error || "Failed.");
    }
  };

  const handleAccept = () => {
    if (!currentUser || !profileUser) return;
    const result = acceptFriendRequest(currentUser.id, profileUser.id);
    if (result.success) {
      showToast("success", "You're now friends!");
      refresh();
    } else {
      showToast("error", result.error || "Failed.");
    }
  };

  const handleCancelRequest = () => {
    if (!currentUser || !profileUser) return;
    cancelFriendRequest(currentUser.id, profileUser.id);
    showToast("success", "Request cancelled.");
    refresh();
  };

  let relationshipAction: React.ReactNode = null;

  if (currentUser && profileUser && !isOwnProfile) {
    const friends = areFriends(currentUser.id, profileUser.id);
    const incoming = hasIncomingRequestFrom(currentUser.id, profileUser.id);
    const outgoing = hasOutgoingRequestTo(currentUser.id, profileUser.id);

    if (friends) {
      relationshipAction = (
        <div className="space-y-2">
          <div className="bg-green-50 border-2 border-green-300 rounded p-2 text-center">
            <p className="text-xs font-bold text-green-700">✓ Friends</p>
          </div>
          <Link
            href={`/messages/${profileUser.id}`}
            className="block text-center w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm py-2 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
          >
            💬 Message
          </Link>
        </div>
      );
    } else if (incoming) {
      relationshipAction = (
        <button
          onClick={handleAccept}
          className="w-full bg-gradient-to-b from-[#22C55E] to-[#16A34A] text-white font-bold text-sm py-2 rounded border border-[#15803D] hover:from-[#4ADE80] hover:to-[#22C55E] transition"
        >
          ✓ Accept Friend Request
        </button>
      );
    } else if (outgoing) {
      relationshipAction = (
        <button
          onClick={handleCancelRequest}
          className="w-full bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm py-2 rounded border border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
        >
          Cancel Friend Request
        </button>
      );
    } else {
      relationshipAction = (
        <button
          onClick={handleAddFriend}
          className="w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm py-2 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
        >
          + Add Friend
        </button>
      );
    }
  } else if (!currentUser && profileUser) {
    relationshipAction = (
      <Link
        href="/signin"
        className="block text-center w-full bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm py-2 rounded border border-[#C5C8D6] hover:bg-[#E0E3EE] transition"
      >
        Sign in to add
      </Link>
    );
  }

  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0;
  const isOwner = isOwnerAccount(currentUser?.username);

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games" },
    { name: "Create", href: "/#create" },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar" },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  const badges = getUserBadges(profileUser);

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans">

      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded shadow-lg text-white text-sm font-bold ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="bg-[#1A1A2E] text-white text-xs">
        <div className="max-w-6xl mx-auto px-3 py-1.5 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            {currentUser ? (
              <>
                <span className="text-gray-400">
                  Welcome,{" "}
                  <strong className="text-white inline-flex items-center">
                    {currentUser.username}
                    <AccountBadge username={currentUser.username} userId={currentUser.id} size={12} />
                  </strong>
                </span>
                <button onClick={handleSignOut} className="hover:text-[#00E5FF]">Sign Out</button>
              </>
            ) : (
              <>
                <span className="text-gray-400">Welcome, Guest</span>
                <Link href="/signin" className="hover:text-[#00E5FF]">Sign In</Link>
                <Link href="/signup" className="hover:text-[#00E5FF]">Sign Up</Link>
              </>
            )}
          </div>
          <div className="flex gap-4">
            <span>
              Voxbux:{" "}
              <strong className="text-[#FFD700]">
                {currentUser ? formatVoxbux(currentUser.voxbux) : "? V$"}
              </strong>
            </span>
            <Link href="#" className="hover:text-[#00E5FF]">Help</Link>
          </div>
        </div>
      </div>

      <header className="bg-gradient-to-b from-[#6C3CE0] to-[#5A2FC7] border-b-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/voxelio-logo.png" alt="Voxelio" className="h-14 w-auto object-contain bg-white rounded px-4 py-1.5 shadow-md" />
          </Link>
        </div>
      </header>

      <nav className="bg-[#4A1FA8] border-b-2 border-[#2D1070]">
        <div className="max-w-6xl mx-auto px-3 flex flex-wrap">
          {navTabs.map((tab) => (
            <NavLink
              key={tab.name}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-bold border-r border-[#3A1580] transition relative ${
                tab.active
                  ? "bg-[#EEF0F7] text-[#4A1FA8]"
                  : tab.dev
                  ? "text-[#FF6B6B] hover:bg-[#3A1580]"
                  : tab.special
                  ? "text-[#FFD700] hover:bg-[#3A1580]"
                  : "text-white hover:bg-[#3A1580]"
              }`}
            >
              {tab.name}
              {tab.name === "Messages" && unreadCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {savedFlash && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white text-sm font-bold px-4 py-2 rounded shadow-lg">
          ✓ About section saved!
        </div>
      )}

      <main className="max-w-6xl mx-auto px-3 py-6">

        {notFound ? (
          <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-12 text-center">
            <div className="text-6xl mb-4">👤</div>
            <h1 className="font-black text-2xl text-[#1A1A2E] mb-2">Player Not Found</h1>
            <p className="text-sm text-[#666] mb-6">
              No Voxelio account exists with the username "<strong>{username}</strong>".
            </p>
            <Link
              href="/"
              className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
            >
              Back to Home
            </Link>
          </div>
        ) : !profileUser ? (
          <div className="text-center text-[#666] py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            <aside className="lg:col-span-1 space-y-4">

              <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
                <div className="bg-gradient-to-r from-[#6C3CE0] to-[#5A2FC7] px-3 py-2 border-b border-[#4A1FA8] text-white text-sm font-bold flex justify-between items-center">
                  <span>Profile</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setView3D(false)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                        !view3D
                          ? "bg-white text-[#4A1FA8]"
                          : "bg-white/20 text-white hover:bg-white/30"
                      }`}
                      title="Front-facing static view"
                    >
                      2D
                    </button>
                    <button
                      onClick={() => setView3D(true)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                        view3D
                          ? "bg-white text-[#4A1FA8]"
                          : "bg-white/20 text-white hover:bg-white/30"
                      }`}
                      title="3D view — drag to rotate"
                    >
                      3D
                    </button>
                  </div>
                </div>

                <div className="p-4 flex flex-col items-center bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0]">
                  <Avatar
                    key={view3D ? "3d" : "2d"}
                    config={profileUser.avatarConfig}
                    size={140}
                    interactive={view3D}
                  />
                </div>

                <div className="p-3 border-t border-[#E5E7F0]">
                  <h1 className="font-black text-lg text-[#1A1A2E] text-center truncate inline-flex items-center justify-center w-full">
                    <span className="truncate">{profileUser.username}</span>
                    <AccountBadge username={profileUser.username} userId={profileUser.id} size={18} />
                  </h1>
                  <p className="text-center text-xs text-[#666] mt-1">
                    {profileUser.status === "online" ? "🟢 Online" : "⚫ Offline"}
                  </p>
                  <p className="text-center text-[10px] text-[#999]">
                    ID: {formatAccountId(profileUser.id, profileUser.displayId)}
                  </p>
                  {isOwnProfile && (
                    <p className="text-center text-[10px] text-[#7B2FF7] font-bold mt-1">THIS IS YOU</p>
                  )}
                </div>

                <div className="border-t border-[#E5E7F0] p-3 space-y-2">
                  {isOwnProfile ? (
                    <Link
                      href="/avatar"
                      className="block text-center w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm py-2 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                    >
                      🎨 Edit Avatar
                    </Link>
                  ) : (
                    relationshipAction
                  )}
                </div>
              </div>

              <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
                <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
                  Statistics
                </div>
                <div className="p-3 text-sm space-y-2">
                  <Row label="Friends" value={profileUser.friends.toString()} />
                  <Row label="Worlds" value="0" />
                  <Row label="Voxbux" value={formatVoxbux(profileUser.voxbux)} />
                  <Row label="Joined" value={profileUser.joined} />
                  <Row label="Account ID" value={formatAccountId(profileUser.id, profileUser.displayId)} />
                </div>
              </div>

              <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
                <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8] flex items-center justify-between">
                  <span>Badges</span>
                  {badges.length > 0 && (
                    <span className="text-[10px] font-normal text-white/70">
                      {badges.length}
                    </span>
                  )}
                </div>
                {badges.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#888]">
                    <div className="text-3xl mb-1">🏅</div>
                    No badges yet
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {badges.map((b) => (
                      <BadgeTile key={b.id} badge={b} />
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <div className="lg:col-span-3 space-y-6">

              <section>
                <div className="flex items-center justify-between mb-3 border-b-2 border-[#C5C8D6] pb-1">
                  <h2 className="text-lg font-black text-[#4A1FA8]">📝 About</h2>
                  {isOwnProfile && !editingBio && (
                    <button
                      onClick={handleStartEdit}
                      className="text-xs font-bold text-[#6C3CE0] hover:underline"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>

                <div className="bg-white border-2 border-[#C5C8D6] rounded p-4">
                  {editingBio ? (
                    <div className="space-y-3">
                      <textarea
                        value={bioDraft}
                        onChange={(e) => setBioDraft(e.target.value.slice(0, MAX_BIO_LENGTH))}
                        placeholder="Tell other players about yourself..."
                        rows={4}
                        className="w-full border-2 border-[#C5C8D6] rounded px-3 py-2 text-sm outline-none resize-none focus:border-[#6C3CE0] transition"
                      />
                      <div className="flex justify-between items-center text-xs text-[#888]">
                        <span>{bioDraft.length} / {MAX_BIO_LENGTH} characters</span>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-1.5 rounded border border-[#C5C8D6] bg-[#EEF0F7] text-[#4A1FA8] font-bold hover:bg-[#E0E3EE] transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveBio}
                            className="px-4 py-1.5 rounded border border-[#4A1FA8] bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                          >
                            💾 Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#1A1A2E] whitespace-pre-wrap">
                      {profileUser.bio || <span className="text-[#999] italic">This player hasn't written an about section yet.</span>}
                    </p>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3 border-b-2 border-[#C5C8D6] pb-1">
                  <h2 className="text-lg font-black text-[#4A1FA8]">👥 Friends ({profileUser.friends})</h2>
                  {isOwnProfile && (
                    <Link href="/friends" className="text-xs font-bold text-[#6C3CE0] hover:underline">
                      Manage →
                    </Link>
                  )}
                </div>
                <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-8 text-center">
                  <div className="text-4xl mb-2">👤</div>
                  <p className="text-sm text-[#666]">
                    {isOwnProfile
                      ? "View and manage your friends on the Friends page."
                      : `${profileUser.username}'s friend list is private.`}
                  </p>
                  {isOwnProfile && (
                    <Link
                      href="/friends"
                      className="inline-block mt-4 bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-xs px-6 py-2.5 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition"
                    >
                      Go to Friends
                    </Link>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3 border-b-2 border-[#C5C8D6] pb-1">
                  <h2 className="text-lg font-black text-[#4A1FA8]">🌍 Worlds</h2>
                </div>
                <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-8 text-center">
                  <div className="text-4xl mb-2">🏗️</div>
                  <p className="text-sm text-[#666]">
                    {isOwnProfile
                      ? "You haven't created any worlds yet."
                      : `${profileUser.username} hasn't created any worlds yet.`}
                  </p>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3 border-b-2 border-[#C5C8D6] pb-1">
                  <h2 className="text-lg font-black text-[#4A1FA8]">🎭 Groups</h2>
                </div>
                <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-8 text-center">
                  <div className="text-4xl mb-2">🎭</div>
                  <p className="text-sm text-[#666]">
                    {isOwnProfile
                      ? "You haven't joined any groups yet."
                      : `${profileUser.username} hasn't joined any groups yet.`}
                  </p>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-[#1A1A2E] text-white mt-8 border-t-4 border-[#4A1FA8]">
        <div className="max-w-6xl mx-auto px-3 py-6 text-center text-xs text-gray-500">
          © 2026 Voxelio. Voxelio is not affiliated with any other platform.
        </div>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#666]">{label}:</span>
      <strong className="text-[#4A1FA8]">{value}</strong>
    </div>
  );
}