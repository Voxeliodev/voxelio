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
        @keyframes obby-shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes obby-pop {
          0% { transform: scale(0.85); opacity: 0; }
          60% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes obby-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .obby-scroll::-webkit-scrollbar { width: 8px; }
        .obby-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 4px;
        }
        .obby-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #8B5FFF, #6C3CE0);
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .obby-scroll {
          scrollbar-width: thin;
          scrollbar-color: #6C3CE0 rgba(255, 255, 255, 0.04);
        }
        .obby-shine-text {
          background: linear-gradient(90deg, #FFD700 0%, #FFF8B0 40%, #FFD700 60%, #FFD700 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: obby-shine 3s linear infinite;
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
        className="absolute z-30"
        style={{
          top: "80px",
          left: "12px",
          padding: "10px 16px",
          minWidth: "120px",
          background: "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,15,60,0.9))",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(139, 95, 255, 0.5)",
          borderRadius: "14px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em" }}>
          <span style={{ fontSize: "14px" }}>⏱️</span>
          <span>Time</span>
        </div>
        <div className="obby-shine-text" style={{ fontSize: "28px", fontWeight: 900, fontVariantNumeric: "tabular-nums", lineHeight: 1, marginTop: "4px" }}>
          {formatShortTime(displayTime)}
        </div>
      </div>

      {/* ===== TOP-RIGHT: Checkpoints ===== */}
      <div
        className="absolute z-30"
        style={{
          top: "80px",
          right: "12px",
          padding: "10px 16px",
          minWidth: "130px",
          background: "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(10,40,25,0.9))",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(34, 197, 94, 0.5)",
          borderRadius: "14px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em" }}>
          <span style={{ fontSize: "14px" }}>🚩</span>
          <span>Checkpoints</span>
        </div>
        <div style={{ fontSize: "28px", fontWeight: 900, fontVariantNumeric: "tabular-nums", lineHeight: 1, marginTop: "4px" }}>
          <span style={{ color: "#22C55E" }}>{checkpointCount}</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "18px" }}> / {totalCheckpoints}</span>
        </div>
        <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", marginTop: "8px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              borderRadius: "999px",
              width: `${Math.min(100, progress * 100)}%`,
              background: "linear-gradient(90deg, #22C55E, #4ADE80)",
              boxShadow: "0 0 8px rgba(34, 197, 94, 0.7)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* ===== BOTTOM-RIGHT: Personal Best ===== */}
      {personalBest !== null && (
        <div
          className="absolute z-30"
          style={{
            bottom: "80px",
            right: "12px",
            padding: "8px 12px",
            background: "linear-gradient(135deg, rgba(0,0,0,0.85), rgba(30,15,60,0.85))",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 215, 0, 0.35)",
            borderRadius: "10px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "white",
          }}
        >
          <span style={{ fontSize: "16px" }}>🏅</span>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", textTransform: "uppercase", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em" }}>
              Your Best
            </div>
            <strong style={{ color: "#FFD700", fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>
              {formatShortTime(personalBest)}
            </strong>
          </div>
        </div>
      )}

      {/* ===== WIN SCREEN ===== */}
      {finished && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        >
          <div
            className="obby-win-card"
            style={{
              padding: "32px",
              width: "100%",
              maxWidth: "512px",
              margin: "0 16px",
              textAlign: "center",
              background: "linear-gradient(160deg, #1A1A2E 0%, #0F0F22 50%, #0A0A1E 100%)",
              border: "2px solid rgba(255, 215, 0, 0.4)",
              borderRadius: "24px",
              boxShadow: "0 25px 50px rgba(0,0,0,0.8), 0 0 40px rgba(255,215,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: "12px", left: "12px", fontSize: "20px", opacity: 0.4 }}>✨</div>
            <div style={{ position: "absolute", top: "12px", right: "12px", fontSize: "20px", opacity: 0.4 }}>✨</div>

            <div className="obby-trophy" style={{ fontSize: "72px", marginBottom: "8px" }}>🏆</div>
            <h1 className="obby-shine-text" style={{ fontSize: "36px", fontWeight: 900, marginBottom: "4px", letterSpacing: "0.02em" }}>
              OBBY COMPLETE!
            </h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", marginBottom: "24px" }}>
              You conquered the Impossible Obby.
            </p>

            {/* Final time card */}
            <div
              style={{
                padding: "20px",
                marginBottom: "16px",
                background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(108,60,224,0.08))",
                border: "1px solid rgba(255,215,0,0.25)",
                borderRadius: "16px",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>
                Final Time
              </div>
              <div className="obby-shine-text" style={{ fontSize: "48px", fontWeight: 900, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                {formatShortTime(finalTime)}
              </div>
              {newBest && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    color: "white",
                    fontWeight: 700,
                    marginTop: "12px",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, #22C55E, #16A34A)",
                    boxShadow: "0 0 16px rgba(34,197,94,0.6)",
                  }}
                >
                  ⭐ NEW PERSONAL BEST
                </div>
              )}
              {submitError && (
                <div style={{ color: "#F87171", fontSize: "12px", marginTop: "12px" }}>⚠️ {submitError}</div>
              )}
            </div>

            {/* Leaderboard */}
            <div
              style={{
                padding: "16px",
                marginBottom: "24px",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>🏆</span>
                  <div style={{ color: "rgba(255,255,255,0.7)", textTransform: "uppercase", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em" }}>
                    Leaderboard
                  </div>
                </div>
                {leaderboard.length > 2 && (
                  <div style={{ color: "#8B5FFF", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>Scroll</span>
                    <span style={{ fontSize: "14px" }}>↓</span>
                  </div>
                )}
              </div>

              {leaderboard.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontStyle: "italic", padding: "16px 0", textAlign: "center" }}>
                  No times recorded yet — be the first!
                </p>
              ) : (
                <div
                  className="obby-scroll"
                  style={{
                    height: "100px",
                    overflowY: "auto",
                    overflowX: "hidden",
                    touchAction: "pan-y",
                    WebkitOverflowScrolling: "touch",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "8px",
                  }}
                  onWheel={(e) => e.stopPropagation()}
                >
                  <ol style={{ fontSize: "14px", margin: 0, padding: 0, listStyle: "none" }}>
                    {leaderboard.map((entry, i) => {
                      const rank = i + 1;
                      const isTop3 = i < 3;
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

                      return (
                        <li
                          key={entry.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0 12px",
                            height: "50px",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            background: isTop3 ? "linear-gradient(90deg, rgba(255,215,0,0.08), transparent 70%)" : "transparent",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "12px",
                                flexShrink: 0,
                                width: "56px",
                                textAlign: "right",
                                color: isTop3 ? "#FFD700" : "rgba(255,255,255,0.5)",
                                fontWeight: isTop3 ? 700 : 400,
                              }}
                            >
                              {medal ? `${medal} ${rank}.` : `${rank}.`}
                            </span>
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: isTop3 ? "white" : "rgba(255,255,255,0.85)",
                                fontWeight: isTop3 ? 700 : 400,
                              }}
                            >
                              {entry.username}
                            </span>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                              flexShrink: 0,
                              marginLeft: "12px",
                              color: isTop3 ? "#FFD700" : "rgba(255,255,255,0.7)",
                            }}
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
              style={{
                width: "100%",
                color: "white",
                fontWeight: 900,
                fontSize: "16px",
                padding: "14px",
                borderRadius: "12px",
                background: "linear-gradient(180deg, #8B5FFF 0%, #6C3CE0 50%, #5A2FC7 100%)",
                border: "2px solid #4A1FA8",
                boxShadow: "0 6px 20px rgba(108,60,224,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
                cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}