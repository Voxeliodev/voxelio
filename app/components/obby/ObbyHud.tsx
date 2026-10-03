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
// IMPOSSIBLE OBBY — HUD overlay (redesigned)
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
    fetchTopTimes(worldId, 50).then(setLeaderboard);
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
        fetchTopTimes(worldId, 50).then(setLeaderboard);
        fetchPersonalBest(worldId).then((pb) => {
          if (pb) setPersonalBest(pb.timeMs);
        });
      }
    })();
  }, [finished, submitted, finalTime, worldId, setSubmitted]);

  const displayTime = finished ? finalTime : elapsed;
  const progress = totalCheckpoints > 0 ? checkpointCount / totalCheckpoints : 0;

  return (
    <>
      <style jsx global>{`
        @keyframes obby-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes obby-pop {
          0% { transform: scale(0.85); opacity: 0; }
          60% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes obby-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.15); }
          50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.65), 0 0 60px rgba(255, 215, 0, 0.25); }
        }
        @keyframes obby-shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes obby-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .obby-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .obby-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 4px;
        }
        .obby-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #8B5FFF, #6C3CE0);
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .obby-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #A878FF, #8B5FFF);
        }
        .obby-scroll {
          scrollbar-width: thin;
          scrollbar-color: #6C3CE0 rgba(255, 255, 255, 0.04);
        }
        .obby-stat-panel {
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.85), rgba(20, 10, 40, 0.85));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          position: relative;
          overflow: hidden;
        }
        .obby-stat-panel::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, currentColor, transparent);
          opacity: 0.6;
        }
        .obby-shine-text {
          background: linear-gradient(
            90deg,
            #FFD700 0%,
            #FFF8B0 40%,
            #FFD700 60%,
            #FFD700 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: obby-shine 3s linear infinite;
        }
        .obby-medal-row {
          background: linear-gradient(90deg, rgba(255, 215, 0, 0.08), transparent 70%);
        }
        .obby-win-card {
          animation: obby-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .obby-trophy {
          animation: obby-float 2.5s ease-in-out infinite;
          filter: drop-shadow(0 8px 16px rgba(255, 215, 0, 0.5));
        }
      `}</style>

      {/* ===== TOP-LEFT: Timer ===== */}
      <div
        className="obby-stat-panel absolute top-20 left-3 z-30 px-4 py-2.5 min-w-[120px]"
        style={{ color: "#8B5FFF" }}
      >
        <div className="flex items-center gap-1.5 text-[10px] text-white/60 uppercase font-bold tracking-widest">
          <span className="text-sm">⏱️</span>
          <span>Time</span>
        </div>
        <div className="text-3xl font-black obby-shine-text tabular-nums leading-none mt-1">
          {formatShortTime(displayTime)}
        </div>
      </div>

      {/* ===== TOP-RIGHT: Checkpoints ===== */}
      <div
        className="obby-stat-panel absolute top-20 right-3 z-30 px-4 py-2.5 min-w-[130px]"
        style={{ color: "#22C55E" }}
      >
        <div className="flex items-center justify-between gap-2 text-[10px] text-white/60 uppercase font-bold tracking-widest">
          <span className="flex items-center gap-1.5">
            <span className="text-sm">🚩</span>
            <span>Checkpoints</span>
          </span>
        </div>
        <div className="text-3xl font-black text-white tabular-nums leading-none mt-1">
          <span className="text-[#22C55E]">{checkpointCount}</span>
          <span className="text-white/30 text-xl"> / {totalCheckpoints}</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, progress * 100)}%`,
              background: "linear-gradient(90deg, #22C55E, #4ADE80)",
              boxShadow: "0 0 8px rgba(34, 197, 94, 0.7)",
            }}
          />
        </div>
      </div>

      {/* ===== BOTTOM-RIGHT: Personal Best ===== */}
      {personalBest !== null && (
        <div className="absolute bottom-20 right-3 z-30 bg-black/70 backdrop-blur-md rounded-lg border border-white/15 px-3 py-2 text-white text-[11px] shadow-lg flex items-center gap-2">
          <span className="text-base">🏅</span>
          <div className="leading-tight">
            <div className="text-white/50 uppercase text-[9px] font-bold tracking-wider">Your Best</div>
            <strong className="text-[#FFD700] text-sm tabular-nums">
              {formatShortTime(personalBest)}
            </strong>
          </div>
        </div>
      )}

      {/* ===== WIN SCREEN ===== */}
      {finished && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div
            className="obby-win-card rounded-3xl shadow-2xl p-8 w-full max-w-lg mx-4 text-center relative"
            style={{
              background: "linear-gradient(160deg, #1A1A2E 0%, #0F0F22 50%, #0A0A1E 100%)",
              border: "2px solid rgba(255, 215, 0, 0.4)",
              boxShadow:
                "0 25px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
            }}
          >
            {/* Corner sparkles */}
            <div className="absolute top-3 left-3 text-xl opacity-40">✨</div>
            <div className="absolute top-3 right-3 text-xl opacity-40">✨</div>

            <div className="obby-trophy text-7xl mb-2">🏆</div>
            <h1
              className="text-4xl font-black mb-1 obby-shine-text"
              style={{ letterSpacing: "0.02em" }}
            >
              OBBY COMPLETE!
            </h1>
            <p className="text-white/60 text-sm mb-6">
              You conquered the Impossible Obby.
            </p>

            {/* Final time card */}
            <div
              className="rounded-2xl p-5 mb-4 border"
              style={{
                background: "linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(108, 60, 224, 0.08))",
                borderColor: "rgba(255, 215, 0, 0.25)",
              }}
            >
              <div className="text-[10px] text-white/60 uppercase font-bold tracking-widest mb-1">
                Final Time
              </div>
              <div className="text-5xl font-black obby-shine-text tabular-nums leading-none">
                {formatShortTime(finalTime)}
              </div>
              {newBest && (
                <div
                  className="inline-flex items-center gap-1.5 text-xs text-white font-bold mt-3 px-3 py-1 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #22C55E, #16A34A)",
                    boxShadow: "0 0 16px rgba(34, 197, 94, 0.6)",
                  }}
                >
                  ⭐ NEW PERSONAL BEST
                </div>
              )}
              {submitError && (
                <div className="text-xs text-red-400 mt-3">⚠️ {submitError}</div>
              )}
            </div>

            {/* ===== LEADERBOARD ===== */}
            <div
              className="rounded-2xl p-4 mb-6 border text-left"
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏆</span>
                  <div className="text-[11px] text-white/70 uppercase font-bold tracking-widest">
                    Leaderboard
                  </div>
                </div>
                {leaderboard.length > 2 && (
                  <div className="text-[10px] text-[#8B5FFF] font-bold flex items-center gap-1">
                    <span>Scroll</span>
                    <span className="text-sm">↓</span>
                  </div>
                )}
              </div>

              {leaderboard.length === 0 ? (
                <p className="text-white/40 text-xs italic py-4 text-center">
                  No times recorded yet — be the first!
                </p>
              ) : (
                <div
                  className="obby-scroll rounded-lg"
                  style={{
                    height: "100px",
                    overflowY: "auto",
                    overflowX: "hidden",
                    touchAction: "pan-y",
                    WebkitOverflowScrolling: "touch",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                  onWheel={(e) => e.stopPropagation()}
                >
                  <ol className="text-sm">
                    {leaderboard.map((entry, i) => {
                      const rank = i + 1;
                      const isTop3 = i < 3;
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

                      return (
                        <li
                          key={entry.id}
                          className={`flex items-center justify-between px-3 ${
                            isTop3 ? "obby-medal-row" : ""
                          }`}
                          style={{
                            height: "50px",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`font-mono text-xs shrink-0 text-right ${
                                isTop3 ? "text-[#FFD700] font-bold" : "text-white/50"
                              }`}
                              style={{ width: "56px" }}
                            >
                              {medal ? `${medal} ${rank}.` : `${rank}.`}
                            </span>
                            <span
                              className={`truncate ${
                                isTop3 ? "text-white font-bold" : "text-white/85"
                              }`}
                            >
                              {entry.username}
                            </span>
                          </div>
                          <span
                            className={`font-bold tabular-nums shrink-0 ml-3 ${
                              isTop3 ? "text-[#FFD700]" : "text-white/70"
                            }`}
                          >
                            {formatShortTime(entry.timeMs)}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>

            <button
              onClick={onRestart}
              className="w-full text-white font-black text-base py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(180deg, #8B5FFF 0%, #6C3CE0 50%, #5A2FC7 100%)",
                border: "2px solid #4A1FA8",
                boxShadow:
                  "0 6px 20px rgba(108, 60, 224, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
              }}
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}