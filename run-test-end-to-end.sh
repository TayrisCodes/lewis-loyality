#!/bin/bash

echo "📋 Loading environment from .env.production..."

# Read all variables from .env.production and export them
export $(grep -v '^#' .env.production | grep -v '^$' | xargs)

echo "✅ Environment loaded"

echo ""
echo "🧪 Running end-to-end flow test..."
echo ""

# Verify MONGODB_URI is set
if [ -z "$MONGODB_URI" ]; then
  echo "❌ Error: MONGODB_URI not found in .env.production"
  exit 1
fi

echo "   ✅ MONGODB_URI is set"

# Run the TypeScript test script (environment variables are already exported)
npx tsx test-end-to-end-flow.ts

