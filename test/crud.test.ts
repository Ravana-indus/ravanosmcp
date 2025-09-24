import axios from 'axios';
import { createDocument, getDocument, listDocuments, updateDocument, deleteDocument } from '../src/core/crud';
import { erpAuthenticator } from '../src/core/auth';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock auth module
jest.mock('../src/core/auth', () => ({
  erpAuthenticator: {
    isAuthenticated: jest.fn(),
    getConfig: jest.fn(),
    client: null
  }
}));

describe('CRUD Module - Document Creation', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    };

    // Reset auth state
    (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(true);
    (erpAuthenticator.getConfig as jest.Mock).mockReturnValue({
      baseUrl: 'https://test.erpnext.com',
      apiKey: 'test_key',
      apiSecret: 'test_secret'
    });
    (erpAuthenticator as any).client = mockAxiosInstance;
  });

  describe('createDocument', () => {
    it('should successfully create a document with valid inputs', async () => {
      // Mock successful creation response
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {
            name: 'CUST-00001'
          }
        }
      });

      const result = await createDocument('Customer', {
        customer_name: 'Test Customer',
        customer_type: 'Company'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('CUST-00001');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/resource/Customer', {
        data: {
          customer_name: 'Test Customer',
          customer_type: 'Company'
        }
      });
    });

    it('should return AUTH_FAILED when not authenticated', async () => {
      (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

      const result = await createDocument('Customer', {
        customer_name: 'Test Customer'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
    });

    it('should return INVALID_DOCTYPE for empty doctype', async () => {
      const result = await createDocument('', {
        customer_name: 'Test Customer'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
    });

    it('should return INVALID_DOCTYPE for non-string doctype', async () => {
      const result = await createDocument(null as any, {
        customer_name: 'Test Customer'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
    });

    it('should return INVALID_DOCTYPE for invalid document data', async () => {
      const result = await createDocument('Customer', null as any);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Document data is required and must be an object');
    });

    it('should return AUTH_FAILED when no client available', async () => {
      (erpAuthenticator as any).client = null;

      const result = await createDocument('Customer', {
        customer_name: 'Test Customer'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('No authenticated client available');
    });

    it('should return INVALID_DOCTYPE for 404 (invalid doctype)', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'DocType not found' }
        }
      });

      const result = await createDocument('InvalidDocType', {
        field: 'value'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Invalid doctype: InvalidDocType');
    });

    it('should return INVALID_DOCTYPE for 403 (insufficient permissions)', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      });

      const result = await createDocument('Customer', {
        customer_name: 'Test Customer'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Insufficient permissions to create Customer');
    });

    it('should handle ERPNext validation errors', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Customer Name is mandatory' }
        }
      });

      const result = await createDocument('Customer', {
        customer_type: 'Company'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Customer Name is mandatory');
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network Error'));

      const result = await createDocument('Customer', {
        customer_name: 'Test Customer'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Network Error');
    });

    it('should return error when document creation returns no name', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {}
        }
      });

      const result = await createDocument('Customer', {
        customer_name: 'Test Customer'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Failed to create document - no name returned');
    });

    it('should validate document ID response format', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          data: {
            name: 'ITEM-00001'
          }
        }
      });

      const result = await createDocument('Item', {
        item_code: 'TEST-ITEM',
        item_name: 'Test Item'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('ITEM-00001');
      expect(typeof result.data?.name).toBe('string');
      expect(result.data?.name.length).toBeGreaterThan(0);
    });

    it('should handle authentication config not found', async () => {
      (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

      const result = await createDocument('Customer', {
        customer_name: 'Test Customer'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Authentication configuration not found');
    });
  });

  describe('getDocument', () => {
    it('should successfully retrieve a document with all fields', async () => {
      // Mock successful retrieval response
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: {
            name: 'CUST-00001',
            customer_name: 'Test Customer',
            customer_type: 'Company',
            territory: 'All Territories'
          }
        }
      });

      const result = await getDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.doc).toEqual({
        name: 'CUST-00001',
        customer_name: 'Test Customer',
        customer_type: 'Company',
        territory: 'All Territories'
      });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource/Customer/CUST-00001');
    });

    it('should successfully retrieve a document with specific fields', async () => {
      // Mock successful retrieval response
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: {
            name: 'CUST-00001',
            customer_name: 'Test Customer',
            customer_type: 'Company',
            territory: 'All Territories'
          }
        }
      });

      const result = await getDocument('Customer', 'CUST-00001', ['name', 'customer_name']);

      expect(result.ok).toBe(true);
      expect(result.data?.doc).toEqual({
        name: 'CUST-00001',
        customer_name: 'Test Customer'
      });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource/Customer/CUST-00001?fields=["name","customer_name"]');
    });

    it('should return AUTH_FAILED when not authenticated', async () => {
      (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

      const result = await getDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
    });

    it('should return NOT_FOUND for empty doctype', async () => {
      const result = await getDocument('', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
    });

    it('should return NOT_FOUND for empty document name', async () => {
      const result = await getDocument('Customer', '');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toBe('Document name is required and must be a string');
    });

    it('should return NOT_FOUND when no client available', async () => {
      (erpAuthenticator as any).client = null;

      const result = await getDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('No authenticated client available');
    });

    it('should return NOT_FOUND for 404 (document not found)', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Document not found' }
        }
      });

      const result = await getDocument('Customer', 'NONEXISTENT');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toBe('Document Customer/NONEXISTENT not found');
    });

    it('should return NOT_FOUND for 403 (insufficient permissions)', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      });

      const result = await getDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toBe('Insufficient permissions to access Customer/CUST-00001');
    });

    it('should handle ERPNext API errors', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Internal Server Error' }
        }
      });

      const result = await getDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toBe('Internal Server Error');
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network Error'));

      const result = await getDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toBe('Network Error');
    });

    it('should return error when API returns no data', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {}
      });

      const result = await getDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toBe('Document Customer/CUST-00001 not found');
    });

    it('should filter fields correctly when fields array is provided', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: {
            name: 'ITEM-00001',
            item_code: 'TEST-ITEM',
            item_name: 'Test Item',
            item_group: 'Products',
            description: 'Test Description',
            stock_uom: 'Nos'
          }
        }
      });

      const result = await getDocument('Item', 'ITEM-00001', ['item_code', 'item_name', 'nonexistent_field']);

      expect(result.ok).toBe(true);
      expect(result.data?.doc).toEqual({
        item_code: 'TEST-ITEM',
        item_name: 'Test Item'
      });
      expect(result.data?.doc).not.toHaveProperty('item_group');
      expect(result.data?.doc).not.toHaveProperty('nonexistent_field');
    });

    it('should handle authentication config not found', async () => {
      (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

      const result = await getDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Authentication configuration not found');
    });
  });

  describe('listDocuments', () => {
    it('should successfully list documents without filters', async () => {
      // Mock successful listing response
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: [
            {
              name: 'CUST-00001',
              customer_name: 'Test Customer 1',
              customer_type: 'Company'
            },
            {
              name: 'CUST-00002',
              customer_name: 'Test Customer 2',
              customer_type: 'Individual'
            }
          ]
        }
      });

      const result = await listDocuments('Customer');

      expect(result.ok).toBe(true);
      expect(result.data?.docs).toHaveLength(2);
      expect(result.data?.docs[0]).toEqual({
        name: 'CUST-00001',
        customer_name: 'Test Customer 1',
        customer_type: 'Company'
      });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource/Customer');
    });

    it('should successfully list documents with filters', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: [
            {
              name: 'CUST-00001',
              customer_name: 'Test Customer 1',
              customer_type: 'Company',
              territory: 'India'
            }
          ]
        }
      });

      const result = await listDocuments('Customer', { customer_type: 'Company', territory: 'India' });

      expect(result.ok).toBe(true);
      expect(result.data?.docs).toHaveLength(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource/Customer?filters=[["customer_type","=","Company"],["territory","=","India"]]');
    });

    it('should successfully list documents with field filtering', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: [
            {
              name: 'CUST-00001',
              customer_name: 'Test Customer 1',
              customer_type: 'Company',
              territory: 'India',
              creation: '2023-01-01'
            }
          ]
        }
      });

      const result = await listDocuments('Customer', undefined, ['name', 'customer_name']);

      expect(result.ok).toBe(true);
      expect(result.data?.docs).toHaveLength(1);
      expect(result.data?.docs[0]).toEqual({
        name: 'CUST-00001',
        customer_name: 'Test Customer 1'
      });
      expect(result.data?.docs[0]).not.toHaveProperty('customer_type');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource/Customer?fields=["name","customer_name"]');
    });

    it('should successfully list documents with limit', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: [
            {
              name: 'CUST-00001',
              customer_name: 'Test Customer 1'
            }
          ]
        }
      });

      const result = await listDocuments('Customer', undefined, undefined, 10);

      expect(result.ok).toBe(true);
      expect(result.data?.docs).toHaveLength(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource/Customer?limit_page_length=10');
    });

    it('should successfully list documents with all parameters', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: [
            {
              name: 'CUST-00001',
              customer_name: 'Test Customer 1',
              customer_type: 'Company',
              territory: 'India'
            }
          ]
        }
      });

      const result = await listDocuments('Customer', { customer_type: 'Company' }, ['name', 'customer_name'], 5);

      expect(result.ok).toBe(true);
      expect(result.data?.docs).toHaveLength(1);
      expect(result.data?.docs[0]).toEqual({
        name: 'CUST-00001',
        customer_name: 'Test Customer 1'
      });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource/Customer?fields=["name","customer_name"]&filters=[["customer_type","=","Company"]]&limit_page_length=5');
    });

    it('should return empty array for no matching documents', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: []
        }
      });

      const result = await listDocuments('Customer', { customer_type: 'NonExistent' });

      expect(result.ok).toBe(true);
      expect(result.data?.docs).toEqual([]);
    });

    it('should return AUTH_FAILED when not authenticated', async () => {
      (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

      const result = await listDocuments('Customer');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
    });

    it('should return INVALID_DOCTYPE for empty doctype', async () => {
      const result = await listDocuments('');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
    });

    it('should return AUTH_FAILED when no client available', async () => {
      (erpAuthenticator as any).client = null;

      const result = await listDocuments('Customer');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('No authenticated client available');
    });

    it('should return INVALID_DOCTYPE for 404 (invalid doctype)', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'DocType not found' }
        }
      });

      const result = await listDocuments('InvalidDocType');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Invalid doctype: InvalidDocType');
    });

    it('should return INVALID_DOCTYPE for 403 (insufficient permissions)', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      });

      const result = await listDocuments('Customer');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Insufficient permissions to list Customer');
    });

    it('should handle ERPNext API errors', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Internal Server Error' }
        }
      });

      const result = await listDocuments('Customer');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Internal Server Error');
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network Error'));

      const result = await listDocuments('Customer');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_DOCTYPE');
      expect(result.error?.message).toBe('Network Error');
    });

    it('should handle response with no data property', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {}
      });

      const result = await listDocuments('Customer');

      expect(result.ok).toBe(true);
      expect(result.data?.docs).toEqual([]);
    });

    it('should ignore zero or negative limit', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: []
        }
      });

      const result1 = await listDocuments('Customer', undefined, undefined, 0);
      const result2 = await listDocuments('Customer', undefined, undefined, -5);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource/Customer');
    });

    it('should handle authentication config not found', async () => {
      (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

      const result = await listDocuments('Customer');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Authentication configuration not found');
    });
  });

  describe('updateDocument', () => {
    it('should successfully update a document', async () => {
      // Mock successful update response
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'CUST-00001'
          }
        }
      });

      const result = await updateDocument('Customer', 'CUST-00001', {
        customer_name: 'Updated Customer Name',
        territory: 'US'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('CUST-00001');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/resource/Customer/CUST-00001', {
        data: {
          customer_name: 'Updated Customer Name',
          territory: 'US'
        }
      });
    });

    it('should handle unauthenticated request', async () => {
      (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

      const result = await updateDocument('Customer', 'CUST-00001', {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate required doctype parameter', async () => {
      const result = await updateDocument('', 'CUST-00001', {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate doctype parameter type', async () => {
      const result = await updateDocument(null as any, 'CUST-00001', {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate required name parameter', async () => {
      const result = await updateDocument('Customer', '', {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Document name is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate name parameter type', async () => {
      const result = await updateDocument('Customer', undefined as any, {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Document name is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate required patch parameter', async () => {
      const result = await updateDocument('Customer', 'CUST-00001', null as any);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Patch data is required and must be a non-empty object');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate patch parameter type', async () => {
      const result = await updateDocument('Customer', 'CUST-00001', 'invalid' as any);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Patch data is required and must be a non-empty object');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate non-empty patch parameter', async () => {
      const result = await updateDocument('Customer', 'CUST-00001', {});

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Patch data is required and must be a non-empty object');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should handle authentication config not found', async () => {
      (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

      const result = await updateDocument('Customer', 'CUST-00001', {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Authentication configuration not found');
    });

    it('should handle no authenticated client', async () => {
      (erpAuthenticator as any).client = null;

      const result = await updateDocument('Customer', 'CUST-00001', {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('No authenticated client available');
    });

    it('should handle document not found (404)', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Document not found' }
        }
      });

      const result = await updateDocument('Customer', 'NONEXISTENT', {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Document Customer/NONEXISTENT not found');
    });

    it('should handle insufficient permissions (403)', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      });

      const result = await updateDocument('Customer', 'CUST-00001', {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Insufficient permissions to update Customer/CUST-00001');
    });

    it('should handle bad request (400)', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Invalid field values' }
        }
      });

      const result = await updateDocument('Customer', 'CUST-00001', {
        invalid_field: 'Invalid Value'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Invalid field values');
    });

    it('should handle validation error (422)', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 422,
          data: { message: 'Field validation failed' }
        }
      });

      const result = await updateDocument('Customer', 'CUST-00001', {
        email: 'invalid-email'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Field validation failed');
    });

    it('should handle 400 error without message', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 400,
          data: {}
        }
      });

      const result = await updateDocument('Customer', 'CUST-00001', {
        invalid_field: 'Invalid Value'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Invalid field values in patch');
    });

    it('should handle ERPNext API errors with custom message', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Custom ERPNext error' }
        }
      });

      const result = await updateDocument('Customer', 'CUST-00001', {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Custom ERPNext error');
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.put.mockRejectedValue(new Error('Network Error'));

      const result = await updateDocument('Customer', 'CUST-00001', {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Network Error');
    });

    it('should handle response with no name returned', async () => {
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {}
        }
      });

      const result = await updateDocument('Customer', 'CUST-00001', {
        customer_name: 'Updated Name'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('FIELD_ERROR');
      expect(result.error?.message).toBe('Failed to update document - no name returned');
    });

    it('should handle partial field updates', async () => {
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'CUST-00001'
          }
        }
      });

      const result = await updateDocument('Customer', 'CUST-00001', {
        territory: 'US'
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('CUST-00001');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/resource/Customer/CUST-00001', {
        data: {
          territory: 'US'
        }
      });
    });

    it('should handle multiple field updates', async () => {
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'ITEM-00001'
          }
        }
      });

      const result = await updateDocument('Item', 'ITEM-00001', {
        item_name: 'Updated Item Name',
        description: 'Updated description',
        stock_uom: 'Nos',
        is_stock_item: 1
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('ITEM-00001');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/resource/Item/ITEM-00001', {
        data: {
          item_name: 'Updated Item Name',
          description: 'Updated description',
          stock_uom: 'Nos',
          is_stock_item: 1
        }
      });
    });
  });

  describe('deleteDocument', () => {
    it('should successfully delete a document', async () => {
      // Mock successful deletion response
      mockAxiosInstance.delete.mockResolvedValue({
        data: {
          message: 'Document deleted successfully'
        }
      });

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.deleted).toBe(true);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/resource/Customer/CUST-00001');
    });

    it('should handle unauthenticated request', async () => {
      (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
    });

    it('should validate required doctype parameter', async () => {
      const result = await deleteDocument('', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DELETE_NOT_ALLOWED');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
      expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
    });

    it('should validate doctype parameter type', async () => {
      const result = await deleteDocument(null as any, 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DELETE_NOT_ALLOWED');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
      expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
    });

    it('should validate required name parameter', async () => {
      const result = await deleteDocument('Customer', '');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DELETE_NOT_ALLOWED');
      expect(result.error?.message).toBe('Document name is required and must be a string');
      expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
    });

    it('should validate name parameter type', async () => {
      const result = await deleteDocument('Customer', undefined as any);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DELETE_NOT_ALLOWED');
      expect(result.error?.message).toBe('Document name is required and must be a string');
      expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
    });

    it('should handle authentication config not found', async () => {
      (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Authentication configuration not found');
    });

    it('should handle no authenticated client', async () => {
      (erpAuthenticator as any).client = null;

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('No authenticated client available');
    });

    it('should handle document not found (404)', async () => {
      mockAxiosInstance.delete.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Document not found' }
        }
      });

      const result = await deleteDocument('Customer', 'NONEXISTENT');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DELETE_NOT_ALLOWED');
      expect(result.error?.message).toBe('Document Customer/NONEXISTENT not found');
    });

    it('should handle insufficient permissions (403)', async () => {
      mockAxiosInstance.delete.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      });

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DELETE_NOT_ALLOWED');
      expect(result.error?.message).toBe('Insufficient permissions to delete Customer/CUST-00001');
    });

    it('should handle protected document (400)', async () => {
      mockAxiosInstance.delete.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Cannot delete Customer. This document is linked with other records.' }
        }
      });

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DELETE_NOT_ALLOWED');
      expect(result.error?.message).toBe('Cannot delete Customer. This document is linked with other records.');
    });

    it('should handle constraint violation (409)', async () => {
      mockAxiosInstance.delete.mockRejectedValue({
        response: {
          status: 409,
          data: { message: 'Constraint violation' }
        }
      });

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DELETE_NOT_ALLOWED');
      expect(result.error?.message).toBe('Constraint violation');
    });

    it('should handle 400 error without message', async () => {
      mockAxiosInstance.delete.mockRejectedValue({
        response: {
          status: 400,
          data: {}
        }
      });

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DELETE_NOT_ALLOWED');
      expect(result.error?.message).toBe('Cannot delete Customer/CUST-00001 - document may be protected or have dependencies');
    });

    it('should handle ERPNext API errors with custom message', async () => {
      mockAxiosInstance.delete.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Custom ERPNext error' }
        }
      });

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DELETE_NOT_ALLOWED');
      expect(result.error?.message).toBe('Custom ERPNext error');
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.delete.mockRejectedValue(new Error('Network Error'));

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DELETE_NOT_ALLOWED');
      expect(result.error?.message).toBe('Network Error');
    });

    it('should handle successful deletion of different document types', async () => {
      mockAxiosInstance.delete.mockResolvedValue({
        data: {
          message: 'Item deleted successfully'
        }
      });

      const result = await deleteDocument('Item', 'ITEM-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.deleted).toBe(true);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/resource/Item/ITEM-00001');
    });

    it('should handle successful deletion with no response data', async () => {
      mockAxiosInstance.delete.mockResolvedValue({
        data: null
      });

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.deleted).toBe(true);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/resource/Customer/CUST-00001');
    });

    it('should handle successful deletion with empty response', async () => {
      mockAxiosInstance.delete.mockResolvedValue({});

      const result = await deleteDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.deleted).toBe(true);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/resource/Customer/CUST-00001');
    });
  });
});