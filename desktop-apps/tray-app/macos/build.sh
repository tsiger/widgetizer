#!/bin/bash

# Build script for Widgetizer macOS Menu Bar App
# Run from: desktop-apps/tray-app/macos/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/WidgetizerMenu"
BUILD_DIR="$SCRIPT_DIR/build"
APP_NAME="WidgetizerMenu"

echo "🔨 Building Widgetizer Menu Bar App..."

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Check for Xcode command line tools
if ! command -v swiftc &> /dev/null; then
    echo "❌ Error: Swift compiler not found."
    echo "   Please install Xcode Command Line Tools:"
    echo "   xcode-select --install"
    exit 1
fi

# Create app bundle structure
APP_BUNDLE="$BUILD_DIR/$APP_NAME.app"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

echo "📦 Compiling Swift..."

# Compile the Swift app
swiftc \
    -O \
    -sdk $(xcrun --sdk macosx --show-sdk-path) \
    -o "$APP_BUNDLE/Contents/MacOS/$APP_NAME" \
    "$PROJECT_DIR/WidgetizerMenu/AppDelegate.swift"

echo "📄 Copying resources..."

# Copy Info.plist
cp "$PROJECT_DIR/WidgetizerMenu/Info.plist" "$APP_BUNDLE/Contents/"

# Copy icon if it exists
if [ -f "$SCRIPT_DIR/icon.icns" ]; then
    cp "$SCRIPT_DIR/icon.icns" "$APP_BUNDLE/Contents/Resources/AppIcon.icns"
    echo "✅ Icon copied"
fi

# Copy menu bar icon if it exists
if [ -f "$SCRIPT_DIR/icon.png" ]; then
    cp "$SCRIPT_DIR/icon.png" "$APP_BUNDLE/Contents/Resources/icon.png"
    echo "✅ Menu bar icon copied"
fi

# Create PkgInfo
echo -n "APPL????" > "$APP_BUNDLE/Contents/PkgInfo"

echo ""
echo "✅ Build complete!"
echo "📍 Output: $APP_BUNDLE"
echo ""
echo "To test, run:"
echo "   open $APP_BUNDLE"
echo ""
echo "To copy to your build folder:"
echo "   cp -r $APP_BUNDLE /path/to/widgetizer-vX.X.X/"
