#!/bin/bash
# Helper script to run docker-compose with the correct APP_VERSION from package.json
# Usage: ./docker-compose.sh up -d

# Extract version from backend/package.json
APP_VERSION=$(grep '"version"' backend/package.json | head -1 | sed 's/.*"\([^"]*\)".*/\1/')

if [ -z "$APP_VERSION" ]; then
    echo "Error: Could not extract version from backend/package.json"
    exit 1
fi

echo "Using APP_VERSION=$APP_VERSION"
export APP_VERSION

# Sync .env APP_VERSION if it exists and differs
if [ -f .env ]; then
    ENV_VERSION=$(grep '^APP_VERSION=' .env | sed 's/APP_VERSION=//')
    if [ "$ENV_VERSION" != "$APP_VERSION" ]; then
        echo "Updating .env APP_VERSION from $ENV_VERSION to $APP_VERSION"
        sed -i "s/^APP_VERSION=.*/APP_VERSION=$APP_VERSION/" .env
    fi
fi

# Run docker-compose with all arguments
docker compose "$@"
