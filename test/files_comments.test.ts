import { uploadFile, addComment } from '../src/core/files_comments';
import { erpAuthenticator } from '../src/core/auth';

// Mock the auth module
jest.mock('../src/core/auth', () => ({
  erpAuthenticator: {
    isAuthenticated: jest.fn(),
    getConfig: jest.fn(),
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

// Mock FormData and Blob for Node.js environment
global.FormData = class FormData {
  private data: Map<string, any> = new Map();

  append(key: string, value: any, filename?: string) {
    this.data.set(key, { value, filename });
  }

  get(key: string) {
    return this.data.get(key)?.value;
  }
} as any;

global.Blob = class Blob {
  constructor(private content: any[]) {}
} as any;

// Mock Buffer for base64 operations
global.Buffer = {
  from: jest.fn().mockImplementation((data: string, encoding: string) => {
    if (encoding === 'base64') {
      return { length: data.length };
    }
    return data;
  })
} as any;

describe('Files and Comments Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default successful auth
    (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(true);
    (erpAuthenticator.getConfig as jest.Mock).mockReturnValue({ baseUrl: 'https://test.com' });
    (erpAuthenticator as any).client = mockAxios;
  });

  describe('uploadFile', () => {
    const validBase64 = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64

    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await uploadFile('Sales Invoice', 'SI-001', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });

      test('should fail when doctype is missing', async () => {
        const result = await uploadFile('', 'SI-001', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when doctype is not string', async () => {
        const result = await uploadFile(null as any, 'SI-001', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when name is missing', async () => {
        const result = await uploadFile('Sales Invoice', '', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document name is required and must be a string'
          }
        });
      });

      test('should fail when name is not string', async () => {
        const result = await uploadFile('Sales Invoice', 123 as any, validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document name is required and must be a string'
          }
        });
      });

      test('should fail when file_base64 is missing', async () => {
        const result = await uploadFile('Sales Invoice', 'SI-001', '', 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'File base64 content is required and must be a string'
          }
        });
      });

      test('should fail when file_base64 is not string', async () => {
        const result = await uploadFile('Sales Invoice', 'SI-001', 123 as any, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'File base64 content is required and must be a string'
          }
        });
      });

      test('should fail when filename is missing', async () => {
        const result = await uploadFile('Sales Invoice', 'SI-001', validBase64, '');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Filename is required and must be a string'
          }
        });
      });

      test('should fail when filename is not string', async () => {
        const result = await uploadFile('Sales Invoice', 'SI-001', validBase64, 123 as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Filename is required and must be a string'
          }
        });
      });

      test('should fail when base64 format is invalid', async () => {
        const result = await uploadFile('Sales Invoice', 'SI-001', 'invalid-base64!@#', 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Invalid base64 format for file content'
          }
        });
      });

      test('should fail when file size exceeds limit', async () => {
        // Create a large base64 string (simulating 11MB)
        const largeBase64 = 'A'.repeat(15000000); // Much larger than 10MB limit

        const result = await uploadFile('Sales Invoice', 'SI-001', largeBase64, 'large.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'File size exceeds maximum limit of 10MB'
          }
        });
      });

      test('should fail when config is missing', async () => {
        (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

        const result = await uploadFile('Sales Invoice', 'SI-001', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Authentication configuration not found'
          }
        });
      });

      test('should fail when client is missing', async () => {
        (erpAuthenticator as any).client = null;

        const result = await uploadFile('Sales Invoice', 'SI-001', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'No authenticated client available'
          }
        });
      });
    });

    describe('Successful Operations', () => {
      test('should upload file successfully', async () => {
        const mockFileResponse = {
          data: {
            message: {
              file_url: '/files/test.txt',
              file_name: 'test.txt'
            }
          }
        };

        mockAxios.post.mockResolvedValue(mockFileResponse);

        const result = await uploadFile('Sales Invoice', 'SI-001', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: true,
          data: {
            file_url: '/files/test.txt',
            file_name: 'test.txt',
            file_size: 12 // Actual decoded size of validBase64 ("Hello World")
          }
        });

        expect(mockAxios.post).toHaveBeenCalledWith(
          '/api/method/upload_file',
          expect.any(Object), // FormData
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      });

      test('should handle file upload without returned file_name', async () => {
        const mockFileResponse = {
          data: {
            message: {
              file_url: '/files/uploaded_file.pdf'
            }
          }
        };

        mockAxios.post.mockResolvedValue(mockFileResponse);

        const result = await uploadFile('Customer', 'CUST-001', validBase64, 'document.pdf');

        expect(result).toEqual({
          ok: true,
          data: {
            file_url: '/files/uploaded_file.pdf',
            file_name: 'document.pdf',
            file_size: 12
          }
        });
      });

      test('should handle large valid files under limit', async () => {
        // Create a file just under the 10MB limit
        const largeBase64 = 'A'.repeat(13000000); // ~9.75MB
        const mockFileResponse = {
          data: {
            message: {
              file_url: '/files/large_file.zip',
              file_name: 'large_file.zip'
            }
          }
        };

        mockAxios.post.mockResolvedValue(mockFileResponse);

        const result = await uploadFile('Item', 'ITEM-001', largeBase64, 'large_file.zip');

        expect(result.ok).toBe(true);
        expect(result.data?.file_url).toBe('/files/large_file.zip');
      });
    });

    describe('Error Handling', () => {
      test('should handle document not found (404)', async () => {
        mockAxios.post.mockRejectedValue({
          response: { status: 404 }
        });

        const result = await uploadFile('Sales Invoice', 'NONEXISTENT', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Document Sales Invoice/NONEXISTENT not found'
          }
        });
      });

      test('should handle permission denied (403)', async () => {
        mockAxios.post.mockRejectedValue({
          response: { status: 403 }
        });

        const result = await uploadFile('Sales Invoice', 'SI-001', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Insufficient permissions to upload file to Sales Invoice/SI-001'
          }
        });
      });

      test('should handle bad request (400)', async () => {
        mockAxios.post.mockRejectedValue({
          response: {
            status: 400,
            data: { message: 'Invalid file type' }
          }
        });

        const result = await uploadFile('Sales Invoice', 'SI-001', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Invalid file type'
          }
        });
      });

      test('should handle file size too large (413)', async () => {
        mockAxios.post.mockRejectedValue({
          response: { status: 413 }
        });

        const result = await uploadFile('Sales Invoice', 'SI-001', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'File size exceeds server limits'
          }
        });
      });

      test('should handle missing file URL in response', async () => {
        mockAxios.post.mockResolvedValue({
          data: {
            message: {} // No file_url
          }
        });

        const result = await uploadFile('Sales Invoice', 'SI-001', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'File upload failed - no file URL returned'
          }
        });
      });

      test('should handle network errors', async () => {
        mockAxios.post.mockRejectedValue(new Error('Network timeout'));

        const result = await uploadFile('Sales Invoice', 'SI-001', validBase64, 'test.txt');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Network timeout'
          }
        });
      });
    });
  });

  describe('addComment', () => {
    describe('Authentication and Validation', () => {
      test('should fail when not authenticated', async () => {
        (erpAuthenticator.isAuthenticated as jest.Mock).mockReturnValue(false);

        const result = await addComment('Sales Invoice', 'SI-001', 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Not authenticated. Please call erp.auth.connect first.'
          }
        });
      });

      test('should fail when doctype is missing', async () => {
        const result = await addComment('', 'SI-001', 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when doctype is not string', async () => {
        const result = await addComment(null as any, 'SI-001', 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'INVALID_DOCTYPE',
            message: 'Doctype is required and must be a string'
          }
        });
      });

      test('should fail when name is missing', async () => {
        const result = await addComment('Sales Invoice', '', 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document name is required and must be a string'
          }
        });
      });

      test('should fail when name is not string', async () => {
        const result = await addComment('Sales Invoice', 123 as any, 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Document name is required and must be a string'
          }
        });
      });

      test('should fail when comment is missing', async () => {
        const result = await addComment('Sales Invoice', 'SI-001', '');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Comment is required and must be a string'
          }
        });
      });

      test('should fail when comment is not string', async () => {
        const result = await addComment('Sales Invoice', 'SI-001', 123 as any);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Comment is required and must be a string'
          }
        });
      });

      test('should fail when comment exceeds length limit', async () => {
        const longComment = 'A'.repeat(10001); // Exceeds 10,000 character limit

        const result = await addComment('Sales Invoice', 'SI-001', longComment);

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Comment exceeds maximum length of 10,000 characters'
          }
        });
      });

      test('should fail when config is missing', async () => {
        (erpAuthenticator.getConfig as jest.Mock).mockReturnValue(null);

        const result = await addComment('Sales Invoice', 'SI-001', 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Authentication configuration not found'
          }
        });
      });

      test('should fail when client is missing', async () => {
        (erpAuthenticator as any).client = null;

        const result = await addComment('Sales Invoice', 'SI-001', 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'No authenticated client available'
          }
        });
      });
    });

    describe('Successful Operations', () => {
      test('should add comment successfully', async () => {
        const mockCommentResponse = {
          data: {
            message: {
              name: 'COMMENT-001'
            }
          }
        };

        mockAxios.post.mockResolvedValue(mockCommentResponse);

        const result = await addComment('Sales Invoice', 'SI-001', 'This is a test comment');

        expect(result).toEqual({
          ok: true,
          data: {
            comment_added: true,
            comment_id: 'COMMENT-001'
          }
        });

        expect(mockAxios.post).toHaveBeenCalledWith('/api/method/frappe.desk.form.utils.add_comment', {
          reference_doctype: 'Sales Invoice',
          reference_name: 'SI-001',
          content: 'This is a test comment',
          comment_type: 'Comment'
        });
      });

      test('should add comment without comment ID', async () => {
        const mockCommentResponse = {
          data: {
            message: {} // No comment ID returned
          }
        };

        mockAxios.post.mockResolvedValue(mockCommentResponse);

        const result = await addComment('Customer', 'CUST-001', 'Customer feedback received');

        expect(result).toEqual({
          ok: true,
          data: {
            comment_added: true,
            comment_id: undefined
          }
        });
      });

      test('should handle long comment within limit', async () => {
        const longComment = 'A'.repeat(9999); // Just under 10,000 character limit
        const mockCommentResponse = {
          data: {
            message: {
              name: 'COMMENT-LONG'
            }
          }
        };

        mockAxios.post.mockResolvedValue(mockCommentResponse);

        const result = await addComment('Item', 'ITEM-001', longComment);

        expect(result.ok).toBe(true);
        expect(result.data?.comment_id).toBe('COMMENT-LONG');
      });

      test('should handle multiline comments', async () => {
        const multilineComment = 'Line 1\nLine 2\nLine 3';
        const mockCommentResponse = {
          data: {
            message: {
              name: 'COMMENT-MULTI'
            }
          }
        };

        mockAxios.post.mockResolvedValue(mockCommentResponse);

        const result = await addComment('Task', 'TASK-001', multilineComment);

        expect(result.ok).toBe(true);
        expect(result.data?.comment_added).toBe(true);
      });
    });

    describe('Error Handling', () => {
      test('should handle document not found (404)', async () => {
        mockAxios.post.mockRejectedValue({
          response: { status: 404 }
        });

        const result = await addComment('Sales Invoice', 'NONEXISTENT', 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Document Sales Invoice/NONEXISTENT not found'
          }
        });
      });

      test('should handle permission denied (403)', async () => {
        mockAxios.post.mockRejectedValue({
          response: { status: 403 }
        });

        const result = await addComment('Sales Invoice', 'SI-001', 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Insufficient permissions to comment on Sales Invoice/SI-001'
          }
        });
      });

      test('should handle bad request (400)', async () => {
        mockAxios.post.mockRejectedValue({
          response: {
            status: 400,
            data: { message: 'Invalid comment format' }
          }
        });

        const result = await addComment('Sales Invoice', 'SI-001', 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Invalid comment format'
          }
        });
      });

      test('should handle response with error message', async () => {
        mockAxios.post.mockRejectedValue({
          response: {
            status: 500,
            data: { message: 'Comment system unavailable' }
          }
        });

        const result = await addComment('Sales Invoice', 'SI-001', 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Comment system unavailable'
          }
        });
      });

      test('should handle network errors', async () => {
        mockAxios.post.mockRejectedValue(new Error('Connection refused'));

        const result = await addComment('Sales Invoice', 'SI-001', 'Test comment');

        expect(result).toEqual({
          ok: false,
          error: {
            code: 'FIELD_ERROR',
            message: 'Connection refused'
          }
        });
      });
    });
  });
});