import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const REASONS = ["spam", "copyright", "nsfw", "misleading", "other"] as const;

const bodySchema = z.object({
  prompt_id: z.string().uuid(),
  reason: z.enum(REASONS),
  message: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { data: me } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Verify the prompt exists and isn't theirs (creators can't report own)
  const { data: prompt } = await supabase
    .from("prompts")
    .select("id, creator_id")
    .eq("id", parsed.data.prompt_id)
    .maybeSingle();
  if (!prompt) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  if (prompt.creator_id === me.id) {
    return NextResponse.json({ error: "Can't report your own prompt" }, { status: 400 });
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: me.id,
    prompt_id: parsed.data.prompt_id,
    reason: parsed.data.reason,
    message: parsed.data.message?.trim() || null,
  });

  if (error) {
    // Unique-violation on the partial index = already reported, return 200
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
