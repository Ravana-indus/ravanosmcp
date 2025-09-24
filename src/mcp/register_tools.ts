import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { erpAuthenticator, AuthResponse } from '../core/auth';
import { createDocument, CreateDocumentResponse, getDocument, GetDocumentResponse, listDocuments, ListDocumentsResponse, updateDocument, UpdateDocumentResponse, deleteDocument, DeleteDocumentResponse } from '../core/crud';
import { submitDocument, SubmitDocumentResponse, cancelDocument, CancelDocumentResponse, workflowAction, WorkflowActionResponse } from '../core/workflow';
import { replaceTable, ReplaceTableResponse, autocomplete, AutocompleteResponse } from '../core/child_links';
import { runReport, RunReportResponse, getPdf, GetPdfResponse } from '../core/reports_print';
import { uploadFile, UploadFileResponse, addComment, AddCommentResponse } from '../core/files_comments';
import { checkPermission, CheckPermissionResponse } from '../core/permissions';
import { previewTransaction, PreviewTransactionResponse, runBulk, RunBulkResponse } from '../core/safety';
import { hrCheckIn, HrCheckInResponse, hrCheckOut, HrCheckOutResponse, getLeaveBalance, GetLeaveBalanceResponse, applyLeave, ApplyLeaveResponse, getPendingApprovals, GetPendingApprovalsResponse, approveDocument, ApproveDocumentResponse } from '../packs/hr';
import { createLead, CreateLeadResponse, convertLeadToCustomer, ConvertLeadToCustomerResponse, createQuotation, CreateQuotationResponse, createSalesOrder, CreateSalesOrderResponse, getSalesPipeline, GetSalesPipelineResponse } from '../packs/sales';
import { createPurchaseRequest, CreatePurchaseRequestResponse, createPurchaseOrder, CreatePurchaseOrderResponse, receivePurchaseOrder, ReceivePurchaseOrderResponse } from '../packs/purchase';
import { getStockLevels, GetStockLevelsResponse, getLowStockItems, GetLowStockItemsResponse } from '../packs/inventory';
import { createSalesInvoice, CreateSalesInvoiceResponse, recordPayment, RecordPaymentResponse, getOutstandingInvoices, GetOutstandingInvoicesResponse, createExpenseClaim, CreateExpenseClaimResponse } from '../packs/finance';
import { logger, redactSensitiveData } from '../observability/logger';

// Tool schemas
const connectToolSchema = {
  name: 'erp_auth_connect',
  description: 'Establish authenticated connection to ERPNext using API key and secret',
  inputSchema: {
    type: 'object',
    properties: {
      baseUrl: {
        type: 'string',
        description: 'ERPNext base URL (e.g., https://your-erpnext.com)'
      },
      apiKey: {
        type: 'string',
        description: 'ERPNext API key'
      },
      apiSecret: {
        type: 'string',
        description: 'ERPNext API secret'
      }
    },
    required: ['baseUrl', 'apiKey', 'apiSecret']
  }
};

const whoamiToolSchema = {
  name: 'erp_auth_whoami',
  description: 'Get current authenticated user information and roles',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

const createDocToolSchema = {
  name: 'erp_doc_create',
  description: 'Create a new document in ERPNext',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type (e.g., Customer, Item, Sales Invoice)'
      },
      doc: {
        type: 'object',
        description: 'Document data fields',
        additionalProperties: true
      }
    },
    required: ['doctype', 'doc']
  }
};

const getDocToolSchema = {
  name: 'erp_doc_get',
  description: 'Get a document from ERPNext by doctype and name',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type (e.g., Customer, Item, Sales Invoice)'
      },
      name: {
        type: 'string',
        description: 'Document name/ID to retrieve'
      },
      fields: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional list of specific fields to retrieve (if not provided, all fields are returned)'
      }
    },
    required: ['doctype', 'name']
  }
};

const listDocToolSchema = {
  name: 'erp_doc_list',
  description: 'List documents from ERPNext with optional filters and pagination',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type (e.g., Customer, Item, Sales Invoice)'
      },
      filters: {
        type: 'object',
        description: 'Optional filters to apply (e.g., {"status": "Active", "customer_group": "Commercial"})',
        additionalProperties: true
      },
      fields: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional list of specific fields to retrieve (if not provided, all fields are returned)'
      },
      limit: {
        type: 'number',
        description: 'Optional limit on number of documents to return',
        minimum: 1
      }
    },
    required: ['doctype']
  }
};

const updateDocToolSchema = {
  name: 'erp_doc_update',
  description: 'Update an existing document in ERPNext with partial field changes',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type (e.g., Customer, Item, Sales Invoice)'
      },
      name: {
        type: 'string',
        description: 'Document name/ID to update'
      },
      patch: {
        type: 'object',
        description: 'Fields to update with their new values (e.g., {"customer_name": "New Name", "territory": "US"})',
        additionalProperties: true
      }
    },
    required: ['doctype', 'name', 'patch']
  }
};

const deleteDocToolSchema = {
  name: 'erp_doc_delete',
  description: 'Delete a document from ERPNext',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type (e.g., Customer, Item, Sales Invoice)'
      },
      name: {
        type: 'string',
        description: 'Document name/ID to delete'
      }
    },
    required: ['doctype', 'name']
  }
};

const submitDocToolSchema = {
  name: 'erp_doc_submit',
  description: 'Submit a document in ERPNext to move it to the next workflow state',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type (e.g., Customer, Item, Sales Invoice)'
      },
      name: {
        type: 'string',
        description: 'Document name/ID to submit'
      }
    },
    required: ['doctype', 'name']
  }
};

