import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PROMPT_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(PROMPT_LIMITS.title.min).max(PROMPT_LIMITS.title.max),
  description: z.string().min(PROMPT_LIMITS.description.min).max(PROMPT_LIMITS.description.max),
  prompt_text: z.string().min(PROMPT_LIMITS.promptText.min).max(PROMPT_LIMITS.promptText.max),
  price_sol: z.number().min(0).max(PROMPT_LIMITS.price.max),
  category_id: z.number().int().nullable(),
  platform_ids: z.array(z.number().int()).max(10),
  image_urls: z.array(z.string().url()).min(PROMPT_LIMITS.images.min).max(PROMPT_LIMITS.images.max),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const raw = await req.json();
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  if (input.price_sol > 0 && input.price_sol < 0.0001) {
    return NextResponse.json({ error: "Paid prompts must be at least 0.0001 SOL" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: prompt, error: pErr } = await supabase
    .from("prompts")
    .insert({
      creator_id: user.id,
      title: input.title.trim(),
      description: input.description.trim(),
      prompt_text: input.prompt_text.trim(),
      price_sol: input.price_sol,
      category_id: input.category_id,
    })
    .select()
    .single();

  if (pErr || !prompt) {
    return NextResponse.json({ error: pErr?.message ?? "Failed to create" }, { status: 500 });
  }

  const imageRows = input.image_urls.map((url, i) => ({
    prompt_id: prompt.id,
    image_url: url,
    position: i + 1,
  }));
  const { error: imgErr } = await supabase.from("prompt_images").insert(imageRows);
  if (imgErr) {
    await supabase.from("prompts").delete().eq("id", prompt.id);
    return NextResponse.json({ error: imgErr.message }, { status: 500 });
  }

  if (input.platform_ids.length > 0) {
    const platformRows = input.platform_ids.map((pid) => ({
      prompt_id: prompt.id,
      platform_id: pid,
    }));
    await supabase.from("prompt_platforms").insert(platformRows);
  }

  return NextResponse.json({ prompt_id: prompt.id });
}
