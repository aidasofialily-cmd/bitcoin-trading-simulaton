#!/usr/bin/env bash

echo "=================================================="
echo "  Bitcoin Trading Simulation CLI Troubleshooter   "
echo "  Repository: aidasofialily-cmd/bitcoin-trading-simulaton"
echo "=================================================="
echo ""

ERRORS=0
WARNINGS=0

# Fix flags tracked across diagnostic checks
FIX_PERMISSIONS_NEEDED=false
FIX_EXEC_FLAGS_NEEDED=false
FIX_NPM_INSTALL_NEEDED=false

# 1. Check Operating System
echo "[1/6] Checking Operating System..."
OS_TYPE="$(uname -s)"
case "$OS_TYPE" in
    Linux*)
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            echo "   OS: Linux ($PRETTY_NAME)"
        else
            echo "   OS: Generic Linux (/etc/os-release not found)"
            ((WARNINGS++))
        fi
        ;;
    Darwin*)
        MACOS_VER=$(sw_vers -productVersion 2>/dev/null || echo "Unknown")
        echo "   OS: macOS ($MACOS_VER)"
        ;;
    *)
        echo "   Error: Unsupported OS ($OS_TYPE). Linux or macOS required."
        ((ERRORS++))
        ;;
esac

# 2. Check Shell Environment & Execution Flags
echo "[2/6] Checking Shell & Execution Environment..."
if [ -n "$BASH_VERSION" ]; then
    echo "   Shell: Bash ($BASH_VERSION)"
else
    echo "   Warning: Script not running natively under Bash."
    ((WARNINGS++))
fi

# 3. Check Node.js
echo "[3/6] Checking Node.js Runtime..."
if command -v node &> /dev/null; then
    NODE_VER=$(node -v)
    NODE_MAJOR=$(echo "$NODE_VER" | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 16 ]; then
        echo "   Node.js: $NODE_VER (Minimum v16 required)"
    else
        echo "   Error: Node.js version $NODE_VER is too old. Please upgrade to v16+."
        ((ERRORS++))
    fi
else
    echo "   Error: Node.js is not installed or not in PATH."
    ((ERRORS++))
fi

# 4. Check npm
echo "[4/6] Checking npm Package Manager..."
if command -v npm &> /dev/null; then
    NPM_VER=$(npm -v)
    echo "   npm: v$NPM_VER"
else
    echo "   Error: npm is not installed or not in PATH."
    ((ERRORS++))
fi

# 5. Check npm Prefix and Write Permissions
echo "[5/6] Checking Global npm Directory Permissions..."
if command -v npm &> /dev/null; then
    NPM_PREFIX="$(npm config get prefix)"
    NPM_GLOBAL_DIR="$NPM_PREFIX/lib/node_modules"

    echo "   Global npm Prefix: $NPM_PREFIX"
    if [ -w "$NPM_PREFIX" ] || [ -w "$NPM_GLOBAL_DIR" 2>/dev/null ]; then
        echo "   Permissions: $NPM_PREFIX is writable by user $(whoami)."
    else
        if [ "$(id -u)" -eq 0 ]; then
            echo "   Permissions: Running as root."
        else
            echo "   Notice: $NPM_PREFIX requires 'sudo' or elevated privileges to write."
            FIX_PERMISSIONS_NEEDED=true
            ((WARNINGS++))
        fi
    fi
fi

# 6. Check Project Context & Local Files
echo "[6/6] Checking Repository Structure..."
if [ -f "package.json" ]; then
    echo "   Found package.json in current working directory."
    
    # Check if local dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo "   Warning: node_modules directory missing. Project dependencies not installed."
        FIX_NPM_INSTALL_NEEDED=true
        ((WARNINGS++))
    fi

    # Check execution flags on shell scripts
    for script in install.sh uninstall.sh install-troubleshooter.sh; do
        if [ -f "$script" ] && [ ! -x "$script" ]; then
            echo "   Warning: $script exists but lacks execute permissions (+x)."
            FIX_EXEC_FLAGS_NEEDED=true
            ((WARNINGS++))
        fi
    done
else
    echo "   Error: package.json not found in current directory."
    echo "      Ensure you run this troubleshooter from the repository root."
    ((ERRORS++))
fi

echo ""
echo "=================================================="
echo "  Diagnostic Summary"
echo "=================================================="
echo "   Errors found:   $ERRORS"
echo "   Warnings found: $WARNINGS"
echo "=================================================="
echo ""

# Interactive Automated Fix Menu
show_fix_menu() {
    while true; do
        echo "Automated Quick Fix Menu:"
        echo "   [1] Grant execution permissions (chmod +x *.sh)"
        echo "   [2] Install npm local dependencies (npm install)"
        echo "   [3] Configure user-owned global npm directory (~/.npm-global)"
        echo "   [4] Run full automated repair sequence"
        echo "   [5] Exit troubleshooter"
        echo ""
        read -p "Select an option [1-5]: " CHOICE

        case "$CHOICE" in
            1)
                echo "Applying execute permissions (+x) to all shell scripts..."
                chmod +x install.sh uninstall.sh install-troubleshooter.sh 2>/dev/null || true
                echo "Execute permissions granted."
                echo ""
                ;;
            2)
                echo "Installing npm dependencies..."
                npm install
                echo "npm dependencies installed."
                echo ""
                ;;
            3)
                echo "Configuring user-owned global npm directory..."
                mkdir -p "$HOME/.npm-global"
                npm config set prefix "$HOME/.npm-global"
                echo "npm prefix updated to $HOME/.npm-global"
                echo "Tip: Ensure 'export PATH=~/.npm-global/bin:\$PATH' is in your ~/.bashrc or ~/.zshrc"
                echo ""
                ;;
            4)
                echo "Running complete automated repair sequence..."
                chmod +x install.sh uninstall.sh install-troubleshooter.sh 2>/dev/null || true
                npm install
                if [ "$FIX_PERMISSIONS_NEEDED" = true ]; then
                    mkdir -p "$HOME/.npm-global"
                    npm config set prefix "$HOME/.npm-global"
                fi
                echo "Repair sequence complete! Re-running installer..."
                echo ""
                ./install.sh -y
                exit 0
                ;;
            5)
                echo "Exiting troubleshooter."
                exit 0
                ;;
            *)
                echo "Invalid choice. Please select a number between 1 and 5."
                echo ""
                ;;
        esac
    done
}

# Prompt user if issues were detected or if interactive terminal is active
if [ -t 0 ]; then
    read -p "Would you like to launch the interactive fix menu? [Y/n]: " LAUNCH_FIX
    LAUNCH_FIX=${LAUNCH_FIX:-Y}

    case "$LAUNCH_FIX" in
        [yY][eE][sS]|[yY])
            echo ""
            show_fix_menu
            ;;
        *)
            echo "Exiting without applying fixes."
            ;;
    esac
fi

if [ "$ERRORS" -gt 0 ]; then
    exit 1
else
    exit 0
fi
