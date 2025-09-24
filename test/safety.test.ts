import { previewTransaction, runBulk, BulkOperation } from '../src/core/safety';
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

describe('Safety Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default successful auth
    (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(true);
    (erpAuthenticator.getConfig as jest.Mock).mockReturnValue({ baseUrl: 'https://test.com' });
    (erpAuthenticator as any).client = mockAxios;
  });

  describe('previewTransaction', () => {
    const validDoc = {
      customer: 'CUST-001',
      items: [
        { item_code: 'ITEM-001', qty: 1, rate: 100 }
      ]
    };

    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await previewTransaction('Sales Invoice', validDoc);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });

      test('should fail when doctype is missing', async () => {
        const result = await previewTransaction('', validDoc);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when doctype is not string', async () => {
        const result = await previewTransaction(null as any, validDoc);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when doc is missing', async () => {
        const result = await previewTransaction('Sales Invoice', null as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document data is required and must be an object'
          }
        });
      });

      test('should fail when doc is not object', async () => {
        const result = await previewTransaction('Sales Invoice', 'invalid' as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document data is required and must be an object'
          }
        });
      });

      test('should fail when doc is array', async () => {
        const result = await previewTransaction('Sales Invoice', [] as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document data is required and must be an object'
          }
        });
      });

      test('should fail when config is missing', async () => {
        (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

        const result = await previewTransaction('Sales Invoice', validDoc);

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

        const result = await previewTransaction('Sales Invoice', validDoc);

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
      test('should preview valid transaction', async () => {
        const mockValidationResponse = {
          data: {
            message: {
              valid: true,
              errors: [],
              warnings: []
            }
          }
        };

        mockAxios.post.mockResolvedValue(mockValidationResponse);

        const result = await previewTransaction('Sales Invoice', validDoc);

        expect(result).toEqual({
          ok: true,
          data: {
            valid: true
          }
        });

        expect(mockAxios.post).toHaveBeenCalledWith('/api/method/frappe.model.document.validate_doc', {
          doctype: 'Sales Invoice',
          doc: JSON.stringify(validDoc),
          action: 'validate'
        });
      });

      test('should preview transaction with warnings', async () => {
        const mockValidationResponse = {
          data: {
            message: {
              valid: true,
              warnings: [
                { message: 'Customer credit limit may be exceeded', field: 'customer' },
                'This is a general warning'
              ]
            }
          }
        };

        mockAxios.post.mockResolvedValue(mockValidationResponse);

        const result = await previewTransaction('Sales Invoice', validDoc);

        expect(result).toEqual({
          ok: true,
          data: {
            valid: true,
            issues: [
              { field: 'customer', message: 'Customer credit limit may be exceeded', severity: 'warning' },
              { message: 'This is a general warning', severity: 'warning' }
            ],
            warnings: [
              'Customer credit limit may be exceeded',
              'This is a general warning'
            ]
          }
        });
      });

      test('should preview transaction with errors', async () => {
        const mockValidationResponse = {
          data: {
            message: {
              errors: [
                { message: 'Customer is mandatory', field: 'customer' },
                { msg: 'Item code is required', fieldname: 'item_code' }
              ]
            }
          }
        };

        mockAxios.post.mockResolvedValue(mockValidationResponse);

        const result = await previewTransaction('Sales Invoice', validDoc);

        expect(result).toEqual({
          ok: true,
          data: {
            valid: false,
            issues: [
              { field: 'customer', message: 'Customer is mandatory', severity: 'error' },
              { field: 'item_code', message: 'Item code is required', severity: 'error' }
            ]
          }
        });
      });

      test('should estimate transaction impact', async () => {
        const docWithFinancials = {
          name: 'SI-001',
          customer: 'CUST-001',
          grand_total: 1000,
          workflow_state: 'Submitted'
        };

        mockAxios.post.mockResolvedValue({
          data: { message: { valid: true } }
        });

        const result = await previewTransaction('Sales Invoice', docWithFinancials);

        expect(result.ok).toBe(true);
        expect(result.data?.estimated_impact).toEqual({
          documents_affected: 1,
          financial_impact: 1000,
          workflow_changes: ['Submitted']
        });
      });

      test('should handle mixed messages', async () => {
        const mockValidationResponse = {
          data: {
            message: {
              messages: [
                { message: 'Info message', severity: 'info', field: 'status' },
                { msg: 'Warning message', type: 'warning', fieldname: 'date' }
              ]
            }
          }
        };

        mockAxios.post.mockResolvedValue(mockValidationResponse);

        const result = await previewTransaction('Customer', { customer_name: 'Test' });

        expect(result.ok).toBe(true);
        expect(result.data?.issues).toEqual([
          { field: 'status', message: 'Info message', severity: 'info' },
          { field: 'date', message: 'Warning message', severity: 'warning' }
        ]);
      });
    });

    describe('Error Handling', () => {
      test('should handle doctype not found (404)', async () => {
        mockAxios.post.mockRejectedValue({
          response: { status: 404 }
        });

        const result = await previewTransaction('InvalidDoctype', validDoc);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: "Doctype 'InvalidDoctype' not found"
          }
        });
      });

      test('should handle permission denied (403)', async () => {
        mockAxios.post.mockRejectedValue({
          response: { status: 403 }
        });

        const result = await previewTransaction('Sales Invoice', validDoc);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Insufficient permissions to preview Sales Invoice transactions'
          }
        });
      });

      test('should handle validation errors (400)', async () => {
        mockAxios.post.mockRejectedValue({
          response: {
            status: 400,
            data: { message: 'Invalid document structure' }
          }
        });

        const result = await previewTransaction('Sales Invoice', validDoc);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Invalid document structure'
          }
        });
      });

      test('should handle network errors', async () => {
        mockAxios.post.mockRejectedValue(new Error('Network timeout'));

        const result = await previewTransaction('Sales Invoice', validDoc);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Network timeout'
          }
        });
      });
    });
  });

  describe('runBulk', () => {
    const validOperations: BulkOperation[] = [
      { type: 'create', doctype: 'Customer', doc: { customer_name: 'Test Customer' } },
      { type: 'update', doctype: 'Customer', name: 'CUST-001', patch: { territory: 'US' } }
    ];

    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await runBulk(validOperations);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });

      test('should fail when operations is not array', async () => {
        const result = await runBulk('invalid' as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Operations array is required and cannot be empty'
          }
        });
      });

      test('should fail when operations is empty', async () => {
        const result = await runBulk([]);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Operations array is required and cannot be empty'
          }
        });
      });

      test('should fail when too many operations', async () => {
        const tooManyOps = Array(101).fill({ type: 'create', doctype: 'Customer', doc: {} });

        const result = await runBulk(tooManyOps);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Maximum 100 operations allowed per bulk request'
          }
        });
      });

      test('should fail when operation type is invalid', async () => {
        const invalidOps = [{ type: 'invalid', doctype: 'Customer' }];

        const result = await runBulk(invalidOps as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: "Invalid operation type 'invalid' at index 0. Valid types: create, update, delete, submit, cancel"
          }
        });
      });

      test('should fail when doctype is missing', async () => {
        const invalidOps = [{ type: 'create' }];

        const result = await runBulk(invalidOps as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required for operation at index 0'
          }
        });
      });

      test('should fail when name is missing for update', async () => {
        const invalidOps = [{ type: 'update', doctype: 'Customer', patch: {} }];

        const result = await runBulk(invalidOps as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document name is required for update operation at index 0'
          }
        });
      });

      test('should fail when doc is missing for create', async () => {
        const invalidOps = [{ type: 'create', doctype: 'Customer' }];

        const result = await runBulk(invalidOps as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document data is required for create operation at index 0'
          }
        });
      });

      test('should fail when patch is missing for update', async () => {
        const invalidOps = [{ type: 'update', doctype: 'Customer', name: 'CUST-001' }];

        const result = await runBulk(invalidOps as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Patch data is required for update operation at index 0'
          }
        });
      });
    });

    describe('Successful Operations', () => {
      test('should execute all operations successfully', async () => {
        const operations: BulkOperation[] = [
          { type: 'create', doctype: 'Customer', doc: { customer_name: 'Test Customer' } },
          { type: 'update', doctype: 'Customer', name: 'CUST-001', patch: { territory: 'US' } }
        ];

        mockAxios.post.mockResolvedValueOnce({
          data: { data: { name: 'CUST-NEW', customer_name: 'Test Customer' } }
        });

        mockAxios.put.mockResolvedValueOnce({
          data: { data: { name: 'CUST-001', territory: 'US' } }
        });

        const result = await runBulk(operations);

        expect(result).toEqual({
          ok: true,
          data: {
            results: [
              {
                operation_index: 0,
                success: true,
                data: { data: { name: 'CUST-NEW', customer_name: 'Test Customer' } }
              },
              {
                operation_index: 1,
                success: true,
                data: { data: { name: 'CUST-001', territory: 'US' } }
              }
            ],
            rolled_back: false,
            completed_operations: 2,
            failed_operations: 0
          }
        });
      });

      test('should execute delete operations', async () => {
        const operations: BulkOperation[] = [
          { type: 'delete', doctype: 'Customer', name: 'CUST-001' }
        ];

        mockAxios.delete.mockResolvedValueOnce({
          data: { message: 'Customer deleted successfully' }
        });

        const result = await runBulk(operations);

        expect(result.ok).toBe(true);
        expect(result.data?.completed_operations).toBe(1);
        expect(mockAxios.delete).toHaveBeenCalledWith('/api/resource/Customer/CUST-001');
      });

      test('should execute submit operations', async () => {
        const operations: BulkOperation[] = [
          { type: 'submit', doctype: 'Sales Invoice', name: 'SI-001' }
        ];

        mockAxios.put.mockResolvedValueOnce({
          data: { data: { name: 'SI-001', docstatus: 1 } }
        });

        const result = await runBulk(operations);

        expect(result.ok).toBe(true);
        expect(mockAxios.put).toHaveBeenCalledWith('/api/resource/Sales Invoice/SI-001', {
          data: { docstatus: 1 }
        });
      });

      test('should execute cancel operations', async () => {
        const operations: BulkOperation[] = [
          { type: 'cancel', doctype: 'Sales Invoice', name: 'SI-001' }
        ];

        mockAxios.put.mockResolvedValueOnce({
          data: { data: { name: 'SI-001', docstatus: 2 } }
        });

        const result = await runBulk(operations);

        expect(result.ok).toBe(true);
        expect(mockAxios.put).toHaveBeenCalledWith('/api/resource/Sales Invoice/SI-001', {
          data: { docstatus: 2 }
        });
      });

      test('should continue on error when rollback is disabled', async () => {
        const operations: BulkOperation[] = [
          { type: 'create', doctype: 'Customer', doc: { customer_name: 'Test' } },
          { type: 'update', doctype: 'Customer', name: 'INVALID', patch: { territory: 'US' } },
          { type: 'create', doctype: 'Customer', doc: { customer_name: 'Test 2' } }
        ];

        mockAxios.post
          .mockResolvedValueOnce({ data: { data: { name: 'CUST-001' } } })
          .mockResolvedValueOnce({ data: { data: { name: 'CUST-002' } } });

        mockAxios.put.mockRejectedValueOnce(new Error('Customer not found'));

        const result = await runBulk(operations, false);

        expect(result).toEqual({
          ok: true,
          data: {
            results: [
              { operation_index: 0, success: true, data: { data: { name: 'CUST-001' } } },
              { operation_index: 1, success: false, error: 'Customer not found' },
              { operation_index: 2, success: true, data: { data: { name: 'CUST-002' } } }
            ],
            rolled_back: false,
            completed_operations: 2,
            failed_operations: 1
          }
        });
      });
    });

    describe('Rollback Functionality', () => {
      test('should rollback on error when enabled', async () => {
        const operations: BulkOperation[] = [
          { type: 'create', doctype: 'Customer', doc: { customer_name: 'Test 1' } },
          { type: 'create', doctype: 'Customer', doc: { customer_name: 'Test 2' } },
          { type: 'update', doctype: 'Customer', name: 'INVALID', patch: { territory: 'US' } }
        ];

        // First two creates succeed
        mockAxios.post
          .mockResolvedValueOnce({ data: { data: { name: 'CUST-001' } } })
          .mockResolvedValueOnce({ data: { data: { name: 'CUST-002' } } });

        // Third operation (update) fails
        mockAxios.put.mockRejectedValueOnce(new Error('Customer not found'));

        // Rollback deletes succeed
        mockAxios.delete
          .mockResolvedValueOnce({ data: { message: 'Deleted CUST-002' } })
          .mockResolvedValueOnce({ data: { message: 'Deleted CUST-001' } });

        const result = await runBulk(operations, true);

        expect(result).toEqual({
          ok: true,
          data: {
            results: [
              { operation_index: 0, success: true, data: { data: { name: 'CUST-001' } } },
              { operation_index: 1, success: true, data: { data: { name: 'CUST-002' } } },
              { operation_index: 2, success: false, error: 'Customer not found' }
            ],
            rolled_back: true,
            completed_operations: 2,
            failed_operations: 1
          }
        });

        // Verify rollback calls were made in reverse order
        expect(mockAxios.delete).toHaveBeenCalledWith('/api/resource/Customer/CUST-002');
        expect(mockAxios.delete).toHaveBeenCalledWith('/api/resource/Customer/CUST-001');
      });

      test('should handle rollback failures gracefully', async () => {
        const operations: BulkOperation[] = [
          { type: 'create', doctype: 'Customer', doc: { customer_name: 'Test' } },
          { type: 'update', doctype: 'Customer', name: 'INVALID', patch: {} }
        ];

        mockAxios.post.mockResolvedValueOnce({ data: { data: { name: 'CUST-001' } } });
        mockAxios.put.mockRejectedValueOnce(new Error('Update failed'));
        mockAxios.delete.mockRejectedValueOnce(new Error('Delete failed'));

        const result = await runBulk(operations, true);

        expect(result.ok).toBe(true);
        expect(result.data?.rolled_back).toBe(true);
        expect(result.data?.failed_operations).toBe(1);
      });
    });

    describe('Error Handling', () => {
      test('should handle permission denied (403)', async () => {
        mockAxios.post.mockRejectedValue({
          response: { status: 403 }
        });

        const result = await runBulk(validOperations);

        expect(result.ok).toBe(true);
        expect(result.data?.failed_operations).toBe(1);
        expect(result.data?.completed_operations).toBe(0);
        expect(result.data?.results[0].success).toBe(false);
      });

      test('should handle response with error message', async () => {
        mockAxios.post.mockRejectedValue({
          response: {
            status: 500,
            data: { message: 'Bulk service unavailable' }
          }
        });

        const result = await runBulk(validOperations);

        expect(result.ok).toBe(true);
        expect(result.data?.failed_operations).toBe(1);
        expect(result.data?.completed_operations).toBe(0);
        expect(result.data?.results[0].success).toBe(false);
        expect(result.data?.results[0].error).toBe('Bulk service unavailable');
      });

      test('should handle network errors', async () => {
        mockAxios.post.mockRejectedValue(new Error('Connection refused'));

        const result = await runBulk(validOperations);

        expect(result.ok).toBe(true);
        expect(result.data?.failed_operations).toBe(1);
        expect(result.data?.completed_operations).toBe(0);
        expect(result.data?.results[0].success).toBe(false);
        expect(result.data?.results[0].error).toBe('Connection refused');
      });
    });

    describe('Complex Scenarios', () => {
      test('should handle mixed operation types', async () => {
        const operations: BulkOperation[] = [
          { type: 'create', doctype: 'Customer', doc: { customer_name: 'New Customer' } },
          { type: 'update', doctype: 'Customer', name: 'CUST-001', patch: { territory: 'US' } },
          { type: 'delete', doctype: 'Customer', name: 'CUST-002' },
          { type: 'submit', doctype: 'Sales Invoice', name: 'SI-001' },
          { type: 'cancel', doctype: 'Sales Invoice', name: 'SI-002' }
        ];

        // Mock all successful responses
        mockAxios.post.mockResolvedValueOnce({ data: { data: { name: 'CUST-NEW' } } });
        mockAxios.put.mockResolvedValueOnce({ data: { data: { name: 'CUST-001' } } });
        mockAxios.delete.mockResolvedValueOnce({ data: { message: 'Deleted' } });
        mockAxios.put.mockResolvedValueOnce({ data: { data: { name: 'SI-001', docstatus: 1 } } });
        mockAxios.put.mockResolvedValueOnce({ data: { data: { name: 'SI-002', docstatus: 2 } } });

        const result = await runBulk(operations);

        expect(result.ok).toBe(true);
        expect(result.data?.completed_operations).toBe(5);
        expect(result.data?.failed_operations).toBe(0);
      });
    });
  });
});