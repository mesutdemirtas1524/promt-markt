import { NextRequest, NextResponse } from "next/server";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID_RE = /^[a-z0-9_]{3,24}$/;

/**
 * Check whether a username is available for the current user.
 * Auth required (so we know which existing username to ignore).
 *
 * Returns { available, reason? } where reason is a short error key when
 * the username can't be used: "format", "taken", "self".
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ available: false, reason: "auth" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ available: false, reason: "auth" }, { status: 401 });

  const u = (req.nextUrl.searchParams.get("u") ?? "").trim().toLowerCase();
  if (!VALID_RE.test(u)) {
    return NextResponse.json({ available: false, reason: "format" });
  }

  const supabase = createSupabaseServiceClient();
  const { data: viewer } = await supabase
    .from("users")
    .select("id, username")
    .eq("privy_id", privyId)
    .single();

  if (viewer && viewer.username === u) {
    // It's their current username — count as "available" to themselves
    return NextResponse.json({ available: true, reason: "self" });
  }

  const { data: taken } = await supabase
    .from("users")
    .select("id")
    .eq("username", u)
    .maybeSingle();

  if (taken) return NextResponse.json({ available: false, reason: "taken" });
  return NextResponse.json({ available: true });
}
