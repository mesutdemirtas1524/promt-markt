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
  // Pricing is now USD-first. minPaid is a floor that comfortably clears
  // Solana's rent-exempt minimum even when SOL is at $50: $1 → ~0.02 SOL,
  // creator's 80% share = 0.016 SOL ≈ 16M lamports, well above the
  // ~890,880 lamport rent floor. Below $1 we'd start to risk failed
  // transfers when SOL pumps higher (small lamport amounts).
  price: { min: 0, max: 1000, minPaid: 1 },
  images: { min: 1, max: 6 },
  imageSizeMB: 5,
  dailyListings: 10,
} as const;

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const LAMPORTS_PER_SOL = 1_000_000_000;
