#!/usr/bin/env bash
# Lints extension/manifest.json for placeholder strings that must be filled in
# before shipping. Run from repo root. Returns 0 on clean, 1 on placeholders.
set -euo pipefail
MANIFEST="extension/manifest.json"
if [ ! -f "$MANIFEST" ]; then
  echo "lint-manifest: $MANIFEST not found" >&2
  exit 2
fi
FAIL=0
if grep -q "YOUR_GOOGLE_CLIENT_ID" "$MANIFEST"; then
  echo "lint-manifest: $MANIFEST contains YOUR_GOOGLE_CLIENT_ID — set the real Google OAuth client ID before release." >&2
  FAIL=1
fi
if grep -q "your-backend.railway.app" "$MANIFEST"; then
  echo "lint-manifest: $MANIFEST contains your-backend.railway.app — set the real backend host before release." >&2
  FAIL=1
fi
if grep -qE '"<all_urls>"' "$MANIFEST"; then
  echo "lint-manifest: $MANIFEST still contains <all_urls> — scope host_permissions and content_scripts before release." >&2
  FAIL=1
fi
if [ "$FAIL" -eq 0 ]; then
  echo "lint-manifest: clean."
fi
exit "$FAIL"
