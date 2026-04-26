export type SocialLinks = {
  twitter?: string;
  instagram?: string;
  website?: string;
  discord?: string;
  youtube?: string;
  tiktok?: string;
  github?: string;
};

export type EmailPrefs = {
  sales?: boolean;
  tips?: boolean;
  follows?: boolean;
};

export type User = {
  id: string;
  privy_id: string;
  wallet_address: string | null;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  social_links: SocialLinks;
  email: string | null;
  email_prefs: EmailPrefs;
  follower_count?: number;
  following_count?: number;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
};

export type Platform = {
  id: number;
  name: string;
  slug: string;
};

export type Prompt = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  prompt_text: string;
  price_sol: number;
  category_id: number | null;
  status: "active" | "removed";
  avg_rating: number | null;
  rating_count: number;
  purchase_count: number;
  created_at: string;
  updated_at: string;
};

export type PromptPublic = Omit<Prompt, "prompt_text">;

export type PromptImage = {
  id: string;
  prompt_id: string;
  image_url: string;
  position: number;
  created_at: string;
};

export type Purchase = {
  id: string;
  buyer_id: string;
  prompt_id: string;
  price_paid_sol: number;
  tx_signature: string | null;
  created_at: string;
};

export type Rating = {
  id: string;
  rater_id: string;
  prompt_id: string;
  stars: number;
  created_at: string;
  updated_at: string;
};

export type PromptWithDetails = PromptPublic & {
  creator: Pick<User, "id" | "username" | "display_name" | "avatar_url" | "wallet_address">;
  images: PromptImage[];
  platforms: Platform[];
  category: Category | null;
};
