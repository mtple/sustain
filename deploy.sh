#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${RPC_URL:-https://rpc.moderato.tempo.xyz}"
TOKEN_ADDRESS="${TOKEN_ADDRESS:-0x20c0000000000000000000000000000000000001}"
ACCOUNT_NAME="${ACCOUNT_NAME:-sustain-deployer}"
FOUNDRY_DIR="${FOUNDRY_DIR:-contracts}"

DEPLOYER_ADDRESS="$(cast wallet address --account "$ACCOUNT_NAME")"
echo "Deploying Sustain from $DEPLOYER_ADDRESS"

cd "$FOUNDRY_DIR"
forge create src/Sustain.sol:Sustain \
  --broadcast \
  --rpc-url "$RPC_URL" \
  --tempo.fee-token "$TOKEN_ADDRESS" \
  --constructor-args "$TOKEN_ADDRESS" \
  --account "$ACCOUNT_NAME"
