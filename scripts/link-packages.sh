#!/bin/bash

# Link all packages for local development
set -e

echo "🔗 Linking BlueprintData packages for local development..."
echo ""

# Build all packages first
echo "📦 Building packages..."
bun run build:packages

# Link each package in dependency order
echo ""
echo "🔗 Linking packages..."

cd packages/@blueprintdata/models
echo "  → @blueprintdata/models"
bun link

cd ../errors
echo "  → @blueprintdata/errors"
bun link

cd ../config
echo "  → @blueprintdata/config"
bun link

cd ../warehouse
echo "  → @blueprintdata/warehouse"
bun link

cd ../analytics
echo "  → @blueprintdata/analytics"
bun link

cd ../gateway
echo "  → @blueprintdata/gateway"
bun link

# Link CLI
cd ../../../../apps/cli
echo "  → blueprintdata-cli"
bun link

cd ../..

echo ""
echo "✅ All packages linked successfully!"
echo ""
echo "You can now use 'blueprintdata' command globally or link individual packages:"
echo "  bun link @blueprintdata/models"
echo "  bun link @blueprintdata/analytics"
echo "  etc."
