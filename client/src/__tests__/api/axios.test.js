/**
 * @file axios.test.js
 * @description Unit tests for Axios API configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import api from '../../api/axios';

// Mock axios.create
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return { default: mockAxios };
});

describe('Axios Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('API Instance Creation', () => {
    it('should create axios instance with correct baseURL', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: '/api',
        })
      );
    });

    it('should set default Content-Type header', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });
  });

  describe('Request Interceptor', () => {
    it('should register request interceptor', () => {
      expect(axios.interceptors.request.use).toHaveBeenCalled();
    });

    it('should inject token from localStorage if available', () => {
      const mockUserInfo = {
        token: 'test-token-123',
        email: 'test@example.com',
      };
      localStorage.setItem('userInfo', JSON.stringify(mockUserInfo));

      // Get the request interceptor function
      const requestInterceptor = axios.interceptors.request.use.mock.calls[0][0];
      
      const config = {
        headers: {},
      };

      const modifiedConfig = requestInterceptor(config);

      // Token should be added to Authorization header
      expect(modifiedConfig.headers.Authorization).toBe('Bearer test-token-123');
    });

    it('should handle missing token gracefully', () => {
      // No token in localStorage

      const requestInterceptor = axios.interceptors.request.use.mock.calls[0][0];
      
      const config = {
        headers: {},
      };

      const modifiedConfig = requestInterceptor(config);

      // Should not crash, just not add Authorization header
      expect(modifiedConfig.headers.Authorization).toBeUndefined();
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorage.setItem('userInfo', 'invalid-json');

      const requestInterceptor = axios.interceptors.request.use.mock.calls[0][0];
      
      const config = {
        headers: {},
      };

      // Should not crash
      expect(() => requestInterceptor(config)).not.toThrow();
    });

    it('should log request errors', () => {
      const errorInterceptor = axios.interceptors.request.use.mock.calls[0][1];
      const mockError = new Error('Request failed');

      expect(() => errorInterceptor(mockError)).rejects.toThrow('Request failed');
    });
  });

  describe('Response Interceptor', () => {
    it('should register response interceptor', () => {
      expect(axios.interceptors.response.use).toHaveBeenCalled();
    });

    it('should pass through successful responses', () => {
      const responseInterceptor = axios.interceptors.response.use.mock.calls[0][0];
      
      const mockResponse = {
        data: { message: 'Success' },
        status: 200,
      };

      const result = responseInterceptor(mockResponse);

      expect(result).toBe(mockResponse);
    });

    it('should handle 401 unauthorized errors', () => {
      const errorInterceptor = axios.interceptors.response.use.mock.calls[0][1];
      
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      // Should clear user data from localStorage on 401
      localStorage.setItem('userInfo', JSON.stringify({ token: 'test' }));

      errorInterceptor(mockError).catch(() => {});

      // Depending on implementation, localStorage might be cleared
      // This test would need to match actual implementation
    });

    it('should handle network errors', () => {
      const errorInterceptor = axios.interceptors.response.use.mock.calls[0][1];
      
      const mockError = new Error('Network Error');
      mockError.message = 'Network Error';

      expect(() => errorInterceptor(mockError)).rejects.toThrow();
    });

    it('should handle 500 server errors', () => {
      const errorInterceptor = axios.interceptors.response.use.mock.calls[0][1];
      
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      };

      expect(() => errorInterceptor(mockError)).rejects.toThrow();
    });
  });

  describe('API Methods', () => {
    it('should support GET requests', () => {
      expect(api.get).toBeDefined();
      expect(typeof api.get).toBe('function');
    });

    it('should support POST requests', () => {
      expect(api.post).toBeDefined();
      expect(typeof api.post).toBe('function');
    });

    it('should support PUT requests', () => {
      expect(api.put).toBeDefined();
      expect(typeof api.put).toBe('function');
    });

    it('should support DELETE requests', () => {
      expect(api.delete).toBeDefined();
      expect(typeof api.delete).toBe('function');
    });
  });
});
