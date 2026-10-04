// ============================================================
// POST /api/launcher-token/exchange
// ============================================================
// Called by the Voxelio Player desktop app when it receives a
// voxelio:// URL with a token. Validates the token, marks it
// used, and returns a fresh Supabase session (access + refresh
// tokens) so the app can act as the user.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(req: NextRequest) {
  try {
    // ---- 1. Read the token from the body ----
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    // ---- 2. Look up the token ----
    const { data: row, error: fetchError } = await supabaseAdmin
      .from("launcher_tokens")
      .select("token, user_id, world_id, expires_at, used")
      .eq("token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("[exchange] fetch error:", fetchError);
      return NextResponse.json(
        { error: "Lookup failed" },
        { status: 500 }
      );
    }

    if (!row) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      );
    }

    if (row.used) {
      return NextResponse.json(
        { error: "Token already used" },
        { status: 410 }
      );
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 410 }
      );
    }

    // ---- 3. Mark the token as used ----
    const { error: updateError } = await supabaseAdmin
      .from("launcher_tokens")
      .update({ used: true })
      .eq("token", token);

    if (updateError) {
      console.error("[exchange] update error:", updateError);
      return NextResponse.json(
        { error: "Failed to redeem token" },
        { status: 500 }
      );
    }

    // ---- 4. Generate a fresh Supabase session for the user ----
    // We use the Admin API to create a signed link (magic link) that
    // the client can use to sign in. This is more secure than
    // returning the user's password or reusing their existing session.
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: (await supabaseAdmin.auth.admin.getUserById(row.user_id)).data
          .user?.email!,
      });

    if (linkError || !linkData) {
      console.error("[exchange] generateLink error:", linkError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Extract the token hash from the magic link URL
    // Example URL: https://xyz.supabase.co/auth/v1/verify?token=abc&type=magiclink&redirect_to=...
    const url = new URL(linkData.properties.action_link);
    const tokenHash = url.searchParams.get("token");
    const type = url.searchParams.get("type") || "magiclink";

    if (!tokenHash) {
      console.error("[exchange] no token in magic link");
      return NextResponse.json(
        { error: "Session creation failed" },
        { status: 500 }
      );
    }

    // ---- 5. Return everything the app needs ----
    return NextResponse.json({
      success: true,
      worldId: row.world_id,
      user: {
        id: row.user_id,
      },
      // The app will use these with supabase.auth.verifyOtp() to sign in
      sessionHandoff: {
        tokenHash,
        type,
      },
    });
  } catch (err) {
    console.error("[exchange] unexpected error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}