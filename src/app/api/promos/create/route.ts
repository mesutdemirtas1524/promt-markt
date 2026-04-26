import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, _ and - only"),
  discount_percent: z.number().int().min(1).max(50),
  max_uses: z.number().int().min(1).max(10_000).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
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
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("privy_id", privyId)
    .single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      creator_id: user.id,
      code: parsed.data.code,
      discount_percent: parsed.data.discount_percent,
      max_uses: parsed.data.max_uses ?? null,
      expires_at: parsed.data.expires_at ?? null,
    })
    .select("id, code, discount_percent, max_uses, uses, expires_at, active, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That code is already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ promo: data });
}
