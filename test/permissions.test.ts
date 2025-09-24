import { checkPermission } from '../src/core/permissions';
import { erpAuthenticator } from '../src/core/auth';

// Mock the auth module
jest.mock('../src/core/auth', () => ({
  erpAuthenticator: {
    isAuthenticated: jest.fn(),
    getConfig: jest.fn(),
    client: null
  }
}));

// Mock the logger
jest.mock('../src/observability/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  redactSensitiveData: jest.fn((data) => data)
}));

// Mock axios
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

describe('Permissions Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default successful auth
    (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(true);
    (erpAuthenticator.getConfig as jest.Mock).mockReturnValue({ baseUrl: 'https://test.com' });
    (erpAuthenticator as any).client = mockAxios;
  });

  describe('checkPermission', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await checkPermission('Customer', 'read');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });

      test('should fail when doctype is missing', async () => {
        const result = await checkPermission('', 'read');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when doctype is not string', async () => {
        const result = await checkPermission(null as any, 'read');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when action is missing', async () => {
        const result = await checkPermission('Customer', '');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Action is required and must be a string'
          }
        });
      });

      test('should fail when action is not string', async () => {
        const result = await checkPermission('Customer', null as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Action is required and must be a string'
          }
        });
      });

      test('should fail when action is invalid', async () => {
        const result = await checkPermission('Customer', 'invalid_action');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: "Invalid action 'invalid_action'. Valid actions are: read, write, create, delete, submit, cancel, amend, print, email, report"
          }
        });
      });

      test('should fail when name is not string', async () => {
        const result = await checkPermission('Customer', 'read', 123 as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document name must be a string if provided'
          }
        });
      });

      test('should fail when config is missing', async () => {
        (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

        const result = await checkPermission('Customer', 'read');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Authentication configuration not found'
          }
        });
      });

      test('should fail when client is missing', async () => {
        (erpAuthenticator as any).client = null;

        const result = await checkPermission('Customer', 'read');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'No authenticated client available'
          }
        });
      });
    });

    describe('Successful Operations', () => {
      test('should return allowed permission for boolean true response', async () => {
        mockAxios.get.mockResolvedValue({
          data: { message: true }
        });

        const result = await checkPermission('Customer', 'read');

        expect(result).toEqual({
          ok: true,
          data: {
            allowed: true,
            permissions: {
              read: true
            }
          }
        });

        expect(mockAxios.get).toHaveBeenCalledWith('/api/method/frappe.permissions.has_permission', {
          params: {
            doctype: 'Customer',
            action: 'read'
          }
        });
      });

      test('should return detailed permission information', async () => {
        const mockPermissionResponse = {
          data: {
            message: {
              allowed: true,
              has_permission: true,
              roles: ['Sales User', 'System Manager'],
              permissions: {
                read: true,
                write: true,
                create: false,
                delete: false,
                submit: false,
                cancel: false,
                amend: false
              }
            }
          }
        };

        mockAxios.get.mockResolvedValue(mockPermissionResponse);

        const result = await checkPermission('Customer', 'write');

        expect(result).toEqual({
          ok: true,
          data: {
            allowed: true,
            roles: ['Sales User', 'System Manager'],
            permissions: {
              read: true,
              write: true,
              create: false,
              delete: false,
              submit: false,
              cancel: false,
              amend: false
            }
          }
        });
      });

      test('should check permission with document name', async () => {
        mockAxios.get.mockResolvedValue({
          data: { message: true }
        });

        const result = await checkPermission('Customer', 'write', 'CUST-001');

        expect(result.ok).toBe(true);
        expect(mockAxios.get).toHaveBeenCalledWith('/api/method/frappe.permissions.has_permission', {
          params: {
            doctype: 'Customer',
            action: 'write',
            name: 'CUST-001'
          }
        });
      });

      test('should handle all valid actions', async () => {
        const validActions = ['read', 'write', 'create', 'delete', 'submit', 'cancel', 'amend', 'print', 'email', 'report'];

        for (const action of validActions) {
          mockAxios.get.mockResolvedValue({
            data: { message: true }
          });

          const result = await checkPermission('Customer', action);

          expect(result.ok).toBe(true);
          expect(result.data?.allowed).toBe(true);
        }
      });

      test('should handle case insensitive actions', async () => {
        mockAxios.get.mockResolvedValue({
          data: { message: true }
        });

        const result = await checkPermission('Customer', 'READ');

        expect(result.ok).toBe(true);
        expect(mockAxios.get).toHaveBeenCalledWith('/api/method/frappe.permissions.has_permission', {
          params: {
            doctype: 'Customer',
            action: 'read'
          }
        });
      });
    });

    describe('Permission Denied Cases', () => {
      test('should return permission denied for boolean false response', async () => {
        mockAxios.get.mockResolvedValue({
          data: { message: false }
        });

        const result = await checkPermission('Customer', 'delete');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Insufficient permissions to delete Customer'
          }
        });
      });

      test('should return permission denied for detailed false response', async () => {
        const mockPermissionResponse = {
          data: {
            message: {
              allowed: false,
              has_permission: false,
              roles: ['Sales User'],
              permissions: {
                read: true,
                write: false,
                create: false,
                delete: false
              }
            }
          }
        };

        mockAxios.get.mockResolvedValue(mockPermissionResponse);

        const result = await checkPermission('Customer', 'delete', 'CUST-001');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Insufficient permissions to delete Customer/CUST-001'
          }
        });
      });
    });

    describe('Error Handling', () => {
      test('should handle doctype not found (404)', async () => {
        mockAxios.get.mockRejectedValue({
          response: { status: 404 }
        });

        const result = await checkPermission('NonExistentDocType', 'read');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: "Doctype 'NonExistentDocType' not found"
          }
        });
      });

      test('should handle permission denied on check (403)', async () => {
        mockAxios.get.mockRejectedValue({
          response: { status: 403 }
        });

        const result = await checkPermission('Customer', 'read');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Insufficient permissions to check read access for Customer'
          }
        });
      });

      test('should handle bad request (400)', async () => {
        mockAxios.get.mockRejectedValue({
          response: {
            status: 400,
            data: { message: 'Invalid permission parameters' }
          }
        });

        const result = await checkPermission('Customer', 'read');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Invalid permission parameters'
          }
        });
      });

      test('should handle response with error message', async () => {
        mockAxios.get.mockRejectedValue({
          response: {
            status: 500,
            data: { message: 'Permission service unavailable' }
          }
        });

        const result = await checkPermission('Customer', 'read');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Permission service unavailable'
          }
        });
      });

      test('should handle network errors', async () => {
        mockAxios.get.mockRejectedValue(new Error('Network timeout'));

        const result = await checkPermission('Customer', 'read');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Network timeout'
          }
        });
      });
    });

    describe('Complex Permission Scenarios', () => {
      test('should handle permissions for different doctypes', async () => {
        const doctypes = ['Customer', 'Sales Invoice', 'Item', 'User'];

        for (const doctype of doctypes) {
          mockAxios.get.mockResolvedValue({
            data: { message: true }
          });

          const result = await checkPermission(doctype, 'read');

          expect(result.ok).toBe(true);
          expect(result.data?.allowed).toBe(true);
        }
      });

      test('should handle role-based permissions', async () => {
        const mockPermissionResponse = {
          data: {
            message: {
              allowed: true,
              roles: ['Sales Manager', 'Accounts User'],
              permissions: {
                read: true,
                write: true,
                create: true,
                delete: false,
                submit: true,
                cancel: false
              }
            }
          }
        };

        mockAxios.get.mockResolvedValue(mockPermissionResponse);

        const result = await checkPermission('Sales Invoice', 'submit');

        expect(result.ok).toBe(true);
        expect(result.data?.roles).toEqual(['Sales Manager', 'Accounts User']);
        expect(result.data?.permissions?.submit).toBe(true);
        expect(result.data?.permissions?.delete).toBe(false);
      });
    });
  });
});