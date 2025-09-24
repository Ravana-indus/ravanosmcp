import { replaceTable, autocomplete } from '../src/core/child_links';
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
  put: jest.fn(),
  post: jest.fn(),
  delete: jest.fn()
};

describe('Child Links Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default successful auth
    (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(true);
    (erpAuthenticator.getConfig as jest.Mock).mockReturnValue({ baseUrl: 'https://test.com' });
    (erpAuthenticator as any).client = mockAxios;
  });

  describe('replaceTable', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await replaceTable('Sales Invoice', 'SI-001', 'items', []);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });

      test('should fail when parent_doctype is missing', async () => {
        const result = await replaceTable('', 'SI-001', 'items', []);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Parent doctype is required and must be a string'
          }
        });
      });

      test('should fail when parent_doctype is not string', async () => {
        const result = await replaceTable(null as any, 'SI-001', 'items', []);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Parent doctype is required and must be a string'
          }
        });
      });

      test('should fail when parent_name is missing', async () => {
        const result = await replaceTable('Sales Invoice', '', 'items', []);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Parent name is required and must be a string'
          }
        });
      });

      test('should fail when parent_name is not string', async () => {
        const result = await replaceTable('Sales Invoice', 123 as any, 'items', []);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Parent name is required and must be a string'
          }
        });
      });

      test('should fail when tablefield is missing', async () => {
        const result = await replaceTable('Sales Invoice', 'SI-001', '', []);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Table field name is required and must be a string'
          }
        });
      });

      test('should fail when tablefield is not string', async () => {
        const result = await replaceTable('Sales Invoice', 'SI-001', null as any, []);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Table field name is required and must be a string'
          }
        });
      });

      test('should fail when rows is not an array', async () => {
        const result = await replaceTable('Sales Invoice', 'SI-001', 'items', 'not-array' as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Rows must be an array'
          }
        });
      });

      test('should fail when config is missing', async () => {
        (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

        const result = await replaceTable('Sales Invoice', 'SI-001', 'items', []);

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

        const result = await replaceTable('Sales Invoice', 'SI-001', 'items', []);

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
      test('should replace table rows successfully', async () => {
        const mockRows = [
          { item_code: 'ITEM-001', qty: 5, rate: 100 },
          { item_code: 'ITEM-002', qty: 3, rate: 200 }
        ];

        mockAxios.get.mockResolvedValue({
          data: {
            data: { name: 'SI-001', doctype: 'Sales Invoice' }
          }
        });

        mockAxios.put.mockResolvedValue({
          data: {
            data: {
              name: 'SI-001',
              items: mockRows
            }
          }
        });

        const result = await replaceTable('Sales Invoice', 'SI-001', 'items', mockRows);

        expect(result).toEqual({
          ok: true,
          data: {
            table_replaced: true,
            rows_count: 2
          }
        });

        expect(mockAxios.get).toHaveBeenCalledWith('/api/resource/Sales Invoice/SI-001');
        expect(mockAxios.put).toHaveBeenCalledWith('/api/resource/Sales Invoice/SI-001', {
          data: { items: mockRows }
        });
      });

      test('should handle empty rows array', async () => {
        mockAxios.get.mockResolvedValue({
          data: {
            data: { name: 'SI-001', doctype: 'Sales Invoice' }
          }
        });

        mockAxios.put.mockResolvedValue({
          data: {
            data: {
              name: 'SI-001',
              items: []
            }
          }
        });

        const result = await replaceTable('Sales Invoice', 'SI-001', 'items', []);

        expect(result).toEqual({
          ok: true,
          data: {
            table_replaced: true,
            rows_count: 0
          }
        });
      });
    });

    describe('Error Handling', () => {
      test('should handle parent document not found (404)', async () => {
        mockAxios.get.mockRejectedValue({
          response: { status: 404 }
        });

        const result = await replaceTable('Sales Invoice', 'SI-001', 'items', []);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Parent document Sales Invoice/SI-001 not found'
          }
        });
      });

      test('should handle permission denied (403)', async () => {
        mockAxios.get.mockResolvedValue({
          data: { data: { name: 'SI-001' } }
        });

        mockAxios.put.mockRejectedValue({
          response: { status: 403 }
        });

        const result = await replaceTable('Sales Invoice', 'SI-001', 'items', []);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Insufficient permissions to modify Sales Invoice/SI-001'
          }
        });
      });

      test('should handle validation errors (400)', async () => {
        mockAxios.get.mockResolvedValue({
          data: { data: { name: 'SI-001' } }
        });

        mockAxios.put.mockRejectedValue({
          response: {
            status: 400,
            data: { message: 'Invalid table field name' }
          }
        });

        const result = await replaceTable('Sales Invoice', 'SI-001', 'items', []);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Invalid table field name'
          }
        });
      });

      test('should handle generic errors', async () => {
        mockAxios.get.mockRejectedValue(new Error('Network error'));

        const result = await replaceTable('Sales Invoice', 'SI-001', 'items', []);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Network error'
          }
        });
      });
    });
  });

  describe('autocomplete', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await autocomplete('Customer', 'test');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });

      test('should fail when doctype is missing', async () => {
        const result = await autocomplete('', 'test');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when doctype is not string', async () => {
        const result = await autocomplete(null as any, 'test');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when txt is not string', async () => {
        const result = await autocomplete('Customer', 123 as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Search text must be a string'
          }
        });
      });

      test('should fail when limit is not positive number', async () => {
        const result = await autocomplete('Customer', 'test', 0);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Limit must be a positive number'
          }
        });
      });

      test('should fail when limit is not number', async () => {
        const result = await autocomplete('Customer', 'test', 'not-number' as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Limit must be a positive number'
          }
        });
      });

      test('should fail when config is missing', async () => {
        (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

        const result = await autocomplete('Customer', 'test');

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

        const result = await autocomplete('Customer', 'test');

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
      test('should return autocomplete results as arrays', async () => {
        const mockResults = [
          ['CUST-001', 'Customer One'],
          ['CUST-002', 'Customer Two']
        ];

        mockAxios.get.mockResolvedValue({
          data: { message: mockResults }
        });

        const result = await autocomplete('Customer', 'customer');

        expect(result).toEqual({
          ok: true,
          data: {
            options: [
              { value: 'CUST-001', label: 'Customer One' },
              { value: 'CUST-002', label: 'Customer Two' }
            ]
          }
        });

        expect(mockAxios.get).toHaveBeenCalledWith(
          '/api/method/frappe.desk.search.search_link?txt=customer',
          { params: { doctype: 'Customer' } }
        );
      });

      test('should return autocomplete results as objects', async () => {
        const mockResults = [
          { value: 'CUST-001', label: 'Customer One' },
          { name: 'CUST-002', title: 'Customer Two' }
        ];

        mockAxios.get.mockResolvedValue({
          data: { message: mockResults }
        });

        const result = await autocomplete('Customer', 'customer');

        expect(result).toEqual({
          ok: true,
          data: {
            options: [
              { value: 'CUST-001', label: 'Customer One' },
              { value: 'CUST-002', label: 'Customer Two' }
            ]
          }
        });
      });

      test('should return autocomplete results as strings', async () => {
        const mockResults = ['CUST-001', 'CUST-002'];

        mockAxios.get.mockResolvedValue({
          data: { message: mockResults }
        });

        const result = await autocomplete('Customer', 'customer');

        expect(result).toEqual({
          ok: true,
          data: {
            options: [
              { value: 'CUST-001', label: 'CUST-001' },
              { value: 'CUST-002', label: 'CUST-002' }
            ]
          }
        });
      });

      test('should handle empty results', async () => {
        mockAxios.get.mockResolvedValue({
          data: { message: [] }
        });

        const result = await autocomplete('Customer', 'nonexistent');

        expect(result).toEqual({
          ok: true,
          data: {
            options: []
          }
        });
      });

      test('should include limit parameter when specified', async () => {
        mockAxios.get.mockResolvedValue({
          data: { message: [] }
        });

        await autocomplete('Customer', 'test', 10);

        expect(mockAxios.get).toHaveBeenCalledWith(
          '/api/method/frappe.desk.search.search_link?txt=test&limit=10',
          { params: { doctype: 'Customer' } }
        );
      });

      test('should handle empty search text', async () => {
        mockAxios.get.mockResolvedValue({
          data: { message: [] }
        });

        const result = await autocomplete('Customer', '');

        expect(result).toEqual({
          ok: true,
          data: {
            options: []
          }
        });
      });
    });

    describe('Error Handling', () => {
      test('should handle doctype not found (404)', async () => {
        mockAxios.get.mockRejectedValue({
          response: { status: 404 }
        });

        const result = await autocomplete('InvalidDoctype', 'test');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype InvalidDoctype not found or not searchable'
          }
        });
      });

      test('should handle permission denied (403)', async () => {
        mockAxios.get.mockRejectedValue({
          response: { status: 403 }
        });

        const result = await autocomplete('Customer', 'test');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Insufficient permissions to search Customer'
          }
        });
      });

      test('should handle validation errors (400)', async () => {
        mockAxios.get.mockRejectedValue({
          response: {
            status: 400,
            data: { message: 'Invalid search parameters' }
          }
        });

        const result = await autocomplete('Customer', 'test');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Invalid search parameters'
          }
        });
      });

      test('should handle response with error message', async () => {
        mockAxios.get.mockRejectedValue({
          response: {
            status: 500,
            data: { message: 'Server error occurred' }
          }
        });

        const result = await autocomplete('Customer', 'test');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Server error occurred'
          }
        });
      });

      test('should handle generic errors', async () => {
        mockAxios.get.mockRejectedValue(new Error('Network error'));

        const result = await autocomplete('Customer', 'test');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Network error'
          }
        });
      });
    });
  });
});