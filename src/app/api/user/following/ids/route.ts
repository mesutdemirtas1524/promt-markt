import { NextRequest, NextResponse } from "next/server";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Returns the list of user IDs that the signed-in user follows. */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ ids: [] });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ ids: [] });

  const supabase = createSupabaseServiceClient();
  const { data: me } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!me) return NextResponse.json({ ids: [] });

  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", me.id);
  return NextResponse.json(
    { ids: (data ?? []).map((r) => r.following_id as string) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