const cancelDocToolSchema = {
  name: 'erp_doc_cancel',
  description: 'Cancel a document in ERPNext to invalidate incorrect records',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type (e.g., Customer, Item, Sales Invoice)'
      },
      name: {
        type: 'string',
        description: 'Document name/ID to cancel'
      }
    },
    required: ['doctype', 'name']
  }
};

const workflowActionToolSchema = {
  name: 'erp_workflow_action',
  description: 'Execute a workflow action on a document in ERPNext to progress approvals',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type (e.g., Sales Invoice, Purchase Order, Expense Claim)'
      },
      name: {
        type: 'string',
        description: 'Document name/ID to execute action on'
      },
      action: {
        type: 'string',
        description: 'Workflow action to execute (e.g., Approve, Reject, Review, Send for Approval)'
      }
    },
    required: ['doctype', 'name', 'action']
  }
};

const replaceTableToolSchema = {
  name: 'erp_child_replace_table',
  description: 'Replace child table rows in a parent document in ERPNext',
  inputSchema: {
    type: 'object',
    properties: {
      parent_doctype: {
        type: 'string',
        description: 'Parent ERPNext document type (e.g., Sales Invoice, Purchase Order)'
      },
      parent_name: {
        type: 'string',
        description: 'Parent document name/ID'
      },
      tablefield: {
        type: 'string',
        description: 'Name of the child table field to replace'
      },
      rows: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true
        },
        description: 'Array of new row objects to replace existing table rows'
      }
    },
    required: ['parent_doctype', 'parent_name', 'tablefield', 'rows']
  }
};

const autocompleteToolSchema = {
  name: 'erp_link_autocomplete',
  description: 'Search and autocomplete link field options in ERPNext',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type to search (e.g., Customer, Item, User)'
      },
      txt: {
        type: 'string',
        description: 'Search text to match against document names'
      },
      limit: {
        type: 'number',
        description: 'Optional limit on number of results to return',
        minimum: 1
      }
    },
    required: ['doctype', 'txt']
  }
};

const runReportToolSchema = {
  name: 'erp_report_run',
  description: 'Execute ERPNext reports to fetch analytics data',
  inputSchema: {
    type: 'object',
    properties: {
      report_name: {
        type: 'string',
        description: 'ERPNext report name (e.g., Accounts Receivable, Sales Analytics, Profit and Loss Statement)'
      },
      filters: {
        type: 'object',
        description: 'Optional filters to apply to the report (e.g., {"company": "My Company", "from_date": "2024-01-01"})',
        additionalProperties: true
      }
    },
    required: ['report_name']
  }
};

const getPdfToolSchema = {
  name: 'erp_print_get_pdf',
  description: 'Generate PDF documents from ERPNext records for sharing',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type (e.g., Sales Invoice, Purchase Order, Quotation)'
      },
      name: {
        type: 'string',
        description: 'Document name/ID to generate PDF for'
      },
      print_format: {
        type: 'string',
        description: 'Optional print format name (if not specified, uses default format)'
      }
    },
    required: ['doctype', 'name']
  }
};

const uploadFileToolSchema = {
  name: 'erp_file_upload',
  description: 'Upload files to ERPNext documents to enrich records',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type (e.g., Sales Invoice, Customer, Item)'
      },
      name: {
        type: 'string',
        description: 'Document name/ID to attach file to'
      },
      file_base64: {
        type: 'string',
        description: 'Base64 encoded file content'
      },
      filename: {
        type: 'string',
        description: 'Name of the file including extension (e.g., document.pdf, image.jpg)'
      }
    },
    required: ['doctype', 'name', 'file_base64', 'filename']
  }
};

const addCommentToolSchema = {
  name: 'erp_comment_add',
  description: 'Add comments to ERPNext documents for collaboration',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type (e.g., Sales Invoice, Customer, Item)'
      },
      name: {
        type: 'string',
        description: 'Document name/ID to add comment to'
      },
      comment: {
        type: 'string',
        description: 'Comment text content (maximum 10,000 characters)'
      }
    },
    required: ['doctype', 'name', 'comment']
  }
};

const checkPermissionToolSchema = {
  name: 'erp_permissions_check',
  description: 'Check RBAC permissions for ERPNext operations to ensure authorized access',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type to check permissions for'
      },
      action: {
        type: 'string',
        description: 'Action to check (read, write, create, delete, submit, cancel, amend, print, email, report)'
      },
      name: {
        type: 'string',
        description: 'Optional document name for instance-specific permission checks'
      }
    },
    required: ['doctype', 'action']
  }
};

const previewTransactionToolSchema = {
  name: 'erp_txn_preview',
  description: 'Preview and validate ERPNext transactions before execution to prevent errors',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'ERPNext document type for the transaction'
      },
      doc: {
        type: 'object',
        description: 'Document data to validate',
        additionalProperties: true
      }
    },
    required: ['doctype', 'doc']
  }
};

const runBulkToolSchema = {
  name: 'erp_bulk_run',
  description: 'Execute bulk operations with automatic rollback on failure for safe batch processing',
  inputSchema: {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['create', 'update', 'delete', 'submit', 'cancel']
            },
            doctype: {
              type: 'string'
            },
            name: {
              type: 'string'
            },
            doc: {
              type: 'object',
              additionalProperties: true
            },
            patch: {
              type: 'object',
              additionalProperties: true
            }
          },
          required: ['type', 'doctype']
        },
        description: 'Array of operations to execute (maximum 100)',
        maxItems: 100
      },
      rollback_on_error: {
        type: 'boolean',
        description: 'Whether to rollback completed operations on failure (default: true)',
        default: true
      }
    },
    required: ['operations']
  }
};

