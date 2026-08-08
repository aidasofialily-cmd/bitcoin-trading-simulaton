#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=================================================="
echo "  Installing Bitcoin Trading Simulation CLI       "
echo "  Repository: aidasofialily-cmd/bitcoin-trading-simulaton"
echo "=================================================="

# Minimum required macOS version
MIN_MACOS_VERSION="11.0"

# 1. macOS Version Check
if [ "$(uname -s)" = "Darwin" ]; then
    CURRENT_MACOS_VERSION=$(sw_vers -productVersion)

    # Compare versions using sort -V
    LOWER_VERSION=$(printf '%s\n%s\n' "$MIN_MACOS_VERSION" "$CURRENT_MACOS_VERSION" | sort -V | head -n1)

    if [ "$LOWER_VERSION" != "$MIN_MACOS_VERSION" ] && [ "$CURRENT_MACOS_VERSION" != "$MIN_MACOS_VERSION" ]; then
        echo "❌ Error: Your macOS version is too old ($CURRENT_MACOS_VERSION). Minimum required version is $MIN_MACOS_VERSION."
        exit 1
    fi

    echo "✅ macOS version:   $CURRENT_MACOS_VERSION"
fi

# 2. Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js (v16+) before proceeding."
    exit 1
fi

# 3. Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm to continue."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version:     $(npm -v)"
echo ""

# 4. Clean install npm dependencies
echo "📦 Installing dependencies via npm..."
npm install

# 5. Build project (if build script exists in package.json)
if npm run | grep -q "build"; then
    echo "🔨 Building project artifacts..."
    npm run build
fi

# 6. Link binary globally using npm
echo "🔗 Linking executable binary globally via npm..."
npm link

echo ""
echo "=================================================="
echo "🎉 Installation completed successfully!"
echo "=================================================="
echo "You can now run the simulation from anywhere using:"
echo "  bitcoin-trading-simulation"
echo ""
