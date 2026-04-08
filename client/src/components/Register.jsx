import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getPostLoginRedirect } from '../utils/authRedirect';

const ROLE_OPTIONS = [
  {
    value: 'superAdmin',
    title: 'Super Admin',
    summary: 'Executive ownership and full business governance access.',
  },
  {
    value: 'businessAdministrator',
    title: 'Business Administrator',
    summary: 'Daily operations management for staff and job flow.',
  },
  {
    value: 'fieldServiceAgent',
    title: 'Field Service Agent',
    summary: 'Technician login for dispatched and self-accepted work.',
  },
  {
    value: 'customer',
    title: 'Customer',
    summary: 'Customer portal access for requests, tracking, and approvals.',
  },
];

const PASSKEY_REQUIRED_ROLES = ['businessAdministrator', 'fieldServiceAgent'];
const BUSINESS_REQUIRED_ROLES = ['superAdmin', 'customer'];

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
  role: 'superAdmin',
  passkey: '',
  fieldServiceAgentProfileId: '',
  customerProfileId: '',
 });
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const selectedRole = formData.role;
 const requiresPasskey = PASSKEY_REQUIRED_ROLES.includes(selectedRole);
 const requiresBusinessInfo = BUSINESS_REQUIRED_ROLES.includes(selectedRole);
 const requiresFieldAgentProfile = selectedRole === 'fieldServiceAgent';
 const requiresCustomerProfile = selectedRole === 'customer';

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

  if (requiresPasskey && !formData.passkey.trim()) {
   setError('A one-time passkey is required for this role');
   return;
  }

  if (requiresFieldAgentProfile && !formData.fieldServiceAgentProfileId.trim()) {
   setError('Field Service Agent Profile ID is required for this role');
   return;
  }

  if (requiresCustomerProfile && !formData.customerProfileId.trim()) {
   setError('Customer Profile ID is required for this role');
   return;
  }

  setLoading(true);

  try {
   const { confirmPassword, ...registerData } = formData;
   const response = await api.post('/auth/register', registerData);
   
   // Store user info and token
   login(response.data);
   
   // Redirect based on role (customers land on their profile page)
   navigate(getPostLoginRedirect(response.data));
  } catch (err) {
   setError(err.response?.data?.message || 'Registration failed. Please try again.');
  } finally {
   setLoading(false);
  }
 };

 return (
  <div className="glass-bg-particles min-h-screen bg-fixed auth-surface py-8 px-4 sm:px-6 lg:px-8">
   <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr]">
    <section className="auth-aside-card">
     <p className="auth-kicker">Identity & Access Provisioning</p>
     <h1 className="auth-aside-title">Create a Production-Grade Account</h1>
     <p className="auth-aside-copy">
      Registration adapts by principal type with role-specific verification, profile linking, and controlled onboarding.
     </p>
     <ul className="mt-6 space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.88)' }}>
      <li>Role-first onboarding for all principal types</li>
      <li>One-time passkey flow for delegated roles</li>
      <li>Operational profile linking for field agents and customers</li>
     </ul>
    </section>

    <section className="glass-form max-w-none p-7 sm:p-9">
    <h2 className="glass-heading text-left">Register Account</h2>
    <p className="glass-heading-secondary mb-6 text-left">Set role, verify identity, and activate access.</p>

    {/* Error Message Display */}
    {error && (
     <div className="glass-alert-error mb-6">
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
       <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <p style={{ color: '#ee5a52' }} className="font-medium">{error}</p>
     </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-5">
     {/* Role Section */}
     <div className="glass-card">
      <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--primary)' }}>Account Role</h3>
      <p className="text-sm mb-4 opacity-75" style={{ color: 'var(--primary)' }}>
       Choose the principal role first. Required fields below will adapt automatically.
      </p>
      <div className="grid grid-cols-1 gap-3">
       {ROLE_OPTIONS.map((option) => (
        <label key={option.value} className="glass-form-group mb-0 cursor-pointer rounded-lg border p-3 transition-all"
          style={{
            borderColor: formData.role === option.value ? 'var(--secondary)' : 'rgba(255,255,255,0.25)',
            background: formData.role === option.value ? 'rgba(255, 251, 40, 0.08)' : 'rgba(255,255,255,0.08)',
          }}
        >
         <div className="flex items-start gap-3">
          <input
           type="radio"
           name="role"
           value={option.value}
           checked={formData.role === option.value}
           onChange={handleChange}
           className="mt-1 h-4 w-4"
          />
          <div>
           <p className="font-semibold" style={{ color: 'var(--primary)' }}>{option.title}</p>
           <p className="text-xs opacity-80" style={{ color: 'var(--primary)' }}>{option.summary}</p>
          </div>
         </div>
        </label>
       ))}
      </div>
     </div>

     {/* User Information Section */}
     <div className="glass-card">
      <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>User Credentials</h3>
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

       {/* Delegated Access Section */}
       {requiresPasskey && (
        <div className="glass-card">
         <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>Delegated Access Verification</h3>
         <div className="grid grid-cols-1 gap-4">
        <div className="glass-form-group mb-0">
         <label className="glass-form-label">One-Time Passkey</label>
         <input
          type="text"
          name="passkey"
          required={requiresPasskey}
          value={formData.passkey}
          onChange={handleChange}
          className="glass-form-input"
          placeholder="Enter 7-digit onboarding key"
         />
        </div>
         </div>
        </div>
       )}

       {/* Profile Linking Section */}
       {(requiresFieldAgentProfile || requiresCustomerProfile) && (
        <div className="glass-card">
         <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>Operational Profile Link</h3>
         <div className="grid grid-cols-1 gap-4">
        {requiresFieldAgentProfile && (
         <div className="glass-form-group mb-0">
          <label className="glass-form-label">Field Service Agent Profile ID</label>
          <input
           type="text"
           name="fieldServiceAgentProfileId"
           required
           value={formData.fieldServiceAgentProfileId}
           onChange={handleChange}
           className="glass-form-input"
           placeholder="Paste linked field agent profile ID"
          />
         </div>
        )}
        {requiresCustomerProfile && (
         <div className="glass-form-group mb-0">
          <label className="glass-form-label">Customer Profile ID</label>
          <input
           type="text"
           name="customerProfileId"
           required
           value={formData.customerProfileId}
           onChange={handleChange}
           className="glass-form-input"
           placeholder="Paste linked customer profile ID"
          />
         </div>
        )}
         </div>
        </div>
       )}

       {/* Business Information Section */}
       {requiresBusinessInfo && (
       <div className="glass-card">
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>Business Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       <div className="md:col-span-2 glass-form-group">
        <label className="glass-form-label">Business Name</label>
        <input
         type="text"
         name="businessName"
         required={requiresBusinessInfo}
         value={formData.businessName}
         onChange={handleChange}
         className="glass-form-input"
         placeholder="ABC Corporation"
        />
       </div>
       <div className="glass-form-group">
        <label className="glass-form-label">Business Registration Number (Optional)</label>
        <input
         type="text"
         name="businessRegistrationNumber"
         value={formData.businessRegistrationNumber}
         onChange={handleChange}
         className="glass-form-input"
         placeholder="REG123456"
        />
       </div>
       <div className="glass-form-group">
        <label className="glass-form-label">Tax Number (Optional)</label>
        <input
         type="text"
         name="taxNumber"
         value={formData.taxNumber}
         onChange={handleChange}
         className="glass-form-input"
         placeholder="TAX123456"
        />
       </div>
       <div className="glass-form-group">
        <label className="glass-form-label">VAT Number (Optional)</label>
        <input
         type="text"
         name="vatNumber"
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
         required={requiresBusinessInfo}
         value={formData.phoneNumber}
         onChange={handleChange}
         className="glass-form-input"
         placeholder="+27 12 345 6789"
        />
       </div>
      </div>
     </div>
      )}

     {/* Address Information Section */}
      {requiresBusinessInfo && (
      <div className="glass-card">
      <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>Address Information</h3>
      <div className="grid grid-cols-1 gap-4">
       <div className="glass-form-group">
        <label className="glass-form-label">Physical Address</label>
        <textarea
         name="physicalAddress"
        required={requiresBusinessInfo}
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
     )}

     {/* Action Buttons */}
     <div className="flex flex-col sm:flex-row gap-4 pt-2">
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
        {loading ? 'Provisioning account...' : 'Create Enterprise Account'}
      </button>
     </div>

     {/* Footer */}
     <div className="text-center pt-4">
      <p className="text-xs opacity-70" style={{ color: 'var(--primary)' }}>
       By registering, you agree to our Terms & Conditions
      </p>
     </div>
    </form>
    </section>
   </div>
  </div>
 );
};

export default Register;
