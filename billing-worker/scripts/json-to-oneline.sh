#!/bin/bash

# Script to convert a Google Service Account JSON file to a single-line format
# Usage: ./scripts/json-to-oneline.sh path/to/service-account.json

if [ -z "$1" ]; then
    echo "Usage: $0 <path-to-json-file>"
    echo "Example: $0 ~/Downloads/service-account.json"
    exit 1
fi

if [ ! -f "$1" ]; then
    echo "Error: File '$1' not found"
    exit 1
fi

# Use jq to minify JSON (removes all unnecessary whitespace)
# If jq is not available, fall back to a simple approach
if command -v jq &> /dev/null; then
    echo "Converting JSON to single line using jq..."
    ONE_LINE=$(jq -c . "$1")
else
    echo "jq not found, using basic conversion..."
    # Remove newlines and extra spaces between JSON elements
    ONE_LINE=$(cat "$1" | tr -d '\n' | tr -d '\r' | sed 's/  */ /g')
fi

echo ""
echo "=== Single-line JSON (copy this to your .env file) ==="
echo ""
echo "GOOGLE_SERVICE_ACCOUNT_JSON=$ONE_LINE"
echo ""
echo "=== End of output ==="

