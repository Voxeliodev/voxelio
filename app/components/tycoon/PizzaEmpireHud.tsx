"use client";

import { useState } from "react";
import {
  formatCoins,
  type PizzaEmpireProgress,
} from "../../../lib/pizzaEmpireProgress";

// ============================================================
// PIZZA EMPIRE — HUD overlay
// ============================================================
// Top bar with coins, income rate, and stats. Bottom-right has
// a small controls legend. Optional "Reset Empire" button in a
// small menu for starting over.
// ============================================================

type Props = {
  progress: PizzaEmpireProgress;
  incomePerSecond: number;
  ownedOvens: number;
  totalOvens: number;
  onReset: () => void;
};

// ============================================================
// INCOME RATE FORMATTER
// ============================================================
function formatIncome(rate: number): string {
  if (rate < 10) return rate.toFixed(1);
  if (rate < 1000) return Math.round(rate).toString();
  if (rate < 1_000_000) return `${(rate / 1000).toFixed(1)}K`;
  if (rate < 1_000_000_000) return `${(rate / 1_000_000).toFixed(1)}M`;
  return `${(rate / 1_000_000_000).toFixed(1)}B`;
}

export default function PizzaEmpireHud({
  progress,
  incomePerSecond,
  ownedOvens,
  totalOvens,
  onReset,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <>
      {/* ============================================================ */}
      {/* TOP-LEFT: COINS PANEL */}
      {/* ============================================================ */}
      <div
        className="absolute top-3 left-3 z-30"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Coins display — the star of the show */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(30,15,5,0.95), rgba(15,8,2,0.95))",
            border: "2px solid #FFD700",
            borderRadius: 14,
            padding: "10px 18px",
            minWidth: 200,
            boxShadow:
              "0 8px 24px rgba(0,0,0,0.6), 0 0 24px rgba(255, 215, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              color: "rgba(255,215,0,0.7)",
              textTransform: "uppercase",
              fontWeight: 900,
              letterSpacing: "0.12em",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            <span style={{ fontSize: 12 }}>🪙</span>
            <span>Coins</span>
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: "#FFD700",
              lineHeight: 1,
              marginTop: 4,
              textShadow: "0 0 20px rgba(255,215,0,0.5)",
              fontVariantNumeric: "tabular-nums",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {formatCoins(progress.coins)}
          </div>
        </div>

        {/* Income rate */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(0,40,15,0.9), rgba(0,20,8,0.9))",
            border: "1px solid rgba(34, 197, 94, 0.5)",
            borderRadius: 12,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow:
              "0 6px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <span style={{ fontSize: 18 }}>📈</span>
          <div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(34, 197, 94, 0.7)",
                textTransform: "uppercase",
                fontWeight: 900,
                letterSpacing: "0.1em",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Income
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "#22C55E",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              +{formatIncome(incomePerSecond)}/s
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TOP-RIGHT: STATS + MENU */}
      {/* ============================================================ */}
      <div
        className="absolute top-3 right-3 z-30"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        {/* Ovens owned */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(30,10,5,0.9), rgba(15,5,2,0.9))",
            border: "1px solid rgba(255, 107, 0, 0.5)",
            borderRadius: 12,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow:
              "0 6px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <span style={{ fontSize: 18 }}>🔥</span>
          <div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255, 107, 0, 0.75)",
                textTransform: "uppercase",
                fontWeight: 900,
                letterSpacing: "0.1em",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Ovens
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "#FF6B00",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {ownedOvens} / {totalOvens}
            </div>
          </div>
        </div>

        {/* Stats panel */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(20,15,40,0.9), rgba(10,8,20,0.9))",
            border: "1px solid rgba(139, 95, 255, 0.4)",
            borderRadius: 12,
            padding: "10px 14px",
            minWidth: 180,
            boxShadow:
              "0 6px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "rgba(139, 95, 255, 0.7)",
              textTransform: "uppercase",
              fontWeight: 900,
              letterSpacing: "0.1em",
              marginBottom: 6,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            📊 Stats
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              fontSize: 11,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.55)" }}>
                Pizzas cooked
              </span>
              <span
                style={{
                  color: "white",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatCoins(progress.totalPizzasCooked)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.55)" }}>
                Total earned
              </span>
              <span
                style={{
                  color: "#FFD700",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatCoins(progress.totalEarned)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.55)" }}>
                Total spent
              </span>
              <span
                style={{
                  color: "#EF4444",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatCoins(progress.totalSpent)}
              </span>
            </div>
          </div>
        </div>

        {/* Menu button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            background: "rgba(0,0,0,0.7)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 10,
            color: "white",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <span>⚙️</span>
          <span>Menu</span>
        </button>

        {/* Menu dropdown */}
        {menuOpen && (
          <div
            style={{
              background:
                "linear-gradient(160deg, #1A1A2E 0%, #0F0F22 100%)",
              border: "2px solid rgba(139, 95, 255, 0.5)",
              borderRadius: 12,
              padding: 8,
              minWidth: 180,
              boxShadow:
                "0 20px 40px rgba(0,0,0,0.7), 0 0 30px rgba(139,95,255,0.2)",
            }}
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                setConfirmReset(true);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: 8,
                color: "#EF4444",
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 12px",
                cursor: "pointer",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              🔄 Reset Empire
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* BOTTOM-CENTER: CONTROLS LEGEND */}
      {/* ============================================================ */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 hidden md:block"
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 999,
            padding: "6px 16px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 11,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 4,
                padding: "1px 6px",
                fontFamily: "monospace",
                fontSize: 10,
              }}
            >
              WASD
            </kbd>
            Move
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 4,
                padding: "1px 6px",
                fontFamily: "monospace",
                fontSize: 10,
              }}
            >
              Space
            </kbd>
            Jump
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 4,
                padding: "1px 6px",
                fontFamily: "monospace",
                fontSize: 10,
              }}
            >
              Right-click
            </kbd>
            Camera
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 4,
                padding: "1px 6px",
                fontFamily: "monospace",
                fontSize: 10,
              }}
            >
              Click
            </kbd>
            Buy / Upgrade
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RESET CONFIRM OVERLAY */}
      {/* ============================================================ */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={() => setConfirmReset(false)}
        >
          <div
            style={{
              background:
                "linear-gradient(160deg, #1A1A2E 0%, #0F0F22 50%, #0A0A1E 100%)",
              border: "2px solid rgba(239, 68, 68, 0.5)",
              borderRadius: 20,
              padding: 32,
              maxWidth: 400,
              margin: "0 16px",
              textAlign: "center",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(239,68,68,0.2)",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "white",
                marginBottom: 8,
              }}
            >
              Reset Your Empire?
            </div>
            <div
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.65)",
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              This will delete all your coins, ovens, and stats. You
              can&apos;t undo this.
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => {
                  onReset();
                  setConfirmReset(false);
                }}
                style={{
                  background:
                    "linear-gradient(180deg, #EF4444 0%, #DC2626 100%)",
                  border: "2px solid #991B1B",
                  borderRadius: 10,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 900,
                  padding: "10px 20px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239,68,68,0.4)",
                }}
              >
                Reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "10px 20px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}