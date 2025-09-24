import { erpAuthenticator } from './auth';
import { logger, redactSensitiveData } from '../observability/logger';

export interface UploadFileRequest {
  doctype: string;
  name: string;
  file_base64: string;
  filename: string;
}

export interface UploadFileResponse {
  ok: boolean;
  data?: {
    file_url: string;
    file_name: string;
    file_size: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface AddCommentRequest {
  doctype: string;
  name: string;
  comment: string;
}

export interface AddCommentResponse {
  ok: boolean;
  data?: {
    comment_added: boolean;
    comment_id?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function uploadFile(
  doctype: string,
  name: string,
  file_base64: string,
  filename: string
): Promise<UploadFileResponse> {
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

    if (!file_base64 || typeof file_base64 !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'File base64 content is required and must be a string'
        }
      };
    }

    if (!filename || typeof filename !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Filename is required and must be a string'
        }
      };
    }

    // Basic validation of base64 format
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Pattern.test(file_base64)) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Invalid base64 format for file content'
        }
      };
    }

    // Validate file size (approximate from base64)
    const fileSizeBytes = (file_base64.length * 3) / 4;
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
    if (fileSizeBytes > maxSizeBytes) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'File size exceeds maximum limit of 10MB'
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

    logger.info('Uploading file', redactSensitiveData({
      doctype,
      name,
      filename,
      size_kb: Math.round(fileSizeBytes / 1024)
    }));

    // Prepare form data for file upload
    const formData = new FormData();

    // Convert base64 to blob
    const binaryString = Buffer.from(file_base64, 'base64');
    const blob = new Blob([binaryString]);

    formData.append('file', blob, filename);
    formData.append('doctype', doctype);
    formData.append('docname', name);
    formData.append('is_private', '0'); // Make file public by default

    // Upload file via ERPNext file API
    const response = await client.post('/api/method/upload_file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const fileData = response.data.message;

    if (!fileData || !fileData.file_url) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'File upload failed - no file URL returned'
        }
      };
    }

    logger.info('File uploaded successfully', {
      doctype,
      name,
      filename,
      file_url: fileData.file_url,
      size_kb: Math.round(fileSizeBytes / 1024)
    });

    return {
      ok: true,
      data: {
        file_url: fileData.file_url,
        file_name: fileData.file_name || filename,
        file_size: Math.round(fileSizeBytes)
      }
    };

  } catch (error: any) {
    logger.error('Failed to upload file', redactSensitiveData({
      doctype,
      name,
      filename,
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
          code: 'PERMISSION_DENIED',
          message: `Insufficient permissions to upload file to ${doctype}/${name}`
        }
      };
    }

    // Handle file upload errors
    if (error.response?.status === 400) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: error.response?.data?.message || `Invalid file upload parameters`
        }
      };
    }

    if (error.response?.status === 413) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'File size exceeds server limits'
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
        message: error.message || 'Failed to upload file'
      }
    };
  }
}

export async function addComment(
  doctype: string,
  name: string,
  comment: string
): Promise<AddCommentResponse> {
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

    if (!comment || typeof comment !== 'string') {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Comment is required and must be a string'
        }
      };
    }

    // Validate comment length
    if (comment.length > 10000) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: 'Comment exceeds maximum length of 10,000 characters'
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

    logger.info('Adding comment', redactSensitiveData({
      doctype,
      name,
      comment_length: comment.length
    }));

    // Add comment via ERPNext comment API
    const response = await client.post('/api/method/frappe.desk.form.utils.add_comment', {
      reference_doctype: doctype,
      reference_name: name,
      content: comment,
      comment_type: 'Comment'
    });

    const commentData = response.data.message;
    const commentId = commentData?.name;

    logger.info('Comment added successfully', {
      doctype,
      name,
      comment_length: comment.length,
      comment_id: commentId
    });

    return {
      ok: true,
      data: {
        comment_added: true,
        comment_id: commentId
      }
    };

  } catch (error: any) {
    logger.error('Failed to add comment', redactSensitiveData({
      doctype,
      name,
      comment_length: comment.length,
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
          code: 'PERMISSION_DENIED',
          message: `Insufficient permissions to comment on ${doctype}/${name}`
        }
      };
    }

    // Handle comment validation errors
    if (error.response?.status === 400) {
      return {
        ok: false,
        error: {
          code: 'FIELD_ERROR',
          message: error.response?.data?.message || `Invalid comment parameters`
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
        message: error.message || 'Failed to add comment'
      }
    };
  }
}