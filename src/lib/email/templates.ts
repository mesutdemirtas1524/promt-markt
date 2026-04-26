import { APP_NAME } from "@/lib/constants";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://promtmarkt.com";

function shell(opts: { preheader: string; heading: string; bodyHtml: string; ctaLabel: string; ctaHref: string }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0a0a0c;color:#e5e5e5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;visibility:hidden;opacity:0;height:0;width:0;font-size:1px;line-height:1px;color:#0a0a0c">${opts.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0c;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#15151a;border:1px solid #2a2a30;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #2a2a30;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:99px;background:linear-gradient(135deg,#a78bfa,#8b5cf6);vertical-align:middle;margin-right:8px"></span>
          <span style="color:#fff;font-weight:600;letter-spacing:-0.3px;vertical-align:middle">${APP_NAME}</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 14px;font-size:22px;font-weight:600;color:#fff;letter-spacing:-0.5px">${opts.heading}</h1>
          <div style="font-size:15px;line-height:1.55;color:#cfcfd6">${opts.bodyHtml}</div>
          <a href="${opts.ctaHref}" style="display:inline-block;margin-top:22px;padding:11px 22px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;font-weight:600;text-decoration:none;font-size:14px">${opts.ctaLabel}</a>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #2a2a30;font-size:12px;color:#6f6f78">
          You're receiving this because you have an account on ${APP_NAME}.
          <a href="${SITE_URL}/dashboard/settings" style="color:#a78bfa;text-decoration:none">Manage email preferences</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function saleEmail(opts: {
  promptTitle: string;
  promptId: string;
  buyerName: string;
  amountSol: number;
  earnedSol: number;
}) {
  const sol = opts.amountSol.toFixed(4).replace(/\.?0+$/, "");
  const earned = opts.earnedSol.toFixed(4).replace(/\.?0+$/, "");
  return {
    subject: `New sale: ${sol} SOL · ${opts.promptTitle}`,
    html: shell({
      preheader: `${opts.buyerName} bought ${opts.promptTitle} for ${sol} SOL.`,
      heading: `You just made a sale 🎉`,
      bodyHtml: `<p style="margin:0 0 10px"><strong style="color:#fff">${opts.buyerName}</strong> bought <strong style="color:#fff">${opts.promptTitle}</strong>.</p>
        <p style="margin:0 0 10px">Sale price: <strong style="color:#fff">${sol} SOL</strong> · Your share: <strong style="color:#a78bfa">${earned} SOL</strong>.</p>
        <p style="margin:0;color:#9a9aa3;font-size:13px">The payment already landed in your wallet on-chain.</p>`,
      ctaLabel: "View earnings",
      ctaHref: `${SITE_URL}/dashboard/earnings`,
    }),
  };
}

export function tipEmail(opts: {
  tipperName: string;
  tipperUsername: string;
  amountSol: number;
  message: string | null;
}) {
  const sol = opts.amountSol.toFixed(4).replace(/\.?0+$/, "");
  const msg = opts.message?.trim();
  return {
    subject: `${opts.tipperName} tipped you ${sol} SOL`,
    html: shell({
      preheader: `${opts.tipperName} sent you ${sol} SOL.`,
      heading: `You got a tip ✨`,
      bodyHtml: `<p style="margin:0 0 10px"><strong style="color:#fff">${opts.tipperName}</strong> sent you <strong style="color:#a78bfa">${sol} SOL</strong>.</p>
        ${
          msg
            ? `<blockquote style="margin:14px 0;padding:12px 16px;border-left:3px solid #8b5cf6;background:#1a1a20;border-radius:6px;color:#e5e5e5;font-style:italic">"${escapeHtml(msg)}"</blockquote>`
            : ""
        }
        <p style="margin:0;color:#9a9aa3;font-size:13px">The SOL is already in your wallet.</p>`,
      ctaLabel: "View profile",
      ctaHref: `${SITE_URL}/u/${opts.tipperUsername}`,
    }),
  };
}

export function followEmail(opts: { followerName: string; followerUsername: string }) {
  return {
    subject: `${opts.followerName} started following you`,
    html: shell({
      preheader: `${opts.followerName} is now following your prompts.`,
      heading: `New follower`,
      bodyHtml: `<p style="margin:0"><strong style="color:#fff">${opts.followerName}</strong> (@${opts.followerUsername}) started following you on ${APP_NAME}.</p>`,
      ctaLabel: "View their profile",
      ctaHref: `${SITE_URL}/u/${opts.followerUsername}`,
    }),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
