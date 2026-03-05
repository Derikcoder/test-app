/**
 * @file ResetPassword.jsx
 * @description Password reset confirmation page component
 * @module Components/ResetPassword
 * 
 * Allows users to set new password using reset token from email.
 * Validates token and updates password securely.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

/**
 * Reset Password Component
 * 
 * @component
 * @returns {JSX.Element} Password reset form with token validation
 * 
 * @description
 * Renders form for setting new password:
 * - New password input
 * - Confirm password input
 * - Token validation
 * - Auto-login after successful reset
 * 
 * Features:
 * - Password strength validation
 * - Password match confirmation
 * - Token expiry handling
 * - Automatic login on success
 * - Error handling
 * 
 * @example
 * <Route path="/reset-password/:token" element={<ResetPassword />} />
 */
const ResetPassword = () => {
 const navigate = useNavigate();
 const { token } = useParams();
 const { login } = useAuth();
 
 const [formData, setFormData] = useState({
  password: '',
  confirmPassword: '',
 });
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 /**
  * Handle Input Changes
  * 
  * @function handleChange
  * @param {Event} e - Input change event
  */
 const handleChange = (e) => {
  setFormData({
   ...formData,
   [e.target.name]: e.target.value,
  });
  // Clear error when user starts typing
  if (error) setError('');
 };

 /**
  * Handle Form Submission
  * 
  * @async
  * @function handleSubmit
  * @param {Event} e - Form submit event
  * 
  * @description
  * Resets password using token:
  * - Validates passwords match
  * - Validates password length
  * - Calls /api/auth/reset-password/:token endpoint
  * - Logs user in automatically
  * - Redirects to profile page
  */
 const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  // Validate passwords match
  if (formData.password !== formData.confirmPassword) {
   return setError('Passwords do not match');
  }

  // Validate password length
  if (formData.password.length < 6) {
   return setError('Password must be at least 6 characters');
  }

  setLoading(true);

  try {
   const response = await api.put(`/auth/reset-password/${token}`, {
    password: formData.password,
   });
   
   // Log user in with returned token
   login(response.data.user);
   
   // Redirect to profile
   navigate('/profile');
  } catch (err) {
   setError(
    err.response?.data?.message || 
    'Failed to reset password. The token may be invalid or expired.'
   );
  } finally {
   setLoading(false);
  }
 };

 return (
  <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center px-4 sm:px-6 lg:px-8">
   <div className="glass-form ">
    {/* Heading */}
    <h1 className="glass-heading">Reset Password</h1>
    <p className="glass-heading-secondary">
     Enter your new password below
    </p>

    {/* Error Message */}
    {error && (
     <div className="glass-alert-error mb-4">
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
       <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <p style={{ color: '#ee5a52' }} className="font-medium">{error}</p>
     </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-6">
     {/* New Password Input */}
     <div className="glass-form-group">
      <label htmlFor="password" className="glass-form-label">
       New Password
      </label>
      <input
       id="password"
       type="password"
       name="password"
       required
       minLength={6}
       value={formData.password}
       onChange={handleChange}
       className="glass-form-input"
       placeholder="Enter new password (min 6 characters)"
       disabled={loading}
      />
      <p className="text-sm mt-2 opacity-75" style={{ color: 'var(--primary)' }}>
       Password must be at least 6 characters
      </p>
     </div>

     {/* Confirm Password Input */}
     <div className="glass-form-group">
      <label htmlFor="confirmPassword" className="glass-form-label">
       Confirm Password
      </label>
      <input
       id="confirmPassword"
       type="password"
       name="confirmPassword"
       required
       minLength={6}
       value={formData.confirmPassword}
       onChange={handleChange}
       className="glass-form-input"
       placeholder="Confirm your new password"
       disabled={loading}
      />
     </div>

     {/* Password Strength Indicator */}
     {formData.password && (
      <div className="glass-form-group">
       <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
         <div 
          className={`h-full transition-all duration-300 ${
           formData.password.length < 6 
            ? 'w-1/3 bg-red-500' 
            : formData.password.length < 10 
            ? 'w-2/3 bg-yellow-500' 
            : 'w-full bg-green-500'
          }`}
         />
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
         {formData.password.length < 6 
          ? 'Weak' 
          : formData.password.length < 10 
          ? 'Medium' 
          : 'Strong'}
        </span>
       </div>
      </div>
     )}

     {/* Submit Button */}
     <button
      type="submit"
      disabled={loading}
      className="glass-btn-primary mt-8"
     >
      {loading ? '🔄 Resetting Password...' : '✨ Reset Password'}
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

    {/* Security Information */}
    <div className="mt-6 text-center">
     <p className="text-sm opacity-75" style={{ color: 'var(--primary)' }}>
      🔒 After resetting, you'll be automatically logged in
     </p>
    </div>
   </div>
  </div>
 );
};

export default ResetPassword;
