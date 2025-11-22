#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please copy env.example to .env and fill in your secrets."
    exit 1
fi

echo "Reading secrets from .env file..."
echo "Note: This script will NOT set CLOUDFLARE_API_TOKEN to avoid conflicts with Wrangler deployment."
echo ""

# Read .env file line by line
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    if [[ $key =~ ^#.* ]] || [[ -z $key ]]; then
        continue
    fi

    # Skip CLOUDFLARE_API_TOKEN as it conflicts with Wrangler's own authentication
    if [[ $key == "CLOUDFLARE_API_TOKEN" ]]; then
        echo "⚠️  Skipping CLOUDFLARE_API_TOKEN (use CLOUDFLARE_ANALYTICS_TOKEN instead)"
        continue
    fi

    # Remove potential quotes from value
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    
    if [ -n "$value" ]; then
        echo "Setting secret: $key"
        # Pipe the value to wrangler secret put to avoid shell escaping issues with complex JSON/strings
        echo "$value" | npx wrangler secret put "$key"
    fi
done < .env

echo ""
echo "Done! All secrets uploaded."

