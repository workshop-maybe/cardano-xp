#!/usr/bin/env bash
#
# Guard the "on-chain strings are untrusted" contract from PR #48 / issue #44.
# Exits non-zero if a new unsafe rendering sink lands outside the allowlist.
#
# The allowlist is intentionally narrow: any file here is a known-safe use
# of an unsafe sink, reviewed and documented in src/lib/alias-validation.ts.
# Adding a file to the allowlist means you've confirmed the sink can never
# receive on-chain data.
#
# See src/lib/alias-validation.ts for the threat model.

set -euo pipefail

# Files permitted to use dangerouslySetInnerHTML. Each must be justified.
# src/components/ui/chart.tsx — injects CSS from developer-supplied ChartConfig
#   (constants + useId() + component props); no on-chain data path.
ALLOWED=(
  "src/components/ui/chart.tsx"
)

# Build the grep exclusion (one -e per allowed file).
EXCLUDE_ARGS=()
for f in "${ALLOWED[@]}"; do
  EXCLUDE_ARGS+=("-e" "$f")
done

# Find every dangerouslySetInnerHTML JSX attribute (`dangerouslySetInnerHTML={`)
# in src/, then filter out the allowlist. We match the attribute form
# specifically so documentation mentions of the API name don't trip the guard.
VIOLATIONS=$(grep -rn 'dangerouslySetInnerHTML={' src/ | grep -v "${EXCLUDE_ARGS[@]}" || true)

if [ -n "$VIOLATIONS" ]; then
  echo "ERROR: Unreviewed dangerouslySetInnerHTML site(s) found:"
  echo "$VIOLATIONS"
  echo ""
  echo "On-chain data must never flow into dangerouslySetInnerHTML."
  echo "If this new use is safe, add the file to the ALLOWED list in"
  echo "scripts/audit-unsafe-sinks.sh and document why in that comment."
  exit 1
fi

echo "audit:unsafe-sinks — OK"
