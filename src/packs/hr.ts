import { erpAuthenticator } from '../core/auth';
import { createDocument } from '../core/crud';
import { listDocuments } from '../core/crud';
import { workflowAction } from '../core/workflow';
import { logger, redactSensitiveData } from '../observability/logger';

export interface HrCheckInRequest {
  location?: string;
  device_id?: string;
}

export interface HrCheckInResponse {
  ok: boolean;
  data?: {
    name: string;
    time: string;
    employee: string;
    log_type: string;
    location?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface HrCheckOutRequest {
  reason?: string;
  device_id?: string;
}

export interface HrCheckOutResponse {
  ok: boolean;
  data?: {
    name: string;
    time: string;
    employee: string;
    log_type: string;
    reason?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface GetLeaveBalanceRequest {
  leave_type?: string;
}

export interface GetLeaveBalanceResponse {
  ok: boolean;
  data?: {
    balances: Array<{
      leave_type: string;
      leaves_allocated: number;
      leaves_taken: number;
      leaves_remaining: number;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ApplyLeaveRequest {
  leave_type: string;
  from_date: string;
  to_date: string;
  reason?: string;
}

export interface ApplyLeaveResponse {
  ok: boolean;
  data?: {
    name: string;
    leave_type: string;
    from_date: string;
    to_date: string;
    total_leave_days: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface GetPendingApprovalsResponse {
  ok: boolean;
  data?: {
    pending_documents: Array<{
      doctype: string;
      name: string;
      workflow_state: string;
      creation: string;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ApproveDocumentRequest {
  doctype: string;
  name: string;
  action: string;
}

export interface ApproveDocumentResponse {
  ok: boolean;
  data?: {
    name: string;
    doctype: string;
    workflow_state: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function hrCheckIn(location?: string, device_id?: string): Promise<HrCheckInResponse> {
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

    // Get current user info for employee field
    const userInfoResponse = await erpAuthenticator.whoami();
    if (!userInfoResponse.ok || !userInfoResponse.data?.user) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Unable to get user information'
        }
      };
    }

    const userInfo = userInfoResponse.data;

    // Try to find employee record for user
    const employeeResult = await listDocuments('Employee', { user_id: userInfo.user }, ['name', 'employee_name']);
    let employeeId = userInfo.user;

    if (employeeResult.ok && employeeResult.data?.docs && employeeResult.data.docs.length > 0) {
      employeeId = employeeResult.data.docs[0].name;
    } else {
      // No employee record found, return informative error
      return {
        ok: false,
        error: {
          code: 'EMPLOYEE_NOT_FOUND',
          message: 'Employee record not found for current user. HR operations require an Employee record to be created and linked to your user account.'
        }
      };
    }

    logger.info('HR check-in requested', redactSensitiveData({
      employee: employeeId,
      location: location || 'not_provided'
    }));

    // Create Employee Checkin document
    const checkinDoc = {
      employee: employeeId,
      time: new Date().toISOString(),
      log_type: 'IN',
      ...(location && { location }),
      ...(device_id && { device_id })
    };

    const result = await createDocument('Employee Checkin', checkinDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    logger.info('HR check-in completed', {
      employee: employeeId,
      checkin_name: result.data?.name
    });

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        time: checkinDoc.time,
        employee: employeeId,
        log_type: 'IN',
        ...(location && { location })
      }
    };

  } catch (error: any) {
    logger.error('Failed to process HR check-in', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to process check-in'
      }
    };
  }
}

export async function hrCheckOut(reason?: string, device_id?: string): Promise<HrCheckOutResponse> {
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

    // Get current user info for employee field
    const userInfoResponse = await erpAuthenticator.whoami();
    if (!userInfoResponse.ok || !userInfoResponse.data?.user) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Unable to get user information'
        }
      };
    }

    const userInfo = userInfoResponse.data;

    // Try to find employee record for user
    const employeeResult = await listDocuments('Employee', { user_id: userInfo.user }, ['name', 'employee_name']);
    let employeeId = userInfo.user;

    if (employeeResult.ok && employeeResult.data?.docs && employeeResult.data.docs.length > 0) {
      employeeId = employeeResult.data.docs[0].name;
    } else {
      // No employee record found, return informative error
      return {
        ok: false,
        error: {
          code: 'EMPLOYEE_NOT_FOUND',
          message: 'Employee record not found for current user. HR operations require an Employee record to be created and linked to your user account.'
        }
      };
    }

    logger.info('HR check-out requested', redactSensitiveData({
      employee: employeeId,
      reason: reason || 'not_provided'
    }));

    // Create Employee Checkin document with OUT type
    const checkoutDoc = {
      employee: employeeId,
      time: new Date().toISOString(),
      log_type: 'OUT',
      ...(reason && { reason }),
      ...(device_id && { device_id })
    };

    const result = await createDocument('Employee Checkin', checkoutDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    logger.info('HR check-out completed', {
      employee: employeeId,
      checkout_name: result.data?.name
    });

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        time: checkoutDoc.time,
        employee: employeeId,
        log_type: 'OUT',
        ...(reason && { reason })
      }
    };

  } catch (error: any) {
    logger.error('Failed to process HR check-out', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to process check-out'
      }
    };
  }
}

export async function getLeaveBalance(leave_type?: string): Promise<GetLeaveBalanceResponse> {
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

    // Get current user info for employee field
    const userInfoResponse = await erpAuthenticator.whoami();
    if (!userInfoResponse.ok || !userInfoResponse.data?.user) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Unable to get user information'
        }
      };
    }

    const userInfo = userInfoResponse.data;

    // Try to find employee record for user
    const employeeResult = await listDocuments('Employee', { user_id: userInfo.user }, ['name', 'employee_name']);
    let employeeId = userInfo.user;

    if (employeeResult.ok && employeeResult.data?.docs && employeeResult.data.docs.length > 0) {
      employeeId = employeeResult.data.docs[0].name;
    } else {
      // No employee record found, return informative error
      return {
        ok: false,
        error: {
          code: 'EMPLOYEE_NOT_FOUND',
          message: 'Employee record not found for current user. HR operations require an Employee record to be created and linked to your user account.'
        }
      };
    }

    logger.info('Leave balance requested', redactSensitiveData({
      employee: employeeId,
      leave_type: leave_type || 'all'
    }));

    // Build filters for Leave Allocation (fallback from Leave Ledger Entry)
    const filters: any = {
      employee: employeeId
    };

    if (leave_type) {
      filters.leave_type = leave_type;
    }

    // Try Leave Ledger Entry first, fall back to Leave Allocation
    let result = await listDocuments('Leave Ledger Entry', filters, ['leave_type', 'leaves_allocated', 'leaves_taken']);

    if (!result.ok) {
      // If Leave Ledger Entry doctype doesn't exist, try Leave Allocation
      logger.info('Leave Ledger Entry not available, trying Leave Allocation');
      result = await listDocuments('Leave Allocation', filters, ['leave_type', 'total_leaves_allocated', 'leaves_taken']);

      if (!result.ok) {
        return {
          ok: false,
          error: {
            code: 'DOCTYPE_NOT_AVAILABLE',
            message: 'Leave balance doctypes (Leave Ledger Entry, Leave Allocation) are not available in this ERPNext instance. This may be a demo server limitation.'
          }
        };
      }
    }

    // Process leave balances (handle both doctype formats)
    const balances = (result.data?.docs || []).map((entry: any) => {
      const allocated = entry.leaves_allocated || entry.total_leaves_allocated || 0;
      const taken = entry.leaves_taken || 0;
      return {
        leave_type: entry.leave_type,
        leaves_allocated: allocated,
        leaves_taken: taken,
        leaves_remaining: allocated - taken
      };
    });

    logger.info('Leave balance retrieved', {
      employee: employeeId,
      balance_count: balances.length
    });

    return {
      ok: true,
      data: {
        balances
      }
    };

  } catch (error: any) {
    logger.error('Failed to get leave balance', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to get leave balance'
      }
    };
  }
}

