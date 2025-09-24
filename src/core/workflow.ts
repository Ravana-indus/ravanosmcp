import { erpAuthenticator } from './auth';
import { logger, redactSensitiveData } from '../observability/logger';

export interface SubmitDocumentRequest {
  doctype: string;
  name: string;
}

export interface SubmitDocumentResponse {
  ok: boolean;
  data?: {
    submitted: boolean;
    workflow_state?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CancelDocumentRequest {
  doctype: string;
  name: string;
}

export interface CancelDocumentResponse {
  ok: boolean;
  data?: {
    cancelled: boolean;
    workflow_state?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface WorkflowActionRequest {
  doctype: string;
  name: string;
  action: string;
}

export interface WorkflowActionResponse {
  ok: boolean;
  data?: {
    action_taken: string;
    workflow_state?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function submitDocument(
  doctype: string,
  name: string
): Promise<SubmitDocumentResponse> {
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
          code: 'PERMISSION_DENIED',
          message: 'Doctype is required and must be a string'
        }
      };
    }

    if (!name || typeof name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
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

    logger.info('Submitting document', redactSensitiveData({
      doctype,
      name
    }));

    // Submit document via ERPNext workflow API
    const response = await client.put(`/api/resource/${doctype}/${name}`, {
      data: {
        docstatus: 1
      }
    });

    const submittedDoc = response.data.data;
    const workflowState = submittedDoc?.workflow_state;

    logger.info('Document submitted successfully', {
      doctype,
      name,
      workflow_state: workflowState
    });

    return {
      ok: true,
      data: {
        submitted: true,
        workflow_state: workflowState
      }
    };

  } catch (error: any) {
    logger.error('Failed to submit document', redactSensitiveData({
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
          code: 'PERMISSION_DENIED',
          message: `Document ${doctype}/${name} not found`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Insufficient permissions to submit ${doctype}/${name}`
        }
      };
    }

    // Handle workflow validation errors
    if (error.response?.status === 400) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: error.response?.data?.message || `Cannot submit ${doctype}/${name} - workflow validation failed`
        }
      };
    }

    // Handle workflow state errors
    if (error.response?.status === 409) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: error.response?.data?.message || `Document ${doctype}/${name} is already submitted or in wrong workflow state`
        }
      };
    }

    if (error.response?.data?.message) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: error.response.data.message
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: error.message || 'Failed to submit document'
      }
    };
  }
}

export async function cancelDocument(
  doctype: string,
  name: string
): Promise<CancelDocumentResponse> {
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
          code: 'ALREADY_CANCELLED',
          message: 'Doctype is required and must be a string'
        }
      };
    }

    if (!name || typeof name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'ALREADY_CANCELLED',
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

    logger.info('Cancelling document', redactSensitiveData({
      doctype,
      name
    }));

    // Cancel document via ERPNext workflow API
    const response = await client.put(`/api/resource/${doctype}/${name}`, {
      data: {
        docstatus: 2
      }
    });

    const cancelledDoc = response.data.data;
    const workflowState = cancelledDoc?.workflow_state;

    logger.info('Document cancelled successfully', {
      doctype,
      name,
      workflow_state: workflowState
    });

    return {
      ok: true,
      data: {
        cancelled: true,
        workflow_state: workflowState
      }
    };

  } catch (error: any) {
    logger.error('Failed to cancel document', redactSensitiveData({
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
          code: 'ALREADY_CANCELLED',
          message: `Document ${doctype}/${name} not found`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'ALREADY_CANCELLED',
          message: `Insufficient permissions to cancel ${doctype}/${name}`
        }
      };
    }

    // Handle workflow validation errors - already cancelled or in wrong state
    if (error.response?.status === 400) {
      return {
        ok: false,
        error: {
          code: 'ALREADY_CANCELLED',
          message: error.response?.data?.message || `Cannot cancel ${doctype}/${name} - document may already be cancelled or in wrong state`
        }
      };
    }

    // Handle document state conflicts
    if (error.response?.status === 409) {
      return {
        ok: false,
        error: {
          code: 'ALREADY_CANCELLED',
          message: error.response?.data?.message || `Document ${doctype}/${name} is already cancelled or cannot be cancelled`
        }
      };
    }

    if (error.response?.data?.message) {
      return {
        ok: false,
        error: {
          code: 'ALREADY_CANCELLED',
          message: error.response.data.message
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'ALREADY_CANCELLED',
        message: error.message || 'Failed to cancel document'
      }
    };
  }
}

export async function workflowAction(
  doctype: string,
  name: string,
  action: string
): Promise<WorkflowActionResponse> {
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
          code: 'INVALID_ACTION',
          message: 'Doctype is required and must be a string'
        }
      };
    }

    if (!name || typeof name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'INVALID_ACTION',
          message: 'Document name is required and must be a string'
        }
      };
    }

    if (!action || typeof action !== 'string') {
      return {
        ok: false,
        error: {
          code: 'INVALID_ACTION',
          message: 'Action is required and must be a string'
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

    logger.info('Executing workflow action', redactSensitiveData({
      doctype,
      name,
      action
    }));

    // Execute workflow action via ERPNext workflow API
    const response = await client.post(`/api/method/frappe.model.workflow.apply_workflow`, {
      doc: JSON.stringify({
        doctype: doctype,
        name: name
      }),
      action: action
    });

    const actionResult = response.data.message;
    const workflowState = actionResult?.workflow_state;

    logger.info('Workflow action executed successfully', {
      doctype,
      name,
      action,
      workflow_state: workflowState
    });

    return {
      ok: true,
      data: {
        action_taken: action,
        workflow_state: workflowState
      }
    };

  } catch (error: any) {
    logger.error('Failed to execute workflow action', redactSensitiveData({
      doctype,
      name,
      action,
      error: error.message,
      response: error.response?.data
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'INVALID_ACTION',
          message: `Document ${doctype}/${name} not found or workflow not configured`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'INVALID_ACTION',
          message: `Insufficient permissions to execute action '${action}' on ${doctype}/${name}`
        }
      };
    }

    // Handle workflow validation errors - invalid action or state
    if (error.response?.status === 400) {
      return {
        ok: false,
        error: {
          code: 'INVALID_ACTION',
          message: error.response?.data?.message || `Invalid action '${action}' for ${doctype}/${name} in current state`
        }
      };
    }

    // Handle workflow state conflicts
    if (error.response?.status === 409) {
      return {
        ok: false,
        error: {
          code: 'INVALID_ACTION',
          message: error.response?.data?.message || `Action '${action}' cannot be executed on ${doctype}/${name} in current state`
        }
      };
    }

    if (error.response?.data?.message) {
      return {
        ok: false,
        error: {
          code: 'INVALID_ACTION',
          message: error.response.data.message
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'INVALID_ACTION',
        message: error.message || 'Failed to execute workflow action'
      }
    };
  }
}