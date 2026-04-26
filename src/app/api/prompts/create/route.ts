import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PROMPT_LIMITS } from "@/lib/constants";
import { fetchSolUsdPriceServer, usdToSol } from "@/lib/sol-price-server";

export const runtime = "nodejs";

const imageSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
});

const createSchema = z.object({
  title: z.string().min(PROMPT_LIMITS.title.min).max(PROMPT_LIMITS.title.max),
  description: z.string().min(PROMPT_LIMITS.description.min).max(PROMPT_LIMITS.description.max),
  prompt_text: z.string().min(PROMPT_LIMITS.promptText.min).max(PROMPT_LIMITS.promptText.max),
  price_usd: z.number().min(0).max(PROMPT_LIMITS.price.max),
  // Backwards-compatible: accept the old single category_id, the new
  // category_ids array, or both. We persist all of them via the join
  // table; category_id is also written for legacy reads.
  category_id: z.number().int().nullable().optional(),
  category_ids: z.array(z.number().int()).max(10).optional(),
  platform_ids: z.array(z.number().int()).max(10),
  cover: imageSchema.nullable().optional(),
  // Backwards-compatible: accept the old string-array shape OR the new
  // object-with-dims shape so the API doesn't break in flight.
  image_urls: z.array(z.string().url()).min(PROMPT_LIMITS.images.min).max(PROMPT_LIMITS.images.max).optional(),
  images: z.array(imageSchema).min(PROMPT_LIMITS.images.min).max(PROMPT_LIMITS.images.max).optional(),
}).refine((d) => d.images || d.image_urls, { message: "Provide images or image_urls" });

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

  if (input.price_usd > 0 && input.price_usd < PROMPT_LIMITS.price.minPaid) {
    return NextResponse.json(
      { error: `Paid prompts must be at least $${PROMPT_LIMITS.price.minPaid}` },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Cache a SOL value at upload-time so display works even if the live
  // price service is later unavailable. Checkout always recomputes from
  // the live rate, so this cached number is never used for billing.
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

  // Resolve cover: explicit upload > first gallery image fallback.
  const imageInputsEarly: { url: string; width?: number; height?: number }[] =
    input.images ?? (input.image_urls ?? []).map((url) => ({ url }));
  const cover = input.cover ?? imageInputsEarly[0] ?? null;

  // Resolve a normalized list of category IDs. category_ids wins, but if
  // only the legacy single category_id was sent we fold it in.
  const categoryIds = Array.from(
    new Set(
      [
        ...(input.category_ids ?? []),
        ...(typeof input.category_id === "number" ? [input.category_id] : []),
      ].filter((n) => Number.isFinite(n))
    )
  );
  const primaryCategoryId = categoryIds[0] ?? null;

  const { data: prompt, error: pErr } = await supabase
    .from("prompts")
    .insert({
      creator_id: user.id,
      title: input.title.trim(),
      description: input.description.trim(),
      prompt_text: input.prompt_text.trim(),
      price_usd: input.price_usd,
      price_sol: priceSol,
      category_id: primaryCategoryId,
      cover_image_url: cover?.url ?? null,
      cover_width: cover?.width ?? null,
      cover_height: cover?.height ?? null,
    })
    .select()
    .single();

  if (pErr || !prompt) {
    return NextResponse.json({ error: pErr?.message ?? "Failed to create" }, { status: 500 });
  }

  const imageRows = imageInputsEarly.map((img, i) => ({
    prompt_id: prompt.id,
    image_url: img.url,
    width: img.width ?? null,
    height: img.height ?? null,
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

  if (categoryIds.length > 0) {
    const categoryRows = categoryIds.map((cid) => ({
      prompt_id: prompt.id,
      category_id: cid,
    }));
    await supabase.from("prompt_categories").insert(categoryRows);
  }

  // Invalidate the cached feeds so the new prompt appears immediately
  // instead of waiting up to 60s for the next ISR refresh.
  revalidatePath("/");
  revalidatePath("/new");

  return NextResponse.json({ prompt_id: prompt.id });
}
