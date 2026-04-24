import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  prompt_id: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { prompt_id, stars } = parsed.data;

  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: prompt } = await supabase
    .from("prompts")
    .select("id, price_sol, creator_id")
    .eq("id", prompt_id)
    .single();
  if (!prompt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (Number(prompt.price_sol) === 0) {
    return NextResponse.json({ error: "Free prompts cannot be rated" }, { status: 400 });
  }
  if (prompt.creator_id === user.id) {
    return NextResponse.json({ error: "Cannot rate your own prompt" }, { status: 400 });
  }

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("prompt_id", prompt_id)
    .maybeSingle();
  if (!purchase) {
    return NextResponse.json({ error: "Only buyers can rate" }, { status: 403 });
  }

  const { error } = await supabase
    .from("ratings")
    .upsert(
      { rater_id: user.id, prompt_id, stars },
      { onConflict: "rater_id,prompt_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
