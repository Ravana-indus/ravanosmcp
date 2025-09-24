import { erpAuthenticator } from './auth';
import { logger, redactSensitiveData } from '../observability/logger';

export interface PreviewTransactionRequest {
  doctype: string;
  doc: Record<string, any>;
}

export interface PreviewTransactionResponse {
  ok: boolean;
  data?: {
    valid: boolean;
    issues?: Array<{
      field?: string;
      message: string;
      severity: 'error' | 'warning' | 'info';
    }>;
    warnings?: string[];
    estimated_impact?: {
      documents_affected?: number;
      financial_impact?: number;
      workflow_changes?: string[];
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface BulkOperation {
  type: 'create' | 'update' | 'delete' | 'submit' | 'cancel';
  doctype: string;
  name?: string;
  doc?: Record<string, any>;
  patch?: Record<string, any>;
}

export interface RunBulkRequest {
  operations: BulkOperation[];
  rollback_on_error?: boolean;
}

export interface RunBulkResponse {
  ok: boolean;
  data?: {
    results: Array<{
      operation_index: number;
      success: boolean;
      data?: any;
      error?: string;
    }>;
    rolled_back?: boolean;
    completed_operations?: number;
    failed_operations?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function previewTransaction(
  doctype: string,
  doc: Record<string, any>
): Promise<PreviewTransactionResponse> {
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

    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
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

    logger.info('Previewing transaction', redactSensitiveData({
      doctype,
      doc_fields: Object.keys(doc)
    }));

    // Preview transaction via ERPNext validation API
    const response = await client.post('/api/method/frappe.model.document.validate_doc', {
      doctype,
      doc: JSON.stringify(doc),
      action: 'validate'
    });

    const validationResult = response.data.message || response.data;

    // Parse validation results
    const issues: Array<{field?: string; message: string; severity: 'error' | 'warning' | 'info'}> = [];
    const warnings: string[] = [];

    // Handle different validation result formats
    if (validationResult?.errors) {
      validationResult.errors.forEach((error: any) => {
        issues.push({
          field: error.field || error.fieldname,
          message: error.message || error.msg || String(error),
          severity: 'error'
        });
      });
    }

    if (validationResult?.warnings) {
      validationResult.warnings.forEach((warning: any) => {
        const warningMsg = warning.message || warning.msg || String(warning);
        warnings.push(warningMsg);
        issues.push({
          field: warning.field || warning.fieldname,
          message: warningMsg,
          severity: 'warning'
        });
      });
    }

    if (validationResult?.messages) {
      validationResult.messages.forEach((message: any) => {
        issues.push({
          field: message.field || message.fieldname,
          message: message.message || message.msg || String(message),
          severity: message.type || 'info'
        });
      });
    }

    // Check if there are any errors that would prevent execution
    const hasErrors = issues.some(issue => issue.severity === 'error');
    const valid = !hasErrors && (validationResult?.valid !== false);

    // Estimate transaction impact
    const estimatedImpact: any = {};

    if (doc.name) {
      estimatedImpact.documents_affected = 1;
    }

    if (doc.grand_total || doc.total || doc.amount) {
      estimatedImpact.financial_impact = doc.grand_total || doc.total || doc.amount;
    }

    if (doc.workflow_state) {
      estimatedImpact.workflow_changes = [doc.workflow_state];
    }

    logger.info('Transaction preview completed', {
      doctype,
      valid,
      issues_count: issues.length,
      warnings_count: warnings.length,
      has_errors: hasErrors
    });

    return {
      ok: true,
      data: {
        valid,
        issues: issues.length > 0 ? issues : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        estimated_impact: Object.keys(estimatedImpact).length > 0 ? estimatedImpact : undefined
      }
    };

  } catch (error: any) {
    logger.error('Failed to preview transaction', redactSensitiveData({
      doctype,
      doc_fields: Object.keys(doc),
      error: error.message,
      response: error.response?.data
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'INVALID_DOCTYPE',
          message: `Doctype '${doctype}' not found`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Insufficient permissions to preview ${doctype} transactions`
        }
      };
    }

    // Handle validation errors
    if (error.response?.status === 400) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: error.response?.data?.message || `Invalid transaction preview parameters`
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
        message: error.message || 'Failed to preview transaction'
      }
    };
  }
}

export async function runBulk(
  operations: BulkOperation[],
  rollback_on_error: boolean = true
): Promise<RunBulkResponse> {
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
    if (!Array.isArray(operations) || operations.length === 0) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Operations array is required and cannot be empty'
        }
      };
    }

    if (operations.length > 100) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Maximum 100 operations allowed per bulk request'
        }
      };
    }

    // Validate each operation
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];

      if (!op.type || !['create', 'update', 'delete', 'submit', 'cancel'].includes(op.type)) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: `Invalid operation type '${op.type}' at index ${i}. Valid types: create, update, delete, submit, cancel`
          }
        };
      }

      if (!op.doctype || typeof op.doctype !== 'string') {
        return {
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: `Doctype is required for operation at index ${i}`
          }
        };
      }

      if (['update', 'delete', 'submit', 'cancel'].includes(op.type) && !op.name) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: `Document name is required for ${op.type} operation at index ${i}`
          }
        };
      }

      if (op.type === 'create' && !op.doc) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: `Document data is required for create operation at index ${i}`
          }
        };
      }

      if (op.type === 'update' && !op.patch) {
        return {
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: `Patch data is required for update operation at index ${i}`
          }
        };
      }
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

    logger.info('Running bulk operations', redactSensitiveData({
      operations_count: operations.length,
      rollback_on_error,
      operation_types: operations.map(op => op.type)
    }));

    const results: Array<{
      operation_index: number;
      success: boolean;
      data?: any;
      error?: string;
    }> = [];

    const executedOperations: Array<{index: number; type: string; doctype: string; name?: string}> = [];
    let completedOperations = 0;
    let failedOperations = 0;
    let rolledBack = false;

    // Execute operations sequentially
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];

      try {
        let operationResult: any = null;

        switch (operation.type) {
          case 'create':
            operationResult = await client.post(`/api/resource/${operation.doctype}`, {
              data: operation.doc
            });
            executedOperations.push({
              index: i,
              type: 'delete',
              doctype: operation.doctype,
              name: operationResult.data.data.name
            });
            break;

          case 'update':
            operationResult = await client.put(`/api/resource/${operation.doctype}/${operation.name}`, {
              data: operation.patch
            });
            break;

          case 'delete':
            operationResult = await client.delete(`/api/resource/${operation.doctype}/${operation.name}`);
            break;

          case 'submit':
            operationResult = await client.put(`/api/resource/${operation.doctype}/${operation.name}`, {
              data: { docstatus: 1 }
            });
            break;

          case 'cancel':
            operationResult = await client.put(`/api/resource/${operation.doctype}/${operation.name}`, {
              data: { docstatus: 2 }
            });
            break;
        }

        results.push({
          operation_index: i,
          success: true,
          data: operationResult?.data
        });

        completedOperations++;

      } catch (operationError: any) {
        failedOperations++;

        results.push({
          operation_index: i,
          success: false,
          error: operationError.response?.data?.message || operationError.message
        });

        logger.error('Bulk operation failed', {
          operation_index: i,
          operation_type: operation.type,
          doctype: operation.doctype,
          error: operationError.message
        });

        // If rollback is enabled and we have an error, attempt rollback
        if (rollback_on_error && executedOperations.length > 0) {
          logger.info('Starting rollback due to failed operation', {
            operation_index: i,
            executed_operations: executedOperations.length
          });

          // Attempt to rollback completed operations in reverse order
          for (let j = executedOperations.length - 1; j >= 0; j--) {
            const rollbackOp = executedOperations[j];
            try {
              if (rollbackOp.type === 'delete' && rollbackOp.name) {
                await client.delete(`/api/resource/${rollbackOp.doctype}/${rollbackOp.name}`);
              }
            } catch (rollbackError: any) {
              logger.error('Rollback operation failed', {
                rollback_index: j,
                rollback_type: rollbackOp.type,
                doctype: rollbackOp.doctype,
                name: rollbackOp.name,
                error: rollbackError.message
              });
            }
          }

          rolledBack = true;
          break;
        }

        // If not rolling back, continue with remaining operations
        if (!rollback_on_error) {
          continue;
        } else {
          break;
        }
      }
    }

    logger.info('Bulk operations completed', {
      total_operations: operations.length,
      completed_operations: completedOperations,
      failed_operations: failedOperations,
      rolled_back: rolledBack
    });

    return {
      ok: true,
      data: {
        results,
        rolled_back: rolledBack,
        completed_operations: completedOperations,
        failed_operations: failedOperations
      }
    };

  } catch (error: any) {
    logger.error('Failed to run bulk operations', redactSensitiveData({
      operations_count: operations.length,
      error: error.message,
      response: error.response?.data
    }));

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions to run bulk operations'
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
        message: error.message || 'Failed to run bulk operations'
      }
    };
  }
}