# Multi-stage build for ERPNext MCP Server - Production Optimized

# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY tsconfig*.json ./
COPY scripts/ ./scripts/

# Build the application
RUN npm run build:prod

# Runtime stage
FROM node:18-alpine AS runtime

# Install runtime dependencies and system packages
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S erpnext && \
    adduser -S erpnext -u 1001 -G erpnext

# Create directories
RUN mkdir -p /app/logs /app/backups /app/tmp

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Copy environment templates
COPY .env.example .env.example
COPY .env.production .env.production

# Create startup script
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'exec dumb-init node --max-old-space-size=4096 dist/index.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# Change ownership to non-root user
RUN chown -R erpnext:erpnext /app
USER erpnext

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    MAX_MEMORY_SIZE=4096 \
    LOG_LEVEL=info

# Create volume for persistent data
VOLUME ["/app/logs", "/app/backups"]

# Metadata
LABEL maintainer="ERPNext MCP Team" \
      version="1.0.0" \
      description="ERPNext MCP Server - Production Deployment" \
      org.opencontainers.image.title="ERPNext MCP Server" \
      org.opencontainers.image.description="Model Context Protocol server for ERPNext integration" \
      org.opencontainers.image.version="1.0.0"

# Start the application using entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]