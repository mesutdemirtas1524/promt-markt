"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { Toaster } from "sonner";
import { CurrentUserProvider } from "@/hooks/use-current-user";
import { SolPriceProvider } from "@/hooks/use-sol-price";

const solanaConnectors = toSolanaWalletConnectors();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#7c3aed",
          logo: "/pm-logo.svg",
          walletChainType: "solana-only",
          showWalletLoginFirst: true,
          walletList: [
            "phantom",
            "metamask",
            "solflare",
            "backpack",
            "detected_solana_wallets",
            "wallet_connect_qr_solana",
          ],
        },
        loginMethodsAndOrder: {
          primary: ["phantom", "google"],
          overflow: [
            "metamask",
            "solflare",
            "backpack",
            "detected_solana_wallets",
            "wallet_connect_qr_solana",
          ],
        },
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
      }}
    >
      <CurrentUserProvider>
        <SolPriceProvider>
          {children}
          <Toaster position="bottom-right" theme="dark" />
        </SolPriceProvider>
      </CurrentUserProvider>
    </PrivyProvider>
  );
}
