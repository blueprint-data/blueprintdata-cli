#!/bin/bash

# Unlink all packages
set -e

echo "🔗 Unlinking BlueprintData packages..."
echo ""

cd packages/@blueprintdata/models
echo "  → @blueprintdata/models"
bun unlink 2>/dev/null || true

cd ../errors
echo "  → @blueprintdata/errors"
bun unlink 2>/dev/null || true

cd ../config
echo "  → @blueprintdata/config"
bun unlink 2>/dev/null || true

cd ../warehouse
echo "  → @blueprintdata/warehouse"
bun unlink 2>/dev/null || true

cd ../analytics
echo "  → @blueprintdata/analytics"
bun unlink 2>/dev/null || true

cd ../gateway
echo "  → @blueprintdata/gateway"
bun unlink 2>/dev/null || true

# Unlink CLI
cd ../../../../apps/cli
echo "  → blueprintdata-cli"
bun unlink 2>/dev/null || true

cd ../..

echo ""
echo "✅ All packages unlinked!"
