#!/bin/bash

# Splash Screen Generator Script for Soccer Note
# Usage: ./scripts/generate-splash.sh [source_logo.png]
#
# Creates splash screens with the app's green background color (#059669)

set -e

SOURCE_LOGO="${1:-public/icon-512.png}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMP_DIR="$PROJECT_ROOT/.temp-splash"

# Background color (emerald-600)
BG_COLOR="#059669"

# Check if source logo exists
if [ ! -f "$PROJECT_ROOT/$SOURCE_LOGO" ]; then
    echo "Error: Source logo not found at $PROJECT_ROOT/$SOURCE_LOGO"
    exit 1
fi

echo "Generating splash screens from $SOURCE_LOGO..."
mkdir -p "$TEMP_DIR"

# Android splash sizes
declare -A ANDROID_SIZES=(
    ["drawable-port-mdpi"]="320x480"
    ["drawable-port-hdpi"]="480x800"
    ["drawable-port-xhdpi"]="720x1280"
    ["drawable-port-xxhdpi"]="960x1600"
    ["drawable-port-xxxhdpi"]="1280x1920"
    ["drawable-land-mdpi"]="480x320"
    ["drawable-land-hdpi"]="800x480"
    ["drawable-land-xhdpi"]="1280x720"
    ["drawable-land-xxhdpi"]="1600x960"
    ["drawable-land-xxxhdpi"]="1920x1280"
)

ANDROID_RES_DIR="$PROJECT_ROOT/android/app/src/main/res"

for folder in "${!ANDROID_SIZES[@]}"; do
    size="${ANDROID_SIZES[$folder]}"
    width=$(echo $size | cut -d'x' -f1)
    height=$(echo $size | cut -d'x' -f2)

    # Calculate logo size (30% of smaller dimension)
    if [ $width -lt $height ]; then
        logo_size=$((width * 30 / 100))
    else
        logo_size=$((height * 30 / 100))
    fi

    echo "Creating Android splash: $folder ($size)..."

    # Create background
    convert -size ${size} xc:"$BG_COLOR" "$TEMP_DIR/bg.png" 2>/dev/null || \
        echo "Note: ImageMagick not found, skipping $folder"

    if [ -f "$TEMP_DIR/bg.png" ]; then
        # Resize logo
        sips -z $logo_size $logo_size "$PROJECT_ROOT/$SOURCE_LOGO" --out "$TEMP_DIR/logo.png" 2>/dev/null

        # Composite (center logo on background)
        composite -gravity center "$TEMP_DIR/logo.png" "$TEMP_DIR/bg.png" "$ANDROID_RES_DIR/$folder/splash.png" 2>/dev/null
    fi
done

# iOS splash (2732x2732 for universal)
IOS_SPLASH_DIR="$PROJECT_ROOT/ios/App/App/Assets.xcassets/Splash.imageset"

if command -v convert &> /dev/null; then
    echo "Creating iOS splash screen..."
    convert -size 2732x2732 xc:"$BG_COLOR" "$TEMP_DIR/ios_bg.png"
    sips -z 600 600 "$PROJECT_ROOT/$SOURCE_LOGO" --out "$TEMP_DIR/ios_logo.png" 2>/dev/null
    composite -gravity center "$TEMP_DIR/ios_logo.png" "$TEMP_DIR/ios_bg.png" "$IOS_SPLASH_DIR/splash-2732x2732.png"
    cp "$IOS_SPLASH_DIR/splash-2732x2732.png" "$IOS_SPLASH_DIR/splash-2732x2732-1.png"
    cp "$IOS_SPLASH_DIR/splash-2732x2732.png" "$IOS_SPLASH_DIR/splash-2732x2732-2.png"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "Splash screens generated successfully!"
echo ""
echo "Note: This script requires ImageMagick for splash generation."
echo "Install with: brew install imagemagick"
echo ""
echo "After generating splash screens, run: npm run cap:sync"
