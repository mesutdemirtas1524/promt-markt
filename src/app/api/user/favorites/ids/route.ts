import { NextRequest, NextResponse } from "next/server";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Returns the set of prompt IDs the current user has favorited.
 * Used by FavoritesProvider to hydrate per-user heart state on cards
 * AFTER the page itself has been served from cache (so pages stay
 * ISR-cacheable).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ ids: [] }, { status: 200 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ ids: [] }, { status: 200 });

  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!user) return NextResponse.json({ ids: [] }, { status: 200 });

  const { data } = await supabase
    .from("favorites")
    .select("prompt_id")
    .eq("user_id", user.id);

  return NextResponse.json(
    { ids: (data ?? []).map((r) => r.prompt_id as string) },
    {
      status: 200,
      headers: {
        // Keep this fresh — heart state needs to feel snappy after toggling.
        "Cache-Control": "no-store",
      },
    }
  );
}
