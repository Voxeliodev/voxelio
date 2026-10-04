// ============================================================
// POST /api/launcher-token
// ============================================================
// Called by the website when a user clicks "Play in Voxelio App".
// Generates a one-time token that the desktop app can exchange
// for a Supabase session.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin client (bypasses RLS — safe here because it's server-only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Regular client used to verify the user's session
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================
// Generate a cryptographically random 32-char token
// ============================================================
function generateToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 32; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

export async function POST(req: NextRequest) {
  try {
    // ---- 1. Extract the user's session from the Authorization header ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice(7);
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    // ---- 2. Read the world ID from the request body ----
    const body = await req.json().catch(() => ({}));
    const worldId = String(body.worldId || "").trim();
    if (!worldId) {
      return NextResponse.json(
        { error: "Missing worldId" },
        { status: 400 }
      );
    }

    // ---- 3. Generate + store the token ----
    const token = generateToken();

    const { error: insertError } = await supabaseAdmin
      .from("launcher_tokens")
      .insert({
        token,
        user_id: user.id,
        world_id: worldId,
        expires_at: new Date(Date.now() + 60_000).toISOString(), // 60 seconds
        used: false,
      });

    if (insertError) {
      console.error("[launcher-token] insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create token" },
        { status: 500 }
      );
    }

    // ---- 4. Return the token to the browser ----
    return NextResponse.json({
      token,
      expiresIn: 60,
      deepLink: `voxelio://launch?token=${token}`,
    });
  } catch (err) {
    console.error("[launcher-token] unexpected error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}