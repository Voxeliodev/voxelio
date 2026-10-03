import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// POST /api/obby/submit
// Body: { worldId: string, timeMs: number }
// Saves a leaderboard entry for the signed-in user.
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const worldId: unknown = body?.worldId;
    const timeMs: unknown = body?.timeMs;

    // ===== Validate input =====
    if (typeof worldId !== "string" || !worldId) {
      return NextResponse.json({ error: "Missing worldId" }, { status: 400 });
    }
    if (typeof timeMs !== "number" || !Number.isFinite(timeMs)) {
      return NextResponse.json({ error: "Invalid timeMs" }, { status: 400 });
    }

    // ===== Anti-cheat: reject impossible times =====
    // Fastest realistic completion is ~15 seconds
    const MIN_TIME_MS = 15_000;
    const MAX_TIME_MS = 600_000; // 10 minutes

    if (timeMs < MIN_TIME_MS) {
      return NextResponse.json(
        { error: "Time too fast — cheated?" },
        { status: 400 }
      );
    }
    if (timeMs > MAX_TIME_MS) {
      return NextResponse.json(
        { error: "Time too slow, didn't finish" },
        { status: 400 }
      );
    }

    // ===== Get the auth token from the request =====
    const authHeader = req.headers.get("authorization");
    const accessToken =
      authHeader?.replace("Bearer ", "") ||
      req.cookies.get("sb-access-token")?.value;

    // ===== Create an authenticated Supabase client =====
    // We use the service role key from env so we can verify the user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    });

    // ===== Get the signed-in user =====
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // ===== Get their username from profiles =====
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const username = profile?.username || user.email?.split("@")[0] || "Unknown";

    // ===== Check their current best =====
    const { data: currentBest } = await supabase
      .from("obby_leaderboard")
      .select("time_ms")
      .eq("world_id", worldId)
      .eq("user_id", user.id)
      .order("time_ms", { ascending: true })
      .limit(1)
      .maybeSingle();

    const isNewBest = !currentBest || timeMs < currentBest.time_ms;

    // ===== Insert the new entry =====
    const { error: insertError } = await supabase
      .from("obby_leaderboard")
      .insert({
        user_id: user.id,
        username,
        world_id: worldId,
        time_ms: Math.round(timeMs),
      });

    if (insertError) {
      console.error("obby submit error:", insertError.message);
      return NextResponse.json(
        { error: "Failed to save time" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newBest: isNewBest,
      timeMs: Math.round(timeMs),
    });
  } catch (err: any) {
    console.error("obby submit exception:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}