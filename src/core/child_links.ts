import { erpAuthenticator } from './auth';
import { logger, redactSensitiveData } from '../observability/logger';

export interface ReplaceTableRequest {
  parent_doctype: string;
  parent_name: string;
  tablefield: string;
  rows: Record<string, any>[];
}

export interface ReplaceTableResponse {
  ok: boolean;
  data?: {
    table_replaced: boolean;
    rows_count: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface AutocompleteRequest {
  doctype: string;
  txt: string;
  limit?: number;
}

export interface AutocompleteResponse {
  ok: boolean;
  data?: {
    options: Array<{
      value: string;
      label: string;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function replaceTable(
  parent_doctype: string,
  parent_name: string,
  tablefield: string,
  rows: Record<string, any>[]
): Promise<ReplaceTableResponse> {
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

    // Validate inputs
    if (!parent_doctype || typeof parent_doctype !== 'string') {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: 'Parent doctype is required and must be a string'
        }
      };
    }

    if (!parent_name || typeof parent_name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Parent name is required and must be a string'
        }
      };
    }

    if (!tablefield || typeof tablefield !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Table field name is required and must be a string'
        }
      };
    }

    if (!Array.isArray(rows)) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Rows must be an array'
        }
      };
    }

    const config = erpAuthenticator.getConfig();
    if (!config) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Authentication configuration not found'
        }
      };
    }

    // Get authenticated client from auth module
    const client = (erpAuthenticator as any).client;
    if (!client) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'No authenticated client available'
        }
      };
    }

    logger.info('Replacing child table', redactSensitiveData({
      parent_doctype,
      parent_name,
      tablefield,
      rows_count: rows.length
    }));

    // First get the parent document to ensure it exists
    const parentResponse = await client.get(`/api/resource/${parent_doctype}/${parent_name}`);
    const parentDoc = parentResponse.data.data;

    if (!parentDoc) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `Parent document ${parent_doctype}/${parent_name} not found`
        }
      };
    }

    // Update the parent document with new child table rows
    const updateData = {
      [tablefield]: rows
    };

    const response = await client.put(`/api/resource/${parent_doctype}/${parent_name}`, {
      data: updateData
    });

    const updatedDoc = response.data.data;
    const updatedRows = updatedDoc?.[tablefield] || [];

    logger.info('Child table replaced successfully', {
      parent_doctype,
      parent_name,
      tablefield,
      rows_count: updatedRows.length
    });

    return {
      ok: true,
      data: {
        table_replaced: true,
        rows_count: updatedRows.length
      }
    };

  } catch (error: any) {
    logger.error('Failed to replace child table', redactSensitiveData({
      parent_doctype,
      parent_name,
      tablefield,
      error: error.message,
      response: error.response?.data
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `Parent document ${parent_doctype}/${parent_name} not found`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Insufficient permissions to modify ${parent_doctype}/${parent_name}`
        }
      };
    }

    // Handle validation errors
    if (error.response?.status === 400) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: error.response?.data?.message || `Invalid table field or data for ${tablefield}`
        }
      };
    }

    if (error.response?.data?.message) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: error.response.data.message
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to replace child table'
      }
    };
  }
}

export async function autocomplete(
  doctype: string,
  txt: string,
  limit?: number
): Promise<AutocompleteResponse> {
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

    // Validate inputs
    if (!doctype || typeof doctype !== 'string') {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: 'Doctype is required and must be a string'
        }
      };
    }

    if (typeof txt !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Search text must be a string'
        }
      };
    }

    if (limit !== undefined && (typeof limit !== 'number' || limit < 1)) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Limit must be a positive number'
        }
      };
    }

    const config = erpAuthenticator.getConfig();
    if (!config) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Authentication configuration not found'
        }
      };
    }

    // Get authenticated client from auth module
    const client = (erpAuthenticator as any).client;
    if (!client) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'No authenticated client available'
        }
      };
    }

    logger.info('Performing autocomplete search', redactSensitiveData({
      doctype,
      txt: txt.substring(0, 20), // Only log first 20 chars of search
      limit: limit || 'no limit'
    }));

    // Build search parameters
    const searchParams = new URLSearchParams();
    searchParams.append('txt', txt);
    if (limit) {
      searchParams.append('limit', limit.toString());
    }

    // Perform autocomplete search via ERPNext search API
    const response = await client.get(`/api/method/frappe.desk.search.search_link?${searchParams}`, {
      params: {
        doctype: doctype
      }
    });

    const searchResults = response.data.message || [];

    // Transform results to standard format
    const options = searchResults.map((result: any) => {
      // ERPNext search results can be arrays [value, label] or objects
      if (Array.isArray(result)) {
        return {
          value: result[0],
          label: result[1] || result[0]
        };
      } else if (typeof result === 'object' && result !== null) {
        return {
          value: result.value || result.name,
          label: result.label || result.title || result.name || result.value
        };
      } else {
        return {
          value: result,
          label: result
        };
      }
    });

    logger.info('Autocomplete search completed', {
      doctype,
      results_count: options.length,
      limited: limit ? options.length >= limit : false
    });

    return {
      ok: true,
      data: {
        options
      }
    };

  } catch (error: any) {
    logger.error('Failed to perform autocomplete search', redactSensitiveData({
      doctype,
      txt: txt.substring(0, 20),
      error: error.message,
      response: error.response?.data
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: `Doctype ${doctype} not found or not searchable`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Insufficient permissions to search ${doctype}`
        }
      };
    }

    // Handle search errors
    if (error.response?.status === 400) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: error.response?.data?.message || `Invalid search parameters for ${doctype}`
        }
      };
    }

    if (error.response?.data?.message) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: error.response.data.message
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to perform autocomplete search'
      }
    };
  }
}