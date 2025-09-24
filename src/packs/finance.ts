import { erpAuthenticator } from '../core/auth';
import { createDocument, listDocuments } from '../core/crud';
import { logger, redactSensitiveData } from '../observability/logger';

export interface CreateSalesInvoiceRequest {
  customer: string;
  due_date: string;
  company: string;
  items: Array<{
    item_code: string;
    qty: number;
    rate: number;
  }>;
}

export interface CreateSalesInvoiceResponse {
  ok: boolean;
  data?: {
    name: string;
    customer: string;
    due_date: string;
    company: string;
    total: number;
    grand_total: number;
    outstanding_amount: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface RecordPaymentRequest {
  payment_type: 'Receive' | 'Pay';
  party_type: 'Customer' | 'Supplier';
  party: string;
  paid_amount: number;
  received_amount: number;
  references: Array<{
    reference_doctype: string;
    reference_name: string;
    allocated_amount: number;
  }>;
}

export interface RecordPaymentResponse {
  ok: boolean;
  data?: {
    name: string;
    payment_type: string;
    party: string;
    paid_amount: number;
    total_allocated: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface GetOutstandingInvoicesRequest {
  customer?: string;
  company?: string;
}

export interface GetOutstandingInvoicesResponse {
  ok: boolean;
  data?: {
    outstanding_invoices: Array<{
      name: string;
      customer: string;
      posting_date: string;
      due_date: string;
      grand_total: number;
      outstanding_amount: number;
      days_overdue?: number;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CreateExpenseClaimRequest {
  employee: string;
  expense_approver: string;
  expenses: Array<{
    expense_date: string;
    expense_type: string;
    amount: number;
    description?: string;
  }>;
}

export interface CreateExpenseClaimResponse {
  ok: boolean;
  data?: {
    name: string;
    employee: string;
    expense_approver: string;
    total_claimed_amount: number;
    total_expenses: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function createSalesInvoice(
  customer: string,
  due_date: string,
  company: string,
  items: Array<{ item_code: string; qty: number; rate: number }>
): Promise<CreateSalesInvoiceResponse> {
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
    if (!customer || typeof customer !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Customer is required and must be a string'
        }
      };
    }

    if (!due_date || typeof due_date !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Due date is required and must be a string'
        }
      };
    }

    // Validate due date format
    const dueDateObj = new Date(due_date);
    if (isNaN(dueDateObj.getTime())) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Due date must be a valid date string'
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

    logger.info('Sales invoice creation requested', redactSensitiveData({
      customer,
      due_date,
      company,
      items_count: items.length
    }));

    // Calculate totals
    const total = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const grand_total = total; // Basic calculation, ERPNext will handle taxes

    // Create Sales Invoice document
    const salesInvoiceDoc = {
      customer,
      due_date,
      company,
      items,
      posting_date: new Date().toISOString().split('T')[0] // Today's date
    };

    const result = await createDocument('Sales Invoice', salesInvoiceDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    logger.info('Sales invoice created successfully', redactSensitiveData({
      sales_invoice_name: result.data?.name,
      customer,
      grand_total
    }));

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        customer,
        due_date,
        company,
        total,
        grand_total,
        outstanding_amount: grand_total // New invoice, full amount outstanding
      }
    };

  } catch (error: any) {
    logger.error('Failed to create sales invoice', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to create sales invoice'
      }
    };
  }
}

export async function recordPayment(
  payment_type: 'Receive' | 'Pay',
  party_type: 'Customer' | 'Supplier',
  party: string,
  paid_amount: number,
  received_amount: number,
  references: Array<{ reference_doctype: string; reference_name: string; allocated_amount: number }>
): Promise<RecordPaymentResponse> {
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
    if (!payment_type || !['Receive', 'Pay'].includes(payment_type)) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Payment type must be either "Receive" or "Pay"'
        }
      };
    }

    if (!party_type || !['Customer', 'Supplier'].includes(party_type)) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Party type must be either "Customer" or "Supplier"'
        }
      };
    }

    if (!party || typeof party !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Party is required and must be a string'
        }
      };
    }

    if (typeof paid_amount !== 'number' || paid_amount <= 0) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Paid amount must be a positive number'
        }
      };
    }

    if (typeof received_amount !== 'number' || received_amount <= 0) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Received amount must be a positive number'
        }
      };
    }

    if (!references || !Array.isArray(references) || references.length === 0) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'References array is required and cannot be empty'
        }
      };
    }

    // Validate references
    let totalAllocated = 0;
    for (const ref of references) {
      if (!ref.reference_doctype || typeof ref.reference_doctype !== 'string') {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each reference must have a valid reference_doctype string'
          }
        };
      }

      if (!ref.reference_name || typeof ref.reference_name !== 'string') {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each reference must have a valid reference_name string'
          }
        };
      }

      if (typeof ref.allocated_amount !== 'number' || ref.allocated_amount <= 0) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each reference must have a valid positive allocated_amount'
          }
        };
      }

      totalAllocated += ref.allocated_amount;
    }

    // Validate total allocation
    if (Math.abs(totalAllocated - paid_amount) > 0.01) { // Allow small rounding differences
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: `Total allocated amount (${totalAllocated}) must equal paid amount (${paid_amount})`
        }
      };
    }

    logger.info('Payment recording requested', redactSensitiveData({
      payment_type,
      party_type,
      party,
      paid_amount,
      references_count: references.length
    }));

    // Create Payment Entry document
    const paymentDoc = {
      payment_type,
      party_type,
      party,
      paid_amount,
      received_amount,
      references,
      posting_date: new Date().toISOString().split('T')[0] // Today's date
    };

    const result = await createDocument('Payment Entry', paymentDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    logger.info('Payment recorded successfully', redactSensitiveData({
      payment_entry_name: result.data?.name,
      party,
      paid_amount,
      total_allocated: totalAllocated
    }));

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        payment_type,
        party,
        paid_amount,
        total_allocated: totalAllocated
      }
    };

  } catch (error: any) {
    logger.error('Failed to record payment', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to record payment'
      }
    };
  }
}

