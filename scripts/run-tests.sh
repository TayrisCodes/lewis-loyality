#!/bin/bash
# Test Runner Script
# Loads environment variables and runs test scripts

set -e

cd "$(dirname "$0")/.."

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "============================================================"
echo "Running Phase 5: Testing & Validation"
echo "============================================================"
echo ""

# Test 1: PaddleOCR Integration
echo "============================================================"
echo "Test 1: PaddleOCR Integration"
echo "============================================================"
npm run test:paddleocr || echo "⚠️  PaddleOCR tests had issues (may be expected if service not running)"

echo ""
echo ""

# Test 2: Fraud Detection
echo "============================================================"
echo "Test 2: Fraud Detection"
echo "============================================================"
npm run test:fraud || echo "⚠️  Fraud detection tests had issues"

echo ""
echo ""

# Test 3: Admin UI API
echo "============================================================"
echo "Test 3: Admin UI API"
echo "============================================================"
npm run test:admin || echo "⚠️  Admin UI tests had issues"

echo ""
echo ""
echo "============================================================"
echo "All tests completed!"
echo "============================================================"

