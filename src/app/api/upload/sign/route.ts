import { NextRequest, NextResponse } from "next/server";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ACCEPTED_IMAGE_TYPES, PROMPT_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = (await req.json()) as {
    files: { name: string; type: string; size: number }[];
  };

  if (!Array.isArray(body.files) || body.files.length === 0 || body.files.length > PROMPT_LIMITS.images.max) {
    return NextResponse.json(
      { error: `Upload between ${PROMPT_LIMITS.images.min} and ${PROMPT_LIMITS.images.max} images` },
      { status: 400 }
    );
  }

  for (const f of body.files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(f.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      return NextResponse.json({ error: `Unsupported type: ${f.type}` }, { status: 400 });
    }
    if (f.size > PROMPT_LIMITS.imageSizeMB * 1024 * 1024) {
      return NextResponse.json({ error: `File ${f.name} exceeds ${PROMPT_LIMITS.imageSizeMB}MB` }, { status: 400 });
    }
  }

  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const urls: { path: string; signedUrl: string; token: string; publicUrl: string }[] = [];
  for (const f of body.files) {
    const ext = f.name.split(".").pop() ?? "png";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { data, error } = await supabase.storage.from("prompt-images").createSignedUploadUrl(path);
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to sign" }, { status: 500 });
    }
    const { data: publicUrlData } = supabase.storage.from("prompt-images").getPublicUrl(path);
    urls.push({
      path: data.path,
      signedUrl: data.signedUrl,
      token: data.token,
      publicUrl: publicUrlData.publicUrl,
    });
  }

  return NextResponse.json({ uploads: urls });
}
