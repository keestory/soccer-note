#!/bin/bash

# App Icon Generator Script for Soccer Note
# Usage: ./scripts/generate-icons.sh [source_icon.png]
#
# The source icon should be at least 1024x1024 pixels
# If no source is provided, it will use public/icon-512.png

set -e

SOURCE_ICON="${1:-public/icon-512.png}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if source icon exists
if [ ! -f "$PROJECT_ROOT/$SOURCE_ICON" ]; then
    echo "Error: Source icon not found at $PROJECT_ROOT/$SOURCE_ICON"
    echo "Please provide a source icon (at least 1024x1024 pixels)"
    echo "Usage: ./scripts/generate-icons.sh path/to/icon.png"
    exit 1
fi

echo "Generating app icons from $SOURCE_ICON..."

# Android icon sizes
ANDROID_SIZES=("48:mdpi" "72:hdpi" "96:xhdpi" "144:xxhdpi" "192:xxxhdpi")
ANDROID_RES_DIR="$PROJECT_ROOT/android/app/src/main/res"

for size_density in "${ANDROID_SIZES[@]}"; do
    IFS=':' read -r size density <<< "$size_density"
    echo "Creating Android $density icon ($size x $size)..."

    # Standard icon
    sips -z $size $size "$PROJECT_ROOT/$SOURCE_ICON" --out "$ANDROID_RES_DIR/mipmap-$density/ic_launcher.png" 2>/dev/null

    # Round icon (same as standard for now)
    cp "$ANDROID_RES_DIR/mipmap-$density/ic_launcher.png" "$ANDROID_RES_DIR/mipmap-$density/ic_launcher_round.png"

    # Foreground for adaptive icons (slightly smaller to account for padding)
    foreground_size=$((size * 72 / 48))
    sips -z $foreground_size $foreground_size "$PROJECT_ROOT/$SOURCE_ICON" --out "$ANDROID_RES_DIR/mipmap-$density/ic_launcher_foreground.png" 2>/dev/null
done

# iOS icon (1024x1024 for App Store)
IOS_ASSETS_DIR="$PROJECT_ROOT/ios/App/App/Assets.xcassets/AppIcon.appiconset"

echo "Creating iOS App Store icon (1024 x 1024)..."
sips -z 1024 1024 "$PROJECT_ROOT/$SOURCE_ICON" --out "$IOS_ASSETS_DIR/AppIcon-512@2x.png" 2>/dev/null

echo ""
echo "App icons generated successfully!"
echo ""
echo "Note: For best results, use a source icon that is:"
echo "  - At least 1024x1024 pixels"
echo "  - PNG format with transparency if needed"
echo "  - Square aspect ratio"
echo ""
echo "After generating icons, run: npm run cap:sync"
