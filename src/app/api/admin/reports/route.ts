import { NextRequest, NextResponse } from "next/server";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PLATFORM_WALLET } from "@/lib/constants";

export const runtime = "nodejs";

async function requirePlatformOwner(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: NextResponse.json({ error: "auth" }, { status: 401 }) };
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return { error: NextResponse.json({ error: "auth" }, { status: 401 }) };
  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, wallet_address")
    .eq("privy_id", privyId)
    .single();
  if (!user) return { error: NextResponse.json({ error: "no user" }, { status: 401 }) };
  if (user.wallet_address !== PLATFORM_WALLET) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { supabase, adminId: user.id };
}

/** List reports, default = open. ?status=all|open|removed|dismissed */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformOwner(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const status = req.nextUrl.searchParams.get("status") ?? "open";

  let q = supabase
    .from("reports")
    .select(
      `
      id, reason, message, status, created_at, reviewed_at, reviewer_note,
      reporter:users!reporter_id ( username, display_name ),
      prompt:prompts!prompt_id (
        id, title, status, creator:users!creator_id ( username, display_name ),
        images:prompt_images ( image_url, position )
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") q = q.eq("status", status);

  const { data } = await q;
  return NextResponse.json({ items: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
