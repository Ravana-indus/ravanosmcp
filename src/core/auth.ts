import axios, { AxiosInstance } from 'axios';
import { logger, redactSensitiveData } from '../observability/logger';

export interface AuthConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
}

export interface AuthResponse {
  ok: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

export interface UserInfo {
  user: string;
  roles: string[];
}

class ERPNextAuthenticator {
  private client: AxiosInstance | null = null;
  private config: AuthConfig | null = null;

  async connect(baseUrl: string, apiKey: string, apiSecret: string): Promise<AuthResponse> {
    try {
      // Validate inputs
      if (!baseUrl || !apiKey || !apiSecret) {
        return {
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Missing required authentication parameters'
          }
        };
      }

      // Normalize base URL
      const normalizedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // Create axios client
      this.client = axios.create({
        baseURL: normalizedUrl,
        timeout: 30000,
        headers: {
          'Authorization': `token ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json'
        }
      });

      // Test authentication by calling a simple endpoint
      await this.client.get('/api/method/frappe.auth.get_logged_user');

      // Store config on successful auth
      this.config = { baseUrl: normalizedUrl, apiKey, apiSecret };

      logger.info('Successfully authenticated with ERPNext', redactSensitiveData({
        baseUrl: normalizedUrl,
        apiKey,
        apiSecret
      }));

      return { ok: true };

    } catch (error: any) {
      logger.error('Authentication failed', redactSensitiveData({
        baseUrl,
        apiKey,
        apiSecret,
        error: error.message
      }));

      // Reset client on failure
      this.client = null;
      this.config = null;

      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: error.response?.data?.message || error.message || 'Authentication failed'
        }
      };
    }
  }

  async whoami(): Promise<AuthResponse> {
    try {
      if (!this.client || !this.config) {
        return {
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call connect first.'
          }
        };
      }

      // Get current user info
      const userResponse = await this.client.get('/api/method/frappe.auth.get_logged_user');
      const username = userResponse.data.message;

      if (!username) {
        return {
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Unable to retrieve user information'
          }
        };
      }

      // Get user roles
      const rolesResponse = await this.client.get(`/api/resource/User/${username}`);
      const userData = rolesResponse.data.data;
      const roles = userData.roles?.map((role: any) => role.role) || [];

      const userInfo: UserInfo = {
        user: username,
        roles
      };

      logger.info('Retrieved user info', { user: username, rolesCount: roles.length });

      return {
        ok: true,
        data: userInfo
      };

    } catch (error: any) {
      logger.error('Failed to get user info', { error: error.message });

      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: error.response?.data?.message || error.message || 'Failed to retrieve user information'
        }
      };
    }
  }

  isAuthenticated(): boolean {
    return this.client !== null && this.config !== null;
  }

  getConfig(): AuthConfig | null {
    return this.config;
  }
}

// Export singleton instance
export const erpAuthenticator = new ERPNextAuthenticator();

// Export class for testing purposes
export { ERPNextAuthenticator };