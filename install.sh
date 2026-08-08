#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

ASSUME_YES=false

# Function called automatically if any step in the installation fails
on_failure() {
    EXIT_CODE=$?
    echo ""
    echo "=================================================="
    echo "❌ Installation encountered an error (exit code: $EXIT_CODE)."
    echo "   Launching diagnostic troubleshooter..."
    echo "=================================================="
    echo ""

    if [ -f "./install-troubleshooter.sh" ]; then
        # Ensure executable permissions on troubleshooter
        chmod +x ./install-troubleshooter.sh 2>/dev/null || true
        ./install-troubleshooter.sh
    else
        echo "⚠️ Could not locate install-troubleshooter.sh in current directory."
    fi

    exit "$EXIT_CODE"
}

# Trap ERR signal to trigger the failure handler
trap 'on_failure' ERR

# Parse command line flags
for arg in "$@"; do
    case "$arg" in
        -y|--yes)
            ASSUME_YES=true
            shift
            ;;
    esac
done

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
            false # Trigger failure trap
        fi

        echo "✅ OS detected:      macOS ($CURRENT_MACOS_VERSION)"
        ;;

    *)
        echo "❌ Error: Unsupported Operating System ($OS_TYPE). This installer supports Linux and macOS."
        false # Trigger failure trap
        ;;
esac

# 2. Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js (v16+) before proceeding."
    false # Trigger failure trap
fi

# 3. Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm to continue."
    false # Trigger failure trap
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version:     $(npm -v)"

# 4. Determine permissions for global npm linking
NPM_PREFIX="$(npm config get prefix)"
NPM_GLOBAL_DIR="$NPM_PREFIX/lib/node_modules"
USE_SUDO=false

if [ ! -w "$NPM_PREFIX" ] && [ ! -w "$NPM_GLOBAL_DIR" 2>/dev/null ] && [ "$(id -u)" -ne 0 ]; then
    echo "⚠️ Warning: Write access denied for global npm directory ($NPM_PREFIX)."
    echo "🔐 Elevated privileges (sudo) will be required to run 'npm link'."
    USE_SUDO=true
else
    echo "✅ Global npm path:  $NPM_PREFIX (Writable)"
fi
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
if [ "$USE_SUDO" = true ]; then
    if [ "$ASSUME_YES" = true ]; then
        echo "🔑 Auto-confirming sudo execution (-y / --yes flag passed)..."
        sudo npm link
    else
        read -p "❓ Sudo privilege is required to link binary to $NPM_PREFIX. Proceed? [Y/n]: " CONFIRM_SUDO
        CONFIRM_SUDO=${CONFIRM_SUDO:-Y}

        case "$CONFIRM_SUDO" in
            [yY][eE][sS]|[yY])
                echo "🔑 Invoking sudo for 'npm link'..."
                sudo npm link
                ;;
            *)
                echo "❌ Global linking canceled by user. Local installation completed."
                echo "   You can manually run 'sudo npm link' whenever you are ready."
                exit 0
                ;;
        esac
    fi
else
    npm link
fi

echo ""
echo "=================================================="
echo "🎉 Installation completed successfully!"
echo "=================================================="
echo "You can now run the simulation from anywhere using:"
echo "  bitcoin-trading-simulation"
echo ""
