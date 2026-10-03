"use client";

import { useEffect, useState } from "react";
import {
  fetchTopTimes,
  fetchPersonalBest,
  submitTime,
  formatShortTime,
  type LeaderboardEntry,
} from "../../../lib/obbyLeaderboard";

// ============================================================
// IMPOSSIBLE OBBY — HUD overlay
// ============================================================

type Props = {
  elapsed: number;
  checkpointCount: number;
  totalCheckpoints: number;
  finished: boolean;
  finalTime: number;
  onRestart: () => void;
  worldId: string;
  submitted: boolean;
  setSubmitted: (v: boolean) => void;
};

export default function ObbyHud({
  elapsed,
  checkpointCount,
  totalCheckpoints,
  finished,
  finalTime,
  onRestart,
  worldId,
  submitted,
  setSubmitted,
}: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newBest, setNewBest] = useState(false);

  useEffect(() => {
    fetchTopTimes(worldId, 20).then(setLeaderboard);
    fetchPersonalBest(worldId).then((pb) => {
      if (pb) setPersonalBest(pb.timeMs);
    });
  }, [worldId]);

  useEffect(() => {
    if (!finished || submitted) return;
    (async () => {
      setSubmitted(true);
      const result = await submitTime(worldId, finalTime);
      if (!result.success) {
        setSubmitError(result.error || "Failed to submit");
      } else {
        setNewBest(Boolean(result.newBest));
        fetchTopTimes(worldId, 20).then(setLeaderboard);
        fetchPersonalBest(worldId).then((pb) => {
          if (pb) setPersonalBest(pb.timeMs);
        });
      }
    })();
  }, [finished, submitted, finalTime, worldId, setSubmitted]);

  const displayTime = finished ? finalTime : elapsed;

  return (
    <>
      {/* ===== TOP-LEFT: Timer ===== */}
      <div className="absolute top-20 left-3 z-30 bg-black/70 backdrop-blur rounded-lg border-2 border-[#6C3CE0] px-4 py-2 shadow-lg">
        <div className="text-[10px] text-white/60 uppercase font-bold tracking-wide">
          Time
        </div>
        <div className="text-2xl font-black text-[#FFD700] tabular-nums">
          {formatShortTime(displayTime)}
        </div>
      </div>

      {/* ===== TOP-RIGHT: Checkpoints ===== */}
      <div className="absolute top-20 right-3 z-30 bg-black/70 backdrop-blur rounded-lg border-2 border-[#22C55E] px-4 py-2 shadow-lg">
        <div className="text-[10px] text-white/60 uppercase font-bold tracking-wide">
          Checkpoints
        </div>
        <div className="text-2xl font-black text-[#22C55E] tabular-nums">
          {checkpointCount} / {totalCheckpoints}
        </div>
      </div>

      {/* ===== BOTTOM-RIGHT: Personal Best ===== */}
      {personalBest !== null && (
        <div className="absolute bottom-20 right-3 z-30 bg-black/60 backdrop-blur rounded border border-white/20 px-3 py-1.5 text-white text-[11px]">
          <span className="text-white/60">Your best:</span>{" "}
          <strong className="text-[#FFD700]">{formatShortTime(personalBest)}</strong>
        </div>
      )}

      {/* ===== WIN SCREEN ===== */}
      {finished && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-[#1A1A2E] to-[#0A0A1E] rounded-2xl border-4 border-[#FFD700] shadow-2xl p-8 w-full max-w-lg mx-4 text-center">
            <div className="text-6xl mb-3">🏆</div>
            <h1 className="text-3xl font-black text-[#FFD700] mb-1">
              OBBY COMPLETE!
            </h1>
            <p className="text-white/70 text-sm mb-6">
              You conquered the Impossible Obby.
            </p>

            <div className="bg-black/50 rounded-lg p-4 mb-4 border border-white/10">
              <div className="text-[10px] text-white/60 uppercase font-bold tracking-wide mb-1">
                Final Time
              </div>
              <div className="text-4xl font-black text-[#FFD700] tabular-nums">
                {formatShortTime(finalTime)}
              </div>
              {newBest && (
                <div className="text-xs text-[#22C55E] font-bold mt-2">
                  ⭐ NEW PERSONAL BEST!
                </div>
              )}
              {submitError && (
                <div className="text-xs text-red-400 mt-2">
                  ⚠️ {submitError}
                </div>
              )}
            </div>

            {/* ===== LEADERBOARD — 2 visible, scrollable ===== */}
            <div className="bg-black/50 rounded-lg p-4 mb-6 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] text-white/60 uppercase font-bold tracking-wide">
                  Top Times
                </div>
                <div className="text-[10px] text-white/40">
                  {leaderboard.length > 2 ? "Scroll for more ↕" : ""}
                </div>
              </div>

              {leaderboard.length === 0 ? (
                <p className="text-white/40 text-xs italic py-4">
                  No times recorded yet
                </p>
              ) : (
                <ol
                  className="space-y-1.5 text-sm overflow-y-auto pr-2 obby-scroll"
                  style={{
                    maxHeight: "88px", // 2 rows * 44px each
                  }}
                >
                  {leaderboard.map((entry, i) => {
                    const rank = i + 1;
                    const medal =
                      i === 0 ? "🥇" :
                      i === 1 ? "🥈" :
                      i === 2 ? "🥉" :
                      null;

                    return (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between text-white/90 py-1 px-2 rounded"
                        style={{
                          minHeight: "36px",
                          background: "rgba(255,255,255,0.03)",
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white/50 font-mono text-xs w-10 text-right shrink-0">
                            {medal ? `${medal} ${rank}.` : `${rank}.`}
                          </span>
                          <span className="truncate font-bold">
                            {entry.username}
                          </span>
                        </div>
                        <span className="text-[#FFD700] font-bold tabular-nums shrink-0 ml-3">
                          {formatShortTime(entry.timeMs)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}

              <style jsx>{`
                .obby-scroll::-webkit-scrollbar {
                  width: 6px;
                }
                .obby-scroll::-webkit-scrollbar-track {
                  background: rgba(255, 255, 255, 0.05);
                  border-radius: 3px;
                }
                .obby-scroll::-webkit-scrollbar-thumb {
                  background: rgba(108, 60, 224, 0.7);
                  border-radius: 3px;
                }
                .obby-scroll::-webkit-scrollbar-thumb:hover {
                  background: rgba(139, 95, 255, 0.9);
                }
              `}</style>
            </div>

            <button
              onClick={onRestart}
              className="w-full bg-gradient-to-b from-[#7B4FF7] to-[#5A2FC7] hover:from-[#8B5FFF] hover:to-[#6A3FD7] text-white font-black text-base py-3 rounded-lg border-2 border-[#4A1FA8] transition shadow-lg"
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}