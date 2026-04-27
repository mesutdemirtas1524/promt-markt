import { getCurrentUser } from "@/lib/auth";
import { WalletPageClient } from "./wallet-page-client";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return <WalletPageClient walletAddress={user.wallet_address ?? null} />;
}
