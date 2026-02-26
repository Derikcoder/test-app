/**
 * @file Login.jsx
 * @description User login page component
 * @module Components/Login
 * 
 * Provides authentication interface for existing users.
 * Handles login form submission and JWT token storage.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

/**
 * Login Component
 * 
 * @component
 * @returns {JSX.Element} Login form page
 * 
 * @description
 * Renders login form with email and password inputs.
 * Authenticates user against backend API and stores JWT token.
 * Redirects to profile page on successful login.
 * 
 * Features:
 * - Form validation (required fields, email format)
 * - Error message display
 * - Loading state during authentication
 * - Auto-redirect on success
 * - Link to registration page
 * 
 * @example
 * // In App.jsx routes:
 * <Route path="/login" element={<Login />} />
 */
const Login = () => {
  // Hooks
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Form state management
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Handle Input Changes
   * 
   * @function handleChange
   * @param {Event} e - Input change event
   * 
   * @description
   * Updates form data state when user types in inputs.
   * Uses computed property names to update the correct field.
   */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /**
   * Handle Form Submission
   * 
   * @async
   * @function handleSubmit
   * @param {Event} e - Form submit event
   * 
   * @description
   * Authenticates user credentials against the backend API.
   * On success:
   * - Stores user data and JWT token via AuthContext
   * - Redirects to profile page
   * On failure:
   * - Displays error message to user
   * 
   * @throws Displays user-friendly error if API call fails
   */
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent page reload
    setError(''); // Clear previous errors
    setLoading(true); // Show loading state

    try {
      // Call login API endpoint
      const response = await api.post('/auth/login', formData);
      
      // Store user info and JWT token in context and localStorage
      login(response.data);
      
      // Navigate to user profile page
      navigate('/profile');
    } catch (err) {
      // Display error message from backend or generic error
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  /**
   * Render Login Form
   * 
   * @description
   * Renders a centered login form with glassmorphic design.
   * Features:
   * - Frosted glass effect with backdrop blur
   * - Brand color scheme (primary blue, secondary yellow)
   * - Email and password inputs with glass styling
   * - Error message display with glass alert
   * - Submit button with primary brand gradient
   * - Link to registration page with glass link styling
   */
  return (
    <div className="glass-bg-particles min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="glass-form">
        {/* Heading */}
        <h1 className="glass-heading">Welcome Back</h1>
        <p className="glass-heading-secondary">Login to Appatunid Platform</p>

        {/* Error Message Display */}
        {error && (
          <div className="glass-alert-error mb-4">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p style={{ color: '#ee5a52' }} className="font-medium">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="glass-form-group">
            <label className="glass-form-label">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="glass-form-input"
              placeholder="you@example.com"
            />
          </div>

          {/* Password Input */}
          <div className="glass-form-group">
            <label className="glass-form-label">Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="glass-form-input"
              placeholder="Enter your password"
            />
          </div>

          {/* Submit Button with Loading State */}
          <button
            type="submit"
            disabled={loading}
            className="glass-btn-primary mt-8"
          >
            {loading ? '🔄 Logging in...' : '✨ Login'}
          </button>

          {/* Divider */}
          <div className="glass-divider">
            <span className="glass-divider-text">OR</span>
          </div>

          {/* Link to Registration Page */}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="glass-btn-outline"
          >
            Create Account
          </button>

          {/* Footer Link */}
          <div className="text-center mt-6">
            <p className="text-sm opacity-75" style={{ color: 'var(--primary)' }}>
              Don't have an account?{' '}
              <a href="#" onClick={() => navigate('/register')} className="glass-link">
                Sign up here
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
