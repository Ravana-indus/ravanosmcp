import { runReport, getPdf } from '../src/core/reports_print';
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

describe('Reports and Printing Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default successful auth
    (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(true);
    (erpAuthenticator.getConfig as jest.Mock).mockReturnValue({ baseUrl: 'https://test.com' });
    (erpAuthenticator as any).client = mockAxios;
  });

  describe('runReport', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await runReport('Sales Analytics');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });

      test('should fail when report_name is missing', async () => {
        const result = await runReport('');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: 'Report name is required and must be a string'
          }
        });
      });

      test('should fail when report_name is not string', async () => {
        const result = await runReport(null as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: 'Report name is required and must be a string'
          }
        });
      });

      test('should fail when filters is not an object', async () => {
        const result = await runReport('Sales Analytics', 'invalid' as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Filters must be an object'
          }
        });
      });

      test('should fail when filters is an array', async () => {
        const result = await runReport('Sales Analytics', [] as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Filters must be an object'
          }
        });
      });

      test('should fail when config is missing', async () => {
        (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

        const result = await runReport('Sales Analytics');

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

        const result = await runReport('Sales Analytics');

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
      test('should run report successfully with object columns', async () => {
        const mockReportData = {
          message: {
            columns: [
              { fieldname: 'customer', label: 'Customer', fieldtype: 'Link', width: 150 },
              { fieldname: 'amount', label: 'Amount', fieldtype: 'Currency', width: 120 }
            ],
            result: [
              ['Customer A', 1000],
              ['Customer B', 2000]
            ],
            total_row_count: 2
          }
        };

        mockAxios.post.mockResolvedValue({ data: mockReportData });

        const result = await runReport('Sales Analytics');

        expect(result).toEqual({
          ok: true,
          data: {
            columns: [
              { fieldname: 'customer', label: 'Customer', fieldtype: 'Link', width: 150 },
              { fieldname: 'amount', label: 'Amount', fieldtype: 'Currency', width: 120 }
            ],
            rows: [
              ['Customer A', 1000],
              ['Customer B', 2000]
            ],
            total_row_count: 2,
            report_name: 'Sales Analytics'
          }
        });

        expect(mockAxios.post).toHaveBeenCalledWith('/api/method/frappe.desk.query_report.run', {
          report_name: 'Sales Analytics'
        });
      });

      test('should run report successfully with string columns', async () => {
        const mockReportData = {
          message: {
            columns: ['customer', 'amount'],
            result: [
              ['Customer A', 1000],
              ['Customer B', 2000]
            ]
          }
        };

        mockAxios.post.mockResolvedValue({ data: mockReportData });

        const result = await runReport('Simple Report');

        expect(result).toEqual({
          ok: true,
          data: {
            columns: [
              { fieldname: 'customer', label: 'customer', fieldtype: 'Data', width: 120 },
              { fieldname: 'amount', label: 'amount', fieldtype: 'Data', width: 120 }
            ],
            rows: [
              ['Customer A', 1000],
              ['Customer B', 2000]
            ],
            total_row_count: 2,
            report_name: 'Simple Report'
          }
        });
      });

      test('should run report with filters', async () => {
        const mockReportData = {
          message: {
            columns: [{ fieldname: 'customer', label: 'Customer' }],
            result: [['Customer A']]
          }
        };

        mockAxios.post.mockResolvedValue({ data: mockReportData });

        const filters = { company: 'Test Company', from_date: '2024-01-01' };
        const result = await runReport('Sales Analytics', filters);

        expect(result.ok).toBe(true);
        expect(mockAxios.post).toHaveBeenCalledWith('/api/method/frappe.desk.query_report.run', {
          report_name: 'Sales Analytics',
          filters
        });
      });

      test('should handle report with no data', async () => {
        const mockReportData = {
          message: {
            columns: [],
            result: []
          }
        };

        mockAxios.post.mockResolvedValue({ data: mockReportData });

        const result = await runReport('Empty Report');

        expect(result).toEqual({
          ok: true,
          data: {
            columns: [],
            rows: [],
            total_row_count: 0,
            report_name: 'Empty Report'
          }
        });
      });

      test('should handle alternative response structure', async () => {
        const mockReportData = {
          columns: [{ fieldname: 'test', label: 'Test' }],
          data: [['test_value']]
        };

        mockAxios.post.mockResolvedValue({ data: mockReportData });

        const result = await runReport('Alternative Format');

        expect(result.ok).toBe(true);
        expect(result.data?.rows).toEqual([['test_value']]);
      });
    });

    describe('Error Handling', () => {
      test('should handle report not found (404)', async () => {
        mockAxios.post.mockRejectedValue({
          response: { status: 404 }
        });

        const result = await runReport('NonExistent Report');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: "Report 'NonExistent Report' not found"
          }
        });
      });

      test('should handle permission denied (403)', async () => {
        mockAxios.post.mockRejectedValue({
          response: { status: 403 }
        });

        const result = await runReport('Restricted Report');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: "Insufficient permissions to access report 'Restricted Report'"
          }
        });
      });

      test('should handle bad request (400)', async () => {
        mockAxios.post.mockRejectedValue({
          response: {
            status: 400,
            data: { message: 'Invalid report parameters' }
          }
        });

        const result = await runReport('Invalid Report');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: 'Invalid report parameters'
          }
        });
      });

      test('should handle response with no columns', async () => {
        mockAxios.post.mockResolvedValue({
          data: { message: { result: [] } }
        });

        const result = await runReport('No Columns Report');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: "Report 'No Columns Report' not found or has no data"
          }
        });
      });

      test('should handle generic errors', async () => {
        mockAxios.post.mockRejectedValue(new Error('Network error'));

        const result = await runReport('Test Report');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'REPORT_NOT_FOUND',
            message: 'Network error'
          }
        });
      });
    });
  });

  describe('getPdf', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await getPdf('Sales Invoice', 'SI-001');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });

      test('should fail when doctype is missing', async () => {
        const result = await getPdf('', 'SI-001');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when doctype is not string', async () => {
        const result = await getPdf(null as any, 'SI-001');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when name is missing', async () => {
        const result = await getPdf('Sales Invoice', '');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document name is required and must be a string'
          }
        });
      });

      test('should fail when name is not string', async () => {
        const result = await getPdf('Sales Invoice', 123 as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document name is required and must be a string'
          }
        });
      });

      test('should fail when print_format is not string', async () => {
        const result = await getPdf('Sales Invoice', 'SI-001', 123 as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Print format must be a string'
          }
        });
      });

      test('should fail when config is missing', async () => {
        (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

        const result = await getPdf('Sales Invoice', 'SI-001');

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

        const result = await getPdf('Sales Invoice', 'SI-001');

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
      test('should generate PDF successfully', async () => {
        const mockPdfBuffer = Buffer.from('PDF content here');
        mockAxios.get.mockResolvedValue({
          data: mockPdfBuffer
        });

        const result = await getPdf('Sales Invoice', 'SI-001');

        expect(result).toEqual({
          ok: true,
          data: {
            pdf_base64: mockPdfBuffer.toString('base64'),
            content_type: 'application/pdf',
            filename: 'Sales Invoice-SI-001.pdf'
          }
        });

        expect(mockAxios.get).toHaveBeenCalledWith(
          '/api/method/frappe.utils.print_format.download_pdf?doctype=Sales+Invoice&name=SI-001&format=PDF',
          { responseType: 'arraybuffer' }
        );
      });

      test('should generate PDF with custom print format', async () => {
        const mockPdfBuffer = Buffer.from('Custom PDF content');
        mockAxios.get.mockResolvedValue({
          data: mockPdfBuffer
        });

        const result = await getPdf('Sales Invoice', 'SI-001', 'Custom Format');

        expect(result.ok).toBe(true);
        expect(mockAxios.get).toHaveBeenCalledWith(
          '/api/method/frappe.utils.print_format.download_pdf?doctype=Sales+Invoice&name=SI-001&format=PDF&print_format=Custom+Format',
          { responseType: 'arraybuffer' }
        );
      });

      test('should handle performance within requirements (< 2s)', async () => {
        const mockPdfBuffer = Buffer.from('Fast PDF');
        mockAxios.get.mockResolvedValue({
          data: mockPdfBuffer
        });

        // Mock a fast response
        const startTime = Date.now();
        const result = await getPdf('Sales Invoice', 'SI-001');
        const endTime = Date.now();

        expect(result.ok).toBe(true);
        expect(endTime - startTime).toBeLessThan(100); // Test should be very fast
      });

      test('should handle large PDF files', async () => {
        const largePdfBuffer = Buffer.alloc(1024 * 1024, 'PDF'); // 1MB PDF
        mockAxios.get.mockResolvedValue({
          data: largePdfBuffer
        });

        const result = await getPdf('Sales Invoice', 'SI-001');

        expect(result.ok).toBe(true);
        expect(result.data?.pdf_base64).toBeDefined();
        expect(result.data?.pdf_base64.length).toBeGreaterThan(0);
      });
    });

    describe('Error Handling', () => {
      test('should handle document not found (404)', async () => {
        mockAxios.get.mockRejectedValue({
          response: { status: 404 }
        });

        const result = await getPdf('Sales Invoice', 'NONEXISTENT');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Document Sales Invoice/NONEXISTENT not found or print format not available'
          }
        });
      });

      test('should handle permission denied (403)', async () => {
        mockAxios.get.mockRejectedValue({
          response: { status: 403 }
        });

        const result = await getPdf('Sales Invoice', 'SI-001');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Insufficient permissions to print Sales Invoice/SI-001'
          }
        });
      });

      test('should handle bad request (400)', async () => {
        mockAxios.get.mockRejectedValue({
          response: {
            status: 400,
            data: { message: 'Invalid print format' }
          }
        });

        const result = await getPdf('Sales Invoice', 'SI-001');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Invalid print format'
          }
        });
      });

      test('should handle response with error message', async () => {
        mockAxios.get.mockRejectedValue({
          response: {
            status: 500,
            data: { message: 'Print server error' }
          }
        });

        const result = await getPdf('Sales Invoice', 'SI-001');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Print server error'
          }
        });
      });

      test('should handle network errors', async () => {
        mockAxios.get.mockRejectedValue(new Error('Connection timeout'));

        const result = await getPdf('Sales Invoice', 'SI-001');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Connection timeout'
          }
        });
      });
    });

    describe('Performance Monitoring', () => {
      test('should log warning for slow PDF generation (>2s)', async () => {
        const logger = require('../src/observability/logger').logger;
        const mockPdfBuffer = Buffer.from('Slow PDF');

        // Mock a slow response by delaying the resolution
        mockAxios.get.mockImplementation(() =>
          new Promise(resolve =>
            setTimeout(() => resolve({ data: mockPdfBuffer }), 2100)
          )
        );

        const result = await getPdf('Sales Invoice', 'SI-001');

        expect(result.ok).toBe(true);
        expect(logger.warn).toHaveBeenCalledWith(
          'PDF generation exceeded performance requirement',
          expect.objectContaining({
            doctype: 'Sales Invoice',
            name: 'SI-001',
            duration_ms: expect.any(Number),
            size_kb: expect.any(Number)
          })
        );
      });
    });
  });
});