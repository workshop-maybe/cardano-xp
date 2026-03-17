#!/bin/bash
set -euo pipefail

# ===========================================================
# Mint 100,000 XP tokens — 3-of-3 multisig, time-locked
# Asset name: "XP" (hex: 5850)
# CIP-721 metadata: Cardano XP V1
# ===========================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK="${NETWORK:---testnet-magic 1}"  # override with NETWORK="--mainnet" for mainnet
SUPPLY=100000

# --- Prompt for inputs ---
read -p "Lock-after slot (no minting after this slot): " LOCK_AFTER_SLOT
read -p "Payment signing key path (wallet paying for tx): " PAYMENT_SKEY
read -p "Payment address (wallet paying for tx): " PAYMENT_ADDR
read -p "Destination address (where XP tokens are sent): " DEST_ADDR

# Validate inputs
[[ -z "$LOCK_AFTER_SLOT" ]] && { echo "Error: lock-after slot is required"; exit 1; }
[[ -z "$PAYMENT_SKEY" ]]    && { echo "Error: payment signing key is required"; exit 1; }
[[ -z "$PAYMENT_ADDR" ]]    && { echo "Error: payment address is required"; exit 1; }
[[ -z "$DEST_ADDR" ]]       && { echo "Error: destination address is required"; exit 1; }
[[ ! -f "$PAYMENT_SKEY" ]]  && { echo "Error: signing key not found at $PAYMENT_SKEY"; exit 1; }

# --- 1. Generate 3 signing key pairs for multisig policy ---
POLICY_DIR="$SCRIPT_DIR/policy"
mkdir -p "$POLICY_DIR"

KEY_HASHES=()
for i in 1 2 3; do
  echo "Generating key pair $i of 3..."
  cardano-cli conway address key-gen \
    --signing-key-file "$POLICY_DIR/mint-$i.skey" \
    --verification-key-file "$POLICY_DIR/mint-$i.vkey"

  KEY_HASHES+=("$(cardano-cli conway address key-hash \
    --payment-verification-key-file "$POLICY_DIR/mint-$i.vkey")")

  echo "  Key hash $i: ${KEY_HASHES[$((i-1))]}"
done

# --- 2. Write 3-of-3 multisig native script with time lock ---
cat > "$POLICY_DIR/xp-policy.script" <<SCRIPT
{
  "type": "all",
  "scripts": [
    {
      "type": "sig",
      "keyHash": "${KEY_HASHES[0]}"
    },
    {
      "type": "sig",
      "keyHash": "${KEY_HASHES[1]}"
    },
    {
      "type": "sig",
      "keyHash": "${KEY_HASHES[2]}"
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

echo ""
echo "Policy ID: $POLICY_ID"
echo "$POLICY_ID" > "$POLICY_DIR/xp-policy.id"

# --- 3. Build CIP-721 metadata with real policy ID ---
METADATA_FILE="$SCRIPT_DIR/xp-metadata-final.json"
sed "s/POLICY_ID_PLACEHOLDER/$POLICY_ID/g" "$SCRIPT_DIR/xp-metadata.json" > "$METADATA_FILE"

echo "Metadata written to $METADATA_FILE"

# --- 4. Query UTxO for tx input ---
echo "Querying UTxOs at $PAYMENT_ADDR ..."
cardano-cli conway query utxo $NETWORK --address "$PAYMENT_ADDR" --out-file /tmp/xp-utxos.json

TX_IN=$(jq -r 'to_entries | sort_by(.value.value.lovelace) | last | .key' /tmp/xp-utxos.json)
echo "Using UTxO: $TX_IN"

# --- 5. Build transaction ---
ASSET="$POLICY_ID.5850"  # policy_id.hex("XP")

cardano-cli conway transaction build \
  $NETWORK \
  --tx-in "$TX_IN" \
  --tx-out "$DEST_ADDR+1500000+${SUPPLY} ${ASSET}" \
  --mint "${SUPPLY} ${ASSET}" \
  --mint-script-file "$POLICY_DIR/xp-policy.script" \
  --metadata-json-file "$METADATA_FILE" \
  --invalid-hereafter "$LOCK_AFTER_SLOT" \
  --witness-override 4 \
  --change-address "$PAYMENT_ADDR" \
  --out-file "$SCRIPT_DIR/mint-xp.raw"

echo "Transaction built: $SCRIPT_DIR/mint-xp.raw"

# --- 6. Sign (payment key + all 3 policy keys) ---
cardano-cli conway transaction sign \
  $NETWORK \
  --tx-body-file "$SCRIPT_DIR/mint-xp.raw" \
  --signing-key-file "$PAYMENT_SKEY" \
  --signing-key-file "$POLICY_DIR/mint-1.skey" \
  --signing-key-file "$POLICY_DIR/mint-2.skey" \
  --signing-key-file "$POLICY_DIR/mint-3.skey" \
  --out-file "$SCRIPT_DIR/mint-xp.signed"

echo "Transaction signed: $SCRIPT_DIR/mint-xp.signed"

# --- 7. Submit ---
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
echo "Policy ID:    $POLICY_ID"
echo "Asset name:   XP (hex: 5850)"
echo "Supply:       $SUPPLY"
echo "Locks at:     slot $LOCK_AFTER_SLOT"
echo "Tokens sent:  $DEST_ADDR"
echo "Policy keys:  $POLICY_DIR/mint-{1,2,3}.{skey,vkey}"
echo "Metadata:     Cardano XP V1 — https://cardano-xp.io"
