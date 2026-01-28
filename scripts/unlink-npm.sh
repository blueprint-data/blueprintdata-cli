#!/bin/bash

# Unlink all NPM links for BlueprintData
set -e

echo "🔗 Unlinking NPM packages..."
echo ""

# Unlink CLI first
echo "Unlinking blueprintdata-cli..."
cd apps/cli
npm unlink -g blueprintdata-cli 2>/dev/null || echo "  blueprintdata-cli not linked"
cd - >/dev/null

# Unlink packages
PACKAGES=("gateway" "analytics" "warehouse" "config" "errors" "models")

for pkg in "${PACKAGES[@]}"; do
    echo "Unlinking @blueprintdata/$pkg..."
    cd "packages/@blueprintdata/$pkg"
    npm unlink -g @blueprintdata/$pkg 2>/dev/null || echo "  @blueprintdata/$pkg not linked"
    cd - >/dev/null
done

echo ""
echo "✅ All packages unlinked!"
echo ""
echo "You can now remove node_modules if needed:"
echo "  rm -rf node_modules"
echo "  rm -rf packages/@blueprintdata/*/node_modules"
echo "  rm -rf apps/*/node_modules"
