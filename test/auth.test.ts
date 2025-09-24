import axios from 'axios';
import { erpAuthenticator } from '../src/core/auth';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Auth Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset authenticator state
    (erpAuthenticator as any).client = null;
    (erpAuthenticator as any).config = null;
  });

  describe('connect', () => {
    it('should successfully authenticate with valid credentials', async () => {
      // Mock successful authentication response
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: { message: 'testuser' } })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const result = await erpAuthenticator.connect(
        'https://test.erpnext.com',
        'test_api_key',
        'test_api_secret'
      );

      expect(result.ok).toBe(true);
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://test.erpnext.com',
        timeout: 30000,
        headers: {
          'Authorization': 'token test_api_key:test_api_secret',
          'Content-Type': 'application/json'
        }
      });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/method/frappe.auth.get_logged_user');
    });

    it('should return AUTH_FAILED for missing parameters', async () => {
      const result = await erpAuthenticator.connect('', '', '');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Missing required authentication parameters');
    });

    it('should return AUTH_FAILED for invalid credentials', async () => {
      // Mock failed authentication response
      const mockAxiosInstance = {
        get: jest.fn().mockRejectedValue({
          response: {
            data: { message: 'Invalid credentials' }
          }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const result = await erpAuthenticator.connect(
        'https://test.erpnext.com',
        'invalid_key',
        'invalid_secret'
      );

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Invalid credentials');
    });

    it('should normalize base URL by removing trailing slash', async () => {
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: { message: 'testuser' } })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      await erpAuthenticator.connect(
        'https://test.erpnext.com/',
        'test_api_key',
        'test_api_secret'
      );

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://test.erpnext.com'
        })
      );
    });
  });

  describe('whoami', () => {
    it('should return user info when authenticated', async () => {
      // First authenticate
      const mockAxiosInstance = {
        get: jest.fn()
          .mockResolvedValueOnce({ data: { message: 'testuser' } }) // auth call
          .mockResolvedValueOnce({ data: { message: 'testuser' } }) // whoami call
          .mockResolvedValueOnce({ // user roles call
            data: {
              data: {
                roles: [
                  { role: 'System Manager' },
                  { role: 'Sales User' }
                ]
              }
            }
          })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      await erpAuthenticator.connect(
        'https://test.erpnext.com',
        'test_api_key',
        'test_api_secret'
      );

      const result = await erpAuthenticator.whoami();

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({
        user: 'testuser',
        roles: ['System Manager', 'Sales User']
      });
    });

    it('should return AUTH_FAILED when not authenticated', async () => {
      const result = await erpAuthenticator.whoami();

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Not authenticated. Please call connect first.');
    });

    it('should handle failed user info retrieval', async () => {
      // First authenticate
      const mockAxiosInstance = {
        get: jest.fn()
          .mockResolvedValueOnce({ data: { message: 'testuser' } }) // auth call
          .mockRejectedValueOnce({ // whoami call fails
            response: {
              data: { message: 'User not found' }
            }
          })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      await erpAuthenticator.connect(
        'https://test.erpnext.com',
        'test_api_key',
        'test_api_secret'
      );

      const result = await erpAuthenticator.whoami();

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('User not found');
    });

    it('should handle empty username response', async () => {
      // First authenticate
      const mockAxiosInstance = {
        get: jest.fn()
          .mockResolvedValueOnce({ data: { message: 'testuser' } }) // auth call
          .mockResolvedValueOnce({ data: { message: null } }) // whoami call returns null
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      await erpAuthenticator.connect(
        'https://test.erpnext.com',
        'test_api_key',
        'test_api_secret'
      );

      const result = await erpAuthenticator.whoami();

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
      expect(result.error?.message).toBe('Unable to retrieve user information');
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', () => {
      expect(erpAuthenticator.isAuthenticated()).toBe(false);
    });

    it('should return true when authenticated', async () => {
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: { message: 'testuser' } })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      await erpAuthenticator.connect(
        'https://test.erpnext.com',
        'test_api_key',
        'test_api_secret'
      );

      expect(erpAuthenticator.isAuthenticated()).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return null when not authenticated', () => {
      expect(erpAuthenticator.getConfig()).toBeNull();
    });

    it('should return config when authenticated', async () => {
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: { message: 'testuser' } })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      await erpAuthenticator.connect(
        'https://test.erpnext.com',
        'test_api_key',
        'test_api_secret'
      );

      const config = erpAuthenticator.getConfig();
      expect(config).toEqual({
        baseUrl: 'https://test.erpnext.com',
        apiKey: 'test_api_key',
        apiSecret: 'test_api_secret'
      });
    });
  });
});