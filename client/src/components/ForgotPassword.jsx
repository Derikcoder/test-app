/**
 * @file ForgotPassword.jsx
 * @description Password reset request page component
 * @module Components/ForgotPassword
 * 
 * Allows users to request a password reset email.
 * Sends reset link to registered email address.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

/**
 * Forgot Password Component
 * 
 * @component
 * @returns {JSX.Element} Password reset request form
 * 
 * @description
 * Renders form for password reset request:
 * - Email input field
 * - Submit button
 * - Success/error message display
 * - Back to login link
 * 
 * Features:
 * - Form validation (required email)
 * - Loading state during submission
 * - Success confirmation message
 * - Error handling
 * 
 * @example
 * <Route path="/forgot-password" element={<ForgotPassword />} />
 */
const ForgotPassword = () => {
 const navigate = useNavigate();
 
 const [email, setEmail] = useState('');
 const [message, setMessage] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);
 const [submitted, setSubmitted] = useState(false);

 /**
  * Handle Form Submission
  * 
  * @async
  * @function handleSubmit
  * @param {Event} e - Form submit event
  * 
  * @description
  * Sends password reset request to backend:
  * - Validates email format
  * - Calls /api/auth/forgot-password endpoint
  * - Shows success message on completion
  * - Displays error if request fails
  */
 const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setMessage('');
  setLoading(true);

  try {
   const response = await api.post('/auth/forgot-password', { email });
   
   setMessage(response.data.message);
   setSubmitted(true);
   
   // Optionally redirect to login after 5 seconds
   setTimeout(() => {
    navigate('/login');
   }, 5000);
  } catch (err) {
   setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
  } finally {
   setLoading(false);
  }
 };

 return (
  <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center px-4 sm:px-6 lg:px-8">
   <div className="glass-form ">
    {/* Heading */}
    <h1 className="glass-heading">Forgot Password?</h1>
    <p className="glass-heading-secondary">
     Enter your email to receive a password reset link
    </p>

    {/* Success Message */}
    {submitted && message && (
     <div className="glass-alert-success mb-4">
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
       <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <div>
       <p style={{ color: '#10b981' }} className="font-medium">{message}</p>
       <p style={{ color: '#10b981' }} className="text-sm mt-1">
        Check your email inbox and spam folder. Redirecting to login in 5 seconds...
       </p>
      </div>
     </div>
    )}

    {/* Error Message */}
    {error && (
     <div className="glass-alert-error mb-4">
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
       <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <p style={{ color: '#ee5a52' }} className="font-medium">{error}</p>
     </div>
    )}

    {!submitted && (
     <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Input */}
      <div className="glass-form-group">
       <label htmlFor="email" className="glass-form-label">
        Email Address
       </label>
       <input
        id="email"
        type="email"
        name="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="glass-form-input"
        placeholder="you@example.com"
        disabled={loading}
       />
       <p className="text-sm mt-2 opacity-75" style={{ color: 'var(--primary)' }}>
        We'll send a password reset link to this email address
       </p>
      </div>

      {/* Submit Button */}
      <button
       type="submit"
       disabled={loading}
       className="glass-btn-primary mt-8"
      >
       {loading ? '🔄 Sending...' : '📧 Send Reset Link'}
      </button>

      {/* Divider */}
      <div className="glass-divider">
       <span className="glass-divider-text">OR</span>
      </div>

      {/* Back to Login Button */}
      <button
       type="button"
       onClick={() => navigate('/login')}
       className="glass-btn-outline"
      >
       ← Back to Login
      </button>
     </form>
    )}

    {submitted && (
     <button
      type="button"
      onClick={() => navigate('/login')}
      className="glass-btn-primary mt-6"
     >
      ← Return to Login
     </button>
    )}

    {/* Security Information */}
    <div className="mt-6 text-center">
     <p className="text-sm opacity-75" style={{ color: 'var(--primary)' }}>
      🔒 The reset link will be valid for 1 hour for security reasons
     </p>
    </div>
   </div>
  </div>
 );
};

export default ForgotPassword;
