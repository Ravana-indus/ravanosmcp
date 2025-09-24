import { erpAuthenticator } from './auth';
import { logger, redactSensitiveData } from '../observability/logger';

export interface CheckPermissionRequest {
  doctype: string;
  action: string;
  name?: string;
}

export interface CheckPermissionResponse {
  ok: boolean;
  data?: {
    allowed: boolean;
    roles?: string[];
    permissions?: {
      read?: boolean;
      write?: boolean;
      create?: boolean;
      delete?: boolean;
      submit?: boolean;
      cancel?: boolean;
      amend?: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function checkPermission(
  doctype: string,
  action: string,
  name?: string
): Promise<CheckPermissionResponse> {
  try {
    // Check authentication
    if (!erpAuthenticator.isAuthenticated()) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Not authenticated. Please call erp.auth.connect first.'
        }
      };
    }

    // Validate inputs
    if (!doctype || typeof doctype !== 'string') {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: 'Doctype is required and must be a string'
        }
      };
    }

    if (!action || typeof action !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Action is required and must be a string'
        }
      };
    }

    // Validate action types
    const validActions = ['read', 'write', 'create', 'delete', 'submit', 'cancel', 'amend', 'print', 'email', 'report'];
    if (!validActions.includes(action.toLowerCase())) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: `Invalid action '${action}'. Valid actions are: ${validActions.join(', ')}`
        }
      };
    }

    if (name !== undefined && typeof name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Document name must be a string if provided'
        }
      };
    }

    const config = erpAuthenticator.getConfig();
    if (!config) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Authentication configuration not found'
        }
      };
    }

    // Get authenticated client from auth module
    const client = (erpAuthenticator as any).client;
    if (!client) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'No authenticated client available'
        }
      };
    }

    logger.info('Checking permissions', redactSensitiveData({
      doctype,
      action,
      name: name || 'none'
    }));

    // Check permissions via ERPNext permissions API
    const permissionParams: any = {
      doctype,
      action: action.toLowerCase()
    };

    if (name) {
      permissionParams.name = name;
    }

    const response = await client.get('/api/method/frappe.permissions.has_permission', {
      params: permissionParams
    });

    const permissionResult = response.data.message;

    // If the API returns a boolean directly
    if (typeof permissionResult === 'boolean') {
      const allowed = permissionResult;

      if (!allowed) {
        return {
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `Insufficient permissions to ${action} ${doctype}${name ? `/${name}` : ''}`
          }
        };
      }

      logger.info('Permission check completed', {
        doctype,
        action,
        name: name || 'none',
        allowed
      });

      return {
        ok: true,
        data: {
          allowed: true,
          permissions: {
            [action.toLowerCase()]: true
          }
        }
      };
    }

    // If the API returns detailed permission information
    const allowed = permissionResult?.allowed || permissionResult?.has_permission || false;
    const roles = permissionResult?.roles || [];
    const permissions = permissionResult?.permissions || {};

    if (!allowed) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Insufficient permissions to ${action} ${doctype}${name ? `/${name}` : ''}`
        }
      };
    }

    logger.info('Permission check completed', {
      doctype,
      action,
      name: name || 'none',
      allowed,
      roles_count: roles.length
    });

    return {
      ok: true,
      data: {
        allowed: true,
        roles,
        permissions: {
          read: permissions.read || false,
          write: permissions.write || false,
          create: permissions.create || false,
          delete: permissions.delete || false,
          submit: permissions.submit || false,
          cancel: permissions.cancel || false,
          amend: permissions.amend || false,
          ...{[action.toLowerCase()]: true}
        }
      }
    };

  } catch (error: any) {
    logger.error('Failed to check permissions', redactSensitiveData({
      doctype,
      action,
      name: name || 'none',
      error: error.message,
      response: error.response?.data
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: `Doctype '${doctype}' not found`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Insufficient permissions to check ${action} access for ${doctype}`
        }
      };
    }

    // Handle permission check errors
    if (error.response?.status === 400) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: error.response?.data?.message || `Invalid permission check parameters`
        }
      };
    }

    // Default to permission denied on any permission check error
    if (error.response?.data?.message) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: error.response.data.message
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: error.message || 'Failed to check permissions'
      }
    };
  }
}