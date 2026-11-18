"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getCurrentUser, updateUser, type User } from "../../../lib/auth";
import { isOwnerAccount } from "../../../lib/badges";
import { supabase } from "../../../lib/supabase";
import {
  fetchWorldById,
  incrementWorldVisits,
  hasLikedWorld,
  likeWorld,
  unlikeWorld,
  type World,
} from "../../../lib/worlds";
import { playInVoxelioApp } from "../../../lib/voxelioPlayer";
import { WONDERLAND_CHALLENGES } from "../../../lib/wonderland";
import { getItem } from "../../../lib/items";
import ItemPreview from "../../components/ItemPreview";
import Wonderland3D from "../../components/Wonderland3D"; // 👈 Import the 3D Game

export default function GameDetailsPage() {
  const params = useParams();
  const worldId = (params.id as string) || "";
  const isWonderland = worldId === "wonderland"; 

  const [user, setUser] = useState<User | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);

  const [launchStatus, setLaunchStatus] = useState<
    "idle" | "launching" | "not-installed" | "failed"
  >("idle");

  const [activeTab, setActiveTab] = useState<"about" | "servers">("about");
  const [currentOnline, setCurrentOnline] = useState(0);

  // 👇 State to toggle the 3D Game
  const [isPlaying3D, setIsPlaying3D] = useState(false);

  const isOwner = isOwnerAccount(user?.username);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    setMounted(true);
    fetchWorldById(worldId).then((w) => {
      if (!w) {
        setNotFound(true);
        return;
      }
      setWorld(w);
      setLikeCount(w.likes);
      hasLikedWorld(worldId).then((yes) => setLiked(yes));
      if (typeof window === "undefined") return;
      const visitKey = `voxelio-visited-${worldId}`;
      if (sessionStorage.getItem(visitKey) !== "1") {
        sessionStorage.setItem(visitKey, "1");
        incrementWorldVisits(worldId);
      }
    });
  }, [worldId]);

  useEffect(() => {
    if (!worldId) return;
    const observerKey = `details-${Math.random().toString(36).slice(2, 10)}`;
    const lobby = supabase.channel("world-lobby", {
      config: { presence: { key: observerKey } },
    });

    const update = () => {
      try {
        const state = lobby.presenceState() as Record<string, any[]>;
        let count = 0;
        for (const key of Object.keys(state)) {
          const entries = state[key];
          if (!Array.isArray(entries)) continue;
          for (const e of entries) {
            if (e && typeof e === "object" && (e as any).worldId === worldId) {
              count += 1;
            }
          }
        }
        setCurrentOnline(count);
      } catch {
        setCurrentOnline(0);
      }
    };

    lobby
      .on("presence", { event: "sync" }, update)
      .on("presence", { event: "join" }, update)
      .on("presence", { event: "leave" }, update)
      .subscribe(() => update());

    const interval = setInterval(update, 4000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(lobby);
    };
  }, [worldId]);

  const handleLike = useCallback(async () => {
    if (!user || liking) return;
    setLiking(true);
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    const ok = wasLiked ? await unlikeWorld(worldId) : await likeWorld(worldId);
    if (!ok) {
      setLiked(wasLiked);
      setLikeCount(prevCount);
    }
    setLiking(false);
  }, [user, liking, liked, likeCount, worldId]);

  const handlePlay = useCallback(async () => {
    if (isWonderland) {
      setIsPlaying3D(true); // 👈 Launch 3D Game directly
      return;
    }

    if (launchStatus === "launching") return;
    setLaunchStatus("launching");

    const result = await playInVoxelioApp(worldId);

    if (result.success) {
      setTimeout(() => setLaunchStatus("idle"), 2000);
    } else if (result.reason === "not_installed") {
      setLaunchStatus("not-installed");
    } else {
      setLaunchStatus("failed");
      setTimeout(() => setLaunchStatus("idle"), 2500);
    }
  }, [worldId, launchStatus, isWonderland]);

  // 👇 Called by the 3D game when you walk into a pillar
  const completeChallengeIn3D = async (challengeId: string, rewardItemId: string) => {
    if (!user || !isOwner) return;
    
    const freshUser = getCurrentUser();
    if (!freshUser) return;

    const currentBadges = freshUser.wonderlandBadges || [];
    if (!currentBadges.includes(challengeId)) {
      const newBadges = [...currentBadges, challengeId];
      const newOwned = freshUser.ownedItems.includes(rewardItemId) 
        ? freshUser.ownedItems 
        : [...freshUser.ownedItems, rewardItemId];
      
      updateUser({ 
        ...freshUser, 
        ownedItems: newOwned, 
        wonderlandBadges: newBadges 
      });
      
      setUser(getCurrentUser());
    }
  };

  if (!mounted) {
    return <div className="py-20 text-center text-[#666] font-semibold">Loading…</div>;
  }

  // 👇 Fullscreen 3D Game
  if (isPlaying3D) {
    return (
      <Wonderland3D 
        onCompleteChallenge={completeChallengeIn3D} 
        onExit={() => setIsPlaying3D(false)} 
      />
    );
  }

  if (notFound) {
    return (
      <div className="bg-white border-2 border-dashed border-[#C5C8D6] rounded p-16 text-center">
        <div className="text-7xl mb-4">🌍</div>
        <h2 className="text-2xl font-black text-[#1A1A2E] mb-2">World Not Found</h2>
        <p className="text-sm text-[#666] mb-6">This world doesn&apos;t exist or was removed.</p>
        <Link href="/games" className="inline-block bg-[#6C3CE0] hover:bg-[#5A2FC7] text-white font-bold text-sm px-6 py-2.5 rounded border-2 border-[#4A1FA8]">
          ← Back to Games
        </Link>
      </div>
    );
  }

  if (!world) {
    return <div className="py-20 text-center text-[#666] font-semibold">Loading world…</div>;
  }

  const completedCount = user?.wonderlandBadges?.length || 0;
  const totalChallenges = WONDERLAND_CHALLENGES.length;
  const progressPercent = Math.round((completedCount / totalChallenges) * 100);

  return (
    <div className="space-y-4">
      <Link href="/games" className="inline-flex items-center gap-2 text-sm font-bold text-[#4A1FA8] hover:text-[#6C3CE0] transition group">
        <span className="inline-block transition-transform group-hover:-translate-x-0.5">←</span>
        <span>Back to Games</span>
      </Link>

      <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-0">
          
          <div
            className="aspect-video relative overflow-hidden"
            style={{
              background: world.imageUrl
                ? `url(${world.imageUrl}) center/cover`
                : `linear-gradient(135deg, ${world.thumbnailColor} 0%, ${world.thumbnailColor}dd 100%)`,
            }}
          >
            {!world.imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center text-[120px]">
                {world.thumbnailEmoji}
              </div>
            )}
          </div>

          <div className="p-6 flex flex-col gap-3 border-l-2 border-[#E5E7F0]">
            <h1 className="text-3xl font-black text-[#1A1A2E] leading-tight">
              {world.name}
            </h1>

            <div className="text-sm text-[#666]">
              By <span className="text-[#4A1FA8] font-bold">@{world.creator || "voxelio"}</span>
            </div>

            <div className="text-xs text-[#666] space-y-1">
              <div>
                <strong className="text-[#1A1A2E]">Category:</strong>{" "}
                <span className="capitalize">{world.category}</span>
              </div>
              <div>
                <strong className="text-[#1A1A2E]">Max Players:</strong> {world.maxPlayers}
              </div>
            </div>

            <button
              onClick={handlePlay}
              className="mt-3 w-full h-14 rounded-lg font-black text-lg text-white flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: isWonderland ? (isOwner ? "linear-gradient(180deg, #00A2FF 0%, #0072C7 100%)" : "linear-gradient(180deg, #9CA3AF, #6B7280)") : "linear-gradient(180deg, #00A2FF 0%, #0072C7 100%)",
                boxShadow: "0 6px 20px rgba(0,162,255,0.4)",
                border: "2px solid #005A9E",
                cursor: isWonderland && !isOwner ? "not-allowed" : "pointer",
              }}
              disabled={isWonderland && !isOwner}
            >
              <span className="text-xl">{isWonderland ? (isOwner ? "▶" : "🔒") : "▶"}</span>
              <span>{isWonderland ? (isOwner ? "Play 3D World" : "Private Event") : "Play"}</span>
            </button>

            <div className="flex justify-around mt-3 pt-3 border-t border-[#E5E7F0]">
              <button
                onClick={handleLike}
                disabled={liking || isWonderland}
                className="flex flex-col items-center gap-1 text-xs font-bold transition"
                style={{
                  color: liked ? "#FF4D8D" : "#666",
                  cursor: liking || isWonderland ? "not-allowed" : "pointer",
                  background: "transparent",
                  border: "none",
                  opacity: isWonderland ? 0.5 : 1,
                }}
              >
                <span className="text-xl">{liked ? "❤️" : "🤍"}</span>
                {likeCount.toLocaleString()}
              </button>
              <div className="flex flex-col items-center gap-1 text-xs font-bold text-[#666]">
                <span className="text-xl">👥</span>
                {currentOnline} online
              </div>
              <div className="flex flex-col items-center gap-1 text-xs font-bold text-[#666]">
                <span className="text-xl">⭐</span>
                {world.favorites.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isWonderland && (
        <div className="bg-[#E0F2FE] border-2 border-[#93C5FD] rounded overflow-hidden p-6 relative">
          
          <div className="bg-white border-2 border-[#BAE6FD] rounded-xl p-4 mb-8 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-black text-[#1E3A8A]">Event Progress</span>
              <span className="text-sm font-black text-[#1E3A8A]">{completedCount} / {totalChallenges} Completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 border border-gray-300 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-400 to-green-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-[#1E3A8A] mb-2 drop-shadow-sm">
              ❄️ Wonderland Challenges ❄️
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WONDERLAND_CHALLENGES.map((challenge) => {
              const isCompleted = user?.wonderlandBadges?.includes(challenge.id);
              const rewardItem = getItem(challenge.rewardItemId);

              return (
                <div key={challenge.id} className="bg-white border-4 border-[#93C5FD] rounded-xl overflow-hidden shadow-lg flex flex-col">
                  <div className="bg-[#1E3A8A] text-white p-3 text-center font-black">
                    {challenge.emoji} {challenge.name}
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col items-center text-center">
                    <p className="text-xs text-[#4B5563] mb-4 font-semibold">{challenge.description}</p>
                    
                    <div className="mt-auto w-full">
                      <p className="text-[10px] font-black uppercase text-[#9CA3AF] mb-2">Reward</p>
                      
                      <div className="bg-[#F0F9FF] border-2 border-[#BAE6FD] rounded-lg p-2 flex flex-col items-center mb-4">
                        {rewardItem ? (
                          <>
                            <div className="w-16 h-16 pointer-events-none">
                              <ItemPreview item={rewardItem} size={64} />
                            </div>
                            <p className="font-bold text-xs text-[#1E3A8A] mt-1">{rewardItem.name}</p>
                          </>
                        ) : (
                          <p className="text-xs font-bold">Item Pending</p>
                        )}
                      </div>

                      {isCompleted ? (
                        <div className="bg-green-100 border-2 border-green-300 text-green-700 font-black py-2 rounded-lg text-sm w-full flex justify-center items-center gap-1">
                          <span>✓</span> Badge Earned
                        </div>
                      ) : (
                        <div className="w-full bg-gray-100 text-gray-500 font-bold py-2 rounded-lg border-2 border-gray-200 text-xs flex justify-center items-center">
                          Find this in the 3D World!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* ... Rest of the page (Tabs, etc.) ... */}
      {!isWonderland && (
        <div className="bg-white border-2 border-[#C5C8D6] rounded overflow-hidden">
          {/* ... Tabs code ... */}
        </div>
      )}
    </div>
  );
}