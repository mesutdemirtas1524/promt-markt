import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  prompt_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: existing } = await supabase
    .from("prompts")
    .select("creator_id, status")
    .eq("id", parsed.data.prompt_id)
    .single();
  if (!existing) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  if (existing.creator_id !== user.id) {
    return NextResponse.json({ error: "Not your prompt" }, { status: 403 });
  }

  // Soft delete so existing buyers retain access via their purchase records.
  const { error } = await supabase
    .from("prompts")
    .update({ status: "removed" })
    .eq("id", parsed.data.prompt_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
