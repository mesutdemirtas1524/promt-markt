export const APP_NAME = "Promt Markt";
export const APP_DESCRIPTION = "A marketplace for AI image prompts — paid in Solana.";

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
  price: { min: 0, max: 10, minPaid: 0.001 },
  images: { min: 1, max: 6 },
  imageSizeMB: 5,
  dailyListings: 10,
} as const;

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const LAMPORTS_PER_SOL = 1_000_000_000;
