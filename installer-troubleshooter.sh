#!/usr/bin/env bash

echo "=================================================="
echo "  Bitcoin Trading Simulation CLI Troubleshooter   "
echo "  Repository: aidasofialily-cmd/bitcoin-trading-simulaton"
echo "=================================================="
echo ""

ERRORS=0
WARNINGS=0

# 1. Check Operating System
echo "🔍 [1/6] Checking Operating System..."
OS_TYPE="$(uname -s)"
case "$OS_TYPE" in
    Linux*)
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            echo "   ✅ OS: Linux ($PRETTY_NAME)"
        else
            echo "   ⚠️ OS: Generic Linux (/etc/os-release not found)"
            ((WARNINGS++))
        fi
        ;;
    Darwin*)
        MACOS_VER=$(sw_vers -productVersion 2>/dev/null || echo "Unknown")
        echo "   ✅ OS: macOS ($MACOS_VER)"
        ;;
    *)
        echo "   ❌ Error: Unsupported OS ($OS_TYPE). Linux or macOS required."
        ((ERRORS++))
        ;;
esac

# 2. Check Shell Environment & Execution Flags
echo "🔍 [2/6] Checking Shell & Execution Environment..."
if [ -n "$BASH_VERSION" ]; then
    echo "   ✅ Shell: Bash ($BASH_VERSION)"
else
    echo "   ⚠️ Warning: Script not running natively under Bash."
    ((WARNINGS++))
fi

# 3. Check Node.js
echo "🔍 [3/6] Checking Node.js Runtime..."
if command -v node &> /dev/null; then
    NODE_VER=$(node -v)
    NODE_MAJOR=$(echo "$NODE_VER" | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 16 ]; then
        echo "   ✅ Node.js: $NODE_VER (Minimum v16 required)"
    else
        echo "   ❌ Error: Node.js version $NODE_VER is too old. Please upgrade to v16+."
        ((ERRORS++))
    fi
else
    echo "   ❌ Error: Node.js is not installed or not in PATH."
    ((ERRORS++))
fi

# 4. Check npm
echo "🔍 [4/6] Checking npm Package Manager..."
if command -v npm &> /dev/null; then
    NPM_VER=$(npm -v)
    echo "   ✅ npm: v$NPM_VER"
else
    echo "   ❌ Error: npm is not installed or not in PATH."
    ((ERRORS++))
fi

# 5. Check npm Prefix and Write Permissions
echo "🔍 [5/6] Checking Global npm Directory Permissions..."
if command -v npm &> /dev/null; then
    NPM_PREFIX="$(npm config get prefix)"
    NPM_GLOBAL_DIR="$NPM_PREFIX/lib/node_modules"

    echo "   📍 Global npm Prefix: $NPM_PREFIX"
    if [ -w "$NPM_PREFIX" ] || [ -w "$NPM_GLOBAL_DIR" 2>/dev/null ]; then
        echo "   ✅ Permissions: $NPM_PREFIX is writable by user $(whoami)."
    else
        if [ "$(id -u)" -eq 0 ]; then
            echo "   ✅ Permissions: Running as root."
        else
            echo "   ⚠️ Notice: $NPM_PREFIX requires 'sudo' or elevated privileges to write."
            echo "      (Note: install.sh will prompt for sudo automatically or accept -y)."
            ((WARNINGS++))
        fi
    fi
fi

# 6. Check Project Context & Local Files
echo "🔍 [6/6] Checking Repository Structure..."
if [ -f "package.json" ]; then
    echo "   ✅ Found package.json in current working directory."
    if [ -f "install.sh" ]; then
        if [ -x "install.sh" ]; then
            echo "   ✅ install.sh is present and executable."
        else
            echo "   ⚠️ Warning: install.sh exists but lacks execute permissions (+x)."
            echo "      Fix with: chmod +x install.sh"
            ((WARNINGS++))
        fi
    fi
else
    echo "   ❌ Error: package.json not found in current directory."
    echo "      Ensure you run this troubleshooter from the repository root."
    ((ERRORS++))
fi

echo ""
echo "=================================================="
echo "  Diagnostic Summary"
echo "=================================================="
echo "   Errors found:   $ERRORS"
echo "   Warnings found: $WARNINGS"
echo ""

if [ "$ERRORS" -gt 0 ]; then
    echo "❌ System check failed. Resolve the errors above before running install.sh."
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo "⚠️ System check passed with warnings. Installation should proceed normally."
    exit 0
else
    echo "🎉 System check passed cleanly! Your environment is ready for install.sh."
    exit 0
fi
