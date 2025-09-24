import { createSalesInvoice, recordPayment, getOutstandingInvoices, createExpenseClaim } from '../src/packs/finance';
import { erpAuthenticator } from '../src/core/auth';
import { createDocument, listDocuments } from '../src/core/crud';
import { logger } from '../src/observability/logger';

// Mock dependencies
jest.mock('../src/core/auth');
jest.mock('../src/core/crud');
jest.mock('../src/observability/logger');

const mockErpAuthenticator = erpAuthenticator as jest.Mocked<typeof erpAuthenticator>;
const mockCreateDocument = createDocument as jest.MockedFunction<typeof createDocument>;
const mockListDocuments = listDocuments as jest.MockedFunction<typeof listDocuments>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Finance Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock responses
    mockErpAuthenticator.isAuthenticated.mockReturnValue(true);
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
  });

  describe('createSalesInvoice', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        mockErpAuthenticator.isAuthenticated.mockReturnValue(false);

        const result = await createSalesInvoice(
          'CUST-001',
          '2024-02-15',
          'ACME Corp',
          [{ item_code: 'ITEM-001', qty: 1, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('AUTH_FAILED');
        expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      });

      test('should fail when customer is missing', async () => {
        const result = await createSalesInvoice(
          '',
          '2024-02-15',
          'ACME Corp',
          [{ item_code: 'ITEM-001', qty: 1, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Customer is required and must be a string');
      });

      test('should fail when due_date is invalid', async () => {
        const result = await createSalesInvoice(
          'CUST-001',
          'invalid-date',
          'ACME Corp',
          [{ item_code: 'ITEM-001', qty: 1, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Due date must be a valid date string');
      });

      test('should fail when company is missing', async () => {
        const result = await createSalesInvoice(
          'CUST-001',
          '2024-02-15',
          '',
          [{ item_code: 'ITEM-001', qty: 1, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Company is required and must be a string');
      });

      test('should fail when items array is empty', async () => {
        const result = await createSalesInvoice('CUST-001', '2024-02-15', 'ACME Corp', []);

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Items array is required and cannot be empty');
      });

      test('should fail when item has invalid rate', async () => {
        const result = await createSalesInvoice(
          'CUST-001',
          '2024-02-15',
          'ACME Corp',
          [{ item_code: 'ITEM-001', qty: 1, rate: -100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each item must have a valid rate (>= 0)');
      });
    });

    describe('Successful Operations', () => {
      test('should create sales invoice with total calculation', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'SINV-00001' }
        });

        const items = [
          { item_code: 'ITEM-001', qty: 2, rate: 150 },
          { item_code: 'ITEM-002', qty: 1, rate: 200 }
        ];

        const result = await createSalesInvoice('CUST-001', '2024-02-15', 'ACME Corp', items);

        expect(result.ok).toBe(true);
        expect(result.data?.name).toBe('SINV-00001');
        expect(result.data?.customer).toBe('CUST-001');
        expect(result.data?.due_date).toBe('2024-02-15');
        expect(result.data?.company).toBe('ACME Corp');
        expect(result.data?.total).toBe(500); // (2*150) + (1*200)
        expect(result.data?.grand_total).toBe(500);
        expect(result.data?.outstanding_amount).toBe(500);

        expect(mockCreateDocument).toHaveBeenCalledWith('Sales Invoice', expect.objectContaining({
          customer: 'CUST-001',
          due_date: '2024-02-15',
          company: 'ACME Corp',
          items,
          posting_date: expect.any(String)
        }));
      });
    });

    describe('Error Handling', () => {
      test('should handle createDocument errors', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: false,
          error: { code: 'PERMISSION_ERROR', message: 'Insufficient permissions' }
        });

        const result = await createSalesInvoice(
          'CUST-001',
          '2024-02-15',
          'ACME Corp',
          [{ item_code: 'ITEM-001', qty: 1, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('PERMISSION_ERROR');
        expect(result.error?.message).toBe('Insufficient permissions');
      });
    });
  });

  describe('recordPayment', () => {
    describe('Input Validation', () => {
      test('should fail when payment_type is invalid', async () => {
        const result = await recordPayment(
          'Invalid' as any,
          'Customer',
          'CUST-001',
          1000,
          1000,
          [{ reference_doctype: 'Sales Invoice', reference_name: 'SINV-001', allocated_amount: 1000 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Payment type must be either "Receive" or "Pay"');
      });

      test('should fail when party_type is invalid', async () => {
        const result = await recordPayment(
          'Receive',
          'Invalid' as any,
          'CUST-001',
          1000,
          1000,
          [{ reference_doctype: 'Sales Invoice', reference_name: 'SINV-001', allocated_amount: 1000 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Party type must be either "Customer" or "Supplier"');
      });

      test('should fail when paid_amount is invalid', async () => {
        const result = await recordPayment(
          'Receive',
          'Customer',
          'CUST-001',
          -1000,
          1000,
          [{ reference_doctype: 'Sales Invoice', reference_name: 'SINV-001', allocated_amount: 1000 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Paid amount must be a positive number');
      });

      test('should fail when references array is empty', async () => {
        const result = await recordPayment(
          'Receive',
          'Customer',
          'CUST-001',
          1000,
          1000,
          []
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('References array is required and cannot be empty');
      });

      test('should fail when reference has invalid allocated_amount', async () => {
        const result = await recordPayment(
          'Receive',
          'Customer',
          'CUST-001',
          1000,
          1000,
          [{ reference_doctype: 'Sales Invoice', reference_name: 'SINV-001', allocated_amount: -500 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each reference must have a valid positive allocated_amount');
      });

      test('should fail when total allocated amount does not equal paid amount', async () => {
        const result = await recordPayment(
          'Receive',
          'Customer',
          'CUST-001',
          1000,
          1000,
          [
            { reference_doctype: 'Sales Invoice', reference_name: 'SINV-001', allocated_amount: 500 },
            { reference_doctype: 'Sales Invoice', reference_name: 'SINV-002', allocated_amount: 300 }
          ]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Total allocated amount (800) must equal paid amount (1000)');
      });
    });

    describe('Successful Operations', () => {
      test('should record payment with single reference', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'PE-00001' }
        });

        const references = [
          { reference_doctype: 'Sales Invoice', reference_name: 'SINV-001', allocated_amount: 1000 }
        ];

        const result = await recordPayment(
          'Receive',
          'Customer',
          'CUST-001',
          1000,
          1000,
          references
        );

        expect(result.ok).toBe(true);
        expect(result.data?.name).toBe('PE-00001');
        expect(result.data?.payment_type).toBe('Receive');
        expect(result.data?.party).toBe('CUST-001');
        expect(result.data?.paid_amount).toBe(1000);
        expect(result.data?.total_allocated).toBe(1000);

        expect(mockCreateDocument).toHaveBeenCalledWith('Payment Entry', expect.objectContaining({
          payment_type: 'Receive',
          party_type: 'Customer',
          party: 'CUST-001',
          paid_amount: 1000,
          received_amount: 1000,
          references,
          posting_date: expect.any(String)
        }));
      });

      test('should record payment with multiple references', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'PE-00001' }
        });

        const references = [
          { reference_doctype: 'Sales Invoice', reference_name: 'SINV-001', allocated_amount: 600 },
          { reference_doctype: 'Sales Invoice', reference_name: 'SINV-002', allocated_amount: 400 }
        ];

        const result = await recordPayment(
          'Receive',
          'Customer',
          'CUST-001',
          1000,
          1000,
          references
        );

        expect(result.ok).toBe(true);
        expect(result.data?.total_allocated).toBe(1000);
      });

      test('should allow small rounding differences in allocation', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'PE-00001' }
        });

        const references = [
          { reference_doctype: 'Sales Invoice', reference_name: 'SINV-001', allocated_amount: 999.99 }
        ];

        const result = await recordPayment(
          'Receive',
          'Customer',
          'CUST-001',
          1000.00,
          1000.00,
          references
        );

        expect(result.ok).toBe(true); // Should pass due to rounding tolerance
      });
    });
  });

  describe('getOutstandingInvoices', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        mockErpAuthenticator.isAuthenticated.mockReturnValue(false);

        const result = await getOutstandingInvoices();

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('AUTH_FAILED');
        expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      });
    });

    describe('Successful Operations', () => {
      test('should get all outstanding invoices', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              {
                name: 'SINV-001',
                customer: 'CUST-001',
                posting_date: '2024-01-15',
                due_date: '2030-12-31', // Far future date, not overdue
                grand_total: 1000,
                outstanding_amount: 500
              },
              {
                name: 'SINV-002',
                customer: 'CUST-002',
                posting_date: '2024-01-20',
                due_date: '2024-01-10', // Overdue
                grand_total: 2000,
                outstanding_amount: 2000
              }
            ]
          }
        });

        const result = await getOutstandingInvoices();

        expect(result.ok).toBe(true);
        expect(result.data?.outstanding_invoices).toHaveLength(2);

        const invoice1 = result.data?.outstanding_invoices[0];
        expect(invoice1?.name).toBe('SINV-001');
        expect(invoice1?.customer).toBe('CUST-001');
        expect(invoice1?.outstanding_amount).toBe(500);
        expect(invoice1?.days_overdue).toBeUndefined(); // Not overdue (future due date)

        const invoice2 = result.data?.outstanding_invoices[1];
        expect(invoice2?.name).toBe('SINV-002');
        expect(invoice2?.days_overdue).toBeGreaterThan(0); // Should be overdue

        expect(mockListDocuments).toHaveBeenCalledWith(
          'Sales Invoice',
          {
            docstatus: 1,
            outstanding_amount: ['>', 0]
          },
          ['name', 'customer', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount']
        );
      });

      test('should filter by customer', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              {
                name: 'SINV-001',
                customer: 'CUST-001',
                posting_date: '2024-01-15',
                due_date: '2024-02-15',
                grand_total: 1000,
                outstanding_amount: 500
              }
            ]
          }
        });

        const result = await getOutstandingInvoices('CUST-001');

        expect(result.ok).toBe(true);
        expect(result.data?.outstanding_invoices).toHaveLength(1);

        expect(mockListDocuments).toHaveBeenCalledWith(
          'Sales Invoice',
          {
            docstatus: 1,
            outstanding_amount: ['>', 0],
            customer: 'CUST-001'
          },
          expect.any(Array)
        );
      });

      test('should filter by customer and company', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: { docs: [] }
        });

        const result = await getOutstandingInvoices('CUST-001', 'ACME Corp');

        expect(result.ok).toBe(true);
        expect(result.data?.outstanding_invoices).toHaveLength(0);

        expect(mockListDocuments).toHaveBeenCalledWith(
          'Sales Invoice',
          {
            docstatus: 1,
            outstanding_amount: ['>', 0],
            customer: 'CUST-001',
            company: 'ACME Corp'
          },
          expect.any(Array)
        );
      });

      test('should handle missing amounts with defaults', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              {
                name: 'SINV-001',
                customer: 'CUST-001',
                posting_date: '2024-01-15',
                due_date: '2024-02-15'
                // Missing grand_total and outstanding_amount
              }
            ]
          }
        });

        const result = await getOutstandingInvoices();

        expect(result.ok).toBe(true);
        expect(result.data?.outstanding_invoices).toHaveLength(1);
        expect(result.data?.outstanding_invoices[0].grand_total).toBe(0);
        expect(result.data?.outstanding_invoices[0].outstanding_amount).toBe(0);
      });
    });

    describe('Error Handling', () => {
      test('should handle listDocuments errors', async () => {
        mockListDocuments.mockResolvedValue({
          ok: false,
          error: { code: 'PERMISSION_ERROR', message: 'Access denied' }
        });

        const result = await getOutstandingInvoices();

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('PERMISSION_ERROR');
        expect(result.error?.message).toBe('Access denied');
      });
    });
  });

  describe('createExpenseClaim', () => {
    describe('Input Validation', () => {
      test('should fail when employee is missing', async () => {
        const result = await createExpenseClaim(
          '',
          'EMP-002',
          [{ expense_date: '2024-01-15', expense_type: 'Travel', amount: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Employee is required and must be a string');
      });

      test('should fail when expense_approver is missing', async () => {
        const result = await createExpenseClaim(
          'EMP-001',
          '',
          [{ expense_date: '2024-01-15', expense_type: 'Travel', amount: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Expense approver is required and must be a string');
      });

      test('should fail when expenses array is empty', async () => {
        const result = await createExpenseClaim('EMP-001', 'EMP-002', []);

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Expenses array is required and cannot be empty');
      });

      test('should fail when expense has invalid date', async () => {
        const result = await createExpenseClaim(
          'EMP-001',
          'EMP-002',
          [{ expense_date: 'invalid-date', expense_type: 'Travel', amount: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each expense must have a valid expense_date');
      });

      test('should fail when expense has invalid amount', async () => {
        const result = await createExpenseClaim(
          'EMP-001',
          'EMP-002',
          [{ expense_date: '2024-01-15', expense_type: 'Travel', amount: -100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each expense must have a valid positive amount');
      });
    });

    describe('Successful Operations', () => {
      test('should create expense claim with multiple expenses', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'EXP-00001' }
        });

        const expenses = [
          { expense_date: '2024-01-15', expense_type: 'Travel', amount: 150, description: 'Flight to client meeting' },
          { expense_date: '2024-01-16', expense_type: 'Meals', amount: 50 }
        ];

        const result = await createExpenseClaim('EMP-001', 'EMP-002', expenses);

        expect(result.ok).toBe(true);
        expect(result.data?.name).toBe('EXP-00001');
        expect(result.data?.employee).toBe('EMP-001');
        expect(result.data?.expense_approver).toBe('EMP-002');
        expect(result.data?.total_claimed_amount).toBe(200); // 150 + 50
        expect(result.data?.total_expenses).toBe(2);

        expect(mockCreateDocument).toHaveBeenCalledWith('Expense Claim', expect.objectContaining({
          employee: 'EMP-001',
          expense_approver: 'EMP-002',
          expenses,
          posting_date: expect.any(String)
        }));
      });

      test('should create expense claim with single expense without description', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'EXP-00001' }
        });

        const expenses = [
          { expense_date: '2024-01-15', expense_type: 'Office Supplies', amount: 75 }
        ];

        const result = await createExpenseClaim('EMP-001', 'EMP-002', expenses);

        expect(result.ok).toBe(true);
        expect(result.data?.total_claimed_amount).toBe(75);
        expect(result.data?.total_expenses).toBe(1);
      });
    });

    describe('Error Handling', () => {
      test('should handle createDocument errors', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'Employee not found' }
        });

        const result = await createExpenseClaim(
          'NONEXISTENT',
          'EMP-002',
          [{ expense_date: '2024-01-15', expense_type: 'Travel', amount: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('VALIDATION_ERROR');
        expect(result.error?.message).toBe('Employee not found');
      });

      test('should handle unexpected errors', async () => {
        mockCreateDocument.mockRejectedValue(new Error('Database timeout'));

        const result = await createExpenseClaim(
          'EMP-001',
          'EMP-002',
          [{ expense_date: '2024-01-15', expense_type: 'Travel', amount: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Database timeout');
      });
    });
  });
});