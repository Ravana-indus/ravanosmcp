# Installation Guide - ERPNext MCP Server

This guide provides step-by-step instructions for installing and configuring the ERPNext MCP Server in various environments.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **ERPNext**: Version 13.0 or higher with API access enabled
- **Optional**: Docker and Docker Compose for containerized deployment
- **Optional**: Redis for caching (recommended for production)

### ERPNext Configuration
1. **Enable API Access**: Ensure your ERPNext instance has API access enabled
2. **Create API User**: Create a user account for the MCP server with appropriate permissions
3. **Generate API Keys**: Generate API key and secret for the MCP server user

## Installation Methods

### Method 1: NPM Installation (Recommended)

```bash
# Install globally
npm install -g erpnext-mcp-server

# Or install locally in your project
npm install erpnext-mcp-server
```

### Method 2: From Source

```bash
# Clone the repository
git clone https://github.com/your-org/erpnext-mcp-server.git
cd erpnext-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

### Method 3: Docker Deployment

```bash
# Using Docker Compose (recommended)
git clone https://github.com/your-org/erpnext-mcp-server.git
cd erpnext-mcp-server

# Copy environment configuration
cp .env.production.example .env

# Edit .env file with your ERPNext credentials
nano .env

# Start the services
docker-compose up -d

# Check logs
docker-compose logs -f erpnext-mcp-server
```

## Configuration

### Environment Variables

Create a `.env` file in your project root with the following configuration:

```bash
# Required: ERPNext Configuration
ERPNEXT_BASE_URL=https://your-erpnext-instance.com
ERPNEXT_API_KEY=your-api-key-here
ERPNEXT_API_SECRET=your-api-secret-here

# Optional: Server Configuration
PORT=3000
HEALTH_CHECK_PORT=3000
LOG_LEVEL=info
NODE_ENV=production

# Optional: Redis Configuration (recommended for production)
REDIS_URL=redis://localhost:6379
```

### Configuration Validation

The server performs automatic validation of configuration on startup:

- **ERPNEXT_BASE_URL**: Must be a valid HTTPS URL
- **ERPNEXT_API_KEY**: Must be a valid ERPNext API key format
- **ERPNEXT_API_SECRET**: Must be a valid ERPNext API secret format
- **PORT**: Must be a valid port number (1-65535)
- **LOG_LEVEL**: Must be one of: error, warn, info, debug

## Starting the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Docker Mode
```bash
docker-compose up -d
```

## Health Checks

The server provides health check endpoints for monitoring:

- **Basic Health**: `GET http://localhost:3000/health`
- **Readiness Check**: `GET http://localhost:3000/health/ready`

Example health response:
```json
{
  "status": "healthy",
  "service": "erpnext-mcp-server",
  "version": "1.0.0",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "uptime": 3600
}
```

## Verification

After installation, verify the server is working:

1. **Check Server Status**: The server should log successful startup
2. **Health Check**: Access `http://localhost:3000/health`
3. **MCP Connection**: Test with your MCP client (e.g., LibreChat)

## Next Steps

- [LibreChat Integration](./librechat-integration.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Security Configuration](./security-checklist.md)
- [Monitoring and Maintenance](./monitoring.md)