import { hrCheckIn, hrCheckOut, getLeaveBalance, applyLeave, getPendingApprovals, approveDocument } from '../src/packs/hr';
import { erpAuthenticator } from '../src/core/auth';

// Mock the auth module
jest.mock('../src/core/auth', () => ({
  erpAuthenticator: {
    isAuthenticated: jest.fn(),
    getConfig: jest.fn(),
    whoami: jest.fn(),
    client: null
  }
}));

// Mock the logger
jest.mock('../src/observability/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  redactSensitiveData: jest.fn((data) => data)
}));

// Mock axios
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

// Mock core CRUD functions
jest.mock('../src/core/crud', () => ({
  createDocument: jest.fn(),
  listDocuments: jest.fn()
}));

// Mock core workflow functions
jest.mock('../src/core/workflow', () => ({
  workflowAction: jest.fn()
}));

import { createDocument, listDocuments } from '../src/core/crud';
import { workflowAction } from '../src/core/workflow';

describe('HR Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default successful auth
    (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(true);
    (erpAuthenticator.getConfig as jest.Mock).mockReturnValue({ baseUrl: 'https://test.com' });
    (erpAuthenticator.whoami as jest.Mock).mockResolvedValue({
      ok: true,
      data: { user: 'testuser@test.com' }
    });
    (erpAuthenticator as any).client = mockAxios;
  });

  describe('hrCheckIn', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await hrCheckIn();

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });

      test('should fail when user info is not available', async () => {
        (erpAuthenticator.whoami as jest.Mock).mockResolvedValue({
          ok: false,
          error: { code: 'AUTH_FAILED', message: 'No user info' }
        });

        const result = await hrCheckIn();

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Unable to get user information'
          }
        });
      });

      test('should fail when user info has no user field', async () => {
        (erpAuthenticator.whoami as jest.Mock).mockResolvedValue({
          ok: true,
          data: {}
        });

        const result = await hrCheckIn();

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Unable to get user information'
          }
        });
      });
    });

    describe('Successful Operations', () => {
      test('should create check-in without location', async () => {
        (createDocument as jest.Mock).mockResolvedValue({
          ok: true,
          data: { name: 'EMP-CHK-001' }
        });

        const result = await hrCheckIn();

        expect(result.ok).toBe(true);
        expect(result.data?.name).toBe('EMP-CHK-001');
        expect(result.data?.employee).toBe('testuser@test.com');
        expect(result.data?.log_type).toBe('IN');
        expect(createDocument).toHaveBeenCalledWith('Employee Checkin', expect.objectContaining({
          employee: 'testuser@test.com',
          log_type: 'IN'
        }));
      });

      test('should create check-in with location and device_id', async () => {
        (createDocument as jest.Mock).mockResolvedValue({
          ok: true,
          data: { name: 'EMP-CHK-002' }
        });

        const result = await hrCheckIn('Office Building A', 'DEVICE-123');

        expect(result.ok).toBe(true);
        expect(result.data?.location).toBe('Office Building A');
        expect(createDocument).toHaveBeenCalledWith('Employee Checkin', expect.objectContaining({
          employee: 'testuser@test.com',
          log_type: 'IN',
          location: 'Office Building A',
          device_id: 'DEVICE-123'
        }));
      });
    });

    describe('Error Handling', () => {
      test('should handle createDocument errors', async () => {
        (createDocument as jest.Mock).mockResolvedValue({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Employee is required'
          }
        });

        const result = await hrCheckIn();

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Employee is required'
          }
        });
      });

      test('should handle unexpected errors', async () => {
        (createDocument as jest.Mock).mockRejectedValue(new Error('Network error'));

        const result = await hrCheckIn();

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Network error'
          }
        });
      });
    });
  });

  describe('hrCheckOut', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await hrCheckOut();

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });
    });

    describe('Successful Operations', () => {
      test('should create check-out without reason', async () => {
        (createDocument as jest.Mock).mockResolvedValue({
          ok: true,
          data: { name: 'EMP-CHK-003' }
        });

        const result = await hrCheckOut();

        expect(result.ok).toBe(true);
        expect(result.data?.log_type).toBe('OUT');
        expect(createDocument).toHaveBeenCalledWith('Employee Checkin', expect.objectContaining({
          employee: 'testuser@test.com',
          log_type: 'OUT'
        }));
      });

      test('should create check-out with reason', async () => {
        (createDocument as jest.Mock).mockResolvedValue({
          ok: true,
          data: { name: 'EMP-CHK-004' }
        });

        const result = await hrCheckOut('End of work day');

        expect(result.ok).toBe(true);
        expect(result.data?.reason).toBe('End of work day');
        expect(createDocument).toHaveBeenCalledWith('Employee Checkin', expect.objectContaining({
          employee: 'testuser@test.com',
          log_type: 'OUT',
          reason: 'End of work day'
        }));
      });
    });
  });

  describe('getLeaveBalance', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await getLeaveBalance();

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });
    });

    describe('Successful Operations', () => {
      test('should get all leave balances', async () => {
        (listDocuments as jest.Mock).mockResolvedValue({
          ok: true,
          data: {
            docs: [
              { leave_type: 'Annual Leave', leaves_allocated: 20, leaves_taken: 5 },
              { leave_type: 'Sick Leave', leaves_allocated: 10, leaves_taken: 2 }
            ]
          }
        });

        const result = await getLeaveBalance();

        expect(result.ok).toBe(true);
        expect(result.data?.balances).toHaveLength(2);
        expect(result.data?.balances[0]).toEqual({
          leave_type: 'Annual Leave',
          leaves_allocated: 20,
          leaves_taken: 5,
          leaves_remaining: 15
        });
        expect(result.data?.balances[1]).toEqual({
          leave_type: 'Sick Leave',
          leaves_allocated: 10,
          leaves_taken: 2,
          leaves_remaining: 8
        });
      });

      test('should get specific leave type balance', async () => {
        (listDocuments as jest.Mock).mockResolvedValue({
          ok: true,
          data: {
            docs: [
              { leave_type: 'Annual Leave', leaves_allocated: 20, leaves_taken: 5 }
            ]
          }
        });

        const result = await getLeaveBalance('Annual Leave');

        expect(result.ok).toBe(true);
        expect(listDocuments).toHaveBeenCalledWith('Leave Ledger Entry', {
          employee: 'testuser@test.com',
          leave_type: 'Annual Leave'
        }, ['leave_type', 'leaves_allocated', 'leaves_taken']);
      });

      test('should handle empty leave balances', async () => {
        (listDocuments as jest.Mock).mockResolvedValue({
          ok: true,
          data: { docs: [] }
        });

        const result = await getLeaveBalance();

        expect(result.ok).toBe(true);
        expect(result.data?.balances).toHaveLength(0);
      });

      test('should handle missing allocated/taken values', async () => {
        (listDocuments as jest.Mock).mockResolvedValue({
          ok: true,
          data: {
            docs: [
              { leave_type: 'Annual Leave' }
            ]
          }
        });

        const result = await getLeaveBalance();

        expect(result.ok).toBe(true);
        expect(result.data?.balances[0]).toEqual({
          leave_type: 'Annual Leave',
          leaves_allocated: 0,
          leaves_taken: 0,
          leaves_remaining: 0
        });
      });
    });

    describe('Error Handling', () => {
      test('should handle listDocuments errors', async () => {
        (listDocuments as jest.Mock).mockResolvedValue({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'No access to Leave Ledger Entry'
          }
        });

        const result = await getLeaveBalance();

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'No access to Leave Ledger Entry'
          }
        });
      });
    });
  });

  describe('applyLeave', () => {
    describe('Input Validation', () => {
      test('should fail when leave_type is missing', async () => {
        const result = await applyLeave('', '2024-01-15', '2024-01-17');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Leave type is required and must be a string'
          }
        });
      });

      test('should fail when leave_type is not string', async () => {
        const result = await applyLeave(null as any, '2024-01-15', '2024-01-17');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Leave type is required and must be a string'
          }
        });
      });

      test('should fail when from_date is missing', async () => {
        const result = await applyLeave('Annual Leave', '', '2024-01-17');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'From date is required and must be a string'
          }
        });
      });

      test('should fail when to_date is missing', async () => {
        const result = await applyLeave('Annual Leave', '2024-01-15', '');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'To date is required and must be a string'
          }
        });
      });
    });

    describe('Successful Operations', () => {
      test('should create leave application without reason', async () => {
        (createDocument as jest.Mock).mockResolvedValue({
          ok: true,
          data: { name: 'HR-LAP-001' }
        });

        const result = await applyLeave('Annual Leave', '2024-01-15', '2024-01-17');

        expect(result.ok).toBe(true);
        expect(result.data?.name).toBe('HR-LAP-001');
        expect(result.data?.total_leave_days).toBe(3); // 15th, 16th, 17th
        expect(createDocument).toHaveBeenCalledWith('Leave Application', expect.objectContaining({
          employee: 'testuser@test.com',
          leave_type: 'Annual Leave',
          from_date: '2024-01-15',
          to_date: '2024-01-17',
          total_leave_days: 3
        }));
      });

      test('should create leave application with reason', async () => {
        (createDocument as jest.Mock).mockResolvedValue({
          ok: true,
          data: { name: 'HR-LAP-002' }
        });

        const result = await applyLeave('Sick Leave', '2024-01-20', '2024-01-22', 'Medical appointment');

        expect(result.ok).toBe(true);
        expect(createDocument).toHaveBeenCalledWith('Leave Application', expect.objectContaining({
          employee: 'testuser@test.com',
          leave_type: 'Sick Leave',
          description: 'Medical appointment',
          total_leave_days: 3
        }));
      });

      test('should calculate single day leave correctly', async () => {
        (createDocument as jest.Mock).mockResolvedValue({
          ok: true,
          data: { name: 'HR-LAP-003' }
        });

        const result = await applyLeave('Annual Leave', '2024-01-15', '2024-01-15');

        expect(result.ok).toBe(true);
        expect(result.data?.total_leave_days).toBe(1);
      });
    });

    describe('Error Handling', () => {
      test('should handle createDocument errors', async () => {
        (createDocument as jest.Mock).mockResolvedValue({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Leave type not found'
          }
        });

        const result = await applyLeave('Invalid Leave Type', '2024-01-15', '2024-01-17');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Leave type not found'
          }
        });
      });
    });
  });

  describe('getPendingApprovals', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await getPendingApprovals();

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });
    });

    describe('Successful Operations', () => {
      test('should get pending approvals from multiple doctypes', async () => {
        (listDocuments as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                { name: 'HR-LAP-001', workflow_state: 'Pending Manager Approval', creation: '2024-01-01' },
                { name: 'HR-LAP-002', workflow_state: 'Draft', creation: '2024-01-02' }
              ]
            }
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                { name: 'HR-EXP-001', workflow_state: 'Pending Finance Approval', creation: '2024-01-03' }
              ]
            }
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                { name: 'PUR-ORD-001', workflow_state: 'Pending CEO Approval', creation: '2024-01-04' }
              ]
            }
          });

        const result = await getPendingApprovals();

        expect(result.ok).toBe(true);
        expect(result.data?.pending_documents).toHaveLength(3);
        expect(result.data?.pending_documents).toContainEqual({
          doctype: 'Leave Application',
          name: 'HR-LAP-001',
          workflow_state: 'Pending Manager Approval',
          creation: '2024-01-01'
        });
        expect(result.data?.pending_documents).toContainEqual({
          doctype: 'Expense Claim',
          name: 'HR-EXP-001',
          workflow_state: 'Pending Finance Approval',
          creation: '2024-01-03'
        });
        expect(result.data?.pending_documents).toContainEqual({
          doctype: 'Purchase Order',
          name: 'PUR-ORD-001',
          workflow_state: 'Pending CEO Approval',
          creation: '2024-01-04'
        });
      });

      test('should handle empty pending approvals', async () => {
        (listDocuments as jest.Mock).mockResolvedValue({
          ok: true,
          data: { docs: [] }
        });

        const result = await getPendingApprovals();

        expect(result.ok).toBe(true);
        expect(result.data?.pending_documents).toHaveLength(0);
      });

      test('should filter out non-pending documents', async () => {
        (listDocuments as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                { name: 'HR-LAP-001', workflow_state: 'Approved', creation: '2024-01-01' },
                { name: 'HR-LAP-002', workflow_state: 'Pending Manager Approval', creation: '2024-01-02' }
              ]
            }
          })
          .mockResolvedValue({
            ok: true,
            data: { docs: [] }
          });

        const result = await getPendingApprovals();

        expect(result.ok).toBe(true);
        expect(result.data?.pending_documents).toHaveLength(1);
        expect(result.data?.pending_documents[0].name).toBe('HR-LAP-002');
      });

      test('should handle failures for individual doctypes gracefully', async () => {
        (listDocuments as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            data: {
              docs: [
                { name: 'HR-LAP-001', workflow_state: 'Pending Manager Approval', creation: '2024-01-01' }
              ]
            }
          })
          .mockRejectedValueOnce(new Error('Permission denied'))
          .mockResolvedValueOnce({
            ok: true,
            data: { docs: [] }
          });

        const result = await getPendingApprovals();

        expect(result.ok).toBe(true);
        expect(result.data?.pending_documents).toHaveLength(1);
      });
    });
  });

  describe('approveDocument', () => {
    describe('Input Validation', () => {
      test('should fail when doctype is missing', async () => {
        const result = await approveDocument('', 'DOC-001');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when name is missing', async () => {
        const result = await approveDocument('Leave Application', '');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document name is required and must be a string'
          }
        });
      });
    });

    describe('Successful Operations', () => {
      test('should approve document with default action', async () => {
        (workflowAction as jest.Mock).mockResolvedValue({
          ok: true,
          data: { workflow_state: 'Approved' }
        });

        const result = await approveDocument('Leave Application', 'HR-LAP-001');

        expect(result.ok).toBe(true);
        expect(result.data?.workflow_state).toBe('Approved');
        expect(workflowAction).toHaveBeenCalledWith('Leave Application', 'HR-LAP-001', 'Approve');
      });

      test('should approve document with custom action', async () => {
        (workflowAction as jest.Mock).mockResolvedValue({
          ok: true,
          data: { workflow_state: 'Rejected' }
        });

        const result = await approveDocument('Leave Application', 'HR-LAP-001', 'Reject');

        expect(result.ok).toBe(true);
        expect(result.data?.workflow_state).toBe('Rejected');
        expect(workflowAction).toHaveBeenCalledWith('Leave Application', 'HR-LAP-001', 'Reject');
      });
    });

    describe('Error Handling', () => {
      test('should handle workflow execution errors', async () => {
        (workflowAction as jest.Mock).mockResolvedValue({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'User cannot approve this document'
          }
        });

        const result = await approveDocument('Leave Application', 'HR-LAP-001');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'User cannot approve this document'
          }
        });
      });

      test('should handle unexpected errors', async () => {
        (workflowAction as jest.Mock).mockRejectedValue(new Error('Network timeout'));

        const result = await approveDocument('Leave Application', 'HR-LAP-001');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Network timeout'
          }
        });
      });
    });

    describe('RBAC Enforcement', () => {
      test('should call workflowAction which enforces RBAC', async () => {
        (workflowAction as jest.Mock).mockResolvedValue({
          ok: true,
          data: { workflow_state: 'Approved' }
        });

        await approveDocument('Leave Application', 'HR-LAP-001');

        expect(workflowAction).toHaveBeenCalledWith('Leave Application', 'HR-LAP-001', 'Approve');
      });
    });
  });
});