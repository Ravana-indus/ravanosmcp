#!/bin/bash

# Docker build script for ERPNext MCP Server
set -e

# Configuration
IMAGE_NAME="erpnext-mcp-server"
IMAGE_TAG="${1:-latest}"
REGISTRY="${REGISTRY:-}"

echo "=== Building Docker Image for ERPNext MCP Server ==="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker and try again."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running. Please start Docker and try again."
    exit 1
fi

# Build multi-stage Docker image
echo "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
docker build \
    --target runtime \
    --tag "${IMAGE_NAME}:${IMAGE_TAG}" \
    --build-arg NODE_ENV=production \
    .

# Tag for registry if specified
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    echo "Tagging for registry: ${FULL_IMAGE_NAME}"
    docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${FULL_IMAGE_NAME}"
fi

# Test the built image
echo "Testing built image..."
docker run --rm "${IMAGE_NAME}:${IMAGE_TAG}" node -e "console.log('Docker build test successful')"

echo "✅ Docker build completed successfully!"
echo "🐳 Image: ${IMAGE_NAME}:${IMAGE_TAG}"

# Show image size
echo "📊 Image size:"
docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

if [ -n "$REGISTRY" ]; then
    echo ""
    echo "To push to registry, run:"
    echo "  docker push ${FULL_IMAGE_NAME}"
fi

echo ""
echo "To run the container:"
echo "  docker run -d --name erpnext-mcp --env-file .env -p 3000:3000 ${IMAGE_NAME}:${IMAGE_TAG}"