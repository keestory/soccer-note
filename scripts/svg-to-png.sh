#!/bin/bash

# SVG to PNG Converter for app icons
# Usage: ./scripts/svg-to-png.sh [source.svg] [output.png] [size]
# Requires: qlmanage (built-in macOS) or rsvg-convert (install: brew install librsvg)

set -e

SVG_FILE="${1:-public/app-icon.svg}"
OUTPUT_FILE="${2:-public/app-icon-1024.png}"
SIZE="${3:-1024}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

SVG_PATH="$PROJECT_ROOT/$SVG_FILE"
OUTPUT_PATH="$PROJECT_ROOT/$OUTPUT_FILE"

if [ ! -f "$SVG_PATH" ]; then
    echo "Error: SVG file not found at $SVG_PATH"
    exit 1
fi

echo "Converting $SVG_FILE to PNG ($SIZE x $SIZE)..."

# Try rsvg-convert first (better quality)
if command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w $SIZE -h $SIZE "$SVG_PATH" -o "$OUTPUT_PATH"
    echo "Converted using rsvg-convert"
# Fallback to qlmanage (built-in macOS)
elif command -v qlmanage &> /dev/null; then
    TEMP_DIR=$(mktemp -d)
    qlmanage -t -s $SIZE -o "$TEMP_DIR" "$SVG_PATH" 2>/dev/null
    mv "$TEMP_DIR"/*.png "$OUTPUT_PATH"
    rm -rf "$TEMP_DIR"
    echo "Converted using qlmanage"
else
    echo "Error: No SVG converter found."
    echo "Install rsvg-convert with: brew install librsvg"
    exit 1
fi

echo "Output: $OUTPUT_FILE"
echo ""
echo "Now run: ./scripts/generate-icons.sh $OUTPUT_FILE"
