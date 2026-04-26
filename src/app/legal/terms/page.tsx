import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${APP_NAME}.`,
};

const LAST_UPDATED = "2026-04-26";

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="meta">Last updated: {LAST_UPDATED}</p>

      <p>
        Welcome to {APP_NAME} (the &quot;Service&quot;). By accessing or using the Service you
        agree to these Terms of Service (the &quot;Terms&quot;). If you do not agree, do not use
        the Service.
      </p>

      <h2>1. Who we are</h2>
      <p>
        The Service is operated by the {APP_NAME} team. {APP_NAME} is a peer-to-peer
        marketplace for AI image prompts. Payments are settled directly between buyer and
        seller wallets on the Solana blockchain. We never custody user funds.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <ul>
        <li>You must be at least 13 years old to use the Service, and at least the age of
          majority in your jurisdiction to sell prompts or receive payments.</li>
        <li>You are responsible for the security of your wallet and login credentials. We
          cannot recover lost private keys or wallet seed phrases.</li>
        <li>One person, one account. You may not impersonate others or use the Service in
          violation of any law.</li>
      </ul>

      <h2>3. Selling prompts</h2>
      <ul>
        <li>You must own or have full rights to the prompt text and images you upload.</li>
        <li>Images must accurately represent what the prompt produces. Misrepresenting
          output is grounds for removal and account suspension.</li>
        <li>Prices are denominated in SOL. The platform fee is <strong>20%</strong> of
          each sale; the remaining 80% goes directly to the seller&apos;s wallet on-chain.</li>
        <li>You grant {APP_NAME} a non-exclusive, worldwide, royalty-free licence to display
          your title, description, and preview images for the purpose of operating and
          promoting the Service.</li>
      </ul>

      <h2>4. Buying prompts</h2>
      <ul>
        <li>Purchases unlock the prompt text for your personal or commercial use, subject
          to the seller&apos;s additional terms (if any).</li>
        <li>You may not redistribute, resell, or sublicense purchased prompts on competing
          marketplaces without the seller&apos;s explicit permission.</li>
        <li>
          <strong>All sales are final.</strong> Solana transactions are irreversible by
          nature and {APP_NAME} does not offer refunds. Preview the cover images and
          read the description carefully before buying.
        </li>
      </ul>

      <h2>5. Prohibited content</h2>
      <p>You may not upload, sell, or promote:</p>
      <ul>
        <li>Content that infringes copyright, trademark, or other IP rights.</li>
        <li>Sexually explicit content involving minors, non-consensual content, or any
          content depicting real people in a defamatory or harassing way.</li>
        <li>Content that promotes violence, terrorism, or hatred against a protected
          class.</li>
        <li>Malware, phishing prompts, or content designed to defraud.</li>
        <li>Personal information of third parties without consent.</li>
      </ul>
      <p>
        We may remove content and suspend accounts at our discretion when we believe these
        rules are violated.
      </p>

      <h2>6. Tips and promotional codes</h2>
      <p>
        Tips are voluntary, on-chain transfers between wallets and are non-refundable.
        Promotional codes issued by sellers reduce the buyer&apos;s payment by a percentage;
        the platform fee continues to apply to the discounted amount.
      </p>

      <h2>7. Reports and moderation</h2>
      <p>
        Users may report listings that violate these Terms via the in-app report button.
        Reports are reviewed by our moderation team and may result in content removal,
        account suspension, or referral to law enforcement.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind. We do not
        warrant uninterrupted operation, the quality of any prompt, the future value of
        SOL, or the conduct of other users. Blockchain transactions are irreversible — we
        are not liable for buyer or seller mistakes (e.g., paying the wrong wallet).
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, our aggregate liability for any claim
        arising out of or related to the Service is limited to the platform fees we
        actually collected from your transactions in the 12 months preceding the claim.
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be announced on
        the Service. Continued use after the effective date constitutes acceptance.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions? Reach us through the GitHub repository linked in the footer.
      </p>
    </>
  );
}
