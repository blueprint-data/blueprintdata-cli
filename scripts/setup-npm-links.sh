#!/bin/bash

# Setup NPM linking for BlueprintData monorepo
# Run this from the repository root

set -e

echo "🔗 Setting up NPM links for BlueprintData monorepo..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "packages/@blueprintdata" ]; then
    print_error "Please run this script from the repository root"
    exit 1
fi

echo "Step 1: Installing dependencies..."
npm install
print_status "Dependencies installed"

echo ""
echo "Step 2: Building packages..."
npm run build:packages
print_status "Packages built"

echo ""
echo "Step 3: Linking packages (in dependency order)..."

# Link packages in dependency order
PACKAGES=("models" "errors" "config" "warehouse" "analytics" "gateway")

for pkg in "${PACKAGES[@]}"; do
    echo "  Linking @blueprintdata/$pkg..."
    cd "packages/@blueprintdata/$pkg"
    
    # Check if already linked
    if npm ls -g @blueprintdata/$pkg >/dev/null 2>&1; then
        print_warning "@blueprintdata/$pkg already linked, skipping"
    else
        npm link
        print_status "@blueprintdata/$pkg linked"
    fi
    
    cd - >/dev/null
done

echo ""
echo "Step 4: Linking CLI..."
cd apps/cli

# Check if already linked
if npm ls -g blueprintdata-cli >/dev/null 2>&1; then
    print_warning "blueprintdata-cli already linked, skipping"
else
    npm link
    print_status "blueprintdata-cli linked"
fi

cd - >/dev/null

echo ""
echo "=========================================="
print_status "NPM linking complete!"
echo "=========================================="
echo ""
echo "You can now use:"
echo "  blueprintdata --help"
echo "  blueprintdata analytics init"
echo ""
echo "To verify the link:"
echo "  which blueprintdata"
echo "  ls -la \$(which blueprintdata)"
echo ""
echo "To unlink later:"
echo "  npm run unlink:npm"
