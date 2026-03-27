/**
 * @file Login.test.jsx
 * @description Unit tests for Login component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import Login from '../../components/Login';
import api from '../../api/axios';

// Mock the API instance
vi.mock('../../api/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper to render component with providers
const renderLogin = () => {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render login form with all fields', () => {
      renderLogin();

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in securely/i })).toBeInTheDocument();
    });

    it('should render link to registration page', () => {
      renderLogin();

      const registerButton = screen.getByRole('button', { name: /create enterprise account/i });
      expect(registerButton).toBeInTheDocument();
    });

    it('should render heading', () => {
      renderLogin();

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should display error for empty email', async () => {
      renderLogin();

      const passwordInput = screen.getByLabelText(/password/i);
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /sign in securely/i });
      fireEvent.click(submitButton);

      // HTML5 validation should prevent submission
      // Check that API was not called
      expect(api.post).not.toHaveBeenCalled();
    });

    it('should display error for empty password', async () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: /sign in securely/i });
      fireEvent.click(submitButton);

      // HTML5 validation should prevent submission
      expect(api.post).not.toHaveBeenCalled();
    });

    it('should accept valid email format', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput).toHaveValue('test@example.com');
    });
  });

  describe('Form Submission', () => {
    it('should submit login with valid credentials', async () => {
      const mockResponse = {
        data: {
          _id: '123',
          email: 'test@example.com',
          userName: 'testuser',
          token: 'jwt-token-123',
        },
      };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in securely/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Should navigate to profile page after successful login
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/profile');
      });

      // Should store user in localStorage
      const storedUser = JSON.parse(localStorage.getItem('userInfo'));
      expect(storedUser).toEqual(mockResponse.data);
    });

    it('should display error message for invalid credentials', async () => {
      const errorMessage = 'Invalid email or password';
      vi.mocked(api.post).mockRejectedValueOnce({
        response: {
          data: { message: errorMessage },
        },
      });

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in securely/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();

      // Should not store user
      expect(localStorage.getItem('userInfo')).toBeNull();
    });

    it('should display generic error for network error', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Network Error'));

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in securely/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button during submission', async () => {
      vi.mocked(api.post).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in securely/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled();
    });
  });

  describe('User Experience', () => {
    it('should clear error message when user starts typing', async () => {
      const errorMessage = 'Invalid email or password';
      vi.mocked(api.post).mockRejectedValueOnce({
        response: {
          data: { message: errorMessage },
        },
      });

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in securely/i });

      // Submit with wrong credentials
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Start typing again
      fireEvent.change(emailInput, { target: { value: 'test2@example.com' } });

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
      });
    });

    it('should show password as hidden by default', () => {
      renderLogin();

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should have required attributes on inputs', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });
  });
});
