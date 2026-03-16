#!/bin/bash
set -euo pipefail

# ===========================================================
# Mint 100,000 XP tokens — one-time mint, fixed supply
# Asset name: "XP" (hex: 5850)
# CIP-721 metadata: Cardano XP V1
# ===========================================================

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK="${NETWORK:---testnet-magic 1}"  # override with NETWORK="--mainnet" for mainnet
SUPPLY=100000

# --- Wallet paths (set these or pass as env vars) ---
SKEY="${SKEY:?Set SKEY to the signing key path}"
ADDR="${ADDR:?Set ADDR to the minting wallet address}"

# --- 1. Generate minting policy (time-locked, single use) ---
# The policy locks after a slot, preventing future mints.
# Set LOCK_AFTER_SLOT to the slot after which no more minting is allowed.
LOCK_AFTER_SLOT="${LOCK_AFTER_SLOT:?Set LOCK_AFTER_SLOT (tip + buffer, e.g. current slot + 3600)}"

POLICY_DIR="$SCRIPT_DIR/policy"
mkdir -p "$POLICY_DIR"

# Derive verification key hash from signing key
cardano-cli conway key verification-key \
  --signing-key-file "$SKEY" \
  --verification-key-file "$POLICY_DIR/mint.vkey"

KEY_HASH=$(cardano-cli conway address key-hash \
  --payment-verification-key-file "$POLICY_DIR/mint.vkey")

# Write native script: sig + time lock
cat > "$POLICY_DIR/xp-policy.script" <<SCRIPT
{
  "type": "all",
  "scripts": [
    {
      "type": "sig",
      "keyHash": "$KEY_HASH"
    },
    {
      "type": "before",
      "slot": $LOCK_AFTER_SLOT
    }
  ]
}
SCRIPT

# Compute policy ID
POLICY_ID=$(cardano-cli conway transaction policyid \
  --script-file "$POLICY_DIR/xp-policy.script")

echo "Policy ID: $POLICY_ID"
echo "$POLICY_ID" > "$POLICY_DIR/xp-policy.id"

# --- 2. Build CIP-721 metadata with real policy ID ---
METADATA_FILE="$SCRIPT_DIR/xp-metadata-final.json"
sed "s/POLICY_ID_PLACEHOLDER/$POLICY_ID/g" "$SCRIPT_DIR/xp-metadata.json" > "$METADATA_FILE"

echo "Metadata written to $METADATA_FILE"

# --- 3. Query UTxO for tx input ---
echo "Querying UTxOs at $ADDR ..."
cardano-cli conway query utxo $NETWORK --address "$ADDR" --out-file /tmp/xp-utxos.json

TX_IN=$(jq -r 'to_entries | sort_by(.value.value.lovelace) | last | .key' /tmp/xp-utxos.json)
echo "Using UTxO: $TX_IN"

# --- 4. Build transaction ---
ASSET="$POLICY_ID.5850"  # policy_id.hex("XP")

cardano-cli conway transaction build \
  $NETWORK \
  --tx-in "$TX_IN" \
  --mint "${SUPPLY} ${ASSET}" \
  --mint-script-file "$POLICY_DIR/xp-policy.script" \
  --metadata-json-file "$METADATA_FILE" \
  --invalid-hereafter "$LOCK_AFTER_SLOT" \
  --change-address "$ADDR" \
  --out-file "$SCRIPT_DIR/mint-xp.raw"

echo "Transaction built: $SCRIPT_DIR/mint-xp.raw"

# --- 5. Sign ---
cardano-cli conway transaction sign \
  $NETWORK \
  --tx-body-file "$SCRIPT_DIR/mint-xp.raw" \
  --signing-key-file "$SKEY" \
  --out-file "$SCRIPT_DIR/mint-xp.signed"

echo "Transaction signed: $SCRIPT_DIR/mint-xp.signed"

# --- 6. Submit ---
echo ""
echo "Ready to submit. Review the transaction first:"
echo "  cardano-cli conway transaction view --tx-file $SCRIPT_DIR/mint-xp.signed"
echo ""
read -p "Submit transaction? (y/N) " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
  cardano-cli conway transaction submit $NETWORK --tx-file "$SCRIPT_DIR/mint-xp.signed"
  echo "Submitted! Tx hash:"
  cardano-cli conway transaction txid --tx-file "$SCRIPT_DIR/mint-xp.signed"
else
  echo "Aborted. Signed tx saved at $SCRIPT_DIR/mint-xp.signed"
fi

echo ""
echo "=== Summary ==="
echo "Policy ID:  $POLICY_ID"
echo "Asset name: XP (hex: 5850)"
echo "Supply:     $SUPPLY"
echo "Locks at:   slot $LOCK_AFTER_SLOT"
echo "Metadata:   Cardano XP V1 — https://cardano-xp.io"
