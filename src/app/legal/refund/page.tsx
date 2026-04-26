import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `Refund Policy for ${APP_NAME}.`,
};

const LAST_UPDATED = "2026-04-26";

export default function RefundPage() {
  return (
    <>
      <h1>Refund Policy</h1>
      <p className="meta">Last updated: {LAST_UPDATED}</p>

      <p>
        Prompts are digital goods that are unlocked instantly on payment. As such, sales
        on {APP_NAME} are <strong>generally final</strong>. The exceptions below cover the
        cases where a refund is appropriate.
      </p>

      <h2>1. Eligible cases</h2>
      <p>You may be eligible for a refund if any of the following apply:</p>
      <ul>
        <li>
          <strong>Misrepresented output</strong>: the prompt&apos;s preview images do not
          plausibly match what the prompt actually produces on the listed model.
        </li>
        <li>
          <strong>Duplicate or stolen content</strong>: the prompt was copied from another
          creator without permission, in violation of our{" "}
          <a href="/legal/terms">Terms</a>.
        </li>
        <li>
          <strong>Technical failure</strong>: you were charged but the prompt did not
          unlock and our records confirm the charge.
        </li>
      </ul>

      <h2>2. How to request a refund</h2>
      <p>
        Use the <strong>Report</strong> button on the prompt page within{" "}
        <strong>14 days</strong> of purchase. Include:
      </p>
      <ul>
        <li>The prompt URL.</li>
        <li>The transaction signature (visible in your{" "}
          <a href="/dashboard/purchases">purchases dashboard</a>).</li>
        <li>A short description of the issue and any evidence (e.g., screenshots of the
          actual output, links to a duplicated listing).</li>
      </ul>

      <h2>3. How refunds are processed</h2>
      <p>
        If a refund is approved, the seller will be asked to send the refunded SOL back to
        the buyer&apos;s wallet within 7 days. The platform fee is also returned. If a seller
        repeatedly fails to honour approved refunds, their account may be suspended.
      </p>
      <p>
        Because Solana transactions are irreversible by nature, we cannot mechanically
        &quot;reverse&quot; a payment. The refund is a new transaction from the seller back
        to the buyer.
      </p>

      <h2>4. Tips and promotional codes</h2>
      <p>
        Tips are voluntary and <strong>non-refundable</strong>. Discounts applied via
        promotional codes are not refundable separately from the underlying sale.
      </p>

      <h2>5. Contact</h2>
      <p>
        If you have a refund question that the in-app report flow doesn&apos;t cover, reach
        us through the GitHub repository linked in the footer.
      </p>
    </>
  );
}
