#!/bin/sh

set -eu

REPOSITORY_PATH="${CI_PRIMARY_REPOSITORY_PATH:-$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)}"

cd "$REPOSITORY_PATH"

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js is not available; installing Node.js 22 with Homebrew..."
  brew install node@22
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi

echo "Installing JavaScript dependencies required by Capacitor Swift packages..."
npm ci --omit=dev --no-audit --no-fund
