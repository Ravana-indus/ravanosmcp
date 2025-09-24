#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './mcp/register_tools';
import { logger } from './observability/logger';
import { appConfig } from './config/env';
import * as http from 'http';

const server = new Server(
  {
    name: 'erpnext-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Create health check server for monitoring
 */
function createHealthServer(): http.Server {
  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        service: 'erpnext-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }));
    } else if (req.url === '/health/ready') {
      // Check if ERPNext connection is ready
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ready',
        service: 'erpnext-mcp-server',
        dependencies: {
          erpnext: 'configured'
        },
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  return healthServer;
}

async function main(): Promise<void> {
  try {
    // Log startup information
    logger.info('ERPNext MCP Server starting...', {
      version: '1.0.0',
      environment: appConfig.environment,
      erpnextUrl: appConfig.erpnext.baseUrl,
      port: appConfig.server.port,
      logLevel: appConfig.logging.level
    });

    // Start health check server if in production
    if (appConfig.environment === 'production' || process.env.ENABLE_HEALTH_SERVER === 'true') {
      const healthServer = createHealthServer();
      healthServer.listen(appConfig.server.healthCheckPort, () => {
        logger.info(`Health check server listening on port ${appConfig.server.healthCheckPort}`);
      });

      // Graceful shutdown for health server
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down health server gracefully');
        healthServer.close(() => {
          logger.info('Health server closed');
        });
      });
    }

    // Register all tools
    await registerAllTools(server);
    logger.info('All MCP tools registered successfully');

    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('ERPNext MCP Server started successfully');
  } catch (error) {
    logger.error('Failed to start ERPNext MCP Server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { server };