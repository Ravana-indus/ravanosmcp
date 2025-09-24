import { erpAuthenticator } from './auth';
import { logger, redactSensitiveData } from '../observability/logger';

export interface CreateDocumentRequest {
  doctype: string;
  doc: Record<string, any>;
}

export interface CreateDocumentResponse {
  ok: boolean;
  data?: {
    name: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface GetDocumentRequest {
  doctype: string;
  name: string;
  fields?: string[];
}

export interface GetDocumentResponse {
  ok: boolean;
  data?: {
    doc: Record<string, any>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ListDocumentsRequest {
  doctype: string;
  filters?: Record<string, any>;
  fields?: string[];
  limit?: number;
}

export interface ListDocumentsResponse {
  ok: boolean;
  data?: {
    docs: Record<string, any>[];
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UpdateDocumentRequest {
  doctype: string;
  name: string;
  patch: Record<string, any>;
}

export interface UpdateDocumentResponse {
  ok: boolean;
  data?: {
    name: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface DeleteDocumentRequest {
  doctype: string;
  name: string;
}

export interface DeleteDocumentResponse {
  ok: boolean;
  data?: {
    deleted: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function createDocument(
  doctype: string,
  doc: Record<string, any>
): Promise<CreateDocumentResponse> {
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

    if (!doc || typeof doc !== 'object') {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: 'Document data is required and must be an object'
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

    logger.info('Creating document', redactSensitiveData({
      doctype,
      docFields: Object.keys(doc)
    }));

    // Create document via ERPNext REST API
    const response = await client.post(`/api/resource/${doctype}`, {
      data: doc
    });

    const documentName = response.data.data.name;

    if (!documentName) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: 'Failed to create document - no name returned'
        }
      };
    }

    logger.info('Document created successfully', {
      doctype,
      name: documentName
    });

    return {
      ok: true,
      data: {
        name: documentName
      }
    };

  } catch (error: any) {
    logger.error('Failed to create document', redactSensitiveData({
      doctype,
      error: error.message,
      response: error.response?.data
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: `Invalid doctype: ${doctype}`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: `Insufficient permissions to create ${doctype}`
        }
      };
    }

    if (error.response?.data?.message) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: error.response.data.message
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'INVALID_DOCTYPE',
        message: error.message || 'Failed to create document'
      }
    };
  }
}

export async function getDocument(
  doctype: string,
  name: string,
  fields?: string[]
): Promise<GetDocumentResponse> {
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
          code: 'NOT_FOUND',
          message: 'Doctype is required and must be a string'
        }
      };
    }

    if (!name || typeof name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document name is required and must be a string'
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

    logger.info('Getting document', redactSensitiveData({
      doctype,
      name,
      fields: fields || 'all'
    }));

    // Build URL with field filtering
    let url = `/api/resource/${doctype}/${name}`;
    if (fields && fields.length > 0) {
      url += `?fields=["${fields.join('","')}"]`;
    }

    // Get document via ERPNext REST API
    const response = await client.get(url);

    const doc = response.data.data;

    if (!doc) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `Document ${doctype}/${name} not found`
        }
      };
    }

    // Filter fields if specified
    let filteredDoc = doc;
    if (fields && fields.length > 0) {
      filteredDoc = {};
      fields.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(doc, field)) {
          filteredDoc[field] = doc[field];
        }
      });
    }

    logger.info('Document retrieved successfully', {
      doctype,
      name,
      fieldCount: Object.keys(filteredDoc).length
    });

    return {
      ok: true,
      data: {
        doc: filteredDoc
      }
    };

  } catch (error: any) {
    logger.error('Failed to get document', redactSensitiveData({
      doctype,
      name,
      error: error.message,
      response: error.response?.data
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `Document ${doctype}/${name} not found`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `Insufficient permissions to access ${doctype}/${name}`
        }
      };
    }

    if (error.response?.data?.message) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: error.response.data.message
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: error.message || 'Failed to get document'
      }
    };
  }
}

