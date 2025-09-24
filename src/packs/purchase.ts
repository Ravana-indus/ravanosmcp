import { erpAuthenticator } from '../core/auth';
import { createDocument, listDocuments } from '../core/crud';
import { logger, redactSensitiveData } from '../observability/logger';

// Helper function to check if a doctype is available
async function checkDoctypeAvailability(doctype: string): Promise<{ available: boolean; error?: string }> {
  try {
    const testResult = await listDocuments(doctype, {}, [], 1);
    return { available: testResult.ok };
  } catch (error: any) {
    return {
      available: false,
      error: error.message || `Doctype ${doctype} is not available in this ERPNext instance`
    };
  }
}

export interface CreatePurchaseRequestRequest {
  company: string;
  transaction_date: string;
  items: Array<{
    item_code: string;
    qty: number;
    warehouse?: string;
  }>;
  priority?: string;
  required_by?: string;
}

export interface CreatePurchaseRequestResponse {
  ok: boolean;
  data?: {
    name: string;
    company: string;
    transaction_date: string;
    priority: string;
    total_items: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CreatePurchaseOrderRequest {
  supplier: string;
  company: string;
  transaction_date: string;
  items: Array<{
    item_code: string;
    qty: number;
    rate: number;
  }>;
  delivery_date?: string;
  terms?: string;
}

export interface CreatePurchaseOrderResponse {
  ok: boolean;
  data?: {
    name: string;
    supplier: string;
    company: string;
    transaction_date: string;
    grand_total: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ReceivePurchaseOrderRequest {
  supplier: string;
  purchase_order: string;
  items: Array<{
    item_code: string;
    qty: number;
    received_qty: number;
  }>;
}

export interface ReceivePurchaseOrderResponse {
  ok: boolean;
  data?: {
    name: string;
    supplier: string;
    purchase_order: string;
    total_received_items: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function createPurchaseRequest(
  company: string,
  transaction_date: string,
  items: Array<{ item_code: string; qty: number; warehouse?: string }>,
  priority?: string,
  required_by?: string
): Promise<CreatePurchaseRequestResponse> {
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

    // Input validation
    if (!company || typeof company !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Company is required and must be a string'
        }
      };
    }

    if (!transaction_date || typeof transaction_date !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Transaction date is required and must be a string'
        }
      };
    }

    // Validate transaction date format
    const dateObj = new Date(transaction_date);
    if (isNaN(dateObj.getTime())) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Transaction date must be a valid date string'
        }
      };
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Items array is required and cannot be empty'
        }
      };
    }

    // Validate items
    for (const item of items) {
      if (!item.item_code || typeof item.item_code !== 'string') {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each item must have a valid item_code string'
          }
        };
      }

      if (typeof item.qty !== 'number' || item.qty <= 0) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each item must have a valid positive quantity'
          }
        };
      }
    }

    // Validate required_by date if provided
    if (required_by) {
      const requiredByDate = new Date(required_by);
      if (isNaN(requiredByDate.getTime())) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Required by date must be a valid date string'
          }
        };
      }
    }

    logger.info('Purchase request creation requested', redactSensitiveData({
      company,
      transaction_date,
      items_count: items.length,
      priority: priority || 'Medium'
    }));

    // Check if Purchase Request doctype is available
    const doctypeCheck = await checkDoctypeAvailability('Purchase Request');
    if (!doctypeCheck.available) {
      return {
        ok: false,
        error: {
          code: 'DOCTYPE_NOT_AVAILABLE',
          message: 'Purchase Request doctype is not available in this ERPNext instance. This may be a demo server limitation or the purchase module is not installed.'
        }
      };
    }

    // Create Purchase Request document
    const purchaseRequestDoc = {
      company,
      transaction_date,
      items,
      priority: priority || 'Medium',
      ...(required_by && { required_by })
    };

    const result = await createDocument('Purchase Request', purchaseRequestDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    logger.info('Purchase request created successfully', {
      purchase_request_name: result.data?.name,
      company,
      items_count: items.length
    });

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        company,
        transaction_date,
        priority: priority || 'Medium',
        total_items: items.length
      }
    };

  } catch (error: any) {
    logger.error('Failed to create purchase request', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to create purchase request'
      }
    };
  }
}

