# Sustain

A micropayment mechanism where holding a button streams USDC to creators on Tempo at $0.005/second. Built for the Tempo x Canteen Hackathon (Consumer Payments track).

## Demo

[sustain.tortoise.studio](https://sustain.tortoise.studio)

## How It Works

- **Press and hold** → a USDC payment stream opens on Tempo, flowing directly to the artist
- **Release** → the stream closes, payment settles instantly
- **Quick tap** → sends a $0.005 minimum payment
- **Duration = amount** → 3 seconds = $0.015

No amount selection, no confirmation screen, no crypto terminology. Privy handles auth with passkeys or social login. The demo plays a real track from [Tortoise](https://tortoise.studio), an onchain independent music platform.

While built around music, the gesture maps naturally to any medium with a temporal dimension — podcasts, video, livestreams.

## Why Tempo

This only works because Tempo provides two things no other chain does simultaneously:

- **Sub-cent gas fees** — a $0.003 payment makes economic sense
- **Stablecoin-denominated gas** — users only think in dollars, never crypto

## Architecture

- **Smart Contract** — `StreamPayment.sol` deployed on Tempo Testnet (Moderato). Manages escrowed USDC, releases per-second based on block timestamps.
- **Frontend** — Next.js, Privy SDK for wallet auth, real-time payment ticker
- **Music Data** — Catalog and audio from Tortoise (Farcaster-native music platform)
- **Faucet** — Auto-funds demo users with AlphaUSD on login via test wallet

### Contract Address

`0xff3FB2A2d1Fb0eb20EBEE6c4906cCC6A7377a23b` ([View on Explorer](https://explore.tempo.xyz/address/0xff3FB2A2d1Fb0eb20EBEE6c4906cCC6A7377a23b))

### Tech Stack

- Next.js / React / TypeScript
- Solidity (StreamPayment.sol)
- Privy (authentication + embedded wallets)
- Tempo Testnet (Moderato) — Chain ID 42431
- AlphaUSD (TIP-20) — `0x20c0000000000000000000000000000000000001`

## Local Development
```bash
git clone <repo-url>
cd sustain
npm install
cp .env.example .env.local
# Add NEXT_PUBLIC_PRIVY_APP_ID, PRIVY_APP_SECRET, FAUCET_PRIVATE_KEY
npm run dev
```

## Built By

**Matt Lee** — Full-stack developer, founder of [Tortoise](https://tortoise.studio). React, TypeScript, Solidity.

- [mattlee.world](https://mattlee.world)
- [github.com/mtple](https://github.com/mtple)