export async function applyLeave(
  leave_type: string,
  from_date: string,
  to_date: string,
  reason?: string
): Promise<ApplyLeaveResponse> {
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
    if (!leave_type || typeof leave_type !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Leave type is required and must be a string'
        }
      };
    }

    if (!from_date || typeof from_date !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'From date is required and must be a string'
        }
      };
    }

    if (!to_date || typeof to_date !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'To date is required and must be a string'
        }
      };
    }

    // Get current user info for employee field
    const userInfoResponse = await erpAuthenticator.whoami();
    if (!userInfoResponse.ok || !userInfoResponse.data?.user) {
      return {
        ok: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Unable to get user information'
        }
      };
    }

    const userInfo = userInfoResponse.data;

    logger.info('Leave application requested', redactSensitiveData({
      employee: userInfo.user,
      leave_type,
      from_date,
      to_date
    }));

    // Calculate leave days (simple calculation)
    const fromDateObj = new Date(from_date);
    const toDateObj = new Date(to_date);
    const totalLeaveDays = Math.ceil((toDateObj.getTime() - fromDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Create Leave Application document
    const leaveDoc = {
      employee: userInfo.user,
      leave_type,
      from_date,
      to_date,
      total_leave_days: totalLeaveDays,
      ...(reason && { description: reason })
    };

    const result = await createDocument('Leave Application', leaveDoc);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    logger.info('Leave application created', {
      employee: userInfo.user,
      leave_application_name: result.data?.name,
      total_leave_days: totalLeaveDays
    });

    return {
      ok: true,
      data: {
        name: result.data?.name || '',
        leave_type,
        from_date,
        to_date,
        total_leave_days: totalLeaveDays
      }
    };

  } catch (error: any) {
    logger.error('Failed to apply for leave', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to apply for leave'
      }
    };
  }
}

