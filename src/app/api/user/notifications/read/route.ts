import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }),
]);

/**
 * Mark notifications as read. Either:
 *   { all: true } — mark every unread notification for this user
 *   { ids: [...] } — mark specific ones (must belong to caller)
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "auth" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "auth" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { data: me } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!me) return NextResponse.json({ error: "no user" }, { status: 404 });

  const now = new Date().toISOString();
  let q = supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("recipient_id", me.id)
    .is("read_at", null);

  if ("ids" in parsed.data) {
    q = q.in("id", parsed.data.ids);
  }

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
