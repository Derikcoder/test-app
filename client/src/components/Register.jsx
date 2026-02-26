import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessRegistrationNumber: '',
    taxNumber: '',
    vatNumber: '',
    phoneNumber: '',
    physicalAddress: '',
    websiteAddress: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await api.post('/auth/register', registerData);
      
      // Store user info and token
      login(response.data);
      
      // Redirect to profile
      navigate('/profile');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-bg-particles min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="glass-form max-w-3xl">
        {/* Heading */}
        <h1 className="glass-heading">Create Account</h1>
        <p className="glass-heading-secondary">Join Appatunid & Manage Your Business</p>

        {/* Error Message Display */}
        {error && (
          <div className="glass-alert-error mb-6">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p style={{ color: '#ee5a52' }} className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Information Section */}
          <div className="glass-card">
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>👤 User Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-form-group">
                <label className="glass-form-label">Username</label>
                <input
                  type="text"
                  name="userName"
                  required
                  value={formData.userName}
                  onChange={handleChange}
                  className="glass-form-input"
                  placeholder="johndoe"
                />
              </div>
              <div className="glass-form-group">
                <label className="glass-form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="glass-form-input"
                  placeholder="john@example.com"
                />
              </div>
              <div className="glass-form-group">
                <label className="glass-form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="glass-form-input"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="glass-form-group">
                <label className="glass-form-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="glass-form-input"
                  placeholder="Re-enter password"
                />
              </div>
            </div>
          </div>

          {/* Business Information Section */}
          <div className="glass-card">
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>🏢 Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 glass-form-group">
                <label className="glass-form-label">Business Name</label>
                <input
                  type="text"
                  name="businessName"
                  required
                  value={formData.businessName}
                  onChange={handleChange}
                  className="glass-form-input"
                  placeholder="ABC Corporation"
                />
              </div>
              <div className="glass-form-group">
                <label className="glass-form-label">Business Registration Number</label>
                <input
                  type="text"
                  name="businessRegistrationNumber"
                  required
                  value={formData.businessRegistrationNumber}
                  onChange={handleChange}
                  className="glass-form-input"
                  placeholder="REG123456"
                />
              </div>
              <div className="glass-form-group">
                <label className="glass-form-label">Tax Number</label>
                <input
                  type="text"
                  name="taxNumber"
                  required
                  value={formData.taxNumber}
                  onChange={handleChange}
                  className="glass-form-input"
                  placeholder="TAX123456"
                />
              </div>
              <div className="glass-form-group">
                <label className="glass-form-label">VAT Number</label>
                <input
                  type="text"
                  name="vatNumber"
                  required
                  value={formData.vatNumber}
                  onChange={handleChange}
                  className="glass-form-input"
                  placeholder="VAT123456"
                />
              </div>
              <div className="glass-form-group">
                <label className="glass-form-label">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="glass-form-input"
                  placeholder="+27 12 345 6789"
                />
              </div>
            </div>
          </div>

          {/* Address Information Section */}
          <div className="glass-card">
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>📍 Address Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="glass-form-group">
                <label className="glass-form-label">Physical Address</label>
                <textarea
                  name="physicalAddress"
                  required
                  value={formData.physicalAddress}
                  onChange={handleChange}
                  rows="3"
                  className="glass-form-textarea"
                  placeholder="123 Main Street, City, Province, Postal Code"
                />
              </div>
              <div className="glass-form-group">
                <label className="glass-form-label">Website Address</label>
                <input
                  type="url"
                  name="websiteAddress"
                  value={formData.websiteAddress}
                  onChange={handleChange}
                  className="glass-form-input"
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="glass-btn-outline flex-1"
            >
              Already Have Account?
            </button>
            <button
              type="submit"
              disabled={loading}
              className="glass-btn-primary flex-1"
            >
              {loading ? '🔄 Registering...' : '✨ Create Account'}
            </button>
          </div>

          {/* Footer */}
          <div className="text-center pt-4">
            <p className="text-xs opacity-70" style={{ color: 'var(--primary)' }}>
              By registering, you agree to our Terms & Conditions
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
