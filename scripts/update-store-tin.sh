#!/bin/bash

# Update store with TIN 0003169685
# Wrapper script that loads environment variables before running

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Load environment variables from .env.production
if [ -f .env.production ]; then
  export $(grep -v '^#' .env.production | xargs)
fi

# Run the update script
npx tsx scripts/update-store-tin.ts