export async function getOutstandingInvoices(
  customer?: string,
  company?: string
): Promise<GetOutstandingInvoicesResponse> {
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

    logger.info('Outstanding invoices requested', redactSensitiveData({
      customer: customer || 'all',
      company: company || 'all'
    }));

    // Build filters for Sales Invoice
    const filters: any = {
      docstatus: 1, // Submitted invoices only
      outstanding_amount: ['>', 0] // Only outstanding invoices
    };

    if (customer) {
      filters.customer = customer;
    }

    if (company) {
      filters.company = company;
    }

    // Get outstanding invoices
    const result = await listDocuments(
      'Sales Invoice',
      filters,
      ['name', 'customer', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount']
    );

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    // Process invoices and calculate days overdue
    const currentDate = new Date();
    const outstanding_invoices = (result.data?.docs || []).map((invoice: any) => {
      const dueDateObj = new Date(invoice.due_date);
      const days_overdue = dueDateObj < currentDate
        ? Math.floor((currentDate.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      return {
        name: invoice.name,
        customer: invoice.customer,
        posting_date: invoice.posting_date,
        due_date: invoice.due_date,
        grand_total: invoice.grand_total || 0,
        outstanding_amount: invoice.outstanding_amount || 0,
        ...(days_overdue !== undefined && days_overdue > 0 && { days_overdue })
      };
    });

    logger.info('Outstanding invoices retrieved', {
      invoices_count: outstanding_invoices.length,
      total_outstanding: outstanding_invoices.reduce((sum, inv) => sum + inv.outstanding_amount, 0)
    });

    return {
      ok: true,
      data: {
        outstanding_invoices
      }
    };

  } catch (error: any) {
    logger.error('Failed to get outstanding invoices', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to get outstanding invoices'
      }
    };
  }
}

export async function createExpenseClaim(
  employee: string,
  expense_approver: string,
  expenses: Array<{ expense_date: string; expense_type: string; amount: number; description?: string }>
): Promise<CreateExpenseClaimResponse> {
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
    if (!employee || typeof employee !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Employee is required and must be a string'
        }
      };
    }

    if (!expense_approver || typeof expense_approver !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Expense approver is required and must be a string'
        }
      };
    }

    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Expenses array is required and cannot be empty'
        }
      };
    }

    // Validate expenses
    for (const expense of expenses) {
      if (!expense.expense_date || typeof expense.expense_date !== 'string') {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each expense must have a valid expense_date string'
          }
        };
      }

      // Validate expense date format
      const expenseDateObj = new Date(expense.expense_date);
      if (isNaN(expenseDateObj.getTime())) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each expense must have a valid expense_date'
          }
        };
      }

      if (!expense.expense_type || typeof expense.expense_type !== 'string') {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each expense must have a valid expense_type string'
          }
        };
      }

      if (typeof expense.amount !== 'number' || expense.amount <= 0) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Each expense must have a valid positive amount'
          }
        };
      }
    }

    // Calculate total claimed amount
    const total_claimed_amount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    logger.info('Expense claim creation requested', redactSensitiveData({
      employee,
      expense_approver,
      expenses_count: expenses.length,
      total_claimed_amount
    }));

    // Create Expense Claim document
    const expenseClaimDoc = {
      employee,
      expense_approver,
      expenses,
      posting_date: new Date().toISOString().split('T')[0] // Today's date
    };

    const result = await createDocument('Expense Claim', expenseClaimDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    logger.info('Expense claim created successfully', redactSensitiveData({
      expense_claim_name: result.data?.name,
      employee,
      total_claimed_amount
    }));

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        employee,
        expense_approver,
        total_claimed_amount,
        total_expenses: expenses.length
      }
    };

  } catch (error: any) {
    logger.error('Failed to create expense claim', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to create expense claim'
      }
    };
  }
}