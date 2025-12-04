#!/bin/bash

# OCR Service Diagnostic Script
# Checks PaddleOCR service status and configuration

echo "🔍 OCR Service Diagnostic"
echo "========================="
echo ""

# Check PaddleOCR Environment Variables
echo "📋 Environment Variables:"
echo "   PADDLEOCR_URL: ${PADDLEOCR_URL:-'Not set (using default: http://paddleocr:8866)'}"
echo "   PADDLEOCR_TIMEOUT: ${PADDLEOCR_TIMEOUT:-'Not set (using default: 45000ms)'}"
echo ""

# Check if Docker is running
echo "🐳 Docker Status:"
if command -v docker &> /dev/null; then
    echo "   ✅ Docker is installed"
    
    # Check if PaddleOCR container is running
    PADDLEOCR_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i paddleocr | head -1)
    if [ -z "$PADDLEOCR_CONTAINER" ]; then
        echo "   ❌ PaddleOCR container is NOT running"
        echo "   📝 To start: docker-compose up -d paddleocr"
    else
        echo "   ✅ PaddleOCR container is running: $PADDLEOCR_CONTAINER"
        
        # Check container health
        CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' "$PADDLEOCR_CONTAINER" 2>/dev/null)
        echo "   Status: $CONTAINER_STATUS"
        
        # Check logs
        echo "   Recent logs:"
        docker logs --tail 5 "$PADDLEOCR_CONTAINER" 2>&1 | sed 's/^/      /'
    fi
else
    echo "   ❌ Docker is not installed or not in PATH"
fi
echo ""

# Test PaddleOCR service connectivity
echo "🌐 Network Connectivity:"
PADDLEOCR_URL="${PADDLEOCR_URL:-http://localhost:8866}"

# Test localhost
echo "   Testing: http://localhost:8866"
if curl -s --max-time 3 http://localhost:8866/health > /dev/null 2>&1; then
    echo "   ✅ http://localhost:8866 is accessible"
else
    echo "   ❌ http://localhost:8866 is NOT accessible"
fi

# Test paddleocr hostname (if in docker network)
echo "   Testing: http://paddleocr:8866"
if docker exec "$PADDLEOCR_CONTAINER" curl -s --max-time 3 http://paddleocr:8866/health > /dev/null 2>&1 2>/dev/null; then
    echo "   ✅ http://paddleocr:8866 is accessible (from container)"
else
    echo "   ⚠️  http://paddleocr:8866 test skipped (may not be in docker network)"
fi
echo ""

# Check receipt storage
echo "📁 Receipt Storage:"
RECEIPT_DIR="/root/lewis-loyality/uploads/receipts"
if [ -d "$RECEIPT_DIR" ]; then
    echo "   ✅ Storage directory exists: $RECEIPT_DIR"
    
    # Count receipts
    RECEIPT_COUNT=$(find "$RECEIPT_DIR" -type f -name "*.jpg" -o -name "*.png" 2>/dev/null | wc -l)
    echo "   Total receipts: $RECEIPT_COUNT"
    
    # List store directories
    echo "   Store directories:"
    for dir in "$RECEIPT_DIR"/*/; do
        if [ -d "$dir" ]; then
            STORE_NAME=$(basename "$dir")
            STORE_COUNT=$(find "$dir" -type f \( -name "*.jpg" -o -name "*.png" \) 2>/dev/null | wc -l)
            echo "      - $STORE_NAME: $STORE_COUNT receipts"
        fi
    done
else
    echo "   ❌ Storage directory not found: $RECEIPT_DIR"
fi
echo ""

# Performance test (if test image exists)
echo "⚡ Quick Performance Test:"
TEST_IMAGE="$RECEIPT_DIR/unknown/$(ls -t "$RECEIPT_DIR/unknown" 2>/dev/null | head -1)"
if [ -f "$TEST_IMAGE" ]; then
    echo "   Using test image: $(basename "$TEST_IMAGE")"
    echo "   Image size: $(du -h "$TEST_IMAGE" | cut -f1)"
    echo ""
    echo "   Testing PaddleOCR directly..."
    
    # Convert image to base64
    BASE64_IMG=$(base64 -w 0 "$TEST_IMAGE" 2>/dev/null || base64 "$TEST_IMAGE" 2>/dev/null)
    
    if [ ! -z "$BASE64_IMG" ]; then
        START_TIME=$(date +%s%N)
        RESPONSE=$(curl -s --max-time 60 -X POST http://localhost:8866/predict/ocr_system \
            -H "Content-Type: application/json" \
            -d "{\"images\":[\"$BASE64_IMG\"]}")
        END_TIME=$(date +%s%N)
        DURATION_MS=$((($END_TIME - $START_TIME) / 1000000))
        
        if [ $? -eq 0 ] && [ ! -z "$RESPONSE" ]; then
            echo "   ✅ PaddleOCR responded in ${DURATION_MS}ms"
            echo "   Response preview: ${RESPONSE:0:100}..."
        else
            echo "   ❌ PaddleOCR request failed or timed out"
        fi
    fi
else
    echo "   ⚠️  No test image found (skipping performance test)"
fi
echo ""

# Summary
echo "========================="
echo "📊 Summary:"
echo ""
echo "If PaddleOCR is taking 2 minutes:"
echo "  1. Check if container is running: docker ps | grep paddleocr"
echo "  2. Check logs: docker logs paddleocr"
echo "  3. Test directly: curl http://localhost:8866/health"
echo "  4. If service is down, OCR falls back to Tesseract (slower)"
echo "  5. Current timeout chain: 45s (PaddleOCR) + 8s (N8N) + 15s (Tesseract) = 68s+"
echo ""
echo "To fix:"
echo "  - Start PaddleOCR: docker-compose up -d paddleocr"
echo "  - Reduce timeout: export PADDLEOCR_TIMEOUT=10000"
echo "  - Check network: docker network ls"
echo ""

