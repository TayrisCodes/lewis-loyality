#!/bin/bash

# Test Receipt Upload to Rewards
# Wrapper script that loads environment variables before running test

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables from .env.production
if [ -f .env.production ]; then
  echo "📋 Loading environment from .env.production..."
  export $(grep -v '^#' .env.production | xargs)
elif [ -f .env.local ]; then
  echo "📋 Loading environment from .env.local..."
  export $(grep -v '^#' .env.local | xargs)
elif [ -f .env ]; then
  echo "📋 Loading environment from .env..."
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ No .env file found (.env.production, .env.local, or .env)"
  exit 1
fi

# Check if MONGODB_URI is set
if [ -z "$MONGODB_URI" ]; then
  echo "❌ Error: MONGODB_URI not set in environment"
  exit 1
fi

echo "✅ Environment loaded"
echo ""

# Run the test
echo "🧪 Running receipt upload test..."
echo "📱 Customer Phone: 0936308836"
echo "📸 Receipt Image: $1"
echo ""

npx tsx test-receipt-direct.ts "$@"
