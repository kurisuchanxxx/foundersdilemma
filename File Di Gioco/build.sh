#!/bin/bash

set -e

echo "========================================="
echo "Building VentureSim..."
echo "========================================="
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
SCHEME="VentureSim"

# Check if Xcode project exists
if [ ! -d "$PROJECT_DIR/VentureSim.xcodeproj" ]; then
    echo "❌ Error: VentureSim.xcodeproj not found!"
    echo ""
    echo "Please create the Xcode project first:"
    echo "1. Open Xcode"
    echo "2. File → New → Project → macOS App"
    echo "3. Name: VentureSim"
    echo "4. Add existing source files"
    echo ""
    echo "See README.md for detailed instructions."
    exit 1
fi

# Build
echo "Building Release configuration..."
xcodebuild -project "$PROJECT_DIR/VentureSim.xcodeproj" \
    -scheme "$SCHEME" \
    -configuration Release \
    -derivedDataPath "$BUILD_DIR" \
    build

APP_PATH="$BUILD_DIR/Build/Products/Release/VentureSim.app"

if [ -d "$APP_PATH" ]; then
    echo ""
    echo "✅ Build successful!"
    echo "App location: $APP_PATH"
    echo ""
    echo "To run:"
    echo "  open \"$APP_PATH\""
else
    echo ""
    echo "❌ Build failed - app not found"
    exit 1
fi
