#!/usr/bin/env bash
# Enable this repo's tracked git hooks (.githooks/) for your local clone.
# Run once after cloning. Idempotent.
set -euo pipefail
repo="$(git rev-parse --show-toplevel)"
chmod +x "$repo/.githooks/"* "$repo/scripts/"*.sh 2>/dev/null || true
git -C "$repo" config core.hooksPath .githooks
echo "git hooks enabled: core.hooksPath -> .githooks"
echo "  - pre-push: blocks push when scripts/check.sh fails"
