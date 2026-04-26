import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { emailFollow } from "@/lib/email/notify";

export const runtime = "nodejs";

const bodySchema = z.object({
  target_username: z.string().min(3).max(24),
  action: z.enum(["follow", "unfollow"]),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { data: me } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: target } = await supabase
    .from("users")
    .select("id, username")
    .eq("username", parsed.data.target_username)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === me.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  if (parsed.data.action === "follow") {
    const { error } = await supabase
      .from("follows")
      .upsert(
        { follower_id: me.id, following_id: target.id },
        { onConflict: "follower_id,following_id" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    void (async () => {
      try {
        const { data: meRow } = await supabase
          .from("users")
          .select("display_name, username")
          .eq("id", me.id)
          .single();
        if (meRow) {
          await emailFollow(supabase, {
            followedId: target.id,
            followerName: meRow.display_name ?? `@${meRow.username}`,
            followerUsername: meRow.username,
          });
        }
      } catch (err) {
        console.error("emailFollow failed", err);
      }
    })();
  } else {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", me.id)
      .eq("following_id", target.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Profile pages cache; invalidate the affected user so counts refresh.
  revalidatePath(`/u/${target.username}`);
  return NextResponse.json({ ok: true });
}
