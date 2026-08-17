#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=================================================="
echo "  Uninstalling Bitcoin Trading Simulation         "
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
USE_SUDO=false

if [ ! -w "$NPM_PREFIX" ] && [ ! -w "$NPM_GLOBAL_DIR" 2>/dev/null ] && [ "$(id -u)" -ne 0 ]; then
    echo "⚠️ Warning: Write access denied for global npm directory ($NPM_PREFIX)."
    echo "🔐 Elevated privileges (sudo) will be required to run 'npm unlink'."
    USE_SUDO=true
else
    echo "✅ Global npm path:  $NPM_PREFIX (Writable)"
fi

# 3. Unlink binary globally using npm (prompting before using sudo)
echo "🔗 Unlinking global npm package..."
if [ "$USE_SUDO" = true ]; then
    read -p "❓ Sudo privilege is required to unlink binary from $NPM_PREFIX. Proceed? [Y/n]: " CONFIRM_SUDO
    CONFIRM_SUDO=${CONFIRM_SUDO:-Y}

    case "$CONFIRM_SUDO" in
        [yY][eE][sS]|[yY])
            echo "🔑 Invoking sudo for 'npm unlink'..."
            if sudo npm unlink 2>/dev/null; then
                echo "✅ Global binary link removed."
            else
                echo "⚠️ Warning: 'npm unlink' did not find an active link, continuing cleanup..."
            fi
            ;;
        *)
            echo "⚠️ Global unlinking skipped by user. Continuing local cleanup..."
            ;;
    esac
else
    if npm unlink 2>/dev/null; then
        echo "✅ Global binary link removed."
    else
        echo "⚠️ Warning: 'npm unlink' did not find an active link, continuing cleanup..."
    fi
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