// HR Pack Tool Schemas
const hrCheckInToolSchema = {
  name: 'hr_check_in',
  description: 'Record employee check-in with optional location tracking',
  inputSchema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'Location of check-in (optional)'
      },
      device_id: {
        type: 'string',
        description: 'Device ID for tracking (optional)'
      }
    },
    additionalProperties: false
  }
};

const hrCheckOutToolSchema = {
  name: 'hr_check_out',
  description: 'Record employee check-out with optional reason',
  inputSchema: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Reason for check-out (optional)'
      },
      device_id: {
        type: 'string',
        description: 'Device ID for tracking (optional)'
      }
    },
    additionalProperties: false
  }
};

const hrGetLeaveBalanceToolSchema = {
  name: 'hr_get_leave_balance',
  description: 'Get leave balance for current employee with optional leave type filtering',
  inputSchema: {
    type: 'object',
    properties: {
      leave_type: {
        type: 'string',
        description: 'Specific leave type to check (optional, if not provided returns all types)'
      }
    },
    additionalProperties: false
  }
};

const hrApplyLeaveToolSchema = {
  name: 'hr_apply_leave',
  description: 'Apply for leave with validation of dates and leave type',
  inputSchema: {
    type: 'object',
    properties: {
      leave_type: {
        type: 'string',
        description: 'Type of leave to apply for'
      },
      from_date: {
        type: 'string',
        description: 'Start date of leave (YYYY-MM-DD format)'
      },
      to_date: {
        type: 'string',
        description: 'End date of leave (YYYY-MM-DD format)'
      },
      reason: {
        type: 'string',
        description: 'Reason for leave (optional)'
      }
    },
    required: ['leave_type', 'from_date', 'to_date']
  }
};

const hrGetPendingApprovalsToolSchema = {
  name: 'hr_get_pending_approvals',
  description: 'Get list of documents pending approval that current user can approve',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

const hrApproveDocumentToolSchema = {
  name: 'hr_approve_document',
  description: 'Approve a document with RBAC enforcement',
  inputSchema: {
    type: 'object',
    properties: {
      doctype: {
        type: 'string',
        description: 'Type of document to approve'
      },
      name: {
        type: 'string',
        description: 'Name/ID of document to approve'
      },
      action: {
        type: 'string',
        description: 'Approval action to take (default: Approve)',
        default: 'Approve'
      }
    },
    required: ['doctype', 'name']
  }
};

const salesCreateLeadToolSchema = {
  name: 'sales_create_lead',
  description: 'Create a new lead with contact validation',
  inputSchema: {
    type: 'object',
    properties: {
      lead_name: {
        type: 'string',
        description: 'Full name of the lead'
      },
      email_id: {
        type: 'string',
        description: 'Email address of the lead'
      },
      phone: {
        type: 'string',
        description: 'Phone number of the lead'
      },
      company_name: {
        type: 'string',
        description: 'Company name of the lead (optional)'
      },
      source: {
        type: 'string',
        description: 'Source of the lead (optional)'
      },
      status: {
        type: 'string',
        description: 'Status of the lead (optional, defaults to Open)'
      }
    },
    required: ['lead_name', 'email_id', 'phone']
  }
};

const salesConvertLeadToCustomerToolSchema = {
  name: 'sales_convert_lead_to_customer',
  description: 'Convert a lead to customer with data mapping',
  inputSchema: {
    type: 'object',
    properties: {
      lead_name: {
        type: 'string',
        description: 'Name/ID of the lead to convert'
      },
      customer_name: {
        type: 'string',
        description: 'Name for the new customer (optional, defaults to lead name)'
      },
      customer_type: {
        type: 'string',
        description: 'Type of customer (optional, defaults to Individual)'
      },
      customer_group: {
        type: 'string',
        description: 'Customer group (optional)'
      },
      territory: {
        type: 'string',
        description: 'Territory for the customer (optional)'
      }
    },
    required: ['lead_name']
  }
};

const salesCreateQuotationToolSchema = {
  name: 'sales_create_quotation',
  description: 'Create a quotation with item validation',
  inputSchema: {
    type: 'object',
    properties: {
      quotation_to: {
        type: 'string',
        enum: ['Customer', 'Lead'],
        description: 'Whether quotation is for Customer or Lead'
      },
      party_name: {
        type: 'string',
        description: 'Name of the customer or lead'
      },
      items: {
        type: 'array',
        description: 'Array of items in the quotation',
        items: {
          type: 'object',
          properties: {
            item_code: {
              type: 'string',
              description: 'Item code/ID'
            },
            qty: {
              type: 'number',
              description: 'Quantity of the item'
            },
            rate: {
              type: 'number',
              description: 'Rate/price per unit'
            }
          },
          required: ['item_code', 'qty', 'rate']
        }
      },
      valid_till: {
        type: 'string',
        description: 'Valid until date (optional)'
      }
    },
    required: ['quotation_to', 'party_name', 'items']
  }
};

const salesCreateSalesOrderToolSchema = {
  name: 'sales_create_sales_order',
  description: 'Create a sales order with delivery tracking',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Customer name/ID'
      },
      delivery_date: {
        type: 'string',
        description: 'Expected delivery date'
      },
      items: {
        type: 'array',
        description: 'Array of items in the sales order',
        items: {
          type: 'object',
          properties: {
            item_code: {
              type: 'string',
              description: 'Item code/ID'
            },
            qty: {
              type: 'number',
              description: 'Quantity of the item'
            },
            rate: {
              type: 'number',
              description: 'Rate/price per unit'
            }
          },
          required: ['item_code', 'qty', 'rate']
        }
      }
    },
    required: ['customer', 'delivery_date', 'items']
  }
};

