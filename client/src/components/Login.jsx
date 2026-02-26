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
   * Renders a centered login form with:
   * - Email and password inputs
   * - Error message display (conditional)
   * - Submit button with loading state
   * - Link to registration page
   * 
   * Styling:
   * - Gradient background (blue to indigo)
   * - Card-style form container
   * - Tailwind CSS classes for responsive design
   */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">Login to your account</p>
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="john@example.com"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your password"
            />
          </div>

          {/* Submit Button with Loading State */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {/* Link to Registration Page */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Don't have an account? Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
