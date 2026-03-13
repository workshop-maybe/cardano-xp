#!/bin/bash
# Generate TypeScript types from the Andamio Gateway OpenAPI spec.
# Updates apiVersion in package.json (app version is stamped separately by stamp-version.sh).
# Also captures API spec metadata for traceability.

set -e

GATEWAY_URL="${NEXT_PUBLIC_ANDAMIO_GATEWAY_URL:-https://preprod.api.andamio.io}"
SPEC_URL="${GATEWAY_URL}/api/v1/docs/doc.json"
OUTPUT_DIR="src/types/generated"
METADATA_FILE="${OUTPUT_DIR}/api-metadata.json"

echo "Fetching OpenAPI spec from ${SPEC_URL}..."

# Generate TypeScript types
npx swagger-typescript-api generate \
  -p "${SPEC_URL}" \
  -o "${OUTPUT_DIR}" \
  -n gateway.ts \
  --no-client

# Remove @ts-nocheck - types compile cleanly without it (verified 2026-03-13)
# This enables TypeScript compile-time checking on generated API types
sed -i '' 's|// @ts-nocheck|// TypeScript checking enabled - API types are compile-time safe|' "${OUTPUT_DIR}/gateway.ts"

# Fetch API metadata, sync version to VERSION + package.json
node -e "
  fetch('${SPEC_URL}')
    .then(r => r.json())
    .then(spec => {
      const fs = require('fs');
      const apiVersion = spec.info?.version ?? 'unknown';

      // --- Save metadata ---
      const meta = {
        api_version: apiVersion,
        api_title: spec.info?.title ?? 'unknown',
        x_api_revision: spec.info?.['x-api-revision'] ?? apiVersion,
        x_build_commit: spec.info?.['x-build-commit'] ?? 'unknown',
        fetched_at: new Date().toISOString(),
        spec_url: '${SPEC_URL}',
      };
      fs.writeFileSync('${METADATA_FILE}', JSON.stringify(meta, null, 2) + '\n');
      console.log('API metadata:', JSON.stringify(meta, null, 2));

      // --- Sync apiVersion only (app version is managed by stamp-version.sh) ---
      const pkgPath = 'package.json';
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const oldApiVersion = pkg.apiVersion;
      pkg.apiVersion = apiVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log('package.json apiVersion: ' + (oldApiVersion ?? 'unset') + ' -> ' + apiVersion);
    })
    .catch(err => {
      console.error('ERROR: Could not fetch API metadata:', err.message);
      process.exit(1);
    });
"

echo ""
echo "Types generated in ${OUTPUT_DIR}/gateway.ts"
echo "API version synced to package.json"
