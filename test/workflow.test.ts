import axios from 'axios';
import { submitDocument, cancelDocument, workflowAction } from '../src/core/workflow';
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

describe('Workflow Module - Document Submission', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock axios instance
    mockAxiosInstance = {
      put: jest.fn(),
      post: jest.fn()
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

  describe('submitDocument', () => {
    it('should successfully submit a document', async () => {
      // Mock successful submission response
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'SI-00001',
            docstatus: 1,
            workflow_state: 'Submitted'
          }
        }
      });

      const result = await submitDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.submitted).toBe(true);
      expect(result.data?.workflow_state).toBe('Submitted');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/resource/Sales Invoice/SI-00001', {
        data: {
          docstatus: 1
        }
      });
    });

    it('should handle successful submission without workflow state', async () => {
      // Mock successful submission response without workflow_state
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'CUST-00001',
            docstatus: 1
          }
        }
      });

      const result = await submitDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.submitted).toBe(true);
      expect(result.data?.workflow_state).toBeUndefined();
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/resource/Customer/CUST-00001', {
        data: {
          docstatus: 1
        }
      });
    });

    it('should handle unauthenticated request', async () => {
      (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

      const result = await submitDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate required doctype parameter', async () => {
      const result = await submitDocument('', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate doctype parameter type', async () => {
      const result = await submitDocument(null as any, 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate required name parameter', async () => {
      const result = await submitDocument('Sales Invoice', '');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Document name is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate name parameter type', async () => {
      const result = await submitDocument('Sales Invoice', undefined as any);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Document name is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should handle authentication config not found', async () => {
      (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

      const result = await submitDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Authentication configuration not found');
    });

    it('should handle no authenticated client', async () => {
      (erpAuthenticator as any).client = null;

      const result = await submitDocument('Sales Invoice', 'SI-00001');

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

      const result = await submitDocument('Sales Invoice', 'NONEXISTENT');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Document Sales Invoice/NONEXISTENT not found');
    });

    it('should handle insufficient permissions (403)', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      });

      const result = await submitDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Insufficient permissions to submit Sales Invoice/SI-00001');
    });

    it('should handle workflow validation errors (400)', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Cannot submit document without required fields' }
        }
      });

      const result = await submitDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Cannot submit document without required fields');
    });

    it('should handle 400 error without message', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 400,
          data: {}
        }
      });

      const result = await submitDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Cannot submit Sales Invoice/SI-00001 - workflow validation failed');
    });

    it('should handle workflow state conflicts (409)', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 409,
          data: { message: 'Document is already submitted' }
        }
      });

      const result = await submitDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Document is already submitted');
    });

    it('should handle 409 error without message', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 409,
          data: {}
        }
      });

      const result = await submitDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Document Sales Invoice/SI-00001 is already submitted or in wrong workflow state');
    });

    it('should handle ERPNext API errors with custom message', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Custom ERPNext error' }
        }
      });

      const result = await submitDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Custom ERPNext error');
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.put.mockRejectedValue(new Error('Network Error'));

      const result = await submitDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
      expect(result.error?.message).toBe('Network Error');
    });

    it('should handle successful submission of different document types', async () => {
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'PO-00001',
            docstatus: 1,
            workflow_state: 'Pending Approval'
          }
        }
      });

      const result = await submitDocument('Purchase Order', 'PO-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.submitted).toBe(true);
      expect(result.data?.workflow_state).toBe('Pending Approval');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/resource/Purchase Order/PO-00001', {
        data: {
          docstatus: 1
        }
      });
    });

    it('should handle submission with complex workflow state', async () => {
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'EXP-00001',
            docstatus: 1,
            workflow_state: 'Waiting for Manager Approval'
          }
        }
      });

      const result = await submitDocument('Expense Claim', 'EXP-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.submitted).toBe(true);
      expect(result.data?.workflow_state).toBe('Waiting for Manager Approval');
    });

    it('should handle successful submission with minimal response data', async () => {
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'TASK-00001',
            docstatus: 1
          }
        }
      });

      const result = await submitDocument('Task', 'TASK-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.submitted).toBe(true);
      expect(result.data?.workflow_state).toBeUndefined();
    });
  });

  describe('cancelDocument', () => {
    it('should successfully cancel a document', async () => {
      // Mock successful cancellation response
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'SI-00001',
            docstatus: 2,
            workflow_state: 'Cancelled'
          }
        }
      });

      const result = await cancelDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.cancelled).toBe(true);
      expect(result.data?.workflow_state).toBe('Cancelled');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/resource/Sales Invoice/SI-00001', {
        data: {
          docstatus: 2
        }
      });
    });

    it('should handle successful cancellation without workflow state', async () => {
      // Mock successful cancellation response without workflow_state
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'CUST-00001',
            docstatus: 2
          }
        }
      });

      const result = await cancelDocument('Customer', 'CUST-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.cancelled).toBe(true);
      expect(result.data?.workflow_state).toBeUndefined();
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/resource/Customer/CUST-00001', {
        data: {
          docstatus: 2
        }
      });
    });

    it('should handle unauthenticated request', async () => {
      (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

      const result = await cancelDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate required doctype parameter', async () => {
      const result = await cancelDocument('', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate doctype parameter type', async () => {
      const result = await cancelDocument(null as any, 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate required name parameter', async () => {
      const result = await cancelDocument('Sales Invoice', '');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Document name is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should validate name parameter type', async () => {
      const result = await cancelDocument('Sales Invoice', undefined as any);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Document name is required and must be a string');
      expect(mockAxiosInstance.put).not.toHaveBeenCalled();
    });

    it('should handle authentication config not found', async () => {
      (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

      const result = await cancelDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Authentication configuration not found');
    });

    it('should handle no authenticated client', async () => {
      (erpAuthenticator as any).client = null;

      const result = await cancelDocument('Sales Invoice', 'SI-00001');

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

      const result = await cancelDocument('Sales Invoice', 'NONEXISTENT');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Document Sales Invoice/NONEXISTENT not found');
    });

    it('should handle insufficient permissions (403)', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      });

      const result = await cancelDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Insufficient permissions to cancel Sales Invoice/SI-00001');
    });

    it('should handle already cancelled document (400)', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Document is already cancelled' }
        }
      });

      const result = await cancelDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Document is already cancelled');
    });

    it('should handle 400 error without message', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 400,
          data: {}
        }
      });

      const result = await cancelDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Cannot cancel Sales Invoice/SI-00001 - document may already be cancelled or in wrong state');
    });

    it('should handle document state conflicts (409)', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 409,
          data: { message: 'Document cannot be cancelled in current state' }
        }
      });

      const result = await cancelDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Document cannot be cancelled in current state');
    });

    it('should handle 409 error without message', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 409,
          data: {}
        }
      });

      const result = await cancelDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Document Sales Invoice/SI-00001 is already cancelled or cannot be cancelled');
    });

    it('should handle ERPNext API errors with custom message', async () => {
      mockAxiosInstance.put.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Custom ERPNext error' }
        }
      });

      const result = await cancelDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Custom ERPNext error');
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.put.mockRejectedValue(new Error('Network Error'));

      const result = await cancelDocument('Sales Invoice', 'SI-00001');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('ALREADY_CANCELLED');
      expect(result.error?.message).toBe('Network Error');
    });

    it('should handle successful cancellation of different document types', async () => {
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'PO-00001',
            docstatus: 2,
            workflow_state: 'Cancelled'
          }
        }
      });

      const result = await cancelDocument('Purchase Order', 'PO-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.cancelled).toBe(true);
      expect(result.data?.workflow_state).toBe('Cancelled');
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/resource/Purchase Order/PO-00001', {
        data: {
          docstatus: 2
        }
      });
    });

    it('should handle cancellation with complex workflow state', async () => {
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'EXP-00001',
            docstatus: 2,
            workflow_state: 'Rejected by Manager'
          }
        }
      });

      const result = await cancelDocument('Expense Claim', 'EXP-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.cancelled).toBe(true);
      expect(result.data?.workflow_state).toBe('Rejected by Manager');
    });

    it('should handle successful cancellation with minimal response data', async () => {
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          data: {
            name: 'TASK-00001',
            docstatus: 2
          }
        }
      });

      const result = await cancelDocument('Task', 'TASK-00001');

      expect(result.ok).toBe(true);
      expect(result.data?.cancelled).toBe(true);
      expect(result.data?.workflow_state).toBeUndefined();
    });
  });

  describe('workflowAction', () => {
    it('should successfully execute a workflow action', async () => {
      // Mock successful workflow action response
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: {
            name: 'SI-00001',
            workflow_state: 'Approved'
          }
        }
      });

      const result = await workflowAction('Sales Invoice', 'SI-00001', 'Approve');

      expect(result.ok).toBe(true);
      expect(result.data?.action_taken).toBe('Approve');
      expect(result.data?.workflow_state).toBe('Approved');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/method/frappe.model.workflow.apply_workflow', {
        doc: JSON.stringify({
          doctype: 'Sales Invoice',
          name: 'SI-00001'
        }),
        action: 'Approve'
      });
    });

    it('should handle successful workflow action without workflow state', async () => {
      // Mock successful workflow action response without workflow_state
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: {
            name: 'TASK-00001'
          }
        }
      });

      const result = await workflowAction('Task', 'TASK-00001', 'Complete');

      expect(result.ok).toBe(true);
      expect(result.data?.action_taken).toBe('Complete');
      expect(result.data?.workflow_state).toBeUndefined();
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/method/frappe.model.workflow.apply_workflow', {
        doc: JSON.stringify({
          doctype: 'Task',
          name: 'TASK-00001'
        }),
        action: 'Complete'
      });
    });

    it('should handle unauthenticated request', async () => {
      (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

      const result = await workflowAction('Sales Invoice', 'SI-00001', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Not authenticated. Please call erp.auth.connect first.');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should validate required doctype parameter', async () => {
      const result = await workflowAction('', 'SI-00001', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should validate doctype parameter type', async () => {
      const result = await workflowAction(null as any, 'SI-00001', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Doctype is required and must be a string');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should validate required name parameter', async () => {
      const result = await workflowAction('Sales Invoice', '', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Document name is required and must be a string');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should validate name parameter type', async () => {
      const result = await workflowAction('Sales Invoice', undefined as any, 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Document name is required and must be a string');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should validate required action parameter', async () => {
      const result = await workflowAction('Sales Invoice', 'SI-00001', '');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Action is required and must be a string');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should validate action parameter type', async () => {
      const result = await workflowAction('Sales Invoice', 'SI-00001', null as any);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Action is required and must be a string');
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should handle authentication config not found', async () => {
      (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

      const result = await workflowAction('Sales Invoice', 'SI-00001', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Authentication configuration not found');
    });

    it('should handle no authenticated client', async () => {
      (erpAuthenticator as any).client = null;

      const result = await workflowAction('Sales Invoice', 'SI-00001', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('No authenticated client available');
    });

    it('should handle document not found or workflow not configured (404)', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Workflow not found' }
        }
      });

      const result = await workflowAction('Sales Invoice', 'NONEXISTENT', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Document Sales Invoice/NONEXISTENT not found or workflow not configured');
    });

    it('should handle insufficient permissions (403)', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      });

      const result = await workflowAction('Sales Invoice', 'SI-00001', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Insufficient permissions to execute action \'Approve\' on Sales Invoice/SI-00001');
    });

    it('should handle invalid action for current state (400)', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Action not allowed in current state' }
        }
      });

      const result = await workflowAction('Sales Invoice', 'SI-00001', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Action not allowed in current state');
    });

    it('should handle 400 error without message', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 400,
          data: {}
        }
      });

      const result = await workflowAction('Sales Invoice', 'SI-00001', 'InvalidAction');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Invalid action \'InvalidAction\' for Sales Invoice/SI-00001 in current state');
    });

    it('should handle workflow state conflicts (409)', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 409,
          data: { message: 'Document cannot be modified in current state' }
        }
      });

      const result = await workflowAction('Sales Invoice', 'SI-00001', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Document cannot be modified in current state');
    });

    it('should handle 409 error without message', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 409,
          data: {}
        }
      });

      const result = await workflowAction('Sales Invoice', 'SI-00001', 'Reject');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Action \'Reject\' cannot be executed on Sales Invoice/SI-00001 in current state');
    });

    it('should handle ERPNext API errors with custom message', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Custom ERPNext workflow error' }
        }
      });

      const result = await workflowAction('Sales Invoice', 'SI-00001', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Custom ERPNext workflow error');
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network Error'));

      const result = await workflowAction('Sales Invoice', 'SI-00001', 'Approve');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION');
      expect(result.error?.message).toBe('Network Error');
    });

    it('should handle different workflow actions', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: {
            name: 'EXP-00001',
            workflow_state: 'Rejected'
          }
        }
      });

      const result = await workflowAction('Expense Claim', 'EXP-00001', 'Reject');

      expect(result.ok).toBe(true);
      expect(result.data?.action_taken).toBe('Reject');
      expect(result.data?.workflow_state).toBe('Rejected');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/method/frappe.model.workflow.apply_workflow', {
        doc: JSON.stringify({
          doctype: 'Expense Claim',
          name: 'EXP-00001'
        }),
        action: 'Reject'
      });
    });

    it('should handle complex workflow transitions', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: {
            name: 'PO-00001',
            workflow_state: 'Pending Manager Approval'
          }
        }
      });

      const result = await workflowAction('Purchase Order', 'PO-00001', 'Send for Manager Approval');

      expect(result.ok).toBe(true);
      expect(result.data?.action_taken).toBe('Send for Manager Approval');
      expect(result.data?.workflow_state).toBe('Pending Manager Approval');
    });

    it('should handle action with special characters', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: {
            name: 'QUO-00001',
            workflow_state: 'Customer Review'
          }
        }
      });

      const result = await workflowAction('Quotation', 'QUO-00001', 'Send to Customer');

      expect(result.ok).toBe(true);
      expect(result.data?.action_taken).toBe('Send to Customer');
      expect(result.data?.workflow_state).toBe('Customer Review');
    });

    it('should handle successful action with minimal response data', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          message: {
            name: 'LEAD-00001'
          }
        }
      });

      const result = await workflowAction('Lead', 'LEAD-00001', 'Qualify');

      expect(result.ok).toBe(true);
      expect(result.data?.action_taken).toBe('Qualify');
      expect(result.data?.workflow_state).toBeUndefined();
    });
  });
});