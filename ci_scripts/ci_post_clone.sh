#!/bin/sh

set -eu

REPOSITORY_PATH="${CI_PRIMARY_REPOSITORY_PATH:-$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)}"

cd "$REPOSITORY_PATH"

echo "Installing JavaScript dependencies required by Capacitor Swift packages..."
npm ci --no-audit --no-fund