const salesGetSalesPipelineToolSchema = {
  name: 'sales_get_sales_pipeline',
  description: 'Get sales pipeline with status grouping',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

const purchaseCreatePurchaseRequestToolSchema = {
  name: 'purchase_create_purchase_request',
  description: 'Create a purchase request with priority handling',
  inputSchema: {
    type: 'object',
    properties: {
      company: {
        type: 'string',
        description: 'Company name/ID'
      },
      transaction_date: {
        type: 'string',
        description: 'Transaction date'
      },
      items: {
        type: 'array',
        description: 'Array of items to request',
        items: {
          type: 'object',
          properties: {
            item_code: {
              type: 'string',
              description: 'Item code/ID'
            },
            qty: {
              type: 'number',
              description: 'Quantity needed'
            },
            warehouse: {
              type: 'string',
              description: 'Warehouse (optional)'
            }
          },
          required: ['item_code', 'qty']
        }
      },
      priority: {
        type: 'string',
        description: 'Priority level (optional, defaults to Medium)'
      },
      required_by: {
        type: 'string',
        description: 'Required by date (optional)'
      }
    },
    required: ['company', 'transaction_date', 'items']
  }
};

const purchaseCreatePurchaseOrderToolSchema = {
  name: 'purchase_create_purchase_order',
  description: 'Create a purchase order with supplier validation',
  inputSchema: {
    type: 'object',
    properties: {
      supplier: {
        type: 'string',
        description: 'Supplier name/ID'
      },
      company: {
        type: 'string',
        description: 'Company name/ID'
      },
      transaction_date: {
        type: 'string',
        description: 'Transaction date'
      },
      items: {
        type: 'array',
        description: 'Array of items to order',
        items: {
          type: 'object',
          properties: {
            item_code: {
              type: 'string',
              description: 'Item code/ID'
            },
            qty: {
              type: 'number',
              description: 'Quantity to order'
            },
            rate: {
              type: 'number',
              description: 'Rate/price per unit'
            }
          },
          required: ['item_code', 'qty', 'rate']
        }
      },
      delivery_date: {
        type: 'string',
        description: 'Expected delivery date (optional)'
      },
      terms: {
        type: 'string',
        description: 'Terms and conditions (optional)'
      }
    },
    required: ['supplier', 'company', 'transaction_date', 'items']
  }
};

const purchaseReceivePurchaseOrderToolSchema = {
  name: 'purchase_receive_purchase_order',
  description: 'Receive a purchase order with quantity validation',
  inputSchema: {
    type: 'object',
    properties: {
      supplier: {
        type: 'string',
        description: 'Supplier name/ID'
      },
      purchase_order: {
        type: 'string',
        description: 'Purchase order name/ID'
      },
      items: {
        type: 'array',
        description: 'Array of items being received',
        items: {
          type: 'object',
          properties: {
            item_code: {
              type: 'string',
              description: 'Item code/ID'
            },
            qty: {
              type: 'number',
              description: 'Ordered quantity'
            },
            received_qty: {
              type: 'number',
              description: 'Actual received quantity'
            }
          },
          required: ['item_code', 'qty', 'received_qty']
        }
      }
    },
    required: ['supplier', 'purchase_order', 'items']
  }
};

const inventoryGetStockLevelsToolSchema = {
  name: 'inventory_get_stock_levels',
  description: 'Get stock levels with warehouse filtering',
  inputSchema: {
    type: 'object',
    properties: {
      warehouse: {
        type: 'string',
        description: 'Warehouse to filter by (optional)'
      },
      item_code: {
        type: 'string',
        description: 'Item code to filter by (optional)'
      }
    },
    additionalProperties: false
  }
};

const inventoryGetLowStockItemsToolSchema = {
  name: 'inventory_get_low_stock_items',
  description: 'Get low stock items with reorder threshold checking',
  inputSchema: {
    type: 'object',
    properties: {
      warehouse: {
        type: 'string',
        description: 'Warehouse to filter by (optional)'
      },
      threshold_days: {
        type: 'number',
        description: 'Threshold days for low stock calculation (optional)'
      }
    },
    additionalProperties: false
  }
};

const financeCreateSalesInvoiceToolSchema = {
  name: 'finance_create_sales_invoice',
  description: 'Create a sales invoice with tax calculation',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Customer name/ID'
      },
      due_date: {
        type: 'string',
        description: 'Invoice due date'
      },
      company: {
        type: 'string',
        description: 'Company name/ID'
      },
      items: {
        type: 'array',
        description: 'Array of items in the invoice',
        items: {
          type: 'object',
          properties: {
            item_code: {
              type: 'string',
              description: 'Item code/ID'
            },
            qty: {
              type: 'number',
              description: 'Quantity of the item'
            },
            rate: {
              type: 'number',
              description: 'Rate/price per unit'
            }
          },
          required: ['item_code', 'qty', 'rate']
        }
      }
    },
    required: ['customer', 'due_date', 'company', 'items']
  }
};

