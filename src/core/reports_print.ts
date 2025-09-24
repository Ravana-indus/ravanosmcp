import { erpAuthenticator } from './auth';
import { logger, redactSensitiveData } from '../observability/logger';

export interface RunReportRequest {
  report_name: string;
  filters?: Record<string, any>;
}

export interface RunReportResponse {
  ok: boolean;
  data?: {
    columns: Array<{
      fieldname: string;
      label: string;
      fieldtype: string;
      width?: number;
    }>;
    rows: any[][];
    total_row_count?: number;
    report_name: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface GetPdfRequest {
  doctype: string;
  name: string;
  print_format?: string;
}

export interface GetPdfResponse {
  ok: boolean;
  data?: {
    pdf_base64: string;
    content_type: string;
    filename: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function runReport(
  report_name: string,
  filters?: Record<string, any>
): Promise<RunReportResponse> {
  const startTime = Date.now();

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
    if (!report_name || typeof report_name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report name is required and must be a string'
        }
      };
    }

    if (filters !== undefined && (typeof filters !== 'object' || filters === null || Array.isArray(filters))) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Filters must be an object'
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

    logger.info('Running report', redactSensitiveData({
      report_name,
      filters: filters ? Object.keys(filters) : 'none'
    }));

    // Build request payload
    const requestData: any = {
      report_name
    };

    if (filters && Object.keys(filters).length > 0) {
      requestData.filters = filters;
    }

    // Execute report via ERPNext reports API
    const response = await client.post('/api/method/frappe.desk.query_report.run', requestData);

    const reportResult = response.data.message || response.data;

    if (!reportResult || !reportResult.columns) {
      return {
        ok: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: `Report '${report_name}' not found or has no data`
        }
      };
    }

    // Process columns to ensure consistent format
    const columns = (reportResult.columns || []).map((col: any) => {
      if (typeof col === 'string') {
        return {
          fieldname: col,
          label: col,
          fieldtype: 'Data',
          width: 120
        };
      } else if (typeof col === 'object' && col !== null) {
        return {
          fieldname: col.fieldname || col.label || 'unknown',
          label: col.label || col.fieldname || 'Unknown',
          fieldtype: col.fieldtype || 'Data',
          width: col.width || 120
        };
      }
      return {
        fieldname: 'unknown',
        label: 'Unknown',
        fieldtype: 'Data',
        width: 120
      };
    });

    const rows = reportResult.result || reportResult.data || [];
    const totalRowCount = reportResult.total_row_count || rows.length;

    const duration = Date.now() - startTime;

    logger.info('Report executed successfully', {
      report_name,
      columns_count: columns.length,
      rows_count: rows.length,
      total_row_count: totalRowCount,
      duration_ms: duration
    });

    return {
      ok: true,
      data: {
        columns,
        rows,
        total_row_count: totalRowCount,
        report_name
      }
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Failed to run report', redactSensitiveData({
      report_name,
      filters,
      error: error.message,
      response: error.response?.data,
      duration_ms: duration
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: `Report '${report_name}' not found`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Insufficient permissions to access report '${report_name}'`
        }
      };
    }

    // Handle report execution errors
    if (error.response?.status === 400) {
      return {
        ok: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: error.response?.data?.message || `Invalid report '${report_name}' or parameters`
        }
      };
    }

    if (error.response?.data?.message) {
      return {
        ok: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: error.response.data.message
        }
      };
    }

    return {
      ok: false,
      error: {
        code: 'REPORT_NOT_FOUND',
        message: error.message || 'Failed to run report'
      }
    };
  }
}

export async function getPdf(
  doctype: string,
  name: string,
  print_format?: string
): Promise<GetPdfResponse> {
  const startTime = Date.now();

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

    if (!name || typeof name !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Document name is required and must be a string'
        }
      };
    }

    if (print_format !== undefined && typeof print_format !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Print format must be a string'
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

    logger.info('Generating PDF', redactSensitiveData({
      doctype,
      name,
      print_format: print_format || 'default'
    }));

    // Build request parameters
    const params = new URLSearchParams();
    params.append('doctype', doctype);
    params.append('name', name);
    params.append('format', 'PDF');
    if (print_format) {
      params.append('print_format', print_format);
    }

    // Generate PDF via ERPNext printing API
    const response = await client.get(`/api/method/frappe.utils.print_format.download_pdf?${params}`, {
      responseType: 'arraybuffer'
    });

    // Convert PDF buffer to base64
    const pdfBuffer = Buffer.from(response.data, 'binary');
    const pdfBase64 = pdfBuffer.toString('base64');

    const duration = Date.now() - startTime;

    // Check performance requirement (≤ 2s)
    if (duration > 2000) {
      logger.warn('PDF generation exceeded performance requirement', {
        doctype,
        name,
        duration_ms: duration,
        size_kb: Math.round(pdfBuffer.length / 1024)
      });
    }

    const filename = `${doctype}-${name}.pdf`;

    logger.info('PDF generated successfully', {
      doctype,
      name,
      print_format: print_format || 'default',
      duration_ms: duration,
      size_kb: Math.round(pdfBuffer.length / 1024),
      filename
    });

    return {
      ok: true,
      data: {
        pdf_base64: pdfBase64,
        content_type: 'application/pdf',
        filename
      }
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Failed to generate PDF', redactSensitiveData({
      doctype,
      name,
      print_format,
      error: error.message,
      response: error.response?.data,
      duration_ms: duration
    }));

    // Map ERPNext errors to canonical format
    if (error.response?.status === 404) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: `Document ${doctype}/${name} not found or print format not available`
        }
      };
    }

    if (error.response?.status === 403) {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Insufficient permissions to print ${doctype}/${name}`
        }
      };
    }

    // Handle print format errors
    if (error.response?.status === 400) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: error.response?.data?.message || `Invalid print parameters for ${doctype}/${name}`
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
        message: error.message || 'Failed to generate PDF'
      }
    };
  }
}