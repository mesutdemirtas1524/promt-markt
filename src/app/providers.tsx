"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { Toaster } from "sonner";
import { CurrentUserProvider } from "@/hooks/use-current-user";
import { WalletAccountWatcher } from "@/hooks/use-wallet-account-watcher";
import { SolPriceProvider } from "@/hooks/use-sol-price";
import { FavoritesProvider } from "@/hooks/use-favorites";
import { FollowingProvider } from "@/hooks/use-following";
import { ThemeProvider } from "@/lib/theme/provider";
import { LocaleProvider } from "@/lib/i18n/provider";
import { SOLANA_NETWORK, SOLANA_RPC_URL } from "@/lib/constants";

const solanaConnectors = toSolanaWalletConnectors();

// Privy's Solana sign-and-send hooks need a per-chain RPC config or they
// throw "No RPC configuration found for chain solana:mainnet". Build it
// from our existing env-driven RPC URL and derive the websocket URL by
// swapping the protocol.
const SOLANA_CHAIN_KEY = (
  SOLANA_NETWORK === "mainnet-beta" ? "solana:mainnet" : `solana:${SOLANA_NETWORK}`
) as "solana:mainnet" | "solana:devnet" | "solana:testnet";

const wsUrl = SOLANA_RPC_URL.replace(/^http/i, (m) => (m.toLowerCase() === "https" ? "wss" : "ws"));

const solanaRpcs = {
  [SOLANA_CHAIN_KEY]: {
    rpc: createSolanaRpc(SOLANA_RPC_URL),
    rpcSubscriptions: createSolanaRpcSubscriptions(wsUrl),
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
    <LocaleProvider>
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
        solana: { rpcs: solanaRpcs },
      }}
    >
      <CurrentUserProvider>
        <WalletAccountWatcher />
        <FavoritesProvider>
          <FollowingProvider>
            <SolPriceProvider>
              {children}
              <Toaster position="bottom-right" />
            </SolPriceProvider>
          </FollowingProvider>
        </FavoritesProvider>
      </CurrentUserProvider>
    </PrivyProvider>
    </LocaleProvider>
    </ThemeProvider>
  );
}
