import { createLead, convertLeadToCustomer, createQuotation, createSalesOrder, getSalesPipeline } from '../src/packs/sales';
import { erpAuthenticator } from '../src/core/auth';
import { createDocument, updateDocument, listDocuments } from '../src/core/crud';
import { logger } from '../src/observability/logger';

// Mock dependencies
jest.mock('../src/core/auth');
jest.mock('../src/core/crud');
jest.mock('../src/observability/logger');

const mockErpAuthenticator = erpAuthenticator as jest.Mocked<typeof erpAuthenticator>;
const mockCreateDocument = createDocument as jest.MockedFunction<typeof createDocument>;
const mockUpdateDocument = updateDocument as jest.MockedFunction<typeof updateDocument>;
const mockListDocuments = listDocuments as jest.MockedFunction<typeof listDocuments>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Sales Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock responses
    mockErpAuthenticator.isAuthenticated.mockReturnValue(true);
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
  });

  describe('createLead', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        mockErpAuthenticator.isAuthenticated.mockReturnValue(false);

        const result = await createLead('John Doe', 'john@example.com', '+1234567890');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('AUTH_FAILED');
        expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      });

      test('should fail when lead_name is missing', async () => {
        const result = await createLead('', 'john@example.com', '+1234567890');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Lead name is required and must be a string');
      });

      test('should fail when lead_name is not string', async () => {
        const result = await createLead(null as any, 'john@example.com', '+1234567890');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Lead name is required and must be a string');
      });

      test('should fail when email_id is missing', async () => {
        const result = await createLead('John Doe', '', '+1234567890');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Email ID is required and must be a string');
      });

      test('should fail when email_id is invalid format', async () => {
        const result = await createLead('John Doe', 'invalid-email', '+1234567890');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Please provide a valid email address');
      });

      test('should fail when phone is missing', async () => {
        const result = await createLead('John Doe', 'john@example.com', '');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Phone is required and must be a string');
      });
    });

    describe('Successful Operations', () => {
      test('should create lead with required fields only', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'LEAD-00001' }
        });

        const result = await createLead('John Doe', 'john@example.com', '+1234567890');

        expect(result.ok).toBe(true);
        expect(result.data?.name).toBe('LEAD-00001');
        expect(result.data?.lead_name).toBe('John Doe');
        expect(result.data?.email_id).toBe('john@example.com');
        expect(result.data?.phone).toBe('+1234567890');
        expect(result.data?.status).toBe('Open');

        expect(mockCreateDocument).toHaveBeenCalledWith('Lead', {
          lead_name: 'John Doe',
          email_id: 'john@example.com',
          phone: '+1234567890',
          status: 'Open'
        });
      });

      test('should create lead with all optional fields', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'LEAD-00001' }
        });

        const result = await createLead(
          'John Doe',
          'john@example.com',
          '+1234567890',
          'Acme Corp',
          'Website',
          'Qualified'
        );

        expect(result.ok).toBe(true);
        expect(result.data?.company_name).toBe('Acme Corp');
        expect(result.data?.status).toBe('Qualified');

        expect(mockCreateDocument).toHaveBeenCalledWith('Lead', {
          lead_name: 'John Doe',
          email_id: 'john@example.com',
          phone: '+1234567890',
          status: 'Qualified',
          company_name: 'Acme Corp',
          source: 'Website'
        });
      });
    });

    describe('Error Handling', () => {
      test('should handle createDocument errors', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: false,
          error: { code: 'PERMISSION_ERROR', message: 'Insufficient permissions' }
        });

        const result = await createLead('John Doe', 'john@example.com', '+1234567890');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('PERMISSION_ERROR');
        expect(result.error?.message).toBe('Insufficient permissions');
      });

      test('should handle unexpected errors', async () => {
        mockCreateDocument.mockRejectedValue(new Error('Network timeout'));

        const result = await createLead('John Doe', 'john@example.com', '+1234567890');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Network timeout');
      });
    });
  });

  describe('convertLeadToCustomer', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        mockErpAuthenticator.isAuthenticated.mockReturnValue(false);

        const result = await convertLeadToCustomer('LEAD-00001');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('AUTH_FAILED');
        expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      });

      test('should fail when lead_name is missing', async () => {
        const result = await convertLeadToCustomer('');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Lead name is required and must be a string');
      });
    });

    describe('Successful Operations', () => {
      test('should convert lead to customer with defaults', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              { lead_name: 'John Doe', email_id: 'john@example.com', phone: '+1234567890' }
            ]
          }
        });

        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'CUST-00001' }
        });

        mockUpdateDocument.mockResolvedValue({ ok: true });

        const result = await convertLeadToCustomer('LEAD-00001');

        expect(result.ok).toBe(true);
        expect(result.data?.customer_name).toBe('CUST-00001');
        expect(result.data?.customer_type).toBe('Individual');
        expect(result.data?.lead_name).toBe('LEAD-00001');

        expect(mockCreateDocument).toHaveBeenCalledWith('Customer', {
          customer_name: 'John Doe',
          customer_type: 'Individual'
        });

        expect(mockUpdateDocument).toHaveBeenCalledWith('Lead', 'LEAD-00001', {
          status: 'Converted'
        });
      });

      test('should convert lead to customer with custom values', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              { lead_name: 'John Doe', email_id: 'john@example.com', phone: '+1234567890' }
            ]
          }
        });

        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'CUST-00001' }
        });

        mockUpdateDocument.mockResolvedValue({ ok: true });

        const result = await convertLeadToCustomer(
          'LEAD-00001',
          'Acme Corporation',
          'Company',
          'Corporate',
          'North America'
        );

        expect(result.ok).toBe(true);
        expect(result.data?.customer_type).toBe('Company');

        expect(mockCreateDocument).toHaveBeenCalledWith('Customer', {
          customer_name: 'Acme Corporation',
          customer_type: 'Company',
          customer_group: 'Corporate',
          territory: 'North America'
        });
      });
    });

    describe('Error Handling', () => {
      test('should fail when lead not found', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: { docs: [] }
        });

        const result = await convertLeadToCustomer('NONEXISTENT');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('NOT_FOUND');
        expect(result.error?.message).toBe('Lead not found');
      });

      test('should handle listDocuments errors', async () => {
        mockListDocuments.mockResolvedValue({
          ok: false,
          error: { code: 'PERMISSION_ERROR', message: 'Access denied' }
        });

        const result = await convertLeadToCustomer('LEAD-00001');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('NOT_FOUND');
        expect(result.error?.message).toBe('Lead not found');
      });

      test('should handle createDocument errors', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              { lead_name: 'John Doe', email_id: 'john@example.com' }
            ]
          }
        });

        mockCreateDocument.mockResolvedValue({
          ok: false,
          error: { code: 'DUPLICATE_ERROR', message: 'Customer already exists' }
        });

        const result = await convertLeadToCustomer('LEAD-00001');

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('DUPLICATE_ERROR');
        expect(result.error?.message).toBe('Customer already exists');
      });
    });
  });

  describe('createQuotation', () => {
    describe('Input Validation', () => {
      test('should fail when quotation_to is invalid', async () => {
        const result = await createQuotation(
          'Invalid' as any,
          'CUST-00001',
          [{ item_code: 'ITEM-001', qty: 1, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Quotation to must be either "Customer" or "Lead"');
      });

      test('should fail when party_name is missing', async () => {
        const result = await createQuotation(
          'Customer',
          '',
          [{ item_code: 'ITEM-001', qty: 1, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Party name is required and must be a string');
      });

      test('should fail when items array is empty', async () => {
        const result = await createQuotation('Customer', 'CUST-00001', []);

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Items array is required and cannot be empty');
      });

      test('should fail when item has invalid item_code', async () => {
        const result = await createQuotation(
          'Customer',
          'CUST-00001',
          [{ item_code: '', qty: 1, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each item must have a valid item_code string');
      });

      test('should fail when item has invalid qty', async () => {
        const result = await createQuotation(
          'Customer',
          'CUST-00001',
          [{ item_code: 'ITEM-001', qty: 0, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each item must have a valid positive quantity');
      });

      test('should fail when item has invalid rate', async () => {
        const result = await createQuotation(
          'Customer',
          'CUST-00001',
          [{ item_code: 'ITEM-001', qty: 1, rate: -100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each item must have a valid rate (>= 0)');
      });
    });

    describe('Successful Operations', () => {
      test('should create quotation for customer', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'QUO-00001' }
        });

        const items = [
          { item_code: 'ITEM-001', qty: 2, rate: 100 },
          { item_code: 'ITEM-002', qty: 1, rate: 200 }
        ];

        const result = await createQuotation('Customer', 'CUST-00001', items);

        expect(result.ok).toBe(true);
        expect(result.data?.name).toBe('QUO-00001');
        expect(result.data?.quotation_to).toBe('Customer');
        expect(result.data?.party_name).toBe('CUST-00001');
        expect(result.data?.grand_total).toBe(400); // (2*100) + (1*200)

        expect(mockCreateDocument).toHaveBeenCalledWith('Quotation', {
          quotation_to: 'Customer',
          party_name: 'CUST-00001',
          items
        });
      });

      test('should create quotation for lead with valid_till', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'QUO-00001' }
        });

        const items = [{ item_code: 'ITEM-001', qty: 1, rate: 100 }];

        const result = await createQuotation('Lead', 'LEAD-00001', items, '2024-12-31');

        expect(result.ok).toBe(true);
        expect(result.data?.quotation_to).toBe('Lead');

        expect(mockCreateDocument).toHaveBeenCalledWith('Quotation', {
          quotation_to: 'Lead',
          party_name: 'LEAD-00001',
          items,
          valid_till: '2024-12-31'
        });
      });
    });
  });

  describe('createSalesOrder', () => {
    describe('Input Validation', () => {
      test('should fail when customer is missing', async () => {
        const result = await createSalesOrder(
          '',
          '2024-12-31',
          [{ item_code: 'ITEM-001', qty: 1, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Customer is required and must be a string');
      });

      test('should fail when delivery_date is invalid', async () => {
        const result = await createSalesOrder(
          'CUST-00001',
          'invalid-date',
          [{ item_code: 'ITEM-001', qty: 1, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Delivery date must be a valid date string');
      });
    });

    describe('Successful Operations', () => {
      test('should create sales order', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'SO-00001' }
        });

        const items = [
          { item_code: 'ITEM-001', qty: 3, rate: 150 },
          { item_code: 'ITEM-002', qty: 2, rate: 250 }
        ];

        const result = await createSalesOrder('CUST-00001', '2024-12-31', items);

        expect(result.ok).toBe(true);
        expect(result.data?.name).toBe('SO-00001');
        expect(result.data?.customer).toBe('CUST-00001');
        expect(result.data?.delivery_date).toBe('2024-12-31');
        expect(result.data?.grand_total).toBe(950); // (3*150) + (2*250)

        expect(mockCreateDocument).toHaveBeenCalledWith('Sales Order', {
          customer: 'CUST-00001',
          delivery_date: '2024-12-31',
          items
        });
      });
    });
  });

  describe('getSalesPipeline', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        mockErpAuthenticator.isAuthenticated.mockReturnValue(false);

        const result = await getSalesPipeline();

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('AUTH_FAILED');
        expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      });
    });

    describe('Successful Operations', () => {
      test('should get sales pipeline with all data', async () => {
        mockListDocuments
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  name: 'LEAD-001',
                  lead_name: 'John Doe',
                  status: 'Open',
                  email_id: 'john@example.com',
                  creation: '2024-01-01'
                }
              ]
            }
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  name: 'OPP-001',
                  opportunity_from: 'Customer',
                  party_name: 'CUST-001',
                  status: 'Open',
                  expected_closing: '2024-06-30',
                  opportunity_amount: 50000
                }
              ]
            }
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  name: 'QUO-001',
                  party_name: 'CUST-001',
                  status: 'Open',
                  valid_till: '2024-03-31',
                  grand_total: 25000
                }
              ]
            }
          });

        const result = await getSalesPipeline();

        expect(result.ok).toBe(true);
        expect(result.data?.pipeline.leads).toHaveLength(1);
        expect(result.data?.pipeline.opportunities).toHaveLength(1);
        expect(result.data?.pipeline.quotations).toHaveLength(1);

        expect(result.data?.pipeline.leads[0]).toEqual({
          name: 'LEAD-001',
          lead_name: 'John Doe',
          status: 'Open',
          email_id: 'john@example.com',
          creation: '2024-01-01'
        });

        expect(result.data?.pipeline.opportunities[0]).toEqual({
          name: 'OPP-001',
          opportunity_from: 'Customer',
          party_name: 'CUST-001',
          status: 'Open',
          expected_closing: '2024-06-30',
          opportunity_amount: 50000
        });

        expect(result.data?.pipeline.quotations[0]).toEqual({
          name: 'QUO-001',
          party_name: 'CUST-001',
          status: 'Open',
          valid_till: '2024-03-31',
          grand_total: 25000
        });
      });

      test('should handle empty pipeline data', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: { docs: [] }
        });

        const result = await getSalesPipeline();

        expect(result.ok).toBe(true);
        expect(result.data?.pipeline.leads).toHaveLength(0);
        expect(result.data?.pipeline.opportunities).toHaveLength(0);
        expect(result.data?.pipeline.quotations).toHaveLength(0);
      });

      test('should handle missing amount/total values', async () => {
        mockListDocuments
          .mockResolvedValueOnce({
            ok: true,
            data: { docs: [] }
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  name: 'OPP-001',
                  opportunity_from: 'Lead',
                  party_name: 'LEAD-001',
                  status: 'Qualified'
                  // missing opportunity_amount and expected_closing
                }
              ]
            }
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  name: 'QUO-001',
                  party_name: 'CUST-001',
                  status: 'Submitted'
                  // missing grand_total and valid_till
                }
              ]
            }
          });

        const result = await getSalesPipeline();

        expect(result.ok).toBe(true);
        expect(result.data?.pipeline.opportunities[0].opportunity_amount).toBe(0);
        expect(result.data?.pipeline.quotations[0].grand_total).toBe(0);
      });
    });

    describe('Error Handling', () => {
      test('should handle listDocuments errors gracefully', async () => {
        mockListDocuments
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ ok: true, data: { docs: [] } })
          .mockResolvedValueOnce({ ok: true, data: { docs: [] } });

        const result = await getSalesPipeline();

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Network error');
      });
    });
  });
});