const financeRecordPaymentToolSchema = {
  name: 'finance_record_payment',
  description: 'Record a payment with invoice matching',
  inputSchema: {
    type: 'object',
    properties: {
      payment_type: {
        type: 'string',
        enum: ['Receive', 'Pay'],
        description: 'Type of payment (Receive or Pay)'
      },
      party_type: {
        type: 'string',
        enum: ['Customer', 'Supplier'],
        description: 'Type of party (Customer or Supplier)'
      },
      party: {
        type: 'string',
        description: 'Party name/ID (Customer or Supplier)'
      },
      paid_amount: {
        type: 'number',
        description: 'Amount paid'
      },
      received_amount: {
        type: 'number',
        description: 'Amount received'
      },
      references: {
        type: 'array',
        description: 'Array of invoice references for payment allocation',
        items: {
          type: 'object',
          properties: {
            reference_doctype: {
              type: 'string',
              description: 'Type of reference document (e.g., Sales Invoice)'
            },
            reference_name: {
              type: 'string',
              description: 'Name/ID of the reference document'
            },
            allocated_amount: {
              type: 'number',
              description: 'Amount allocated to this reference'
            }
          },
          required: ['reference_doctype', 'reference_name', 'allocated_amount']
        }
      }
    },
    required: ['payment_type', 'party_type', 'party', 'paid_amount', 'received_amount', 'references']
  }
};

const financeGetOutstandingInvoicesToolSchema = {
  name: 'finance_get_outstanding_invoices',
  description: 'Get outstanding invoices with customer filtering',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Customer to filter by (optional)'
      },
      company: {
        type: 'string',
        description: 'Company to filter by (optional)'
      }
    },
    additionalProperties: false
  }
};

const financeCreateExpenseClaimToolSchema = {
  name: 'finance_create_expense_claim',
  description: 'Create an expense claim with validation',
  inputSchema: {
    type: 'object',
    properties: {
      employee: {
        type: 'string',
        description: 'Employee name/ID'
      },
      expense_approver: {
        type: 'string',
        description: 'Expense approver name/ID'
      },
      expenses: {
        type: 'array',
        description: 'Array of expense entries',
        items: {
          type: 'object',
          properties: {
            expense_date: {
              type: 'string',
              description: 'Date of the expense'
            },
            expense_type: {
              type: 'string',
              description: 'Type of expense'
            },
            amount: {
              type: 'number',
              description: 'Amount of the expense'
            },
            description: {
              type: 'string',
              description: 'Description of the expense (optional)'
            }
          },
          required: ['expense_date', 'expense_type', 'amount']
        }
      }
    },
    required: ['employee', 'expense_approver', 'expenses']
  }
};

