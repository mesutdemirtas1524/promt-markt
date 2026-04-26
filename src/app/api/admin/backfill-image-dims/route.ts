import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PLATFORM_WALLET } from "@/lib/constants";

export const runtime = "nodejs";

/**
 * Admin-only: backfill width/height on existing prompt_images that were
 * uploaded before migration_005. The browser does the actual dimension
 * read (free + correct) and POSTs the values back here.
 *
 * GET — list images that still need dims (paginated).
 * POST — apply { id, width, height }[] updates.
 *
 * Authorization: the user's wallet_address must match the platform wallet.
 */
async function requirePlatformOwner(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: NextResponse.json({ error: "auth" }, { status: 401 }) };
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return { error: NextResponse.json({ error: "auth" }, { status: 401 }) };

  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, wallet_address")
    .eq("privy_id", privyId)
    .single();
  if (!user) return { error: NextResponse.json({ error: "no user" }, { status: 401 }) };
  if (user.wallet_address !== PLATFORM_WALLET) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { supabase };
}

export async function GET(req: NextRequest) {
  const auth = await requirePlatformOwner(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10)));

  const { data } = await supabase
    .from("prompt_images")
    .select("id, image_url")
    .is("width", null)
    .limit(limit);

  return NextResponse.json({ items: data ?? [] });
}

const updateSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        width: z.number().int().positive().max(20_000),
        height: z.number().int().positive().max(20_000),
      })
    )
    .min(1)
    .max(50),
});

export async function POST(req: NextRequest) {
  const auth = await requirePlatformOwner(req);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let ok = 0;
  let failed = 0;
  for (const u of parsed.data.updates) {
    const { error } = await supabase
      .from("prompt_images")
      .update({ width: u.width, height: u.height })
      .eq("id", u.id);
    if (error) failed++;
    else ok++;
  }

  return NextResponse.json({ ok, failed });
}
