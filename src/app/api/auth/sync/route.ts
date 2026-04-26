import { NextRequest, NextResponse } from "next/server";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { generateUsernameFromEmail } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    wallet_address?: string | null;
    email?: string | null;
  };

  const supabase = createSupabaseServiceClient();

  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("privy_id", privyId)
    .maybeSingle();

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (body.wallet_address && existing.wallet_address !== body.wallet_address) {
      patch.wallet_address = body.wallet_address;
    }
    if (body.email && existing.email !== body.email) {
      patch.email = body.email;
    }
    if (Object.keys(patch).length > 0) {
      const { data: updated } = await supabase
        .from("users")
        .update(patch)
        .eq("id", existing.id)
        .select()
        .single();
      return NextResponse.json({ user: updated ?? existing });
    }
    return NextResponse.json({ user: existing });
  }

  let base = body.email ? generateUsernameFromEmail(body.email) : `user${Date.now().toString(36)}`;
  let username = base;
  for (let i = 0; i < 5; i++) {
    const { data: taken } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (!taken) break;
    username = `${base}${Math.floor(Math.random() * 10000)}`;
  }

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      privy_id: privyId,
      wallet_address: body.wallet_address ?? null,
      email: body.email ?? null,
      username,
    })
    .select()
    .single();

  if (created) return NextResponse.json({ user: created });

  // Likely a concurrent sync beat us to it (React StrictMode double-fire in dev,
  // or genuine parallel requests). Re-fetch the row and return it.
  if (error?.code === "23505") {
    const { data: raced } = await supabase
      .from("users")
      .select("*")
      .eq("privy_id", privyId)
      .maybeSingle();
    if (raced) return NextResponse.json({ user: raced });
  }

  console.error("sync insert failed", error);
  return NextResponse.json({ error: error?.message ?? "Failed to create user" }, { status: 500 });
}
