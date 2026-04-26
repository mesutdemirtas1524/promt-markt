import { Resend } from "resend";

/**
 * Wrap Resend so callers don't have to know whether mail is configured.
 * In dev or before the API key is set we no-op and log; in prod we
 * fire the request and swallow errors (mail is best-effort, never the
 * primary success path for any user-visible action).
 */

let cached: Resend | null = null;

function client(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

const FROM = process.env.EMAIL_FROM ?? "Promt Markt <hello@promtmarkt.com>";

export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const c = client();
  if (!c) {
    console.log(`[email:noop] would send "${params.subject}" → ${params.to}`);
    return;
  }
  try {
    await c.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (err) {
    // Mail is best-effort. Log and move on — never bubble to the user.
    console.error("[email:send] failed", err);
  }
}