export async function getPendingApprovals(): Promise<GetPendingApprovalsResponse> {
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

    logger.info('Pending approvals requested');

    // Get pending documents from various doctypes that require approval
    const doctypes = ['Leave Application', 'Expense Claim', 'Purchase Order'];
    const allPendingDocs: any[] = [];

    for (const doctype of doctypes) {
      try {
        const result = await listDocuments(doctype, { docstatus: 0 }, ['name', 'workflow_state', 'creation']);

        if (result.ok && result.data?.docs) {
          const pendingDocs = result.data.docs
            .filter((doc: any) => doc.workflow_state && doc.workflow_state.includes('Pending'))
            .map((doc: any) => ({
              doctype,
              name: doc.name,
              workflow_state: doc.workflow_state,
              creation: doc.creation
            }));

          allPendingDocs.push(...pendingDocs);
        }
      } catch (error) {
        // Continue with other doctypes if one fails
        logger.warn(`Failed to get pending approvals for ${doctype}`, { error: (error as Error).message });
      }
    }

    logger.info('Pending approvals retrieved', {
      total_pending: allPendingDocs.length
    });

    return {
      ok: true,
      data: {
        pending_documents: allPendingDocs
      }
    };

  } catch (error: any) {
    logger.error('Failed to get pending approvals', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to get pending approvals'
      }
    };
  }
}

export async function approveDocument(
  doctype: string,
  name: string,
  action: string = 'Approve'
): Promise<ApproveDocumentResponse> {
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

    logger.info('Document approval requested', redactSensitiveData({
      doctype,
      name,
      action
    }));

    // Execute workflow action using core workflow
    const result = await workflowAction(doctype, name, action);

    if (!result.ok) {
      return {
        ok: false,
        error: result.error
      };
    }

    logger.info('Document approval completed', {
      doctype,
      name,
      action,
      new_state: result.data?.workflow_state
    });

    return {
      ok: true,
      data: {
        name,
        doctype,
        workflow_state: result.data?.workflow_state || ''
      }
    };

  } catch (error: any) {
    logger.error('Failed to approve document', {
      error: error.message
    });

    return {
      ok: false,
      error: {
        code: 'FIELD_ERROR',
        message: error.message || 'Failed to approve document'
      }
    };
  }
}