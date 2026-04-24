import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({ prompt_id: z.string().uuid() });

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: prompt } = await supabase
    .from("prompts")
    .select("id, price_sol, status, creator_id")
    .eq("id", parsed.data.prompt_id)
    .single();
  if (!prompt || prompt.status !== "active") {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }
  if (Number(prompt.price_sol) > 0) {
    return NextResponse.json({ error: "Prompt is not free" }, { status: 400 });
  }
  if (prompt.creator_id === user.id) {
    return NextResponse.json({ ok: true, already: true });
  }

  await supabase
    .from("purchases")
    .upsert(
      { buyer_id: user.id, prompt_id: prompt.id, price_paid_sol: 0 },
      { onConflict: "buyer_id,prompt_id", ignoreDuplicates: true }
    );

  return NextResponse.json({ ok: true });
}
