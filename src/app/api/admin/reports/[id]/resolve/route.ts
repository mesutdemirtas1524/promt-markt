import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PLATFORM_WALLET } from "@/lib/constants";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["remove", "dismiss"]),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "auth" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "auth" }, { status: 401 });

  const supabase = createSupabaseServiceClient();
  const { data: admin } = await supabase
    .from("users")
    .select("id, wallet_address")
    .eq("privy_id", privyId)
    .single();
  if (!admin) return NextResponse.json({ error: "no user" }, { status: 401 });
  if (admin.wallet_address !== PLATFORM_WALLET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { id } = await params;

  // Look up the report (need prompt_id for the remove action)
  const { data: report } = await supabase
    .from("reports")
    .select("id, prompt_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (report.status !== "open") {
    return NextResponse.json({ error: "Already resolved" }, { status: 400 });
  }

  if (parsed.data.action === "remove") {
    // Soft-delete the prompt. Past buyers keep access (see fetchPromptDetail).
    const { error: pErr } = await supabase
      .from("prompts")
      .update({ status: "removed" })
      .eq("id", report.prompt_id);
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    // Resolve every OPEN report on this prompt at once — no point in
    // keeping duplicates in the queue once the prompt is gone.
    const { error: rErr } = await supabase
      .from("reports")
      .update({
        status: "removed",
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        reviewer_note: parsed.data.note?.trim() || null,
      })
      .eq("prompt_id", report.prompt_id)
      .eq("status", "open");
    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

    revalidatePath("/");
    revalidatePath("/explore");
  } else {
    const { error } = await supabase
      .from("reports")
      .update({
        status: "dismissed",
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        reviewer_note: parsed.data.note?.trim() || null,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
