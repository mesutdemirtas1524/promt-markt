export const APP_NAME = "Promt Markt";
export const APP_DESCRIPTION = "A marketplace for AI image prompts — paid in Solana.";
export const PRICE_CURRENCY = "USD" as const;

export const PLATFORM_FEE_BPS = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_BPS ?? "2000");
export const CREATOR_SHARE_BPS = 10_000 - PLATFORM_FEE_BPS;

export const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET as string;
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL as string;
export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "mainnet-beta") as
  | "mainnet-beta"
  | "devnet"
  | "testnet";

export const PROMPT_LIMITS = {
  title: { min: 5, max: 100 },
  description: { min: 10, max: 500 },
  promptText: { min: 10, max: 4000 },
  // Pricing is USD-first. $0.15 is well below Solana's per-tx rent-exempt
  // floor (~890,880 lamports ≈ ~$0.20 at SOL $250) for the creator's 80%
  // share, so the first sale to a brand-new creator wallet may fail
  // on-chain with "insufficient lamports for rent". Once a creator's
  // wallet has received any SOL it's fine. Operator's call.
  price: { min: 0, max: 1000, minPaid: 0.15 },
  images: { min: 1, max: 6 },
  imageSizeMB: 5,
  dailyListings: 10,
} as const;

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const LAMPORTS_PER_SOL = 1_000_000_000;
