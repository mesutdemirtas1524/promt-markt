import { NextRequest, NextResponse } from "next/server";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";

export const runtime = "nodejs";

const BANNER_MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    type?: string;
    size?: number;
  };

  if (!body.type || !ACCEPTED_IMAGE_TYPES.includes(body.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return NextResponse.json({ error: `Unsupported type: ${body.type}` }, { status: 400 });
  }
  if (!body.size || body.size > BANNER_MAX_BYTES) {
    return NextResponse.json({ error: "Banner must be 4MB or smaller" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const ext = (body.name?.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `banners/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { data, error } = await supabase.storage.from("prompt-images").createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to sign" }, { status: 500 });
  }
  const { data: publicUrlData } = supabase.storage.from("prompt-images").getPublicUrl(path);

  return NextResponse.json({
    path: data.path,
    signedUrl: data.signedUrl,
    token: data.token,
    publicUrl: publicUrlData.publicUrl,
  });
}
