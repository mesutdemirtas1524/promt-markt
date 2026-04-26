import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  prompt_id: z.string().uuid(),
});

/**
 * Record a prompt detail-page view. Fire-and-forget from the client;
 * the unique index dedups within a 24h window so we don't inflate
 * counts on refresh-spam.
 *
 * Anonymous visitors are deduped by a salted hash of their IP — never
 * the raw IP. The salt is rotated daily via the `day` column so the
 * same viewer on different days counts as two views.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createSupabaseServiceClient();

  // Identify the viewer if signed in; otherwise hash the request IP.
  let viewerId: string | null = null;
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token) {
    const privyId = await verifyPrivyToken(token);
    if (privyId) {
      const { data: me } = await supabase
        .from("users")
        .select("id")
        .eq("privy_id", privyId)
        .maybeSingle();
      viewerId = me?.id ?? null;
    }
  }

  let ipHash: string | null = null;
  if (!viewerId) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "0.0.0.0";
    const salt = process.env.VIEW_HASH_SALT ?? "pm-views-v1";
    ipHash = crypto.createHash("sha256").update(`${ip}|${salt}`).digest("hex").slice(0, 32);
  }

  // Don't credit a creator's view of their own prompt.
  if (viewerId) {
    const { data: prompt } = await supabase
      .from("prompts")
      .select("creator_id")
      .eq("id", parsed.data.prompt_id)
      .maybeSingle();
    if (prompt?.creator_id === viewerId) {
      return NextResponse.json({ ok: true, skipped: "self" });
    }
  }

  const { error } = await supabase.from("prompt_views").insert({
    prompt_id: parsed.data.prompt_id,
    viewer_id: viewerId,
    ip_hash: ipHash,
  });

  // 23505 = unique violation = already counted today; that's success.
  if (error && error.code !== "23505") {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