export async function createPurchaseOrder(
  supplier: string,
  company: string,
  transaction_date: string,
  items: Array<{ item_code: string; qty: number; rate: number }>,
  delivery_date?: string,
  terms?: string
): Promise<CreatePurchaseOrderResponse> {
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

    // Input validation
    if (!supplier || typeof supplier !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Supplier is required and must be a string'
        }
      };
    }

    if (!company || typeof company !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Company is required and must be a string'
        }
      };
    }

    if (!transaction_date || typeof transaction_date !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Transaction date is required and must be a string'
        }
      };
    }

    // Validate transaction date format
    const dateObj = new Date(transaction_date);
    if (isNaN(dateObj.getTime())) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Transaction date must be a valid date string'
        }
      };
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Items array is required and cannot be empty'
        }
      };
    }

    // Validate items
    for (const item of items) {
      if (!item.item_code || typeof item.item_code !== 'string') {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each item must have a valid item_code string'
          }
        };
      }

      if (typeof item.qty !== 'number' || item.qty <= 0) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each item must have a valid positive quantity'
          }
        };
      }

      if (typeof item.rate !== 'number' || item.rate < 0) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each item must have a valid rate (>= 0)'
          }
        };
      }
    }

    // Validate delivery date if provided
    if (delivery_date) {
      const deliveryDateObj = new Date(delivery_date);
      if (isNaN(deliveryDateObj.getTime())) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Delivery date must be a valid date string'
          }
        };
      }
    }

    logger.info('Purchase order creation requested', redactSensitiveData({
      supplier,
      company,
      transaction_date,
      items_count: items.length
    }));

    // Check if Purchase Order doctype is available
    const doctypeCheck = await checkDoctypeAvailability('Purchase Order');
    if (!doctypeCheck.available) {
      return {
        ok: false,
        error: {
          code: 'DOCTYPE_NOT_AVAILABLE',
          message: 'Purchase Order doctype is not available in this ERPNext instance. This may be a demo server limitation or the purchase module is not installed.'
        }
      };
    }

    // Create Purchase Order document
    const purchaseOrderDoc = {
      supplier,
      company,
      transaction_date,
      items,
      ...(delivery_date && { delivery_date }),
      ...(terms && { terms })
    };

    const result = await createDocument('Purchase Order', purchaseOrderDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    // Calculate grand total (simple sum)
    const grand_total = items.reduce((total, item) => total + (item.qty * item.rate), 0);

    logger.info('Purchase order created successfully', {
      purchase_order_name: result.data?.name,
      supplier,
      grand_total
    });

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        supplier,
        company,
        transaction_date,
        grand_total
      }
    };

  } catch (error: any) {
    logger.error('Failed to create purchase order', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to create purchase order'
      }
    };
  }
}

export async function receivePurchaseOrder(
  supplier: string,
  purchase_order: string,
  items: Array<{ item_code: string; qty: number; received_qty: number }>
): Promise<ReceivePurchaseOrderResponse> {
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

    // Input validation
    if (!supplier || typeof supplier !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Supplier is required and must be a string'
        }
      };
    }

    if (!purchase_order || typeof purchase_order !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Purchase order is required and must be a string'
        }
      };
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Items array is required and cannot be empty'
        }
      };
    }

    // Validate items
    for (const item of items) {
      if (!item.item_code || typeof item.item_code !== 'string') {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each item must have a valid item_code string'
          }
        };
      }

      if (typeof item.qty !== 'number' || item.qty <= 0) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each item must have a valid positive ordered quantity'
          }
        };
      }

      if (typeof item.received_qty !== 'number' || item.received_qty < 0) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each item must have a valid received quantity (>= 0)'
          }
        };
      }

      if (item.received_qty > item.qty) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: `Received quantity (${item.received_qty}) cannot exceed ordered quantity (${item.qty}) for item ${item.item_code}`
          }
        };
      }
    }

    logger.info('Purchase receipt creation requested', redactSensitiveData({
      supplier,
      purchase_order,
      items_count: items.length
    }));

    // Check if Purchase Receipt doctype is available
    const doctypeCheck = await checkDoctypeAvailability('Purchase Receipt');
    if (!doctypeCheck.available) {
      return {
        ok: false,
        error: {
          code: 'DOCTYPE_NOT_AVAILABLE',
          message: 'Purchase Receipt doctype is not available in this ERPNext instance. This may be a demo server limitation or the purchase module is not installed.'
        }
      };
    }

    // Create Purchase Receipt document
    const purchaseReceiptDoc = {
      supplier,
      purchase_order,
      items
    };

    const result = await createDocument('Purchase Receipt', purchaseReceiptDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    logger.info('Purchase receipt created successfully', {
      purchase_receipt_name: result.data?.name,
      supplier,
      purchase_order
    });

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        supplier,
        purchase_order,
        total_received_items: items.length
      }
    };

  } catch (error: any) {
    logger.error('Failed to receive purchase order', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to receive purchase order'
      }
    };
  }
}