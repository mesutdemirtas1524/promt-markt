import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${APP_NAME}.`,
};

const LAST_UPDATED = "2026-04-26";

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="meta">Last updated: {LAST_UPDATED}</p>

      <p>
        This policy explains what data {APP_NAME} (the &quot;Service&quot;) collects, how we
        use it, and the choices you have. We try to collect the minimum needed to operate
        a working marketplace.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong> via Privy: a Privy user ID and any email or social
          identifier you choose to log in with. We do not see your wallet&apos;s private key.
        </li>
        <li>
          <strong>Wallet address</strong>: your Solana public address, used to send and
          receive payments and to display short identifiers next to your username.
        </li>
        <li>
          <strong>Profile data</strong>: username, display name, bio, avatar, banner, and
          social links you add yourself.
        </li>
        <li>
          <strong>Listings and transactions</strong>: the prompts you publish, the on-chain
          purchases and tips you make or receive, and ratings and reports you submit.
        </li>
        <li>
          <strong>Usage data</strong>: prompt detail-page views, deduplicated by user ID
          (logged in) or salted IP hash (anonymous). We do not store raw IP addresses
          alongside views.
        </li>
        <li>
          <strong>Cookies</strong>: a session cookie set by Privy for authentication, plus
          small cookies for theme and language preference. No third-party advertising
          trackers.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To operate the marketplace: showing your listings, processing checkouts, and
          delivering notifications.</li>
        <li>To prevent fraud and abuse, including dedup of view counts and verification of
          on-chain transactions.</li>
        <li>To send you product emails (sales, tips, follows) when you have provided an
          email and the relevant preference is on. You can opt out per channel in your
          settings.</li>
      </ul>

      <h2>3. Third parties we share data with</h2>
      <ul>
        <li><strong>Privy</strong> — authentication and embedded wallet provider.</li>
        <li><strong>Supabase</strong> — managed database, file storage, and serverless
          backend.</li>
        <li><strong>Helius</strong> — Solana RPC and webhook provider used to confirm
          on-chain payments.</li>
        <li><strong>Resend</strong> — transactional email delivery (only when email
          notifications are enabled).</li>
        <li><strong>Vercel</strong> — hosting and edge network for the website.</li>
      </ul>
      <p>
        We do not sell or rent your personal data. We share data with these processors
        only to the extent needed to operate the Service.
      </p>

      <h2>4. On-chain data</h2>
      <p>
        Solana transactions — purchases and tips — are public by their nature. Anyone can
        see that wallet A paid wallet B at a given time. {APP_NAME} cannot make on-chain
        transactions private.
      </p>

      <h2>5. Data retention</h2>
      <ul>
        <li>Profile and listing data persists for as long as your account exists.</li>
        <li>View tracking rows are pruned after 90 days; the cached counters remain.</li>
        <li>Notifications older than 1 year may be archived.</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>
        You can edit your profile, change email preferences, or remove individual listings
        at any time. If you would like a copy of your data or want your account deleted,
        contact us through the GitHub repository linked in the footer. We will fulfil
        reasonable requests within 30 days, subject to legal obligations.
      </p>

      <h2>7. Children</h2>
      <p>
        The Service is not directed to children under 13. We do not knowingly collect
        personal information from children under 13. If you believe a child has provided
        information to us, contact us and we will delete it.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be announced on
        the Service.
      </p>
    </>
  );
}
