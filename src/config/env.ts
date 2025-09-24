import { config } from 'dotenv';
import { logger } from '../observability/logger';

// Load environment variables from .env file
config();

export interface Config {
  erpnext: {
    baseUrl: string;
    apiKey: string;
    apiSecret: string;
  };
  server: {
    port: number;
    healthCheckPort: number;
  };
  redis?: {
    url: string;
  };
  logging: {
    level: string;
  };
  environment: string;
}

/**
 * Validates that a URL is properly formatted
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that an API key has the expected format
 */
function isValidApiKey(key: string): boolean {
  // ERPNext API keys are typically base64 encoded strings
  return key.length > 10 && /^[A-Za-z0-9+/=]+$/.test(key);
}

/**
 * Validates and loads configuration from environment variables
 */
export function loadConfig(): Config {
  const errors: string[] = [];

  // Required ERPNext configuration
  const baseUrl = process.env.ERPNEXT_BASE_URL;
  const apiKey = process.env.ERPNEXT_API_KEY;
  const apiSecret = process.env.ERPNEXT_API_SECRET;

  // Validate required fields
  if (!baseUrl) {
    errors.push('ERPNEXT_BASE_URL is required');
  } else if (!isValidUrl(baseUrl)) {
    errors.push('ERPNEXT_BASE_URL must be a valid URL');
  }

  if (!apiKey) {
    errors.push('ERPNEXT_API_KEY is required');
  } else if (!isValidApiKey(apiKey)) {
    errors.push('ERPNEXT_API_KEY appears to be invalid format');
  }

  if (!apiSecret) {
    errors.push('ERPNEXT_API_SECRET is required');
  } else if (!isValidApiKey(apiSecret)) {
    errors.push('ERPNEXT_API_SECRET appears to be invalid format');
  }

  // Optional configuration with defaults
  const port = parseInt(process.env.PORT || '3000', 10);
  const healthCheckPort = parseInt(process.env.HEALTH_CHECK_PORT || '3000', 10);
  const logLevel = process.env.LOG_LEVEL || 'info';
  const nodeEnv = process.env.NODE_ENV || 'development';
  const redisUrl = process.env.REDIS_URL;

  // Validate numeric ports
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('PORT must be a valid port number (1-65535)');
  }

  if (isNaN(healthCheckPort) || healthCheckPort < 1 || healthCheckPort > 65535) {
    errors.push('HEALTH_CHECK_PORT must be a valid port number (1-65535)');
  }

  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLogLevels.includes(logLevel)) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  // Validate Redis URL if provided
  if (redisUrl && !isValidUrl(redisUrl)) {
    errors.push('REDIS_URL must be a valid URL if provided');
  }

  // Throw error if validation failed
  if (errors.length > 0) {
    const errorMessage = 'Configuration validation failed:\n' + errors.join('\n');
    logger.error('Configuration validation failed', { errors });
    throw new Error(errorMessage);
  }

  const config: Config = {
    erpnext: {
      baseUrl: baseUrl!,
      apiKey: apiKey!,
      apiSecret: apiSecret!,
    },
    server: {
      port,
      healthCheckPort,
    },
    logging: {
      level: logLevel,
    },
    environment: nodeEnv,
  };

  // Add Redis configuration if provided
  if (redisUrl) {
    config.redis = { url: redisUrl };
  }

  return config;
}

/**
 * Global configuration instance
 */
export const appConfig = loadConfig();