export async function listDocuments(
  doctype: string,
  filters?: Record<string, any>,
  fields?: string[],
  limit?: number
): Promise<ListDocumentsResponse> {
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

    logger.info('Listing documents', redactSensitiveData({
      doctype,
      filters: filters || 'none',
      fields: fields || 'all',
      limit: limit || 'no limit'
    }));

    // Build URL with query parameters
    let url = `/api/resource/${doctype}`;
    const queryParams: string[] = [];

    // Add fields filter
    if (fields && fields.length > 0) {
      queryParams.push(`fields=["${fields.join('","')}"]`);
    }

    // Add filters
    if (filters && Object.keys(filters).length > 0) {
      const filterArray = Object.entries(filters).map(([field, value]) => [field, '=', value]);
      queryParams.push(`filters=${JSON.stringify(filterArray)}`);
    }

    // Add limit
    if (limit && limit > 0) {
      queryParams.push(`limit_page_length=${limit}`);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    // Get documents via ERPNext REST API
    const response = await client.get(url);

    const docs = response.data.data || [];

    // Filter fields if specified
    let filteredDocs = docs;
    if (fields && fields.length > 0) {
      filteredDocs = docs.map((doc: Record<string, any>) => {
        const filteredDoc: Record<string, any> = {};
        fields.forEach(field => {
          if (Object.prototype.hasOwnProperty.call(doc, field)) {
            filteredDoc[field] = doc[field];
          }
        });
        return filteredDoc;
      });
    }

    logger.info('Documents listed successfully', {
      doctype,
      count: filteredDocs.length,
      hasFilters: filters ? Object.keys(filters).length > 0 : false
    });

    return {
      ok: true,
      data: {
        docs: filteredDocs
      }
    };

  } catch (error: any) {
    logger.error('Failed to list documents', redactSensitiveData({
      doctype,
      filters,
      error: error.message,
      response: error.response?.data
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: `Invalid doctype: ${doctype}`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: `Insufficient permissions to list ${doctype}`
        }
      };
    }

    if (error.response?.data?.message) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: error.response.data.message
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'INVALID_DOCTYPE',
        message: error.message || 'Failed to list documents'
      }
    };
  }
}

export async function updateDocument(
  doctype: string,
  name: string,
  patch: Record<string, any>
): Promise<UpdateDocumentResponse> {
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
          code: 'FIELD_ERROR',
          message: 'Doctype is required and must be a string'
        }
      };
    }

    if (!name || typeof name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Document name is required and must be a string'
        }
      };
    }

    if (!patch || typeof patch !== 'object' || Object.keys(patch).length === 0) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Patch data is required and must be a non-empty object'
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

    logger.info('Updating document', redactSensitiveData({
      doctype,
      name,
      patchFields: Object.keys(patch)
    }));

    // Update document via ERPNext REST API
    const response = await client.put(`/api/resource/${doctype}/${name}`, {
      data: patch
    });

    const documentName = response.data.data.name;

    if (!documentName) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Failed to update document - no name returned'
        }
      };
    }

    logger.info('Document updated successfully', {
      doctype,
      name: documentName
    });

    return {
      ok: true,
      data: {
        name: documentName
      }
    };

  } catch (error: any) {
    logger.error('Failed to update document', redactSensitiveData({
      doctype,
      name,
      patchFields: Object.keys(patch),
      error: error.message,
      response: error.response?.data
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: `Document ${doctype}/${name} not found`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: `Insufficient permissions to update ${doctype}/${name}`
        }
      };
    }

    if (error.response?.status === 400 || error.response?.status === 422) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: error.response?.data?.message || 'Invalid field values in patch'
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
        message: error.message || 'Failed to update document'
      }
    };
  }
}

export async function deleteDocument(
  doctype: string,
  name: string
): Promise<DeleteDocumentResponse> {
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
          code: 'DELETE_NOT_ALLOWED',
          message: 'Doctype is required and must be a string'
        }
      };
    }

    if (!name || typeof name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'DELETE_NOT_ALLOWED',
          message: 'Document name is required and must be a string'
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

    logger.info('Deleting document', redactSensitiveData({
      doctype,
      name
    }));

    // Delete document via ERPNext REST API
    await client.delete(`/api/resource/${doctype}/${name}`);

    logger.info('Document deleted successfully', {
      doctype,
      name
    });

    return {
      ok: true,
      data: {
        deleted: true
      }
    };

  } catch (error: any) {
    logger.error('Failed to delete document', redactSensitiveData({
      doctype,
      name,
      error: error.message,
      response: error.response?.data
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'DELETE_NOT_ALLOWED',
          message: `Document ${doctype}/${name} not found`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'DELETE_NOT_ALLOWED',
          message: `Insufficient permissions to delete ${doctype}/${name}`
        }
      };
    }

    // Handle protected documents or constraints
    if (error.response?.status === 400 || error.response?.status === 409) {
      return {
        ok: false,
        error: {
          code: 'DELETE_NOT_ALLOWED',
          message: error.response?.data?.message || `Cannot delete ${doctype}/${name} - document may be protected or have dependencies`
        }
      };
    }

    if (error.response?.data?.message) {
      return {
        ok: false,
        error: {
          code: 'DELETE_NOT_ALLOWED',
          message: error.response.data.message
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'DELETE_NOT_ALLOWED',
        message: error.message || 'Failed to delete document'
      }
    };
  }
}