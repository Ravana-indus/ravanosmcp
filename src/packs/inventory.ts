import { erpAuthenticator } from '../core/auth';
import { listDocuments } from '../core/crud';
import { logger, redactSensitiveData } from '../observability/logger';

export interface GetStockLevelsRequest {
  warehouse?: string;
  item_code?: string;
}

export interface GetStockLevelsResponse {
  ok: boolean;
  data?: {
    stock_levels: Array<{
      item_code: string;
      item_name?: string;
      warehouse: string;
      actual_qty: number;
      qty_after_transaction: number;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface GetLowStockItemsRequest {
  warehouse?: string;
  threshold_days?: number;
}

export interface GetLowStockItemsResponse {
  ok: boolean;
  data?: {
    low_stock_items: Array<{
      item_code: string;
      item_name: string;
      current_stock: number;
      reorder_level: number;
      reorder_qty: number;
      min_order_qty: number;
      warehouse?: string;
      status: 'Below Reorder Level' | 'Critical Stock';
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function getStockLevels(
  warehouse?: string,
  item_code?: string
): Promise<GetStockLevelsResponse> {
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

    logger.info('Stock levels requested', redactSensitiveData({
      warehouse: warehouse || 'all',
      item_code: item_code || 'all'
    }));

    // Build filters for Stock Ledger Entry
    const filters: any = {};

    if (warehouse) {
      filters.warehouse = warehouse;
    }

    if (item_code) {
      filters.item_code = item_code;
    }

    // Get stock ledger entries
    const result = await listDocuments(
      'Stock Ledger Entry',
      filters,
      ['item_code', 'warehouse', 'actual_qty', 'qty_after_transaction']
    );

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    // Process stock levels - group by item_code and warehouse to get latest quantities
    const stockMap = new Map<string, any>();

    (result.data?.docs || []).forEach((entry: any) => {
      const key = `${entry.item_code}:${entry.warehouse}`;
      const existing = stockMap.get(key);

      if (!existing || new Date(entry.posting_date || '1900-01-01') > new Date(existing.posting_date || '1900-01-01')) {
        stockMap.set(key, {
          item_code: entry.item_code,
          warehouse: entry.warehouse,
          actual_qty: entry.actual_qty || 0,
          qty_after_transaction: entry.qty_after_transaction || 0,
          posting_date: entry.posting_date
        });
      }
    });

    const stock_levels = Array.from(stockMap.values()).map((entry: any) => ({
      item_code: entry.item_code,
      warehouse: entry.warehouse,
      actual_qty: entry.actual_qty,
      qty_after_transaction: entry.qty_after_transaction
    }));

    logger.info('Stock levels retrieved', {
      stock_levels_count: stock_levels.length
    });

    return {
      ok: true,
      data: {
        stock_levels
      }
    };

  } catch (error: any) {
    logger.error('Failed to get stock levels', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to get stock levels'
      }
    };
  }
}

export async function getLowStockItems(
  warehouse?: string,
  threshold_days?: number
): Promise<GetLowStockItemsResponse> {
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

    logger.info('Low stock items requested', redactSensitiveData({
      warehouse: warehouse || 'all',
      threshold_days: threshold_days || 'default'
    }));

    // First, get items with reorder settings
    const itemsResult = await listDocuments(
      'Item',
      { is_stock_item: 1 },
      ['item_code', 'item_name', 'reorder_level', 'reorder_qty', 'min_order_qty']
    );

    if (!itemsResult.ok) {
      return {
        ok: false,
        error: itemsResult.error
      };
    }

    const items = itemsResult.data?.docs || [];
    const low_stock_items: any[] = [];

    // For each item, get current stock levels
    for (const item of items) {
      if (!item.reorder_level || item.reorder_level <= 0) {
        continue; // Skip items without reorder settings
      }

      // Build filters for stock ledger
      const stockFilters: any = {
        item_code: item.item_code
      };

      if (warehouse) {
        stockFilters.warehouse = warehouse;
      }

      try {
        const stockResult = await listDocuments(
          'Stock Ledger Entry',
          stockFilters,
          ['warehouse', 'qty_after_transaction', 'posting_date']
        );

        if (stockResult.ok && stockResult.data?.docs) {
          // Get latest stock for each warehouse
          const warehouseStocks = new Map<string, number>();

          stockResult.data.docs.forEach((entry: any) => {
            const existing = warehouseStocks.get(entry.warehouse);
            if (!existing || new Date(entry.posting_date || '1900-01-01') > new Date(entry.posting_date || '1900-01-01')) {
              warehouseStocks.set(entry.warehouse, entry.qty_after_transaction || 0);
            }
          });

          // Check each warehouse stock against reorder level
          for (const [wh, currentStock] of warehouseStocks.entries()) {
            if (warehouse && wh !== warehouse) {
              continue; // Skip if specific warehouse requested
            }

            let status: 'Below Reorder Level' | 'Critical Stock' = 'Below Reorder Level';

            if (currentStock <= 0) {
              status = 'Critical Stock';
            } else if (currentStock <= item.reorder_level) {
              status = 'Below Reorder Level';
            } else {
              continue; // Stock is above reorder level, skip
            }

            low_stock_items.push({
              item_code: item.item_code,
              item_name: item.item_name || item.item_code,
              current_stock: currentStock,
              reorder_level: item.reorder_level || 0,
              reorder_qty: item.reorder_qty || 0,
              min_order_qty: item.min_order_qty || 0,
              warehouse: wh,
              status
            });
          }
        }
      } catch (error) {
        // Continue with other items if one fails
        logger.warn(`Failed to get stock for item ${item.item_code}`, { error: (error as Error).message });
      }
    }

    logger.info('Low stock items retrieved', {
      low_stock_count: low_stock_items.length
    });

    return {
      ok: true,
      data: {
        low_stock_items
      }
    };

  } catch (error: any) {
    logger.error('Failed to get low stock items', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to get low stock items'
      }
    };
  }
}