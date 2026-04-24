# Promt Markt — Setup Guide

This covers everything you need to do manually. Everything else is already coded.

## 1) Supabase — run the schema (5 minutes)

1. Go to your Supabase project: https://supabase.com/dashboard → `promt-markt`
2. Left sidebar → **SQL Editor** → **New query**
3. Open `supabase/schema.sql` from this repo, copy its **entire contents**
4. Paste into the SQL Editor → click **Run** (bottom right)
5. Expected result: "Success. No rows returned" with no errors
6. Verify: left sidebar → **Table Editor** → you should see tables:
   `users`, `prompts`, `prompt_images`, `prompt_platforms`, `purchases`, `ratings`, `categories`, `platforms`

### Storage bucket

The schema auto-creates a `prompt-images` storage bucket. Verify:
- Left sidebar → **Storage** → you should see `prompt-images` bucket (public).

## 2) Privy — get the App Secret (2 minutes)

1. Go to https://dashboard.privy.io → your `Promt Markt` app
2. **Settings → API keys** → copy the **App Secret**
3. Paste it into `.env.local` as `PRIVY_APP_SECRET=...`

### Enable Google + Solana login

1. Same dashboard → **Login methods**
2. Enable **Google** (follow the OAuth setup instructions)
3. Enable **Solana wallets** (Phantom, Solflare, etc.)
4. **Embedded wallets** → Solana → **Create on login for users without wallets**
5. **Advanced** → Allowed domains → add `http://localhost:3000` and (later) your Vercel domain

## 3) Local dev

```bash
npm run dev
```

Open http://localhost:3000 — you should see the empty marketplace.

Try:
- Click **Sign in** (top right) → sign in with Google or Phantom
- Click **Upload** → add a prompt with some images
- Open your prompt in an incognito window → sign in as a different user → buy it

## 4) Deploy to Vercel

1. Push this repo to GitHub (already configured at `github.com/mesutdemirtas1524/promt-markt`)
2. Go to https://vercel.com → **New Project** → import `promt-markt`
3. **Environment Variables** → add every line from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_PRIVY_APP_ID`
   - `PRIVY_APP_SECRET`
   - `NEXT_PUBLIC_SOLANA_RPC_URL`
   - `NEXT_PUBLIC_SOLANA_NETWORK`
   - `NEXT_PUBLIC_PLATFORM_WALLET`
   - `NEXT_PUBLIC_PLATFORM_FEE_BPS`
4. Click **Deploy**
5. Add your deployed URL to Privy's **Allowed domains**

## 5) Going to production — important

- **RPC endpoint**: `https://api.mainnet-beta.solana.com` is rate-limited and will fail under load. Sign up at https://helius.xyz (free tier = 100k req/day) and replace `NEXT_PUBLIC_SOLANA_RPC_URL` with the Helius URL.
- **Custom domain**: add it in Vercel → Project → Domains.

## Key economic rules (baked into the code)

- 80% of every paid purchase goes to the creator, 20% to `NEXT_PUBLIC_PLATFORM_WALLET`
- Payment is one atomic Solana transaction (two SystemProgram transfers) — either both succeed or neither does
- Free prompts can be unlocked by signing in; they cannot be rated
- Buyers rate 1–5 stars (displayed as 0–100 average); rating can be changed anytime
- Daily listing cap: 10 prompts per user

## Troubleshooting

- **"Invalid token" on API calls** → Privy App Secret is wrong or missing
- **"relation ... does not exist"** → SQL schema wasn't run in Supabase
- **Images don't load** → `prompt-images` bucket missing or not public
- **"Creator wallet missing" when buying** → the seller hasn't connected a Solana wallet. They need to sign in → Settings → link a wallet (Privy will create one automatically for Google users)
