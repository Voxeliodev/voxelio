"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import {
  getCurrentUser,
  updateUser,
  signOut,
  formatVoxbux,
  getUnreadCount,
  subscribeAuth,
  type User,
  type AvatarConfig,
} from "../../lib/auth";
import { isOwnerAccount } from "../../lib/badges";
import {
  BODY_PART_SLOTS,
  DEFAULT_PART_ID,
  getBodyPartsForSlot,
  type BodyPartSlot,
} from "../../lib/bodyParts";
import Avatar from "../components/Avatar";
import AccountBadge from "../components/AccountBadge";
import NavLink from "../components/NavLink";
import ItemPreview from "../components/ItemPreview";
import { getHats, getShirts, getAccessories, getFaces, getHair, type Item } from "../../lib/items";

const SKIN_TONES = ["#F5C6A5", "#E8B08A", "#D69B71", "#B87A54", "#8B5A3C", "#5C3A23", "#3B2314"];

const PART_COLORS = [
  "#F5C6A5", "#E8B08A", "#D69B71", "#B87A54", "#8B5A3C", "#5C3A23", "#3B2314",
  "#FFFFFF", "#C5C8D6", "#888888", "#4B5563", "#1A1A2E",
  "#EF4444", "#F97316", "#FFD700", "#22C55E", "#00D4FF", "#3B82F6",
  "#7B2FF7", "#A855F7", "#EC4899", "#FF3B6B", "#B22222",
];

type TabId = "appearance" | "body" | "items";

const PART_LABELS: { slot: BodyPartSlot; label: string; emoji: string }[] = [
  { slot: "head", label: "Head", emoji: "🧠" },
  { slot: "torso", label: "Torso", emoji: "👕" },
  { slot: "leftArm", label: "Left Arm", emoji: "💪" },
  { slot: "rightArm", label: "Right Arm", emoji: "💪" },
  { slot: "leftLeg", label: "Left Leg", emoji: "🦵" },
  { slot: "rightLeg", label: "Right Leg", emoji: "🦵" },
];

