#!/bin/bash

# Build script for ERPNext MCP Server
set -e

echo "=== Building ERPNext MCP Server ==="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/

# Install dependencies
echo "Installing dependencies..."
npm ci

# Run linting
echo "Running linter..."
npm run lint

# Run tests
echo "Running tests..."
npm test

# Build for production
echo "Building for production..."
npm run build:prod

# Verify build
echo "Verifying build..."
if [ ! -f "dist/index.js" ]; then
    echo "Error: Build failed - dist/index.js not found"
    exit 1
fi

# Make executable
chmod +x dist/index.js

echo "✅ Build completed successfully!"
echo "📦 Built files are in the 'dist/' directory"
echo "🚀 You can now run: node dist/index.js"