# Promt Markt

A marketplace for AI image prompts — paid in Solana.

- **80/20 split**: creators earn 80% of every sale, platform takes 20%, settled atomically in a single Solana transaction
- **No escrow, no intermediaries**: SOL flows directly wallet-to-wallet
- **Free or paid prompts**: creators set any price (including free)
- **Transparent ratings**: 1–5 stars from buyers, displayed as 0–100

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS v4
- Supabase (Postgres + Storage)
- Privy (auth + embedded Solana wallets)
- Solana web3.js

## Getting started

See [SETUP.md](./SETUP.md) for the full setup walkthrough.

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

## Project structure

```
src/
  app/                 # Next.js App Router pages + API routes
    api/               # /api/prompts/*, /api/auth/sync, /api/upload/sign
    dashboard/         # /dashboard/listings, /purchases, /earnings, /settings
    prompt/[id]/       # prompt detail page
    u/[username]/      # creator profile
    explore/, category/[slug]/, upload/
  components/          # UI components + shared pieces
    ui/                # button, input, card, badge, etc.
    prompt-card.tsx    # grid card
    prompt-detail-actions.tsx  # buy + rate client logic
  lib/
    supabase/          # browser + service-role clients + types
    solana.ts          # purchase tx builder + on-chain verifier
    queries.ts         # server-side DB queries
    auth.ts            # Privy token verification
    utils.ts, constants.ts
  hooks/
    use-sync-user.ts   # ensures Privy user has a row in our users table
supabase/
  schema.sql           # full DB schema + RLS policies
```

## License

Private — all rights reserved.
