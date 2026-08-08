#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=================================================="
echo "  Uninstalling Bitcoin Trading Simulation CLI     "
echo "  Repository: aidasofialily-cmd/bitcoin-trading-simulaton"
echo "=================================================="

# 1. Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Unable to proceed with unlinking."
    exit 1
fi

# 2. Check global npm write permissions before unlinking
NPM_PREFIX="$(npm config get prefix)"
NPM_GLOBAL_DIR="$NPM_PREFIX/lib/node_modules"

if [ ! -w "$NPM_PREFIX" ] && [ ! -w "$NPM_GLOBAL_DIR" 2>/dev/null ] && [ "$(id -u)" -ne 0 ]; then
    echo ""
    echo "❌ Error: Write permission denied for global npm folder ($NPM_PREFIX)."
    echo "   Removing global links requires root privileges or a user-owned npm prefix."
    echo ""
    echo "   Please re-run with elevated privileges:"
    echo "     sudo ./uninstall.sh"
    exit 1
fi

# 3. Unlink binary globally using npm
echo "🔗 Unlinking global npm package..."
if npm unlink 2>/dev/null; then
    echo "✅ Global binary link removed."
else
    echo "⚠️ Warning: 'npm unlink' did not find an active link, continuing cleanup..."
fi

# 4. Clean local dependencies and build artifacts
echo "🧹 Cleaning local node_modules, build directories, and cache..."
rm -rf node_modules
rm -rf dist build .next
rm -f package-lock.json

echo ""
echo "=================================================="
echo "🎉 Uninstallation completed successfully!"
echo "=================================================="
echo "Global CLI command removed and local build environment reset."
echo ""
