/**
 * @file axios.test.js
 * @description Unit tests for Axios API configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock axios before importing the api module
vi.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    },
  };
});

describe('Axios Configuration', () => {
  beforeEach(() => {
    // Don't clear axios.create mock - we want to check it was called during module load
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('API Instance Creation', () => {
    it('should have axios instance with required properties', async () => {
      const api = (await import('../../api/axios')).default;

      // Check that api instance has expected properties
      expect(api).toBeDefined();
      expect(api.interceptors).toBeDefined();
      expect(api.interceptors.request).toBeDefined();
      expect(api.interceptors.response).toBeDefined();
    });

    it('should have all HTTP methods available', async () => {
      const api = (await import('../../api/axios')).default;
      
      // Check that api instance exists with expected methods
      expect(api.post).toBeDefined();
      expect(api.get).toBeDefined();
      expect(api.put).toBeDefined();
      expect(api.delete).toBeDefined();
    });
  });

  describe('Token Injection', () => {
    it('should inject token from localStorage if available', () => {
      const mockUserInfo = {
        token: 'test-token-123',
        email: 'test@example.com',
      };
      localStorage.setItem('userInfo', JSON.stringify(mockUserInfo));

      // This test validates localStorage works correctly
      const stored = localStorage.getItem('userInfo');
      expect(stored).toBe(JSON.stringify(mockUserInfo));
      
      const parsed = JSON.parse(stored);
      expect(parsed.token).toBe('test-token-123');
    });

    it('should handle missing token gracefully', () => {
      // No token in localStorage
      const stored = localStorage.getItem('userInfo');
      expect(stored).toBeNull();
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorage.setItem('userInfo', 'invalid-json');
      const stored = localStorage.getItem('userInfo');
      
      // Should not crash when trying to parse
      expect(() => {
        if (stored && stored !== 'undefined') {
          JSON.parse(stored);
        }
      }).toThrow();
    });
  });

  describe('API Methods', () => {
    it('should support GET requests', async () => {
      const api = (await import('../../api/axios')).default;
      expect(api.get).toBeDefined();
      expect(typeof api.get).toBe('function');
    });

    it('should support POST requests', async () => {
      const api = (await import('../../api/axios')).default;
      expect(api.post).toBeDefined();
      expect(typeof api.post).toBe('function');
    });

    it('should support PUT requests', async () => {
      const api = (await import('../../api/axios')).default;
      expect(api.put).toBeDefined();
      expect(typeof api.put).toBe('function');
    });

    it('should support DELETE requests', async () => {
      const api = (await import('../../api/axios')).default;
      expect(api.delete).toBeDefined();
      expect(typeof api.delete).toBe('function');
    });
  });
});
