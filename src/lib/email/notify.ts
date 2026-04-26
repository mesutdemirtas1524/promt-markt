import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMail } from "./send";
import { saleEmail, tipEmail, followEmail } from "./templates";

type EmailPrefs = { sales?: boolean; tips?: boolean; follows?: boolean };

async function loadRecipient(
  supabase: SupabaseClient,
  recipientId: string
): Promise<{ email: string; prefs: EmailPrefs } | null> {
  const { data } = await supabase
    .from("users")
    .select("email, email_prefs")
    .eq("id", recipientId)
    .maybeSingle();
  if (!data?.email) return null;
  return {
    email: data.email,
    prefs: (data.email_prefs ?? {}) as EmailPrefs,
  };
}

export async function emailSale(
  supabase: SupabaseClient,
  args: {
    creatorId: string;
    promptTitle: string;
    promptId: string;
    buyerName: string;
    amountSol: number;
    earnedSol: number;
  }
) {
  const r = await loadRecipient(supabase, args.creatorId);
  if (!r || r.prefs.sales === false) return;
  const { subject, html } = saleEmail(args);
  await sendMail({ to: r.email, subject, html });
}

export async function emailTip(
  supabase: SupabaseClient,
  args: {
    creatorId: string;
    tipperName: string;
    tipperUsername: string;
    amountSol: number;
    message: string | null;
  }
) {
  const r = await loadRecipient(supabase, args.creatorId);
  if (!r || r.prefs.tips === false) return;
  const { subject, html } = tipEmail(args);
  await sendMail({ to: r.email, subject, html });
}

export async function emailFollow(
  supabase: SupabaseClient,
  args: {
    followedId: string;
    followerName: string;
    followerUsername: string;
  }
) {
  const r = await loadRecipient(supabase, args.followedId);
  if (!r || r.prefs.follows === false) return;
  const { subject, html } = followEmail(args);
  await sendMail({ to: r.email, subject, html });
}
