import { erpAuthenticator } from '../core/auth';
import { createDocument, updateDocument } from '../core/crud';
import { listDocuments } from '../core/crud';
import { logger, redactSensitiveData } from '../observability/logger';

export interface CreateLeadRequest {
  lead_name: string;
  email_id: string;
  phone: string;
  company_name?: string;
  source?: string;
  status?: string;
}

export interface CreateLeadResponse {
  ok: boolean;
  data?: {
    name: string;
    lead_name: string;
    email_id: string;
    phone: string;
    company_name?: string;
    status: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ConvertLeadToCustomerRequest {
  lead_name: string;
  customer_name?: string;
  customer_type?: string;
  customer_group?: string;
  territory?: string;
}

export interface ConvertLeadToCustomerResponse {
  ok: boolean;
  data?: {
    customer_name: string;
    customer_type: string;
    lead_name: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CreateQuotationRequest {
  quotation_to: 'Customer' | 'Lead';
  party_name: string;
  items: Array<{
    item_code: string;
    qty: number;
    rate: number;
  }>;
  valid_till?: string;
}

export interface CreateQuotationResponse {
  ok: boolean;
  data?: {
    name: string;
    quotation_to: string;
    party_name: string;
    grand_total: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CreateSalesOrderRequest {
  customer: string;
  delivery_date: string;
  items: Array<{
    item_code: string;
    qty: number;
    rate: number;
  }>;
}

export interface CreateSalesOrderResponse {
  ok: boolean;
  data?: {
    name: string;
    customer: string;
    delivery_date: string;
    grand_total: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface GetSalesPipelineResponse {
  ok: boolean;
  data?: {
    pipeline: {
      leads: Array<{
        name: string;
        lead_name: string;
        status: string;
        email_id: string;
        creation: string;
      }>;
      opportunities: Array<{
        name: string;
        opportunity_from: string;
        party_name: string;
        status: string;
        expected_closing: string;
        opportunity_amount: number;
      }>;
      quotations: Array<{
        name: string;
        party_name: string;
        status: string;
        valid_till: string;
        grand_total: number;
      }>;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function createLead(
  lead_name: string,
  email_id: string,
  phone: string,
  company_name?: string,
  source?: string,
  status?: string
): Promise<CreateLeadResponse> {
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
    if (!lead_name || typeof lead_name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Lead name is required and must be a string'
        }
      };
    }

    if (!email_id || typeof email_id !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Email ID is required and must be a string'
        }
      };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_id)) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Please provide a valid email address'
        }
      };
    }

    if (!phone || typeof phone !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Phone is required and must be a string'
        }
      };
    }

    logger.info('Lead creation requested', redactSensitiveData({
      lead_name,
      email_id,
      phone,
      company_name: company_name || 'not_provided'
    }));

    // Create Lead document
    const leadDoc = {
      lead_name,
      email_id,
      phone,
      status: status || 'Open',
      ...(company_name && { company_name }),
      ...(source && { source })
    };

    const result = await createDocument('Lead', leadDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    logger.info('Lead created successfully', {
      lead_name,
      lead_doc_name: result.data?.name
    });

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        lead_name,
        email_id,
        phone,
        ...(company_name && { company_name }),
        status: status || 'Open'
      }
    };

  } catch (error: any) {
    logger.error('Failed to create lead', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to create lead'
      }
    };
  }
}

export async function convertLeadToCustomer(
  lead_name: string,
  customer_name?: string,
  customer_type?: string,
  customer_group?: string,
  territory?: string
): Promise<ConvertLeadToCustomerResponse> {
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
    if (!lead_name || typeof lead_name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Lead name is required and must be a string'
        }
      };
    }

    logger.info('Lead conversion requested', {
      lead_name,
      customer_name: customer_name || 'not_provided'
    });

    // Get lead data first
    const leadResult = await listDocuments('Lead', { name: lead_name }, ['lead_name', 'email_id', 'phone', 'company_name']);

    if (!leadResult.ok || !leadResult.data?.docs || leadResult.data.docs.length === 0) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lead not found'
        }
      };
    }

    const leadData = leadResult.data.docs[0];

    // Create Customer document
    const customerDoc = {
      customer_name: customer_name || leadData.lead_name,
      customer_type: customer_type || 'Individual',
      ...(customer_group && { customer_group }),
      ...(territory && { territory })
    };

    const customerResult = await createDocument('Customer', customerDoc);

    if (!customerResult.ok) {
      return {
        ok: false,
        error: customerResult.error
      };
    }

    // Update lead status to converted
    const updateResult = await updateDocument('Lead', lead_name, {
      status: 'Converted'
    });

    if (!updateResult.ok) {
      logger.warn('Failed to update lead status after customer creation', {
        lead_name,
        customer_name: customerResult.data?.name
      });
    }

    logger.info('Lead converted to customer successfully', {
      lead_name,
      customer_name: customerResult.data?.name
    });

    return {
      ok: true,
      data: {
        customer_name: customerResult.data?.name || '',
        customer_type: customer_type || 'Individual',
        lead_name
      }
    };

  } catch (error: any) {
    logger.error('Failed to convert lead to customer', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to convert lead to customer'
      }
    };
  }
}

