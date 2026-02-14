import { type Address, defineChain } from "viem";

// --- Token ---
export const alphaUsd =
  "0x20c0000000000000000000000000000000000001" as Address;

// --- Sustain contract ---
export const sustainAddress =
  "0xff3FB2A2d1Fb0eb20EBEE6c4906cCC6A7377A23b" as Address;

// Fixed deposit: $1.00 (6 decimals)
export const DEPOSIT_AMOUNT = 1_000_000n;

// --- Chain ---
export const tempoModerato = defineChain({
  id: 42431,
  name: "Tempo Moderato",
  nativeCurrency: { name: "AlphaUSD", symbol: "aUSD", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.moderato.tempo.xyz"] },
  },
  feeToken: alphaUsd,
});

// --- URLs ---
export const RPC_URL = "https://rpc.moderato.tempo.xyz";
export const EXPLORER_URL = "https://explore.tempo.xyz";
