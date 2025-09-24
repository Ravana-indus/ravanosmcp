import { createPurchaseRequest, createPurchaseOrder, receivePurchaseOrder } from '../src/packs/purchase';
import { erpAuthenticator } from '../src/core/auth';
import { createDocument } from '../src/core/crud';
import { logger } from '../src/observability/logger';

// Mock dependencies
jest.mock('../src/core/auth');
jest.mock('../src/core/crud');
jest.mock('../src/observability/logger');

const mockErpAuthenticator = erpAuthenticator as jest.Mocked<typeof erpAuthenticator>;
const mockCreateDocument = createDocument as jest.MockedFunction<typeof createDocument>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Purchase Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock responses
    mockErpAuthenticator.isAuthenticated.mockReturnValue(true);
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
  });

  describe('createPurchaseRequest', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        mockErpAuthenticator.isAuthenticated.mockReturnValue(false);

        const result = await createPurchaseRequest(
          'ACME Corp',
          '2024-01-15',
          [{ item_code: 'ITEM-001', qty: 10 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('AUTH_FAILED');
        expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      });

      test('should fail when company is missing', async () => {
        const result = await createPurchaseRequest(
          '',
          '2024-01-15',
          [{ item_code: 'ITEM-001', qty: 10 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Company is required and must be a string');
      });

      test('should fail when transaction_date is invalid', async () => {
        const result = await createPurchaseRequest(
          'ACME Corp',
          'invalid-date',
          [{ item_code: 'ITEM-001', qty: 10 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Transaction date must be a valid date string');
      });

      test('should fail when items array is empty', async () => {
        const result = await createPurchaseRequest('ACME Corp', '2024-01-15', []);

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Items array is required and cannot be empty');
      });

      test('should fail when item has invalid item_code', async () => {
        const result = await createPurchaseRequest(
          'ACME Corp',
          '2024-01-15',
          [{ item_code: '', qty: 10 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each item must have a valid item_code string');
      });

      test('should fail when item has invalid qty', async () => {
        const result = await createPurchaseRequest(
          'ACME Corp',
          '2024-01-15',
          [{ item_code: 'ITEM-001', qty: 0 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each item must have a valid positive quantity');
      });

      test('should fail when required_by date is invalid', async () => {
        const result = await createPurchaseRequest(
          'ACME Corp',
          '2024-01-15',
          [{ item_code: 'ITEM-001', qty: 10 }],
          'High',
          'invalid-date'
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Required by date must be a valid date string');
      });
    });

    describe('Successful Operations', () => {
      test('should create purchase request with required fields only', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'PR-00001' }
        });

        const items = [
          { item_code: 'ITEM-001', qty: 10 },
          { item_code: 'ITEM-002', qty: 5 }
        ];

        const result = await createPurchaseRequest('ACME Corp', '2024-01-15', items);

        expect(result.ok).toBe(true);
        expect(result.data?.name).toBe('PR-00001');
        expect(result.data?.company).toBe('ACME Corp');
        expect(result.data?.transaction_date).toBe('2024-01-15');
        expect(result.data?.priority).toBe('Medium');
        expect(result.data?.total_items).toBe(2);

        expect(mockCreateDocument).toHaveBeenCalledWith('Purchase Request', {
          company: 'ACME Corp',
          transaction_date: '2024-01-15',
          items,
          priority: 'Medium'
        });
      });

      test('should create purchase request with all optional fields', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'PR-00001' }
        });

        const items = [{ item_code: 'ITEM-001', qty: 10, warehouse: 'WH-001' }];

        const result = await createPurchaseRequest(
          'ACME Corp',
          '2024-01-15',
          items,
          'High',
          '2024-01-31'
        );

        expect(result.ok).toBe(true);
        expect(result.data?.priority).toBe('High');

        expect(mockCreateDocument).toHaveBeenCalledWith('Purchase Request', {
          company: 'ACME Corp',
          transaction_date: '2024-01-15',
          items,
          priority: 'High',
          required_by: '2024-01-31'
        });
      });
    });

    describe('Error Handling', () => {
      test('should handle createDocument errors', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: false,
          error: { code: 'PERMISSION_ERROR', message: 'Insufficient permissions' }
        });

        const result = await createPurchaseRequest(
          'ACME Corp',
          '2024-01-15',
          [{ item_code: 'ITEM-001', qty: 10 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('PERMISSION_ERROR');
        expect(result.error?.message).toBe('Insufficient permissions');
      });

      test('should handle unexpected errors', async () => {
        mockCreateDocument.mockRejectedValue(new Error('Network timeout'));

        const result = await createPurchaseRequest(
          'ACME Corp',
          '2024-01-15',
          [{ item_code: 'ITEM-001', qty: 10 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Network timeout');
      });
    });
  });

  describe('createPurchaseOrder', () => {
    describe('Input Validation', () => {
      test('should fail when supplier is missing', async () => {
        const result = await createPurchaseOrder(
          '',
          'ACME Corp',
          '2024-01-15',
          [{ item_code: 'ITEM-001', qty: 10, rate: 100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Supplier is required and must be a string');
      });

      test('should fail when item has invalid rate', async () => {
        const result = await createPurchaseOrder(
          'SUPP-001',
          'ACME Corp',
          '2024-01-15',
          [{ item_code: 'ITEM-001', qty: 10, rate: -100 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each item must have a valid rate (>= 0)');
      });

      test('should fail when delivery_date is invalid', async () => {
        const result = await createPurchaseOrder(
          'SUPP-001',
          'ACME Corp',
          '2024-01-15',
          [{ item_code: 'ITEM-001', qty: 10, rate: 100 }],
          'invalid-date'
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Delivery date must be a valid date string');
      });
    });

    describe('Successful Operations', () => {
      test('should create purchase order with grand total calculation', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'PO-00001' }
        });

        const items = [
          { item_code: 'ITEM-001', qty: 10, rate: 150 },
          { item_code: 'ITEM-002', qty: 5, rate: 200 }
        ];

        const result = await createPurchaseOrder(
          'SUPP-001',
          'ACME Corp',
          '2024-01-15',
          items
        );

        expect(result.ok).toBe(true);
        expect(result.data?.name).toBe('PO-00001');
        expect(result.data?.supplier).toBe('SUPP-001');
        expect(result.data?.company).toBe('ACME Corp');
        expect(result.data?.grand_total).toBe(2500); // (10*150) + (5*200)

        expect(mockCreateDocument).toHaveBeenCalledWith('Purchase Order', {
          supplier: 'SUPP-001',
          company: 'ACME Corp',
          transaction_date: '2024-01-15',
          items
        });
      });

      test('should create purchase order with delivery date and terms', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'PO-00001' }
        });

        const items = [{ item_code: 'ITEM-001', qty: 10, rate: 100 }];

        const result = await createPurchaseOrder(
          'SUPP-001',
          'ACME Corp',
          '2024-01-15',
          items,
          '2024-02-15',
          'Net 30 days'
        );

        expect(result.ok).toBe(true);

        expect(mockCreateDocument).toHaveBeenCalledWith('Purchase Order', {
          supplier: 'SUPP-001',
          company: 'ACME Corp',
          transaction_date: '2024-01-15',
          items,
          delivery_date: '2024-02-15',
          terms: 'Net 30 days'
        });
      });
    });
  });

  describe('receivePurchaseOrder', () => {
    describe('Input Validation', () => {
      test('should fail when supplier is missing', async () => {
        const result = await receivePurchaseOrder(
          '',
          'PO-00001',
          [{ item_code: 'ITEM-001', qty: 10, received_qty: 10 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Supplier is required and must be a string');
      });

      test('should fail when purchase_order is missing', async () => {
        const result = await receivePurchaseOrder(
          'SUPP-001',
          '',
          [{ item_code: 'ITEM-001', qty: 10, received_qty: 10 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Purchase order is required and must be a string');
      });

      test('should fail when received_qty is negative', async () => {
        const result = await receivePurchaseOrder(
          'SUPP-001',
          'PO-00001',
          [{ item_code: 'ITEM-001', qty: 10, received_qty: -5 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each item must have a valid received quantity (>= 0)');
      });

      test('should fail when received_qty exceeds ordered qty', async () => {
        const result = await receivePurchaseOrder(
          'SUPP-001',
          'PO-00001',
          [{ item_code: 'ITEM-001', qty: 10, received_qty: 15 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Received quantity (15) cannot exceed ordered quantity (10) for item ITEM-001');
      });

      test('should fail when ordered qty is invalid', async () => {
        const result = await receivePurchaseOrder(
          'SUPP-001',
          'PO-00001',
          [{ item_code: 'ITEM-001', qty: 0, received_qty: 0 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Each item must have a valid positive ordered quantity');
      });
    });

    describe('Successful Operations', () => {
      test('should receive purchase order with valid quantities', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'PR-00001' }
        });

        const items = [
          { item_code: 'ITEM-001', qty: 10, received_qty: 10 },
          { item_code: 'ITEM-002', qty: 5, received_qty: 3 }
        ];

        const result = await receivePurchaseOrder('SUPP-001', 'PO-00001', items);

        expect(result.ok).toBe(true);
        expect(result.data?.name).toBe('PR-00001');
        expect(result.data?.supplier).toBe('SUPP-001');
        expect(result.data?.purchase_order).toBe('PO-00001');
        expect(result.data?.total_received_items).toBe(2);

        expect(mockCreateDocument).toHaveBeenCalledWith('Purchase Receipt', {
          supplier: 'SUPP-001',
          purchase_order: 'PO-00001',
          items
        });
      });

      test('should allow zero received quantity', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'PR-00001' }
        });

        const items = [{ item_code: 'ITEM-001', qty: 10, received_qty: 0 }];

        const result = await receivePurchaseOrder('SUPP-001', 'PO-00001', items);

        expect(result.ok).toBe(true);
        expect(mockCreateDocument).toHaveBeenCalledWith('Purchase Receipt', {
          supplier: 'SUPP-001',
          purchase_order: 'PO-00001',
          items
        });
      });

      test('should allow partial receipt', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: true,
          data: { name: 'PR-00001' }
        });

        const items = [{ item_code: 'ITEM-001', qty: 10, received_qty: 7 }];

        const result = await receivePurchaseOrder('SUPP-001', 'PO-00001', items);

        expect(result.ok).toBe(true);
      });
    });

    describe('Error Handling', () => {
      test('should handle createDocument errors', async () => {
        mockCreateDocument.mockResolvedValue({
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Purchase order not found' }
        });

        const result = await receivePurchaseOrder(
          'SUPP-001',
          'NONEXISTENT',
          [{ item_code: 'ITEM-001', qty: 10, received_qty: 10 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('NOT_FOUND');
        expect(result.error?.message).toBe('Purchase order not found');
      });

      test('should handle unexpected errors', async () => {
        mockCreateDocument.mockRejectedValue(new Error('Database connection failed'));

        const result = await receivePurchaseOrder(
          'SUPP-001',
          'PO-00001',
          [{ item_code: 'ITEM-001', qty: 10, received_qty: 10 }]
        );

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Database connection failed');
      });
    });
  });
});