"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// ============================================================
// /download — Install Voxelio Player
// ============================================================

const GITHUB_REPO = "VoxelioDev/voxelio-player";
const DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/Voxelio-Setup.exe`;

export default function DownloadPage() {
  const [version, setVersion] = useState<string>("1.0.2");
  const [loading, setLoading] = useState(true);

  // Fetch the latest version from GitHub Releases API
  useEffect(() => {
    let cancelled = false;

    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        const tag = String(json.tag_name || "").replace(/^v/, "");
        if (tag) setVersion(tag);
      })
      .catch(() => {
        // Silently fail — keep the default version
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1A1A2E 0%, #0A0A1E 60%, #050510 100%)",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              background: "linear-gradient(90deg, #8B5FFF, #00E5FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.02em",
              lineHeight: 1,
            }}
          >
            VOXELIO PLAYER
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: 16,
              marginTop: 16,
              maxWidth: 500,
              margin: "16px auto 0",
            }}
          >
            Download the Voxelio Player app to play games in full-screen
            without opening your browser.
          </p>
        </div>

        {/* Download card */}
        <div
          style={{
            background:
              "linear-gradient(160deg, rgba(20,15,40,0.9), rgba(10,10,26,0.9))",
            border: "2px solid rgba(139, 95, 255, 0.4)",
            borderRadius: 20,
            padding: 32,
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.6), 0 0 60px rgba(139,95,255,0.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "linear-gradient(135deg, #8B5FFF, #00E5FF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                boxShadow: "0 8px 24px rgba(139,95,255,0.4)",
              }}
            >
              🎮
            </div>
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: "0.02em",
                }}
              >
                Voxelio Player
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {loading ? "Checking version…" : `Version ${version} · Windows`}
              </div>
            </div>
          </div>

          {/* Features */}
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 28px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {[
              "Play any Voxelio game in full-screen",
              "Faster performance than the browser",
              "Sign in automatically from the website",
              "Press Esc to leave a game",
              "Auto-updates to the latest version",
            ].map((text) => (
              <li
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 14,
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #22C55E, #16A34A)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                {text}
              </li>
            ))}
          </ul>

          {/* Download button */}
          <a
            href={DOWNLOAD_URL}
            style={{
              display: "block",
              textAlign: "center",
              background:
                "linear-gradient(180deg, #8B5FFF 0%, #6C3CE0 50%, #5A2FC7 100%)",
              color: "white",
              border: "2px solid #4A1FA8",
              borderRadius: 12,
              padding: "16px 24px",
              fontSize: 16,
              fontWeight: 900,
              textDecoration: "none",
              boxShadow:
                "0 6px 20px rgba(108,60,224,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
              letterSpacing: "0.02em",
            }}
          >
            ⬇ Download for Windows
          </a>

          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            By downloading, you agree to the Voxelio Terms of Service.
          </div>
        </div>

        {/* Back to games */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link
            href="/games"
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            ← Back to games
          </Link>
        </div>
      </div>
    </div>
  );
}