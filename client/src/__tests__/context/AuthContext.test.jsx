/**
 * @file AuthContext.test.jsx
 * @description Unit tests for AuthContext
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// Test component that uses auth context
const TestComponent = () => {
  const { user, loading, login, logout, updateUser } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <button onClick={() => login({ email: 'test@example.com', token: 'token123' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => updateUser({ email: 'updated@example.com' })}>
        Update
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('AuthProvider initialization', () => {
    it('should start with loading state true, then set to false', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Initially loading should be true (but quickly becomes false)
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });
    });

    it('should initialize with no user when localStorage is empty', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });

    it('should restore user from localStorage on mount', async () => {
      const storedUser = { email: 'stored@example.com', token: 'storedtoken' };
      localStorage.setItem('userInfo', JSON.stringify(storedUser));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('stored@example.com');
      });
    });

    it('should handle invalid JSON in localStorage gracefully', async () => {
      localStorage.setItem('userInfo', 'invalid json');

      // Should not crash, should handle gracefully
      expect(() => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      }).not.toThrow();
    });
  });

  describe('login', () => {
    it('should set user data and store in localStorage', async () => {
      const { container } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      // Click login button
      const loginButton = screen.getByText('Login');
      loginButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      // Check localStorage
      const storedData = JSON.parse(localStorage.getItem('userInfo'));
      expect(storedData).toEqual({ email: 'test@example.com', token: 'token123' });
    });

    it('should persist user data across remounts', async () => {
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      // Login
      const loginButton = screen.getByText('Login');
      loginButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      // Unmount and remount
      unmount();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // User should still be logged in
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });
    });
  });

  describe('logout', () => {
    it('should clear user data and remove from localStorage', async () => {
      // Start with logged in user
      localStorage.setItem('userInfo', JSON.stringify({ email: 'test@example.com', token: 'token123' }));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      // Click logout button
      const logoutButton = screen.getByText('Logout');
      logoutButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });

      // Check localStorage
      expect(localStorage.getItem('userInfo')).toBeNull();
    });

    it('should handle logout when no user is logged in', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });

      // Click logout when no one is logged in
      const logoutButton = screen.getByText('Logout');
      logoutButton.click();

      // Should not crash
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });
  });

  describe('updateUser', () => {
    it('should update user data in state and localStorage', async () => {
      localStorage.setItem('userInfo', JSON.stringify({ email: 'old@example.com', token: 'token123' }));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('old@example.com');
      });

      // Click update button
      const updateButton = screen.getByText('Update');
      updateButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('updated@example.com');
      });

      // Check localStorage
      const storedData = JSON.parse(localStorage.getItem('userInfo'));
      expect(storedData.email).toBe('updated@example.com');
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });

    it('should provide all context values', async () => {
      let contextValue;

      const TestContextValues = () => {
        contextValue = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <TestContextValues />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
        expect(contextValue).toHaveProperty('user');
        expect(contextValue).toHaveProperty('loading');
        expect(contextValue).toHaveProperty('login');
        expect(contextValue).toHaveProperty('logout');
        expect(contextValue).toHaveProperty('updateUser');
      });
    });
  });
});
