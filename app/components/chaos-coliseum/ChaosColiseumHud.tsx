"use client";

import { useEffect, useState } from "react";
import { PLAYER_MAX_HP } from "../../../lib/chaosColiseum";

// ============================================================
// CHAOS COLISEUM — HUD overlay
// ============================================================

export type KillFeedEntry = {
  id: string;
  killerName: string;
  victimName: string;
  timestamp: number;
};

type PlayerScore = {
  id: string;
  username: string;
  kills: number;
  deaths: number;
  alive: boolean;
};

type Props = {
  localUsername: string;
  localHp: number;
  localAlive: boolean;
  localKills: number;
  localDeaths: number;
  respawnSecondsLeft: number;      // 0 when alive
  players: PlayerScore[];          // all players including local
  killFeed: KillFeedEntry[];
  roundTimeLeft: number;           // seconds
  roundOver: boolean;
  localWon: boolean;
  onRestart: () => void;
};

// ============================================================
// KILL FEED ENTRY
// ============================================================
function KillFeedRow({ entry }: { entry: KillFeedEntry }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: "linear-gradient(90deg, rgba(0,0,0,0.85), rgba(30,10,20,0.75))",
        border: "1px solid rgba(239, 68, 68, 0.35)",
        borderLeft: "3px solid #EF4444",
        borderRadius: "8px",
        color: "white",
        fontSize: 12,
        fontWeight: 700,
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "chaos-feed-in 0.25s ease-out",
      }}
    >
      <span style={{ color: "#22C55E" }}>{entry.killerName}</span>
      <span style={{ fontSize: 14 }}>⚔️</span>
      <span style={{ color: "#EF4444" }}>{entry.victimName}</span>
    </div>
  );
}

