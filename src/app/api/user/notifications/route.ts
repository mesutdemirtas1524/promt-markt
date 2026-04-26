import { NextRequest, NextResponse } from "next/server";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * List the signed-in user's notifications, paginated.
 * Also returns the total unread count so the navbar bell can show a badge.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ items: [], unreadCount: 0 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ items: [], unreadCount: 0 });

  const supabase = createSupabaseServiceClient();
  const { data: me } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!me) return NextResponse.json({ items: [], unreadCount: 0 });

  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10)));
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10));

  // Fetch notifications + actor info + prompt title in one round-trip
  const { data } = await supabase
    .from("notifications")
    .select(
      `
      id, kind, created_at, read_at, amount_sol, message,
      actor:users!actor_id ( username, display_name, avatar_url ),
      prompt:prompts!prompt_id ( id, title )
    `
    )
    .eq("recipient_id", me.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", me.id)
    .is("read_at", null);

  // Flatten relational shape (Supabase sometimes returns arrays)
  const items = (data ?? []).map((n) => {
    const actor = Array.isArray(n.actor) ? n.actor[0] : n.actor;
    const prompt = Array.isArray(n.prompt) ? n.prompt[0] : n.prompt;
    return {
      id: n.id,
      kind: n.kind,
      created_at: n.created_at,
      read_at: n.read_at,
      amount_sol: n.amount_sol,
      message: n.message,
      actor: actor ?? null,
      prompt: prompt ?? null,
    };
  });

  return NextResponse.json(
    { items, unreadCount: unreadCount ?? 0 },
    { headers: { "Cache-Control": "no-store" } }
  );
}
