#!/bin/bash
# =============================================================================
# stamp-version.sh — Compute app version from git tags and write to package.json
# =============================================================================
# Source of truth: git tags (v*.*.*).
#
# Version tiers:
#   1. Push to main:           2.0.0-dev-20260131-a3f4b2c
#   2. Tag v*.*.*-rc*:         2.0.0-rc1
#   3. Tag v*.*.*  (release):  2.0.0
#
# Usage:
#   ./scripts/stamp-version.sh          # auto-detect from git state
#   ./scripts/stamp-version.sh --dry    # print version without writing
# =============================================================================

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry" ]] && DRY_RUN=true

SHORT_SHA=$(git rev-parse --short HEAD)
DATE=$(date -u +'%Y%m%d')

# --- Determine version from git ref ---
if [[ "${GITHUB_REF:-}" == refs/tags/v* ]]; then
  # CI: tagged build — strip leading 'v'
  VERSION="${GITHUB_REF#refs/tags/v}"
else
  # Detect if HEAD itself is a version tag (local usage)
  HEAD_TAG=$(git tag --points-at HEAD 2>/dev/null | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true)

  if [[ -n "$HEAD_TAG" ]]; then
    VERSION="${HEAD_TAG#v}"
  else
    # Dev build: find latest version tag and extract base semver (X.Y.Z)
    LATEST_TAG=$(git describe --tags --match 'v[0-9]*.[0-9]*.[0-9]*' --abbrev=0 2>/dev/null || echo "v0.0.0")
    # Strip 'v' prefix and any prerelease suffix (-rc1, -beta2, etc.)
    BASE=$(echo "${LATEST_TAG#v}" | sed 's/-.*//')
    VERSION="${BASE}-dev-${DATE}-${SHORT_SHA}"
  fi
fi

echo "Version: ${VERSION}"

if $DRY_RUN; then
  exit 0
fi

# --- Write to package.json using npm (no git side-effects) ---
npm version "${VERSION}" --no-git-tag-version --allow-same-version 2>/dev/null

echo "Stamped package.json → ${VERSION}"