export default function AvatarEditorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<AvatarConfig | null>(null);
  const [tab, setTab] = useState<TabId>("appearance");
  const [activeBodySlot, setActiveBodySlot] = useState<BodyPartSlot>("head");
  const [savedFlash, setSavedFlash] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedSlot, setAdvancedSlot] = useState<BodyPartSlot>("head");

  const sceneRef = useRef<THREE.Scene | null>(null);
  const [exporting, setExporting] = useState(false);

  const refreshFromStorage = useCallback(() => {
    const fresh = getCurrentUser();
    if (fresh) {
      setUser(fresh);
      setConfig((prev) => {
        if (!prev) return fresh.avatarConfig;
        if (JSON.stringify(prev) === JSON.stringify(fresh.avatarConfig)) return prev;
        return fresh.avatarConfig;
      });
    } else {
      setUser(null);
      setConfig(null);
    }
  }, []);

  useEffect(() => {
    refreshFromStorage();

    const unsub = subscribeAuth(() => {
      const fresh = getCurrentUser();
      if (!fresh) return;
      setUser(fresh);
      setConfig((prev) => {
        if (!prev) return fresh.avatarConfig;
        if (JSON.stringify(prev) === JSON.stringify(fresh.avatarConfig)) return prev;
        return fresh.avatarConfig;
      });
    });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshFromStorage();
    };
    const handleFocus = () => refreshFromStorage();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", refreshFromStorage);

    return () => {
      unsub();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", refreshFromStorage);
    };
  }, [refreshFromStorage]);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setConfig(null);
  };

  const persist = (newConfig: AvatarConfig) => {
    if (!user) return;
    setConfig(newConfig);
    const updated = { ...user, avatarConfig: newConfig };
    updateUser(updated);
    setUser(updated);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const update = (key: keyof AvatarConfig, value: any) => {
    if (!user || !config) return;
    persist({ ...config, [key]: value });
  };

  const updateBodyPart = (slot: BodyPartSlot, partId: string) => {
    if (!user || !config) return;
    persist({
      ...config,
      bodyParts: { ...config.bodyParts, [slot]: partId },
    });
  };

  const updatePartColour = (slot: BodyPartSlot, colour: string) => {
    if (!user || !config) return;
    persist({
      ...config,
      partColors: { ...config.partColors, [slot]: colour },
    });
  };

  const resetPartColour = (slot: BodyPartSlot) => {
    if (!user || !config) return;
    const next = { ...config.partColors };
    delete next[slot];
    persist({ ...config, partColors: next });
  };

  const resetAllPartColours = () => {
    if (!user || !config) return;
    persist({ ...config, partColors: {} });
  };

  const handleExport = async () => {
    if (!sceneRef.current || !user) return;
    setExporting(true);

    try {
      const characterGroup = sceneRef.current.getObjectByName("VoxelioCharacter");
      if (!characterGroup) {
        alert("Couldn't find the character to export.");
        setExporting(false);
        return;
      }

      const exporter = new GLTFExporter();

      exporter.parse(
        characterGroup,
        (result) => {
          const blob = new Blob([result as ArrayBuffer], {
            type: "model/gltf-binary",
          });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = `${user.username || "voxelio-avatar"}.glb`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setExporting(false);
        },
        (error) => {
          console.error("Export failed:", error);
          alert("Export failed. Check the console for details.");
          setExporting(false);
        },
        { binary: true }
      );
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed. Check the console for details.");
      setExporting(false);
    }
  };

  const owned = user?.ownedItems || [];
  const ownedHats = getHats().filter((h) => owned.includes(h.id));
  const ownedShirts = getShirts().filter((s) => owned.includes(s.id));
  const ownedAccessories = getAccessories().filter((a) => owned.includes(a.id));
  const ownedFaces = getFaces().filter((f) => owned.includes(f.id));
  const ownedHair = getHair().filter((h) => owned.includes(h.id));

  const unreadCount = user ? getUnreadCount(user.id) : 0;
  const isOwner = isOwnerAccount(user?.username);

  const navTabs: any[] = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games" },
    { name: "Create", href: "/#create" },
    { name: "Catalog", href: "/catalog" },
    ...(isOwner ? [{ name: "Dev", href: "/dev", dev: true }] : []),
    { name: "Friends", href: "/friends" },
    { name: "Messages", href: "/messages" },
    { name: "Avatar", href: "/avatar", active: true },
    { name: "INDEV Club", href: "/indev", special: true },
  ];

  const getEffectiveColour = (slot: BodyPartSlot): string => {
    if (!config) return "#FFFFFF";
    const override = config.partColors?.[slot];
    if (override) return override;
    if (slot === "head") return config.skinTone;
    if (slot === "torso" || slot === "leftArm" || slot === "rightArm") {
      const shirtItem = config.shirt ? getShirts().find((s) => s.id === config.shirt) : null;
      return shirtItem?.shirtColorOverride || config.shirtColor;
    }
    return config.pantsColor;
  };

  return (
    <div className="min-h-screen bg-[#EEF0F7] text-[#1A1A2E] font-sans">

      {savedFlash && (
        <div className="fixed top-4 right-4 z-[60] bg-green-500 text-white text-sm font-bold px-4 py-2 rounded shadow-lg">
          ✓ Saved
        </div>
      )}

      <div className="bg-[#1A1A2E] text-white text-xs">
        <div className="max-w-6xl mx-auto px-3 py-1.5 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                <span className="text-gray-400">
                  Welcome,{" "}
                  <strong className="text-white inline-flex items-center">
                    {user.username}
                    <AccountBadge username={user.username} userId={user.id} size={12} />
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
              Voxbux: <strong className="text-[#FFD700]">{user ? formatVoxbux(user.voxbux) : "? V$"}</strong>
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
                tab.active ? "bg-[#EEF0F7] text-[#4A1FA8]"
                : tab.dev ? "text-[#FF6B6B] hover:bg-[#3A1580]"
                : tab.special ? "text-[#FFD700] hover:bg-[#3A1580]"
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

      <main className="max-w-6xl mx-auto px-3 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-black text-[#4A1FA8] mb-1">🎨 Avatar Editor</h1>
          <p className="text-sm text-[#666]">Customize your Voxian. Every change saves automatically.</p>
        </div>

        {!user || !config ? (
          <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-12 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="font-black text-xl text-[#1A1A2E] mb-2">Sign in to edit your avatar</h2>
            <p className="text-sm text-[#666] mb-6">You need an account to customize your Voxian.</p>
            <Link href="/signin" className="inline-block bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] text-white font-bold text-sm px-8 py-3 rounded border border-[#4A1FA8] hover:from-[#8B5FFF] hover:to-[#6A3FD7] transition">
              Sign In
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-1 space-y-3">
              <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden sticky top-3">
                <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8] flex justify-between items-center">
                  <span>Preview</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-normal">🖱️ Drag · Scroll</span>
                </div>
                <div className="p-6 flex justify-center bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0]">
                  <Avatar
                    config={config}
                    size={280}
                    interactive={true}
                    onSceneReady={(s) => { sceneRef.current = s; }}
                  />
                </div>
              </div>

              <div className="bg-white border-2 border-[#C5C8D6] rounded p-3 space-y-2">
                <div className="bg-green-50 border-2 border-green-300 rounded p-2 text-center">
                  <p className="text-xs font-bold text-green-700">✓ Changes save automatically</p>
                </div>

                {isOwner && (
                  <>
                    <button
                      onClick={handleExport}
                      disabled={exporting}
                      className={`block text-center w-full font-bold text-sm py-2 rounded border transition ${
                        exporting
                          ? "bg-[#EEF0F7] text-[#888] border-[#C5C8D6] cursor-not-allowed"
                          : "bg-gradient-to-b from-[#00B8D4] to-[#0090A8] text-white border-[#007A8A] hover:from-[#33CBE0] hover:to-[#00A8C0]"
                      }`}
                    >
                      {exporting ? "Preparing .glb…" : "⬇️ Download as .glb"}
                    </button>

                    <p className="text-[10px] text-[#888] text-center leading-tight">
                      Opens in Blender, Maya, Unity, Unreal, etc.
                    </p>
                  </>
                )}

                <Link href={`/profile/${user.username}/${user.id}`} className="block text-center w-full bg-[#EEF0F7] text-[#4A1FA8] font-bold text-sm py-2 rounded border border-[#C5C8D6] hover:bg-[#E0E3EE] transition">
                  View Profile →
                </Link>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-3">

              <div className="bg-white border-2 border-[#C5C8D6] rounded p-2 flex flex-wrap gap-2">
                {([
                  { id: "appearance" as const, label: "Appearance", emoji: "🎨" },
                  { id: "body" as const, label: "Body Parts", emoji: "🧩" },
                  { id: "items" as const, label: "Items", emoji: "🎒" },
                ]).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-4 py-2 text-sm font-bold rounded border transition flex items-center gap-1.5 ${
                      tab === t.id ? "bg-[#6C3CE0] text-white border-[#4A1FA8]"
                      : "bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE]"
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {tab === "appearance" && (
                <>
                  <Section title="🧑 Skin Tone">
                    <div className="flex flex-wrap gap-2">
                      {SKIN_TONES.map((c) => (
                        <ColorSwatch key={c} color={c} selected={config.skinTone === c} onClick={() => update("skinTone", c)} />
                      ))}
                    </div>
                  </Section>

                  <Section title="😀 Face">
                    {ownedFaces.length === 0 && (
                      <p className="text-xs text-[#888] mb-3 italic">
                        No custom faces owned.{" "}
                        <Link href="/catalog" className="text-[#6C3CE0] hover:underline font-bold">Visit the Catalog →</Link>
                      </p>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      <FaceDefaultTile
                        selected={!config.face}
                        onSelect={() => update("face", "")}
                      />
                      {ownedFaces.map((face) => (
                        <FaceCard
                          key={face.id}
                          item={face}
                          selected={config.face === face.id}
                          onSelect={() => update("face", face.id)}
                        />
                      ))}
                    </div>
                  </Section>

                  <Section title="💇 Hair">
                    {ownedHair.length === 0 && (
                      <p className="text-xs text-[#888] mb-3 italic">
                        No hair owned.{" "}
                        <Link href="/catalog" className="text-[#6C3CE0] hover:underline font-bold">Visit the Catalog →</Link>
                      </p>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      <ItemTile
                        emoji="🚫"
                        name="None"
                        selected={(config.hair || "") === ""}
                        onSelect={() => update("hair", "")}
                      />
                      {ownedHair.map((item) => (
                        <ItemPreviewTile
                          key={item.id}
                          item={item}
                          selected={config.hair === item.id}
                          onSelect={() => update("hair", item.id)}
                        />
                      ))}
                    </div>
                  </Section>

                  <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
                    <button
                      onClick={() => setShowAdvanced((s) => !s)}
                      className="w-full bg-gradient-to-r from-[#4A1FA8] to-[#7B2FF7] text-white text-sm font-bold px-3 py-2 border-b border-[#3A1580] flex justify-between items-center"
                    >
                      <span>🎨 Advanced Body Part Colours</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{showAdvanced ? "▲ Hide" : "▼ Show"}</span>
                    </button>

                    {showAdvanced && (
                      <div className="p-3 space-y-3">
                        <p className="text-xs text-[#666]">Set the colour of each body part individually.</p>

                        <div className="flex flex-wrap gap-1.5">
                          {PART_LABELS.map((p) => {
                            const hasOverride = Boolean(config.partColors?.[p.slot]);
                            return (
                              <button
                                key={p.slot}
                                onClick={() => setAdvancedSlot(p.slot)}
                                className={`px-3 py-1.5 text-xs font-bold rounded border transition flex items-center gap-1.5 relative ${
                                  advancedSlot === p.slot ? "bg-[#6C3CE0] text-white border-[#4A1FA8]"
                                  : "bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE]"
                                }`}
                              >
                                <span>{p.emoji}</span>
                                <span>{p.label}</span>
                                {hasOverride && <span className="w-2 h-2 bg-yellow-400 rounded-full" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="bg-[#EEF0F7] rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#4A1FA8]">
                              {PART_LABELS.find((p) => p.slot === advancedSlot)?.emoji}{" "}
                              {PART_LABELS.find((p) => p.slot === advancedSlot)?.label} Colour
                            </span>
                            {config.partColors?.[advancedSlot] && (
                              <button onClick={() => resetPartColour(advancedSlot)} className="text-[10px] font-bold text-red-600 hover:underline">
                                Reset to default
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {PART_COLORS.map((c, i) => (
                              <button
                                key={`${c}-${i}`}
                                onClick={() => updatePartColour(advancedSlot, c)}
                                className={`w-8 h-8 rounded border-2 transition ${
                                  getEffectiveColour(advancedSlot) === c ? "border-[#6C3CE0] scale-110 shadow-md" : "border-[#C5C8D6] hover:scale-105"
                                }`}
                                style={{ backgroundColor: c }}
                                aria-label={c}
                              />
                            ))}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <label className="text-[11px] font-bold text-[#666]">Custom:</label>
                            <input
                              type="color"
                              value={getEffectiveColour(advancedSlot)}
                              onChange={(e) => updatePartColour(advancedSlot, e.target.value)}
                              className="w-10 h-8 rounded border-2 border-[#C5C8D6] cursor-pointer bg-white"
                            />
                            <span className="text-[11px] text-[#666] font-mono">{getEffectiveColour(advancedSlot)}</span>
                          </div>
                        </div>

                        {config.partColors && Object.keys(config.partColors).length > 0 && (
                          <button onClick={resetAllPartColours} className="w-full text-xs font-bold py-2 rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition">
                            🔄 Reset All Body Part Colours
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-4 text-center">
                    <p className="text-xs font-bold text-[#888] mb-1">🚧 Coming Soon</p>
                    <p className="text-xs text-[#999]">Facial hair, and more body types coming soon.</p>
                  </div>
                </>
              )}

              {tab === "body" && (
                <>
                  <div className="bg-gradient-to-r from-[#6C3CE0] to-[#A855F7] rounded-lg p-4 text-white">
                    <h2 className="text-lg font-black mb-1">🧩 Body Parts</h2>
                    <p className="text-xs text-white/85">Swap individual parts of your Voxian. Unlock new parts from the Catalog.</p>
                  </div>

                  <div className="bg-white border-2 border-[#C5C8D6] rounded p-2 flex flex-wrap gap-1.5">
                    {BODY_PART_SLOTS.map((s) => {
                      const equippedId = config.bodyParts?.[s.id] || DEFAULT_PART_ID;
                      const hasCustom = equippedId !== DEFAULT_PART_ID;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setActiveBodySlot(s.id)}
                          className={`px-3 py-2 text-xs font-bold rounded-full border transition flex items-center gap-1.5 relative ${
                            activeBodySlot === s.id ? "bg-[#6C3CE0] text-white border-[#4A1FA8]"
                            : "bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE]"
                          }`}
                        >
                          <span>{s.emoji}</span>
                          <span>{s.name}</span>
                          {hasCustom && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
                        </button>
                      );
                    })}
                  </div>

                  <Section title={`${BODY_PART_SLOTS.find((s) => s.id === activeBodySlot)?.emoji} ${BODY_PART_SLOTS.find((s) => s.id === activeBodySlot)?.name}`}>
                    <BodyPartSlotEditor
                      slot={activeBodySlot}
                      currentPartId={config.bodyParts?.[activeBodySlot] || DEFAULT_PART_ID}
                      ownedItemIds={owned}
                      onSelect={(partId) => updateBodyPart(activeBodySlot, partId)}
                    />
                  </Section>
                </>
              )}

              {tab === "items" && (
                <>
                  <Section title="🎩 Hats">
                    {ownedHats.length === 0 && (
                      <p className="text-xs text-[#888] mb-3 italic">
                        No hats owned.{" "}
                        <Link href="/catalog" className="text-[#6C3CE0] hover:underline font-bold">Visit the Catalog →</Link>
                      </p>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      <ItemTile
                        emoji="🚫"
                        name="None"
                        selected={config.hat === ""}
                        onSelect={() => update("hat", "")}
                      />
                      {ownedHats.map((item) => (
                        <ItemPreviewTile
                          key={item.id}
                          item={item}
                          selected={config.hat === item.id}
                          onSelect={() => update("hat", item.id)}
                        />
                      ))}
                    </div>
                  </Section>

                  <Section title="👚 Shirts">
                    {ownedShirts.length === 0 && (
                      <p className="text-xs text-[#888] mb-3 italic">
                        No shirts owned.{" "}
                        <Link href="/catalog" className="text-[#6C3CE0] hover:underline font-bold">Visit the Catalog →</Link>
                      </p>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      <ItemTile
                        emoji="🚫"
                        name="None"
                        selected={config.shirt === ""}
                        onSelect={() => update("shirt", "")}
                      />
                      {ownedShirts.map((item) => (
                        <ItemPreviewTile
                          key={item.id}
                          item={item}
                          selected={config.shirt === item.id}
                          onSelect={() => update("shirt", item.id)}
                        />
                      ))}
                    </div>
                  </Section>

                  <Section title="⚔️ Accessories">
                    {ownedAccessories.length === 0 && (
                      <p className="text-xs text-[#888] mb-3 italic">
                        No accessories owned.{" "}
                        <Link href="/catalog" className="text-[#6C3CE0] hover:underline font-bold">Visit the Catalog →</Link>
                      </p>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      <ItemTile
                        emoji="🚫"
                        name="None"
                        selected={(config.accessory || "") === ""}
                        onSelect={() => update("accessory", "")}
                      />
                      {ownedAccessories.map((item) => (
                        <ItemPreviewTile
                          key={item.id}
                          item={item}
                          selected={config.accessory === item.id}
                          onSelect={() => update("accessory", item.id)}
                        />
                      ))}
                    </div>
                  </Section>
                </>
              )}
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

// ============================================================
// TILES
// ============================================================

function ItemTile({
  emoji,
  name,
  selected,
  onSelect,
}: {
  emoji: string;
  name: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center gap-1 p-2 rounded border-2 transition ${
        selected
          ? "border-[#6C3CE0] bg-[#F5F0FF] shadow-md"
          : "border-[#C5C8D6] bg-white hover:border-[#6C3CE0] hover:shadow-md"
      }`}
      title={name}
    >
      <div className="w-full aspect-square rounded bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] flex items-center justify-center overflow-hidden">
        <span className="text-3xl">{emoji}</span>
      </div>
      <span className="text-[10px] font-bold text-[#1A1A2E] text-center leading-tight line-clamp-2">
        {name}
      </span>
    </button>
  );
}

function ItemPreviewTile({
  item,
  selected,
  onSelect,
}: {
  item: Item;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center gap-1 p-2 rounded border-2 transition ${
        selected
          ? "border-[#6C3CE0] bg-[#F5F0FF] shadow-md"
          : "border-[#C5C8D6] bg-white hover:border-[#6C3CE0] hover:shadow-md"
      }`}
      title={item.name}
    >
      <div className="w-full aspect-square rounded bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] flex items-center justify-center overflow-hidden pointer-events-none">
        <ItemPreview item={item} size={90} />
      </div>
      <span className="text-[10px] font-bold text-[#1A1A2E] text-center leading-tight line-clamp-2">
        {item.name}
      </span>
    </button>
  );
}

function FaceCard({
  item,
  selected,
  onSelect,
}: {
  item: Item;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center gap-1 p-2 rounded border-2 transition ${
        selected
          ? "border-[#6C3CE0] bg-[#F5F0FF] shadow-md"
          : "border-[#C5C8D6] bg-white hover:border-[#6C3CE0] hover:shadow-md"
      }`}
      title={item.name}
    >
      <div className="w-full aspect-square rounded bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] flex items-center justify-center overflow-hidden">
        {item.faceImageUrl ? (
          <img
            src={item.faceImageUrl}
            alt={item.name}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <span className="text-3xl">{item.previewEmoji}</span>
        )}
      </div>
      <span className="text-[10px] font-bold text-[#1A1A2E] text-center leading-tight line-clamp-2">
        {item.name}
      </span>
    </button>
  );
}

function FaceDefaultTile({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center gap-1 p-2 rounded border-2 transition ${
        selected
          ? "border-[#6C3CE0] bg-[#F5F0FF] shadow-md"
          : "border-[#C5C8D6] bg-white hover:border-[#6C3CE0] hover:shadow-md"
      }`}
      title="Default"
    >
      <div className="w-full aspect-square rounded bg-gradient-to-br from-[#EEF0F7] to-[#DDD6F0] flex items-center justify-center overflow-hidden">
        <img
          src="/faces/default.png"
          alt="Default face"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
      <span className="text-[10px] font-bold text-[#1A1A2E] text-center leading-tight">
        Default
      </span>
    </button>
  );
}

function BodyPartSlotEditor({
  slot,
  currentPartId,
  ownedItemIds,
  onSelect,
}: {
  slot: BodyPartSlot;
  currentPartId: string;
  ownedItemIds: string[];
  onSelect: (partId: string) => void;
}) {
  const availableParts = getBodyPartsForSlot(slot);
  const ownedParts = availableParts.filter((p) => ownedItemIds.includes(p.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelect(DEFAULT_PART_ID)}
          className={`px-3 py-2 text-xs font-bold rounded border transition ${
            currentPartId === DEFAULT_PART_ID ? "bg-[#6C3CE0] text-white border-[#4A1FA8]"
            : "bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE]"
          }`}
        >
          ✨ Default
        </button>

        {ownedParts.map((part) => (
          <button
            key={part.id}
            onClick={() => onSelect(part.id)}
            className={`px-3 py-2 text-xs font-bold rounded border transition ${
              currentPartId === part.id ? "bg-[#6C3CE0] text-white border-[#4A1FA8]"
              : "bg-[#EEF0F7] text-[#4A1FA8] border-[#C5C8D6] hover:bg-[#E0E3EE]"
            }`}
            title={part.description}
          >
            🧩 {part.name}
          </button>
        ))}
      </div>

      {ownedParts.length === 0 && (
        <div className="bg-[#EEF0F7] border-2 border-dashed border-[#C5C8D6] rounded p-4 text-center">
          <div className="text-3xl mb-1">🛒</div>
          <p className="text-xs font-bold text-[#888] mb-1">No custom {slot} parts owned</p>
          <p className="text-[11px] text-[#999] max-w-md mx-auto mb-3">
            Unlock new {slot} shapes by claiming them from the Catalog.
          </p>
          <Link href="/catalog" className="inline-block text-xs font-bold text-[#6C3CE0] hover:underline">
            Browse the Catalog →
          </Link>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
      <div className="bg-[#6C3CE0] text-white text-sm font-bold px-3 py-2 border-b border-[#4A1FA8]">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function ColorSwatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded border-2 transition ${
        selected ? "border-[#6C3CE0] scale-110 shadow-md" : "border-[#C5C8D6] hover:scale-105"
      }`}
      style={{ backgroundColor: color }}
      aria-label={color}
    />
  );
}