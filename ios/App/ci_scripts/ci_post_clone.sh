#!/bin/sh

set -eu

REPOSITORY_PATH="${CI_PRIMARY_REPOSITORY_PATH:-$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)}"

cd "$REPOSITORY_PATH"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || printf '0')"
if ! command -v npm >/dev/null 2>&1 || [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node.js 22+ is required; installing Node.js 22 with Homebrew..."
  brew install node@22
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi

echo "Installing JavaScript dependencies required by Capacitor Swift packages..."
npm ci --no-audit --no-fund

mkdir -p out
if [ ! -f out/index.html ]; then
  printf '%s\n' '<!doctype html><html><head><meta charset="utf-8"><title>Football Note</title></head><body></body></html>' > out/index.html
fi

echo "Generating the Capacitor iOS project resources..."
npx --no-install cap sync ios
