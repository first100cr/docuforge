#!/bin/bash

# Quick Fix Script for pdf-parse Module Error
# Run this script from your project root: /srv/projects/docforge-arbaz/docuforge

set -e  # Exit on error

echo "🔧 Starting pdf-parse installation fix..."

# Step 1: Stop current container
echo "📦 Stopping current container..."
docker-compose down || docker stop 7476c6bbf7eb || true

# Step 2: Install pdf-parse locally
echo "📥 Installing pdf-parse..."
npm install pdf-parse
npm install --save-dev @types/pdf-parse

# Step 3: Verify installation
echo "✅ Verifying package.json..."
if grep -q "pdf-parse" package.json; then
    echo "✓ pdf-parse found in package.json"
else
    echo "❌ ERROR: pdf-parse not in package.json"
    exit 1
fi

# Step 4: Clean Docker cache
echo "🧹 Cleaning Docker cache..."
docker system prune -af

# Step 5: Rebuild Docker image
echo "🏗️  Rebuilding Docker image (this may take a few minutes)..."
docker-compose build --no-cache

# Step 6: Start container
echo "🚀 Starting container..."
docker-compose up -d

# Step 7: Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 5

# Step 8: Get container ID
CONTAINER_ID=$(docker-compose ps -q)

# Step 9: Check logs
echo "📋 Checking logs..."
docker logs $CONTAINER_ID

# Step 10: Verify pdf-parse installation
echo "🔍 Verifying pdf-parse in container..."
if docker exec $CONTAINER_ID ls node_modules/pdf-parse > /dev/null 2>&1; then
    echo "✅ SUCCESS! pdf-parse is installed in container"
else
    echo "❌ ERROR: pdf-parse not found in container"
    exit 1
fi

echo ""
echo "✨ Fix completed successfully!"
echo ""
echo "Your container is running. Test with:"
echo "curl -X POST -F \"file=@test.pdf\" http://localhost:5000/api/upload"
echo ""
echo "View logs with:"
echo "docker logs -f $CONTAINER_ID"
