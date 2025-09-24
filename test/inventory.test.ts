import { getStockLevels, getLowStockItems } from '../src/packs/inventory';
import { erpAuthenticator } from '../src/core/auth';
import { listDocuments } from '../src/core/crud';
import { logger } from '../src/observability/logger';

// Mock dependencies
jest.mock('../src/core/auth');
jest.mock('../src/core/crud');
jest.mock('../src/observability/logger');

const mockErpAuthenticator = erpAuthenticator as jest.Mocked<typeof erpAuthenticator>;
const mockListDocuments = listDocuments as jest.MockedFunction<typeof listDocuments>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Inventory Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock responses
    mockErpAuthenticator.isAuthenticated.mockReturnValue(true);
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.warn = jest.fn();
  });

  describe('getStockLevels', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        mockErpAuthenticator.isAuthenticated.mockReturnValue(false);

        const result = await getStockLevels();

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('AUTH_FAILED');
        expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      });
    });

    describe('Successful Operations', () => {
      test('should get all stock levels', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              {
                item_code: 'ITEM-001',
                warehouse: 'WH-001',
                actual_qty: 100,
                qty_after_transaction: 100,
                posting_date: '2024-01-15'
              },
              {
                item_code: 'ITEM-002',
                warehouse: 'WH-001',
                actual_qty: 50,
                qty_after_transaction: 50,
                posting_date: '2024-01-15'
              }
            ]
          }
        });

        const result = await getStockLevels();

        expect(result.ok).toBe(true);
        expect(result.data?.stock_levels).toHaveLength(2);
        expect(result.data?.stock_levels[0]).toEqual({
          item_code: 'ITEM-001',
          warehouse: 'WH-001',
          actual_qty: 100,
          qty_after_transaction: 100
        });

        expect(mockListDocuments).toHaveBeenCalledWith(
          'Stock Ledger Entry',
          {},
          ['item_code', 'warehouse', 'actual_qty', 'qty_after_transaction']
        );
      });

      test('should filter by warehouse', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              {
                item_code: 'ITEM-001',
                warehouse: 'WH-001',
                actual_qty: 100,
                qty_after_transaction: 100,
                posting_date: '2024-01-15'
              }
            ]
          }
        });

        const result = await getStockLevels('WH-001');

        expect(result.ok).toBe(true);
        expect(result.data?.stock_levels).toHaveLength(1);

        expect(mockListDocuments).toHaveBeenCalledWith(
          'Stock Ledger Entry',
          { warehouse: 'WH-001' },
          ['item_code', 'warehouse', 'actual_qty', 'qty_after_transaction']
        );
      });

      test('should filter by item_code', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              {
                item_code: 'ITEM-001',
                warehouse: 'WH-001',
                actual_qty: 100,
                qty_after_transaction: 100,
                posting_date: '2024-01-15'
              }
            ]
          }
        });

        const result = await getStockLevels(undefined, 'ITEM-001');

        expect(result.ok).toBe(true);

        expect(mockListDocuments).toHaveBeenCalledWith(
          'Stock Ledger Entry',
          { item_code: 'ITEM-001' },
          ['item_code', 'warehouse', 'actual_qty', 'qty_after_transaction']
        );
      });

      test('should filter by both warehouse and item_code', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              {
                item_code: 'ITEM-001',
                warehouse: 'WH-001',
                actual_qty: 100,
                qty_after_transaction: 100,
                posting_date: '2024-01-15'
              }
            ]
          }
        });

        const result = await getStockLevels('WH-001', 'ITEM-001');

        expect(result.ok).toBe(true);

        expect(mockListDocuments).toHaveBeenCalledWith(
          'Stock Ledger Entry',
          { warehouse: 'WH-001', item_code: 'ITEM-001' },
          ['item_code', 'warehouse', 'actual_qty', 'qty_after_transaction']
        );
      });

      test('should handle empty stock levels', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: { docs: [] }
        });

        const result = await getStockLevels();

        expect(result.ok).toBe(true);
        expect(result.data?.stock_levels).toHaveLength(0);
      });

      test('should use latest stock entry when multiple entries exist for same item-warehouse', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              {
                item_code: 'ITEM-001',
                warehouse: 'WH-001',
                actual_qty: 50,
                qty_after_transaction: 50,
                posting_date: '2024-01-10'
              },
              {
                item_code: 'ITEM-001',
                warehouse: 'WH-001',
                actual_qty: 100,
                qty_after_transaction: 100,
                posting_date: '2024-01-15'
              }
            ]
          }
        });

        const result = await getStockLevels();

        expect(result.ok).toBe(true);
        expect(result.data?.stock_levels).toHaveLength(1);
        expect(result.data?.stock_levels[0].actual_qty).toBe(100); // Latest entry
      });

      test('should handle missing quantities with defaults', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: {
            docs: [
              {
                item_code: 'ITEM-001',
                warehouse: 'WH-001',
                posting_date: '2024-01-15'
                // Missing actual_qty and qty_after_transaction
              }
            ]
          }
        });

        const result = await getStockLevels();

        expect(result.ok).toBe(true);
        expect(result.data?.stock_levels).toHaveLength(1);
        expect(result.data?.stock_levels[0]).toEqual({
          item_code: 'ITEM-001',
          warehouse: 'WH-001',
          actual_qty: 0,
          qty_after_transaction: 0
        });
      });
    });

    describe('Error Handling', () => {
      test('should handle listDocuments errors', async () => {
        mockListDocuments.mockResolvedValue({
          ok: false,
          error: { code: 'PERMISSION_ERROR', message: 'Access denied' }
        });

        const result = await getStockLevels();

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('PERMISSION_ERROR');
        expect(result.error?.message).toBe('Access denied');
      });

      test('should handle unexpected errors', async () => {
        mockListDocuments.mockRejectedValue(new Error('Database connection lost'));

        const result = await getStockLevels();

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('Database connection lost');
      });
    });
  });

  describe('getLowStockItems', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        mockErpAuthenticator.isAuthenticated.mockReturnValue(false);

        const result = await getLowStockItems();

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('AUTH_FAILED');
        expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      });
    });

    describe('Successful Operations', () => {
      test('should get low stock items with reorder settings', async () => {
        // Mock items with reorder settings
        mockListDocuments
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  item_code: 'ITEM-001',
                  item_name: 'Test Item 1',
                  reorder_level: 20,
                  reorder_qty: 100,
                  min_order_qty: 50
                },
                {
                  item_code: 'ITEM-002',
                  item_name: 'Test Item 2',
                  reorder_level: 10,
                  reorder_qty: 50,
                  min_order_qty: 25
                }
              ]
            }
          })
          // Mock stock entries for ITEM-001 (low stock)
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  warehouse: 'WH-001',
                  qty_after_transaction: 5, // Below reorder level of 20
                  posting_date: '2024-01-15'
                }
              ]
            }
          })
          // Mock stock entries for ITEM-002 (sufficient stock)
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  warehouse: 'WH-001',
                  qty_after_transaction: 30, // Above reorder level of 10
                  posting_date: '2024-01-15'
                }
              ]
            }
          });

        const result = await getLowStockItems();

        expect(result.ok).toBe(true);
        expect(result.data?.low_stock_items).toHaveLength(1);
        expect(result.data?.low_stock_items[0]).toEqual({
          item_code: 'ITEM-001',
          item_name: 'Test Item 1',
          current_stock: 5,
          reorder_level: 20,
          reorder_qty: 100,
          min_order_qty: 50,
          warehouse: 'WH-001',
          status: 'Below Reorder Level'
        });
      });

      test('should identify critical stock items (zero or negative stock)', async () => {
        mockListDocuments
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  item_code: 'ITEM-001',
                  item_name: 'Test Item 1',
                  reorder_level: 10,
                  reorder_qty: 50,
                  min_order_qty: 25
                }
              ]
            }
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  warehouse: 'WH-001',
                  qty_after_transaction: 0, // Critical stock
                  posting_date: '2024-01-15'
                }
              ]
            }
          });

        const result = await getLowStockItems();

        expect(result.ok).toBe(true);
        expect(result.data?.low_stock_items).toHaveLength(1);
        expect(result.data?.low_stock_items[0].status).toBe('Critical Stock');
        expect(result.data?.low_stock_items[0].current_stock).toBe(0);
      });

      test('should filter by warehouse', async () => {
        mockListDocuments
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  item_code: 'ITEM-001',
                  item_name: 'Test Item 1',
                  reorder_level: 10,
                  reorder_qty: 50,
                  min_order_qty: 25
                }
              ]
            }
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  warehouse: 'WH-001',
                  qty_after_transaction: 5,
                  posting_date: '2024-01-15'
                },
                {
                  warehouse: 'WH-002',
                  qty_after_transaction: 3,
                  posting_date: '2024-01-15'
                }
              ]
            }
          });

        const result = await getLowStockItems('WH-001');

        expect(result.ok).toBe(true);
        expect(result.data?.low_stock_items).toHaveLength(1);
        expect(result.data?.low_stock_items[0].warehouse).toBe('WH-001');

        // Should have been called with warehouse filter for stock ledger
        expect(mockListDocuments).toHaveBeenCalledWith(
          'Stock Ledger Entry',
          { item_code: 'ITEM-001', warehouse: 'WH-001' },
          ['warehouse', 'qty_after_transaction', 'posting_date']
        );
      });

      test('should skip items without reorder settings', async () => {
        mockListDocuments.mockResolvedValueOnce({
          ok: true,
          data: {
            docs: [
              {
                item_code: 'ITEM-001',
                item_name: 'Test Item 1',
                reorder_level: 0 // No reorder level set
              },
              {
                item_code: 'ITEM-002',
                item_name: 'Test Item 2'
                // Missing reorder_level
              }
            ]
          }
        });

        const result = await getLowStockItems();

        expect(result.ok).toBe(true);
        expect(result.data?.low_stock_items).toHaveLength(0);
      });

      test('should handle empty items list', async () => {
        mockListDocuments.mockResolvedValue({
          ok: true,
          data: { docs: [] }
        });

        const result = await getLowStockItems();

        expect(result.ok).toBe(true);
        expect(result.data?.low_stock_items).toHaveLength(0);
      });

      test('should handle missing item names with defaults', async () => {
        mockListDocuments
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  item_code: 'ITEM-001',
                  // Missing item_name
                  reorder_level: 10,
                  reorder_qty: 50,
                  min_order_qty: 25
                }
              ]
            }
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  warehouse: 'WH-001',
                  qty_after_transaction: 5,
                  posting_date: '2024-01-15'
                }
              ]
            }
          });

        const result = await getLowStockItems();

        expect(result.ok).toBe(true);
        expect(result.data?.low_stock_items).toHaveLength(1);
        expect(result.data?.low_stock_items[0].item_name).toBe('ITEM-001'); // Defaults to item_code
      });

      test('should handle missing reorder quantities with defaults', async () => {
        mockListDocuments
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  item_code: 'ITEM-001',
                  item_name: 'Test Item 1',
                  reorder_level: 10
                  // Missing reorder_qty and min_order_qty
                }
              ]
            }
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  warehouse: 'WH-001',
                  qty_after_transaction: 5,
                  posting_date: '2024-01-15'
                }
              ]
            }
          });

        const result = await getLowStockItems();

        expect(result.ok).toBe(true);
        expect(result.data?.low_stock_items).toHaveLength(1);
        expect(result.data?.low_stock_items[0].reorder_qty).toBe(0);
        expect(result.data?.low_stock_items[0].min_order_qty).toBe(0);
      });

      test('should handle stock lookup failures gracefully', async () => {
        mockListDocuments
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                {
                  item_code: 'ITEM-001',
                  item_name: 'Test Item 1',
                  reorder_level: 10,
                  reorder_qty: 50,
                  min_order_qty: 25
                }
              ]
            }
          })
          .mockRejectedValueOnce(new Error('Stock data not available'));

        const result = await getLowStockItems();

        expect(result.ok).toBe(true);
        expect(result.data?.low_stock_items).toHaveLength(0);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Failed to get stock for item ITEM-001',
          { error: 'Stock data not available' }
        );
      });
    });

    describe('Error Handling', () => {
      test('should handle listDocuments errors', async () => {
        mockListDocuments.mockResolvedValue({
          ok: false,
          error: { code: 'PERMISSION_ERROR', message: 'Access denied' }
        });

        const result = await getLowStockItems();

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('PERMISSION_ERROR');
        expect(result.error?.message).toBe('Access denied');
      });

      test('should handle unexpected errors', async () => {
        mockListDocuments.mockRejectedValue(new Error('System error'));

        const result = await getLowStockItems();

        expect(result.ok).toBe(false);
        expect(result.error?.code).toBe('FIELD_ERROR');
        expect(result.error?.message).toBe('System error');
      });
    });
  });
});