export async function createQuotation(
  quotation_to: 'Customer' | 'Lead',
  party_name: string,
  items: Array<{ item_code: string; qty: number; rate: number }>,
  valid_till?: string
): Promise<CreateQuotationResponse> {
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
    if (!quotation_to || !['Customer', 'Lead'].includes(quotation_to)) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Quotation to must be either "Customer" or "Lead"'
        }
      };
    }

    if (!party_name || typeof party_name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Party name is required and must be a string'
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

    logger.info('Quotation creation requested', {
      quotation_to,
      party_name,
      items_count: items.length
    });

    // Create Quotation document
    const quotationDoc = {
      quotation_to,
      party_name,
      items,
      ...(valid_till && { valid_till })
    };

    const result = await createDocument('Quotation', quotationDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    // Calculate grand total (simple sum)
    const grand_total = items.reduce((total, item) => total + (item.qty * item.rate), 0);

    logger.info('Quotation created successfully', {
      quotation_name: result.data?.name,
      party_name,
      grand_total
    });

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        quotation_to,
        party_name,
        grand_total
      }
    };

  } catch (error: any) {
    logger.error('Failed to create quotation', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to create quotation'
      }
    };
  }
}

export async function createSalesOrder(
  customer: string,
  delivery_date: string,
  items: Array<{ item_code: string; qty: number; rate: number; warehouse?: string }>
): Promise<CreateSalesOrderResponse> {
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

    if (!delivery_date || typeof delivery_date !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Delivery date is required and must be a string'
        }
      };
    }

    // Validate delivery date format
    const dateObj = new Date(delivery_date);
    if (isNaN(dateObj.getTime())) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Delivery date must be a valid date string'
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

    logger.info('Sales order creation requested', {
      customer,
      delivery_date,
      items_count: items.length
    });

    // Create Sales Order document
    const salesOrderDoc = {
      customer,
      delivery_date,
      company: 'Ravanos', // Add default company
      items: items.map(item => ({
        ...item,
        warehouse: item.warehouse || 'Stores - RO' // Add default warehouse if not provided
      }))
    };

    const result = await createDocument('Sales Order', salesOrderDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    // Calculate grand total (simple sum)
    const grand_total = items.reduce((total, item) => total + (item.qty * item.rate), 0);

    logger.info('Sales order created successfully', {
      sales_order_name: result.data?.name,
      customer,
      grand_total
    });

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        customer,
        delivery_date,
        grand_total
      }
    };

  } catch (error: any) {
    logger.error('Failed to create sales order', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to create sales order'
      }
    };
  }
}

export async function getSalesPipeline(): Promise<GetSalesPipelineResponse> {
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

    logger.info('Sales pipeline requested');

    // Get leads
    const leadsResult = await listDocuments('Lead', { status: ['!=', 'Converted'] }, ['name', 'lead_name', 'status', 'email_id', 'creation']);
    const leads = leadsResult.ok && leadsResult.data?.docs ? leadsResult.data.docs.map((lead: any) => ({
      name: lead.name,
      lead_name: lead.lead_name,
      status: lead.status,
      email_id: lead.email_id,
      creation: lead.creation
    })) : [];

    // Get opportunities
    const opportunitiesResult = await listDocuments('Opportunity', {}, ['name', 'opportunity_from', 'party_name', 'status', 'expected_closing', 'opportunity_amount']);
    const opportunities = opportunitiesResult.ok && opportunitiesResult.data?.docs ? opportunitiesResult.data.docs.map((opp: any) => ({
      name: opp.name,
      opportunity_from: opp.opportunity_from,
      party_name: opp.party_name,
      status: opp.status,
      expected_closing: opp.expected_closing,
      opportunity_amount: opp.opportunity_amount || 0
    })) : [];

    // Get quotations
    const quotationsResult = await listDocuments('Quotation', { docstatus: ['!=', 2] }, ['name', 'party_name', 'status', 'valid_till', 'grand_total']);
    const quotations = quotationsResult.ok && quotationsResult.data?.docs ? quotationsResult.data.docs.map((quot: any) => ({
      name: quot.name,
      party_name: quot.party_name,
      status: quot.status,
      valid_till: quot.valid_till,
      grand_total: quot.grand_total || 0
    })) : [];

    logger.info('Sales pipeline retrieved', {
      leads_count: leads.length,
      opportunities_count: opportunities.length,
      quotations_count: quotations.length
    });

    return {
      ok: true,
      data: {
        pipeline: {
          leads,
          opportunities,
          quotations
        }
      }
    };

  } catch (error: any) {
    logger.error('Failed to get sales pipeline', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to get sales pipeline'
      }
    };
  }
}