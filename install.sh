#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=================================================="
echo "  Installing Bitcoin Trading Simulation CLI       "
echo "  Repository: aidasofialily-cmd/bitcoin-trading-simulaton"
echo "=================================================="

MIN_MACOS_VERSION="11.0"
OS_TYPE="$(uname -s)"

# 1. OS and Linux Distribution Check
case "$OS_TYPE" in
    Linux*)
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            DISTRO_NAME="${NAME:-Linux}"
            echo "✅ OS detected:      Linux ($PRETTY_NAME)"
        else
            DISTRO_NAME="Generic Linux"
            echo "⚠️ OS detected:      Linux (Unable to parse /etc/os-release)"
        fi

        case "${ID:-unknown}" in
            ubuntu|debian|fedora|arch|centos|rhel|alpine|pop|manjaro|mint)
                echo "✅ Distribution:     Supported ($DISTRO_NAME)"
                ;;
            *)
                echo "⚠️ Warning: Running on an unverified Linux distribution (${DISTRO_NAME}). Proceeding with installation..."
                ;;
        esac
        ;;

    Darwin*)
        CURRENT_MACOS_VERSION=$(sw_vers -productVersion)

        LOWER_VERSION=$(printf '%s\n%s\n' "$MIN_MACOS_VERSION" "$CURRENT_MACOS_VERSION" | sort -V | head -n1)

        if [ "$LOWER_VERSION" != "$MIN_MACOS_VERSION" ] && [ "$CURRENT_MACOS_VERSION" != "$MIN_MACOS_VERSION" ]; then
            echo "❌ Error: Your macOS version is too old ($CURRENT_MACOS_VERSION). Minimum required version is $MIN_MACOS_VERSION."
            exit 1
        fi

        echo "✅ OS detected:      macOS ($CURRENT_MACOS_VERSION)"
        ;;

    *)
        echo "❌ Error: Unsupported Operating System ($OS_TYPE). This installer supports Linux and macOS."
        exit 1
        ;;
esac

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

# 4. Check global npm permissions before linking
NPM_PREFIX="$(npm config get prefix)"
NPM_GLOBAL_DIR="$NPM_PREFIX/lib/node_modules"

if [ ! -w "$NPM_PREFIX" ] && [ ! -w "$NPM_GLOBAL_DIR" 2>/dev/null ] && [ "$(id -u)" -ne 0 ]; then
    echo ""
    echo "❌ Error: Write permission denied for global npm folder ($NPM_PREFIX)."
    echo "   Running 'npm link' requires root privileges or a user-owned npm prefix."
    echo ""
    echo "   To resolve this, choose one of the following:"
    echo "   1. Re-run with sudo: sudo ./install.sh"
    echo "   2. Configure a user-owned global directory:"
    echo "      mkdir -p ~/.npm-global"
    echo "      npm config set prefix '~/.npm-global'"
    echo "      export PATH=~/.npm-global/bin:\$PATH"
    exit 1
fi

echo "✅ Global npm path:  $NPM_PREFIX (Writable)"
echo ""

# 5. Clean install npm dependencies
echo "📦 Installing dependencies via npm..."
npm install

# 6. Build project (if build script exists in package.json)
if npm run | grep -q "build"; then
    echo "🔨 Building project artifacts..."
    npm run build
fi

# 7. Link binary globally using npm
echo "🔗 Linking executable binary globally via npm..."
npm link

echo ""
echo "=================================================="
echo "🎉 Installation completed successfully!"
echo "=================================================="
echo "You can now run the simulation from anywhere using:"
echo "  bitcoin-trading-simulation"
echo ""
