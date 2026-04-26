import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PROMPT_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

const updateSchema = z.object({
  prompt_id: z.string().uuid(),
  title: z.string().min(PROMPT_LIMITS.title.min).max(PROMPT_LIMITS.title.max),
  description: z.string().min(PROMPT_LIMITS.description.min).max(PROMPT_LIMITS.description.max),
  prompt_text: z.string().min(PROMPT_LIMITS.promptText.min).max(PROMPT_LIMITS.promptText.max),
  price_sol: z.number().min(0).max(PROMPT_LIMITS.price.max),
  category_id: z.number().int().nullable(),
  platform_ids: z.array(z.number().int()).max(10),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  if (input.price_sol > 0 && input.price_sol < PROMPT_LIMITS.price.minPaid) {
    return NextResponse.json(
      { error: `Paid prompts must be at least ${PROMPT_LIMITS.price.minPaid} SOL` },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: existing } = await supabase
    .from("prompts")
    .select("creator_id")
    .eq("id", input.prompt_id)
    .single();
  if (!existing) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  if (existing.creator_id !== user.id) {
    return NextResponse.json({ error: "Not your prompt" }, { status: 403 });
  }

  const { error: updErr } = await supabase
    .from("prompts")
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      prompt_text: input.prompt_text.trim(),
      price_sol: input.price_sol,
      category_id: input.category_id,
    })
    .eq("id", input.prompt_id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await supabase.from("prompt_platforms").delete().eq("prompt_id", input.prompt_id);
  if (input.platform_ids.length > 0) {
    const rows = input.platform_ids.map((pid) => ({ prompt_id: input.prompt_id, platform_id: pid }));
    await supabase.from("prompt_platforms").insert(rows);
  }

  // Edits change title, description, price — invalidate the feeds so the
  // change appears immediately even though /prompt/[id] itself is dynamic.
  revalidatePath("/");
  revalidatePath("/new");

  return NextResponse.json({ ok: true });
}