export async function registerAllTools(server: Server): Promise<void> {
  // Register erp.auth.connect tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'erp_auth_connect') {
        const { baseUrl, apiKey, apiSecret } = args as {
          baseUrl: string;
          apiKey: string;
          apiSecret: string;
        };

        logger.info('Processing auth_connect request', redactSensitiveData({
          baseUrl,
          apiKey,
          apiSecret
        }));

        const result: AuthResponse = await erpAuthenticator.connect(baseUrl, apiKey, apiSecret);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_auth_connect',
                ok: result.ok,
                data: result.ok ? { connected: true } : undefined,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_auth_whoami') {
        logger.info('Processing auth_whoami request');

        const result: AuthResponse = await erpAuthenticator.whoami();

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_auth_whoami',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_doc_create') {
        const { doctype, doc } = args as {
          doctype: string;
          doc: Record<string, any>;
        };

        logger.info('Processing doc_create request', redactSensitiveData({
          doctype,
          docFields: Object.keys(doc)
        }));

        const result: CreateDocumentResponse = await createDocument(doctype, doc);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_doc_create',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_doc_get') {
        const { doctype, name: docName, fields } = args as {
          doctype: string;
          name: string;
          fields?: string[];
        };

        logger.info('Processing doc_get request', redactSensitiveData({
          doctype,
          name: docName,
          fields: fields || 'all'
        }));

        const result: GetDocumentResponse = await getDocument(doctype, docName, fields);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_doc_get',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_doc_list') {
        const { doctype, filters, fields, limit } = args as {
          doctype: string;
          filters?: Record<string, any>;
          fields?: string[];
          limit?: number;
        };

        logger.info('Processing doc_list request', redactSensitiveData({
          doctype,
          filters: filters || 'none',
          fields: fields || 'all',
          limit: limit || 'no limit'
        }));

        const result: ListDocumentsResponse = await listDocuments(doctype, filters, fields, limit);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_doc_list',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_doc_update') {
        const { doctype, name: docName, patch } = args as {
          doctype: string;
          name: string;
          patch: Record<string, any>;
        };

        logger.info('Processing doc_update request', redactSensitiveData({
          doctype,
          name: docName,
          patchFields: Object.keys(patch)
        }));

        const result: UpdateDocumentResponse = await updateDocument(doctype, docName, patch);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_doc_update',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_doc_delete') {
        const { doctype, name: docName } = args as {
          doctype: string;
          name: string;
        };

        logger.info('Processing doc_delete request', redactSensitiveData({
          doctype,
          name: docName
        }));

        const result: DeleteDocumentResponse = await deleteDocument(doctype, docName);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_doc_delete',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_doc_submit') {
        const { doctype, name: docName } = args as {
          doctype: string;
          name: string;
        };

        logger.info('Processing doc_submit request', redactSensitiveData({
          doctype,
          name: docName
        }));

        const result: SubmitDocumentResponse = await submitDocument(doctype, docName);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_doc_submit',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_doc_cancel') {
        const { doctype, name: docName } = args as {
          doctype: string;
          name: string;
        };

        logger.info('Processing doc_cancel request', redactSensitiveData({
          doctype,
          name: docName
        }));

        const result: CancelDocumentResponse = await cancelDocument(doctype, docName);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_doc_cancel',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_workflow_action') {
        const { doctype, name: docName, action } = args as {
          doctype: string;
          name: string;
          action: string;
        };

        logger.info('Processing workflow_action request', redactSensitiveData({
          doctype,
          name: docName,
          action
        }));

        const result: WorkflowActionResponse = await workflowAction(doctype, docName, action);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_workflow_action',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_child_replace_table') {
        const { parent_doctype, parent_name, tablefield, rows } = args as {
          parent_doctype: string;
          parent_name: string;
          tablefield: string;
          rows: Record<string, any>[];
        };

        logger.info('Processing child_replace_table request', redactSensitiveData({
          parent_doctype,
          parent_name,
          tablefield,
          rows_count: rows.length
        }));

        const result: ReplaceTableResponse = await replaceTable(parent_doctype, parent_name, tablefield, rows);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_child_replace_table',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_link_autocomplete') {
        const { doctype, txt, limit } = args as {
          doctype: string;
          txt: string;
          limit?: number;
        };

        logger.info('Processing link_autocomplete request', redactSensitiveData({
          doctype,
          txt: txt.substring(0, 20),
          limit: limit || 'no limit'
        }));

        const result: AutocompleteResponse = await autocomplete(doctype, txt, limit);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_link_autocomplete',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_report_run') {
        const { report_name, filters } = args as {
          report_name: string;
          filters?: Record<string, any>;
        };

        logger.info('Processing report_run request', redactSensitiveData({
          report_name,
          filters: filters ? Object.keys(filters) : 'none'
        }));

        const result: RunReportResponse = await runReport(report_name, filters);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_report_run',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_print_get_pdf') {
        const { doctype, name: docName, print_format } = args as {
          doctype: string;
          name: string;
          print_format?: string;
        };

        logger.info('Processing print_get_pdf request', redactSensitiveData({
          doctype,
          name: docName,
          print_format: print_format || 'default'
        }));

        const result: GetPdfResponse = await getPdf(doctype, docName, print_format);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_print_get_pdf',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_file_upload') {
        const { doctype, name: docName, file_base64, filename } = args as {
          doctype: string;
          name: string;
          file_base64: string;
          filename: string;
        };

        logger.info('Processing file_upload request', redactSensitiveData({
          doctype,
          name: docName,
          filename,
          file_size_kb: Math.round((file_base64.length * 3) / 4 / 1024)
        }));

        const result: UploadFileResponse = await uploadFile(doctype, docName, file_base64, filename);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_file_upload',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_comment_add') {
        const { doctype, name: docName, comment } = args as {
          doctype: string;
          name: string;
          comment: string;
        };

        logger.info('Processing comment_add request', redactSensitiveData({
          doctype,
          name: docName,
          comment_length: comment.length
        }));

        const result: AddCommentResponse = await addComment(doctype, docName, comment);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_comment_add',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_permissions_check') {
        const { doctype, action, name: docName } = args as {
          doctype: string;
          action: string;
          name?: string;
        };

        logger.info('Processing permissions_check request', redactSensitiveData({
          doctype,
          action,
          name: docName || 'none'
        }));

        const result: CheckPermissionResponse = await checkPermission(doctype, action, docName);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_permissions_check',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_txn_preview') {
        const { doctype, doc } = args as {
          doctype: string;
          doc: Record<string, any>;
        };

        logger.info('Processing txn_preview request', redactSensitiveData({
          doctype,
          doc_fields: Object.keys(doc)
        }));

        const result: PreviewTransactionResponse = await previewTransaction(doctype, doc);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_txn_preview',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'erp_bulk_run') {
        const { operations, rollback_on_error } = args as {
          operations: Array<{
            type: string;
            doctype: string;
            name?: string;
            doc?: Record<string, any>;
            patch?: Record<string, any>;
          }>;
          rollback_on_error?: boolean;
        };

        logger.info('Processing bulk_run request', redactSensitiveData({
          operations_count: operations.length,
          rollback_on_error: rollback_on_error ?? true,
          operation_types: operations.map(op => op.type)
        }));

        const result: RunBulkResponse = await runBulk(operations as any, rollback_on_error);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'erp_bulk_run',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'hr_check_in') {
        const { location, device_id } = args as {
          location?: string;
          device_id?: string;
        };

        logger.info('Processing hr_check_in request', redactSensitiveData({
          location: location || 'not_provided'
        }));

        const result: HrCheckInResponse = await hrCheckIn(location, device_id);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'hr_check_in',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'hr_check_out') {
        const { reason, device_id } = args as {
          reason?: string;
          device_id?: string;
        };

        logger.info('Processing hr_check_out request', redactSensitiveData({
          reason: reason || 'not_provided'
        }));

        const result: HrCheckOutResponse = await hrCheckOut(reason, device_id);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'hr_check_out',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'hr_get_leave_balance') {
        const { leave_type } = args as {
          leave_type?: string;
        };

        logger.info('Processing hr_get_leave_balance request', redactSensitiveData({
          leave_type: leave_type || 'all'
        }));

        const result: GetLeaveBalanceResponse = await getLeaveBalance(leave_type);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'hr_get_leave_balance',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'hr_apply_leave') {
        const { leave_type, from_date, to_date, reason } = args as {
          leave_type: string;
          from_date: string;
          to_date: string;
          reason?: string;
        };

        logger.info('Processing hr_apply_leave request', redactSensitiveData({
          leave_type,
          from_date,
          to_date,
          reason: reason || 'not_provided'
        }));

        const result: ApplyLeaveResponse = await applyLeave(leave_type, from_date, to_date, reason);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'hr_apply_leave',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'hr_get_pending_approvals') {
        logger.info('Processing hr_get_pending_approvals request');

        const result: GetPendingApprovalsResponse = await getPendingApprovals();

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'hr_get_pending_approvals',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'hr_approve_document') {
        const { doctype, name: docName, action } = args as {
          doctype: string;
          name: string;
          action?: string;
        };

        logger.info('Processing hr_approve_document request', redactSensitiveData({
          doctype,
          name: docName,
          action: action || 'Approve'
        }));

        const result: ApproveDocumentResponse = await approveDocument(doctype, docName, action);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'hr_approve_document',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'sales_create_lead') {
        const { lead_name, email_id, phone, company_name, source, status } = args as {
          lead_name: string;
          email_id: string;
          phone: string;
          company_name?: string;
          source?: string;
          status?: string;
        };

        logger.info('Processing sales_create_lead request', redactSensitiveData({
          lead_name,
          email_id,
          phone,
          company_name: company_name || 'not_provided'
        }));

        const result: CreateLeadResponse = await createLead(lead_name, email_id, phone, company_name, source, status);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'sales_create_lead',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'sales_convert_lead_to_customer') {
        const { lead_name, customer_name, customer_type, customer_group, territory } = args as {
          lead_name: string;
          customer_name?: string;
          customer_type?: string;
          customer_group?: string;
          territory?: string;
        };

        logger.info('Processing sales_convert_lead_to_customer request', {
          lead_name,
          customer_name: customer_name || 'not_provided'
        });

        const result: ConvertLeadToCustomerResponse = await convertLeadToCustomer(lead_name, customer_name, customer_type, customer_group, territory);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'sales_convert_lead_to_customer',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'sales_create_quotation') {
        const { quotation_to, party_name, items, valid_till } = args as {
          quotation_to: 'Customer' | 'Lead';
          party_name: string;
          items: Array<{ item_code: string; qty: number; rate: number }>;
          valid_till?: string;
        };

        logger.info('Processing sales_create_quotation request', {
          quotation_to,
          party_name,
          items_count: items?.length || 0
        });

        const result: CreateQuotationResponse = await createQuotation(quotation_to, party_name, items, valid_till);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'sales_create_quotation',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'sales_create_sales_order') {
        const { customer, delivery_date, items } = args as {
          customer: string;
          delivery_date: string;
          items: Array<{ item_code: string; qty: number; rate: number }>;
        };

        logger.info('Processing sales.create_sales_order request', {
          customer,
          delivery_date,
          items_count: items?.length || 0
        });

        const result: CreateSalesOrderResponse = await createSalesOrder(customer, delivery_date, items);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'sales_create_sales_order',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'sales_get_sales_pipeline') {
        logger.info('Processing sales.get_sales_pipeline request');

        const result: GetSalesPipelineResponse = await getSalesPipeline();

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'sales_get_sales_pipeline',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'purchase_create_purchase_request') {
        const { company, transaction_date, items, priority, required_by } = args as {
          company: string;
          transaction_date: string;
          items: Array<{ item_code: string; qty: number; warehouse?: string }>;
          priority?: string;
          required_by?: string;
        };

        logger.info('Processing purchase.create_purchase_request request', {
          company,
          transaction_date,
          items_count: items?.length || 0
        });

        const result: CreatePurchaseRequestResponse = await createPurchaseRequest(company, transaction_date, items, priority, required_by);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'purchase_create_purchase_request',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'purchase_create_purchase_order') {
        const { supplier, company, transaction_date, items, delivery_date, terms } = args as {
          supplier: string;
          company: string;
          transaction_date: string;
          items: Array<{ item_code: string; qty: number; rate: number }>;
          delivery_date?: string;
          terms?: string;
        };

        logger.info('Processing purchase.create_purchase_order request', {
          supplier,
          company,
          transaction_date,
          items_count: items?.length || 0
        });

        const result: CreatePurchaseOrderResponse = await createPurchaseOrder(supplier, company, transaction_date, items, delivery_date, terms);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'purchase_create_purchase_order',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'purchase_receive_purchase_order') {
        const { supplier, purchase_order, items } = args as {
          supplier: string;
          purchase_order: string;
          items: Array<{ item_code: string; qty: number; received_qty: number }>;
        };

        logger.info('Processing purchase.receive_purchase_order request', {
          supplier,
          purchase_order,
          items_count: items?.length || 0
        });

        const result: ReceivePurchaseOrderResponse = await receivePurchaseOrder(supplier, purchase_order, items);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'purchase_receive_purchase_order',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'inventory_get_stock_levels') {
        const { warehouse, item_code } = args as {
          warehouse?: string;
          item_code?: string;
        };

        logger.info('Processing inventory.get_stock_levels request', {
          warehouse: warehouse || 'all',
          item_code: item_code || 'all'
        });

        const result: GetStockLevelsResponse = await getStockLevels(warehouse, item_code);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'inventory_get_stock_levels',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'inventory_get_low_stock_items') {
        const { warehouse, threshold_days } = args as {
          warehouse?: string;
          threshold_days?: number;
        };

        logger.info('Processing inventory.get_low_stock_items request', {
          warehouse: warehouse || 'all',
          threshold_days: threshold_days || 'default'
        });

        const result: GetLowStockItemsResponse = await getLowStockItems(warehouse, threshold_days);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'inventory_get_low_stock_items',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'finance_create_sales_invoice') {
        const { customer, due_date, company, items } = args as {
          customer: string;
          due_date: string;
          company: string;
          items: Array<{ item_code: string; qty: number; rate: number }>;
        };

        logger.info('Processing finance.create_sales_invoice request', redactSensitiveData({
          customer,
          due_date,
          company,
          items_count: items?.length || 0
        }));

        const result: CreateSalesInvoiceResponse = await createSalesInvoice(customer, due_date, company, items);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'finance_create_sales_invoice',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'finance_record_payment') {
        const { payment_type, party_type, party, paid_amount, received_amount, references } = args as {
          payment_type: 'Receive' | 'Pay';
          party_type: 'Customer' | 'Supplier';
          party: string;
          paid_amount: number;
          received_amount: number;
          references: Array<{ reference_doctype: string; reference_name: string; allocated_amount: number }>;
        };

        logger.info('Processing finance.record_payment request', redactSensitiveData({
          payment_type,
          party_type,
          party,
          paid_amount,
          references_count: references?.length || 0
        }));

        const result: RecordPaymentResponse = await recordPayment(payment_type, party_type, party, paid_amount, received_amount, references);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'finance_record_payment',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'finance_get_outstanding_invoices') {
        const { customer, company } = args as {
          customer?: string;
          company?: string;
        };

        logger.info('Processing finance.get_outstanding_invoices request', redactSensitiveData({
          customer: customer || 'all',
          company: company || 'all'
        }));

        const result: GetOutstandingInvoicesResponse = await getOutstandingInvoices(customer, company);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'finance_get_outstanding_invoices',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else if (name === 'finance_create_expense_claim') {
        const { employee, expense_approver, expenses } = args as {
          employee: string;
          expense_approver: string;
          expenses: Array<{ expense_date: string; expense_type: string; amount: number; description?: string }>;
        };

        logger.info('Processing finance.create_expense_claim request', redactSensitiveData({
          employee,
          expense_approver,
          expenses_count: expenses?.length || 0
        }));

        const result: CreateExpenseClaimResponse = await createExpenseClaim(employee, expense_approver, expenses);

        const response = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                requestId: request.params.name,
                tool: 'finance_create_expense_claim',
                ok: result.ok,
                data: result.data,
                error: result.error,
                meta: {
                  timestamp: new Date().toISOString()
                }
              }, null, 2)
            }
          ]
        };

        return response;

      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

    } catch (error: any) {
      logger.error('Tool execution failed', { tool: name, error: error.message });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              requestId: request.params.name,
              tool: name,
              ok: false,
              error: {
                code: 'TOOL_ERROR',
                message: error.message
              },
              meta: {
                timestamp: new Date().toISOString()
              }
            }, null, 2)
          }
        ]
      };
    }
  });

  // Register tool definitions with server
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [connectToolSchema, whoamiToolSchema, createDocToolSchema, getDocToolSchema, listDocToolSchema, updateDocToolSchema, deleteDocToolSchema, submitDocToolSchema, cancelDocToolSchema, workflowActionToolSchema, replaceTableToolSchema, autocompleteToolSchema, runReportToolSchema, getPdfToolSchema, uploadFileToolSchema, addCommentToolSchema, checkPermissionToolSchema, previewTransactionToolSchema, runBulkToolSchema, hrCheckInToolSchema, hrCheckOutToolSchema, hrGetLeaveBalanceToolSchema, hrApplyLeaveToolSchema, hrGetPendingApprovalsToolSchema, hrApproveDocumentToolSchema, salesCreateLeadToolSchema, salesConvertLeadToCustomerToolSchema, salesCreateQuotationToolSchema, salesCreateSalesOrderToolSchema, salesGetSalesPipelineToolSchema, purchaseCreatePurchaseRequestToolSchema, purchaseCreatePurchaseOrderToolSchema, purchaseReceivePurchaseOrderToolSchema, inventoryGetStockLevelsToolSchema, inventoryGetLowStockItemsToolSchema, financeCreateSalesInvoiceToolSchema, financeRecordPaymentToolSchema, financeGetOutstandingInvoicesToolSchema, financeCreateExpenseClaimToolSchema]
    };
  });

  logger.info('All tools registered successfully', {
    tools: [connectToolSchema.name, whoamiToolSchema.name, createDocToolSchema.name, getDocToolSchema.name, listDocToolSchema.name, updateDocToolSchema.name, deleteDocToolSchema.name, submitDocToolSchema.name, cancelDocToolSchema.name, workflowActionToolSchema.name, replaceTableToolSchema.name, autocompleteToolSchema.name, runReportToolSchema.name, getPdfToolSchema.name, uploadFileToolSchema.name, addCommentToolSchema.name, checkPermissionToolSchema.name, previewTransactionToolSchema.name, runBulkToolSchema.name, hrCheckInToolSchema.name, hrCheckOutToolSchema.name, hrGetLeaveBalanceToolSchema.name, hrApplyLeaveToolSchema.name, hrGetPendingApprovalsToolSchema.name, hrApproveDocumentToolSchema.name, salesCreateLeadToolSchema.name, salesConvertLeadToCustomerToolSchema.name, salesCreateQuotationToolSchema.name, salesCreateSalesOrderToolSchema.name, salesGetSalesPipelineToolSchema.name, purchaseCreatePurchaseRequestToolSchema.name, purchaseCreatePurchaseOrderToolSchema.name, purchaseReceivePurchaseOrderToolSchema.name, inventoryGetStockLevelsToolSchema.name, inventoryGetLowStockItemsToolSchema.name, financeCreateSalesInvoiceToolSchema.name, financeRecordPaymentToolSchema.name, financeGetOutstandingInvoicesToolSchema.name, financeCreateExpenseClaimToolSchema.name]
  });
}