import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const socialLinksSchema = z
  .object({
    twitter: z.string().max(120).optional(),
    instagram: z.string().max(120).optional(),
    website: z.string().max(200).optional(),
    discord: z.string().max(120).optional(),
    youtube: z.string().max(120).optional(),
    tiktok: z.string().max(120).optional(),
    github: z.string().max(120).optional(),
  })
  .optional();

const emailPrefsSchema = z
  .object({
    sales: z.boolean().optional(),
    tips: z.boolean().optional(),
    follows: z.boolean().optional(),
  })
  .optional();

const bodySchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscore"),
  display_name: z.string().max(60).optional(),
  bio: z.string().max(280).optional(),
  avatar_url: z.string().url().max(500).nullable().optional(),
  banner_url: z.string().url().max(500).nullable().optional(),
  social_links: socialLinksSchema,
  email_prefs: emailPrefsSchema,
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
  const { data: user } = await supabase.from("users").select("id, username").eq("privy_id", privyId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (parsed.data.username !== user.username) {
    const { data: taken } = await supabase
      .from("users")
      .select("id")
      .eq("username", parsed.data.username)
      .maybeSingle();
    if (taken) return NextResponse.json({ error: "Username taken" }, { status: 409 });
  }

  const updates: Record<string, unknown> = {
    username: parsed.data.username,
    display_name: parsed.data.display_name?.trim() || null,
    bio: parsed.data.bio?.trim() || null,
  };
  if (parsed.data.avatar_url !== undefined) {
    updates.avatar_url = parsed.data.avatar_url;
  }
  if (parsed.data.banner_url !== undefined) {
    updates.banner_url = parsed.data.banner_url;
  }
  if (parsed.data.social_links !== undefined) {
    // Strip empty strings so the JSON stays clean
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.data.social_links)) {
      if (typeof v === "string" && v.trim()) cleaned[k] = v.trim();
    }
    updates.social_links = cleaned;
  }
  if (parsed.data.email_prefs !== undefined) {
    updates.email_prefs = parsed.data.email_prefs;
  }

  const { error } = await supabase.from("users").update(updates).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