// ============================================================
// MAIN HUD
// ============================================================
export default function ChaosColiseumHud({
  localUsername,
  localHp,
  localAlive,
  localKills,
  localDeaths,
  respawnSecondsLeft,
  players,
  killFeed,
  roundTimeLeft,
  roundOver,
  localWon,
  onRestart,
}: Props) {
  const hpPercent = Math.max(0, Math.min(100, (localHp / PLAYER_MAX_HP) * 100));

  // Color-code HP bar
  const hpColor =
    hpPercent > 66 ? "#22C55E" :
    hpPercent > 33 ? "#FBBF24" :
    "#EF4444";

  // Sort players by kills for the mini leaderboard
  const sortedPlayers = [...players].sort((a, b) => b.kills - a.kills);

  // Format time
  const mins = Math.floor(Math.max(0, roundTimeLeft) / 60);
  const secs = Math.floor(Math.max(0, roundTimeLeft) % 60);
  const timeStr = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <>
      <style jsx global>{`
        @keyframes chaos-feed-in {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes chaos-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.05); opacity: 0.85; }
        }
        @keyframes chaos-pop {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes chaos-shine {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .chaos-shine {
          background: linear-gradient(90deg, #FFD700 0%, #FFF8B0 40%, #FFD700 60%, #FFD700 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: chaos-shine 3s linear infinite;
        }
        .chaos-panel {
          background: linear-gradient(135deg, rgba(0,0,0,0.85), rgba(20,5,15,0.85));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          box-shadow:
            0 8px 24px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
      `}</style>

      {/* ============================================================ */}
      {/* TOP-LEFT: KILLS */}
      {/* ============================================================ */}
      <div
        className="chaos-panel absolute z-30"
        style={{
          top: "80px",
          left: "12px",
          padding: "10px 16px",
          minWidth: "100px",
          borderColor: "rgba(34, 197, 94, 0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em" }}>
          <span style={{ fontSize: 14 }}>⚔️</span>
          <span>Kills</span>
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#22C55E", lineHeight: 1, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
          {localKills}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TOP-CENTER: ROUND TIMER + ALIVE COUNT */}
      {/* ============================================================ */}
      <div className="absolute z-30" style={{ top: "12px", left: "50%", transform: "translateX(-50%)" }}>
        <div
          className="chaos-panel"
          style={{
            padding: "8px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: 140,
            borderColor: "rgba(255, 215, 0, 0.35)",
          }}
        >
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.15em" }}>
            Round Time
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "white", fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginTop: 2 }}>
            {timeStr}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TOP-RIGHT: DEATHS + K/D */}
      {/* ============================================================ */}
      <div
        className="chaos-panel absolute z-30"
        style={{
          top: "80px",
          right: "12px",
          padding: "10px 16px",
          minWidth: "100px",
          borderColor: "rgba(239, 68, 68, 0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em" }}>
          <span style={{ fontSize: 14 }}>💀</span>
          <span>Deaths</span>
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#EF4444", lineHeight: 1, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
          {localDeaths}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4, letterSpacing: "0.05em" }}>
          K/D {localDeaths === 0 ? localKills.toFixed(2) : (localKills / localDeaths).toFixed(2)}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TOP-CENTER BELOW TIMER: MINI LEADERBOARD */}
      {/* ============================================================ */}
      <div
        className="chaos-panel absolute z-30"
        style={{
          top: "86px",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "8px 12px",
          minWidth: "200px",
          borderColor: "rgba(139, 95, 255, 0.35)",
        }}
      >
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.12em", marginBottom: 6, textAlign: "center" }}>
          Scoreboard
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {sortedPlayers.map((p, i) => {
            const isMe = p.username === localUsername;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 11,
                  padding: "3px 6px",
                  borderRadius: 4,
                  background: isMe ? "rgba(139, 95, 255, 0.2)" : "transparent",
                  border: isMe ? "1px solid rgba(139, 95, 255, 0.4)" : "1px solid transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                  <span style={{ color: i === 0 ? "#FFD700" : "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: 10, width: 14, textAlign: "right" }}>
                    {i + 1}.
                  </span>
                  <span style={{ color: p.alive ? (isMe ? "white" : "rgba(255,255,255,0.85)") : "rgba(255,255,255,0.4)", fontWeight: isMe ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.username}
                  </span>
                  {!p.alive && <span style={{ fontSize: 10, color: "#EF4444" }}>☠️</span>}
                </div>
                <span style={{ color: "#22C55E", fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {p.kills}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* BOTTOM-CENTER: LOCAL HP BAR */}
      {/* ============================================================ */}
      {localAlive && (
        <div
          className="absolute z-30"
          style={{
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(440px, 80vw)",
          }}
        >
          <div className="chaos-panel" style={{ padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em" }}>
                Health
              </span>
              <span style={{ fontSize: 14, fontWeight: 900, color: hpColor, fontVariantNumeric: "tabular-nums" }}>
                {Math.round(localHp)} / {PLAYER_MAX_HP}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 14,
                background: "rgba(0,0,0,0.6)",
                borderRadius: 7,
                overflow: "hidden",
                border: "1px solid rgba(0,0,0,0.9)",
              }}
            >
              <div
                style={{
                  width: `${hpPercent}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${hpColor}, ${hpColor}DD)`,
                  borderRadius: 6,
                  transition: "width 0.2s ease-out, background 0.3s ease-out",
                  boxShadow: `0 0 12px ${hpColor}99`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BOTTOM-LEFT: KILL FEED */}
      {/* ============================================================ */}
      <div
        className="absolute z-30"
        style={{
          bottom: "100px",
          left: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: "260px",
        }}
      >
        {killFeed.map((entry) => (
          <KillFeedRow key={entry.id} entry={entry} />
        ))}
      </div>

      {/* ============================================================ */}
      {/* RESPAWN OVERLAY (when dead, but round isn't over) */}
      {/* ============================================================ */}
      {!localAlive && !roundOver && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ background: "radial-gradient(circle at center, rgba(180,0,0,0.25) 0%, rgba(0,0,0,0.75) 70%)" }}
        >
          <div style={{ textAlign: "center", animation: "chaos-pop 0.4s ease-out" }}>
            <div style={{ fontSize: 80, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(239,68,68,0.7))" }}>💀</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#EF4444", letterSpacing: "0.05em", textShadow: "0 0 20px rgba(239,68,68,0.8)" }}>
              YOU DIED
            </div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginTop: 16, fontWeight: 700 }}>
              Respawning in
            </div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: "white",
                marginTop: 4,
                fontVariantNumeric: "tabular-nums",
                textShadow: "0 0 30px rgba(255,255,255,0.6)",
                animation: "chaos-pulse 1s ease-in-out infinite",
              }}
            >
              {Math.max(0, Math.ceil(respawnSecondsLeft))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* END-OF-ROUND OVERLAY */}
      {/* ============================================================ */}
      {roundOver && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        >
          <div
            style={{
              padding: "36px",
              width: "100%",
              maxWidth: 520,
              margin: "0 16px",
              textAlign: "center",
              background: localWon
                ? "linear-gradient(160deg, #1A2E1A 0%, #0F2210 50%, #0A1E0A 100%)"
                : "linear-gradient(160deg, #2E1A1A 0%, #220F0F 50%, #1E0A0A 100%)",
              border: `2px solid ${localWon ? "rgba(255, 215, 0, 0.5)" : "rgba(239, 68, 68, 0.5)"}`,
              borderRadius: 24,
              boxShadow: localWon
                ? "0 25px 50px rgba(0,0,0,0.8), 0 0 60px rgba(255,215,0,0.3)"
                : "0 25px 50px rgba(0,0,0,0.8), 0 0 60px rgba(239,68,68,0.3)",
              animation: "chaos-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <div style={{ fontSize: 80, marginBottom: 8, filter: localWon ? "drop-shadow(0 8px 20px rgba(255,215,0,0.6))" : "drop-shadow(0 8px 20px rgba(239,68,68,0.4))" }}>
              {localWon ? "🏆" : "💀"}
            </div>
            <h1
              className={localWon ? "chaos-shine" : ""}
              style={{
                fontSize: 42,
                fontWeight: 900,
                marginBottom: 8,
                letterSpacing: "0.02em",
                color: localWon ? undefined : "#EF4444",
                textShadow: localWon ? undefined : "0 0 20px rgba(239,68,68,0.6)",
              }}
            >
              {localWon ? "VICTORY!" : "DEFEAT"}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 24 }}>
              {localWon ? "You ruled the Chaos Coliseum." : "Better luck next round."}
            </p>

            {/* Final stats */}
            <div
              style={{
                padding: 20,
                marginBottom: 24,
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em" }}>
                    Kills
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#22C55E", fontVariantNumeric: "tabular-nums" }}>
                    {localKills}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em" }}>
                    Deaths
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#EF4444", fontVariantNumeric: "tabular-nums" }}>
                    {localDeaths}
                  </div>
                </div>
              </div>
            </div>

            {/* Final standings */}
            <div
              style={{
                padding: 16,
                marginBottom: 24,
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>
                Final Standings
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sortedPlayers.map((p, i) => {
                  const isMe = p.username === localUsername;
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: isMe ? "rgba(139, 95, 255, 0.15)" : "transparent",
                        border: isMe ? "1px solid rgba(139, 95, 255, 0.35)" : "1px solid transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                        </span>
                        <span style={{ color: isMe ? "white" : "rgba(255,255,255,0.85)", fontWeight: isMe ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 }}>
                          {p.username}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                        <span style={{ color: "#22C55E", fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                          {p.kills} K
                        </span>
                        <span style={{ color: "#EF4444", fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                          {p.deaths} D
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={onRestart}
              style={{
                width: "100%",
                color: "white",
                fontWeight: 900,
                fontSize: 16,
                padding: "14px",
                borderRadius: 12,
                background: "linear-gradient(180deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)",
                border: "2px solid #991B1B",
                boxShadow: "0 6px 20px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
                cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              ⚔️ Play Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}