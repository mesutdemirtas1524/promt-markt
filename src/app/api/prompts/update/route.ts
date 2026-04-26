import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PROMPT_LIMITS } from "@/lib/constants";
import { fetchSolUsdPriceServer, usdToSol } from "@/lib/sol-price-server";

export const runtime = "nodejs";

const coverSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
});

const updateSchema = z.object({
  prompt_id: z.string().uuid(),
  title: z.string().min(PROMPT_LIMITS.title.min).max(PROMPT_LIMITS.title.max),
  description: z.string().min(PROMPT_LIMITS.description.min).max(PROMPT_LIMITS.description.max),
  prompt_text: z.string().min(PROMPT_LIMITS.promptText.min).max(PROMPT_LIMITS.promptText.max),
  price_usd: z.number().min(0).max(PROMPT_LIMITS.price.max),
  category_id: z.number().int().nullable().optional(),
  category_ids: z.array(z.number().int()).max(10).optional(),
  platform_ids: z.array(z.number().int()).max(10),
  // Three-state cover: undefined = leave alone, null = clear (fall back to
  // first gallery image), object = replace.
  cover: coverSchema.nullable().optional(),
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

  if (input.price_usd > 0 && input.price_usd < PROMPT_LIMITS.price.minPaid) {
    return NextResponse.json(
      { error: `Paid prompts must be at least $${PROMPT_LIMITS.price.minPaid}` },
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

  let priceSol = 0;
  if (input.price_usd > 0) {
    const solUsd = await fetchSolUsdPriceServer();
    if (!solUsd) {
      return NextResponse.json(
        { error: "Live SOL price unavailable. Try again in a moment." },
        { status: 503 }
      );
    }
    priceSol = Math.round(usdToSol(input.price_usd, solUsd) * 1_000_000) / 1_000_000;
  }

  const categoryIds = Array.from(
    new Set(
      [
        ...(input.category_ids ?? []),
        ...(typeof input.category_id === "number" ? [input.category_id] : []),
      ].filter((n) => Number.isFinite(n))
    )
  );
  const primaryCategoryId = categoryIds[0] ?? null;

  const updates: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description.trim(),
    prompt_text: input.prompt_text.trim(),
    price_usd: input.price_usd,
    price_sol: priceSol,
    category_id: primaryCategoryId,
  };
  if (input.cover !== undefined) {
    updates.cover_image_url = input.cover?.url ?? null;
    updates.cover_width = input.cover?.width ?? null;
    updates.cover_height = input.cover?.height ?? null;
  }

  const { error: updErr } = await supabase
    .from("prompts")
    .update(updates)
    .eq("id", input.prompt_id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await supabase.from("prompt_platforms").delete().eq("prompt_id", input.prompt_id);
  if (input.platform_ids.length > 0) {
    const rows = input.platform_ids.map((pid) => ({ prompt_id: input.prompt_id, platform_id: pid }));
    await supabase.from("prompt_platforms").insert(rows);
  }

  // Re-sync the categories join table when the client posted any
  // category fields. (If neither is present we leave it alone.)
  if (input.category_ids !== undefined || input.category_id !== undefined) {
    await supabase.from("prompt_categories").delete().eq("prompt_id", input.prompt_id);
    if (categoryIds.length > 0) {
      const rows = categoryIds.map((cid) => ({ prompt_id: input.prompt_id, category_id: cid }));
      await supabase.from("prompt_categories").insert(rows);
    }
  }

  // Edits change title, description, price — invalidate the feeds so the
  // change appears immediately even though /prompt/[id] itself is dynamic.
  revalidatePath("/");
  revalidatePath("/new");

  return NextResponse.json({ ok: true });
}
