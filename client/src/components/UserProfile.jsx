import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from './Sidebar';

const UserProfile = () => {
 const navigate = useNavigate();
 const { user, logout, updateUser } = useAuth();
 const [isEditing, setIsEditing] = useState(false);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const [successMessage, setSuccessMessage] = useState('');
 
 // Form state for editable fields
 const [formData, setFormData] = useState({
  businessName: user?.businessName || '',
  businessRegistrationNumber: user?.businessRegistrationNumber || '',
  email: user?.email || '',
  phoneNumber: user?.phoneNumber || '',
  taxNumber: user?.taxNumber || '',
  vatNumber: user?.vatNumber || '',
  legalDocumentType: '',
  legalDocumentReference: '',
  legalDocumentUri: '',
  legalChangeReason: '',
  physicalAddress: user?.physicalAddress || '',
  websiteAddress: user?.websiteAddress || '',
  password: '',
  confirmPassword: '',
 });

 const [pendingQuotations, setPendingQuotations] = useState([]);
 const [quotsLoading, setQuotsLoading] = useState(true);
 const [quoteMsg, setQuoteMsg] = useState('');

 useEffect(() => {
  if (!user || user.role !== 'customer') { setQuotsLoading(false); return; }
  const fetchPending = async () => {
   try {
    const res = await api.get('/quotations', {
     headers: { Authorization: `Bearer ${user.token}` },
     params: { status: 'sent' },
    });
    setPendingQuotations(Array.isArray(res.data) ? res.data : []);
   } catch {
    /* non-critical */
   } finally {
    setQuotsLoading(false);
   }
  };
  fetchPending();
 }, [user?.role, user?.token]);

 if (!user) {
  navigate('/login');
  return null;
 }

 const handleAcceptQuotation = async (quotation) => {
  setQuoteMsg('');
  try {
   const res = await api.patch(`/quotations/share/${quotation.shareToken}/accept`);
   setQuoteMsg(res.data.message || 'Quotation accepted!');
   setPendingQuotations((prev) => prev.filter((q) => q._id !== quotation._id));
  } catch (err) {
   setQuoteMsg(err.response?.data?.message || 'Failed to accept quotation');
  }
 };

 const handleRejectQuotation = async (quotation) => {
  setQuoteMsg('');
  try {
   const res = await api.patch(`/quotations/share/${quotation.shareToken}/reject`);
   setQuoteMsg(res.data.message || 'Quotation declined.');
   setPendingQuotations((prev) => prev.filter((q) => q._id !== quotation._id));
  } catch (err) {
   setQuoteMsg(err.response?.data?.message || 'Failed to decline quotation');
  }
 };

 const roleDisplayName = {
  superAdmin: 'Super Admin',
  businessAdministrator: 'Business Administrator',
  fieldServiceAgent: 'Field Service Agent',
  customer: 'Customer',
 };

 const profileRole = roleDisplayName[user.role] || 'Platform User';
 const canOverrideRegistrationIdentifiers = user.role === 'superAdmin' || user.isSuperUser === true;
 const isRegistrationFieldLocked = (value) => !canOverrideRegistrationIdentifiers && Boolean(value?.trim());
 const registrationIdentifierFields = ['businessRegistrationNumber', 'taxNumber', 'vatNumber'];
 const requiresLegalEvidenceForOverride = canOverrideRegistrationIdentifiers && registrationIdentifierFields.some((field) => {
  const existingValue = (user[field] || '').trim();
  const incomingValue = (formData[field] || '').trim();
  return Boolean(existingValue) && incomingValue !== existingValue;
 });

 const handleLogout = () => {
  logout();
  navigate('/login');
 };

 const handleEditClick = () => {
  setIsEditing(true);
  setError('');
  setSuccessMessage('');
  // Reset form data to current user values
  setFormData({
    businessName: user.businessName || '',
   businessRegistrationNumber: user.businessRegistrationNumber || '',
   email: user.email,
   phoneNumber: user.phoneNumber,
   taxNumber: user.taxNumber,
   vatNumber: user.vatNumber,
   legalDocumentType: '',
   legalDocumentReference: '',
   legalDocumentUri: '',
   legalChangeReason: '',
   physicalAddress: user.physicalAddress,
   websiteAddress: user.websiteAddress || '',
   password: '',
   confirmPassword: '',
  });
 };

 const handleCancelEdit = () => {
  setIsEditing(false);
  setError('');
  setSuccessMessage('');
  setFormData({
    businessName: user.businessName || '',
   businessRegistrationNumber: user.businessRegistrationNumber || '',
   email: user.email,
   phoneNumber: user.phoneNumber,
   taxNumber: user.taxNumber,
   vatNumber: user.vatNumber,
   legalDocumentType: '',
   legalDocumentReference: '',
   legalDocumentUri: '',
   legalChangeReason: '',
   physicalAddress: user.physicalAddress,
   websiteAddress: user.websiteAddress || '',
   password: '',
   confirmPassword: '',
  });
 };

 const handleInputChange = (e) => {
  setFormData({
   ...formData,
   [e.target.name]: e.target.value,
  });
 };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccessMessage('');

  // Validate passwords match if password is being changed
  if (formData.password && formData.password !== formData.confirmPassword) {
   setError('Passwords do not match');
   return;
  }

  // Validate password length if changing
  if (formData.password && formData.password.length < 6) {
   setError('Password must be at least 6 characters');
   return;
  }

  if (requiresLegalEvidenceForOverride) {
   const hasAllEvidence =
    formData.legalDocumentType.trim() &&
    formData.legalDocumentReference.trim() &&
    formData.legalDocumentUri.trim() &&
    formData.legalChangeReason.trim().length >= 15;

   if (!hasAllEvidence) {
    setError('Legal documentation details are required when changing existing registration identifiers');
    return;
   }
  }

  setLoading(true);

  try {
   // Prepare update data (only send password if it's being changed)
   const updateData = {
    businessName: formData.businessName,
    businessRegistrationNumber: formData.businessRegistrationNumber,
    email: formData.email,
    phoneNumber: formData.phoneNumber,
    taxNumber: formData.taxNumber,
    vatNumber: formData.vatNumber,
    physicalAddress: formData.physicalAddress,
    websiteAddress: formData.websiteAddress,
   };

    if (requiresLegalEvidenceForOverride) {
     updateData.registrationChangeEvidence = {
      legalDocumentType: formData.legalDocumentType.trim(),
      legalDocumentReference: formData.legalDocumentReference.trim(),
      legalDocumentUri: formData.legalDocumentUri.trim(),
      legalChangeReason: formData.legalChangeReason.trim(),
     };
    }

   if (formData.password) {
    updateData.password = formData.password;
   }

   const response = await api.put('/auth/profile', updateData, {
    headers: {
     Authorization: `Bearer ${user.token}`,
    },
   });

   // Update user context with new data
   updateUser(response.data);
   setSuccessMessage('Profile updated successfully!');
   setIsEditing(false);
   
   // Clear password fields
   setFormData({
    ...formData,
    password: '',
    confirmPassword: '',
   });

   // Clear success message after 3 seconds
   setTimeout(() => setSuccessMessage(''), 3000);
  } catch (err) {
   setError(err.response?.data?.message || 'Failed to update profile');
  } finally {
   setLoading(false);
  }
 };

 return (
  <>
   <Sidebar />
   <div className="glass-bg-particles auth-surface min-h-screen bg-fixed py-10 px-4 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
     <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
      <section className="auth-aside-card">
       <p className="auth-kicker">Identity Console</p>
       <h1 className="auth-aside-title">{user.businessName || 'Enterprise Account'}</h1>
       <p className="auth-aside-copy">
        Centralized profile and governance summary for your platform account.
       </p>
       <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="auth-stat-card">
         <p className="auth-stat-label">Role</p>
         <p className="auth-stat-value">{profileRole}</p>
        </div>
        <div className="auth-stat-card">
         <p className="auth-stat-label">Status</p>
         <p className="auth-stat-value">{user.isActive ? 'Active' : 'Inactive'}</p>
        </div>
        <div className="auth-stat-card">
         <p className="auth-stat-label">Principal</p>
         <p className="auth-stat-value">{user.isSuperUser ? 'Admin' : 'Operational'}</p>
        </div>
       </div>
       <div className="mt-8 flex flex-wrap gap-3">
        <button
         onClick={isEditing ? handleCancelEdit : handleEditClick}
         className="glass-btn-outline w-auto px-5 py-2"
        >
         {isEditing ? 'Cancel Editing' : 'Edit Profile'}
        </button>
        <button
         onClick={handleLogout}
         className="glass-btn-secondary w-auto px-5 py-2"
        >
         Logout
        </button>
       </div>
      </section>

      <section className="glass-form max-w-none p-7 sm:p-9">
       <h2 className="glass-heading text-left">Account Profile</h2>
       <p className="glass-heading-secondary mb-6 text-left">Review and maintain your enterprise identity data.</p>

       {error && (
        <div className="glass-alert-error mb-4">
         <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
         </svg>
         <p className="font-medium" style={{ color: '#ee5a52' }}>{error}</p>
        </div>
       )}

       {successMessage && (
        <div className="glass-alert-success mb-4">
         <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
         </svg>
         <p className="font-medium">{successMessage}</p>
        </div>
       )}

       {!isEditing ? (
        <div className="space-y-5">
         <div className="glass-card p-5">
          <h3 className="glass-heading-secondary mb-3 text-left">User Details</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
           <div>
            <p className="text-xs uppercase tracking-wider text-white/70">Username</p>
            <p className="font-semibold text-white">{user.userName}</p>
           </div>
           <div>
            <p className="text-xs uppercase tracking-wider text-white/70">Email</p>
            <p className="font-semibold text-white">{user.email}</p>
           </div>
           <div>
            <p className="text-xs uppercase tracking-wider text-white/70">Phone Number</p>
            <p className="font-semibold text-white">{user.phoneNumber || 'Not provided'}</p>
           </div>
           <div>
            <p className="text-xs uppercase tracking-wider text-white/70">Role</p>
            <p className="font-semibold text-white">{profileRole}</p>
           </div>
          </div>
         </div>

         <div className="glass-card p-5">
          <h3 className="glass-heading-secondary mb-3 text-left">Business Information</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
           <div>
            <p className="text-xs uppercase tracking-wider text-white/70">Business Name</p>
            <p className="font-semibold text-white">{user.businessName || 'Not provided'}</p>
           </div>
           <div>
            <p className="text-xs uppercase tracking-wider text-white/70">Registration Number</p>
            <p className="font-semibold text-white">{user.businessRegistrationNumber || 'Not provided'}</p>
           </div>
           <div>
            <p className="text-xs uppercase tracking-wider text-white/70">Tax Number</p>
            <p className="font-semibold text-white">{user.taxNumber || 'Not provided'}</p>
           </div>
           <div>
            <p className="text-xs uppercase tracking-wider text-white/70">VAT Number</p>
            <p className="font-semibold text-white">{user.vatNumber || 'Not provided'}</p>
           </div>
          </div>
         </div>

         <div className="glass-card p-5">
          <h3 className="glass-heading-secondary mb-3 text-left">Address & Web</h3>
          <div className="space-y-3">
           <div>
            <p className="text-xs uppercase tracking-wider text-white/70">Physical Address</p>
            <p className="font-semibold text-white">{user.physicalAddress || 'Not provided'}</p>
           </div>
           <div>
            <p className="text-xs uppercase tracking-wider text-white/70">Website</p>
            {user.websiteAddress ? (
             <a
              href={user.websiteAddress}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-link font-semibold"
             >
              {user.websiteAddress}
             </a>
            ) : (
             <p className="font-semibold text-white/50">Not provided</p>
            )}
           </div>
          </div>
         </div>
        </div>
       ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
         <div className="glass-card p-5">
          <h3 className="glass-heading-secondary mb-3 text-left">Editable Fields</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
           <div className="glass-form-group mb-0">
            <label className="glass-form-label">Business Name</label>
            <input
             type="text"
             name="businessName"
             value={formData.businessName}
             onChange={handleInputChange}
             className="glass-form-input"
             required
            />
           </div>
             <div className="glass-form-group mb-0">
              <label className="glass-form-label">Registration Number</label>
              <input
               type="text"
               name="businessRegistrationNumber"
               value={formData.businessRegistrationNumber}
               onChange={handleInputChange}
               className="glass-form-input"
               disabled={isRegistrationFieldLocked(user.businessRegistrationNumber || '')}
              />
              {isRegistrationFieldLocked(user.businessRegistrationNumber || '') && (
               <p className="mt-1 text-xs text-white/60">Locked after initial save. Contact super admin for corrections.</p>
              )}
             </div>
           <div className="glass-form-group mb-0">
            <label className="glass-form-label">Email</label>
            <input
             type="email"
             name="email"
             value={formData.email}
             onChange={handleInputChange}
             className="glass-form-input"
             required
            />
           </div>
           <div className="glass-form-group mb-0">
            <label className="glass-form-label">Phone Number</label>
            <input
             type="text"
             name="phoneNumber"
             value={formData.phoneNumber}
             onChange={handleInputChange}
             className="glass-form-input"
            />
           </div>
           <div className="glass-form-group mb-0">
            <label className="glass-form-label">Tax Number</label>
            <input
             type="text"
             name="taxNumber"
             value={formData.taxNumber}
             onChange={handleInputChange}
             className="glass-form-input"
             disabled={isRegistrationFieldLocked(user.taxNumber || '')}
            />
            {isRegistrationFieldLocked(user.taxNumber || '') && (
             <p className="mt-1 text-xs text-white/60">Locked after initial save. Contact super admin for corrections.</p>
            )}
           </div>
           <div className="glass-form-group mb-0">
            <label className="glass-form-label">VAT Number</label>
            <input
             type="text"
             name="vatNumber"
             value={formData.vatNumber}
             onChange={handleInputChange}
             className="glass-form-input"
             disabled={isRegistrationFieldLocked(user.vatNumber || '')}
            />
            {isRegistrationFieldLocked(user.vatNumber || '') && (
             <p className="mt-1 text-xs text-white/60">Locked after initial save. Contact super admin for corrections.</p>
            )}
           </div>
           {canOverrideRegistrationIdentifiers && (
            <>
             <div className="glass-form-group mb-0 sm:col-span-2">
              <p className="text-xs text-white/70">Super admin overrides of existing registration fields require legal documentation.</p>
             </div>
             <div className="glass-form-group mb-0">
              <label className="glass-form-label">Legal Document Type</label>
              <input
               type="text"
               name="legalDocumentType"
               value={formData.legalDocumentType}
               onChange={handleInputChange}
               className="glass-form-input"
               placeholder="e.g. Court Order, CIPC Amendment"
              />
             </div>
             <div className="glass-form-group mb-0">
              <label className="glass-form-label">Legal Document Reference</label>
              <input
               type="text"
               name="legalDocumentReference"
               value={formData.legalDocumentReference}
               onChange={handleInputChange}
               className="glass-form-input"
               placeholder="Case/File/Certificate number"
              />
             </div>
             <div className="glass-form-group mb-0 sm:col-span-2">
              <label className="glass-form-label">Legal Document URL</label>
              <input
               type="url"
               name="legalDocumentUri"
               value={formData.legalDocumentUri}
               onChange={handleInputChange}
               className="glass-form-input"
               placeholder="https://..."
              />
             </div>
             <div className="glass-form-group mb-0 sm:col-span-2">
              <label className="glass-form-label">Legal Change Reason</label>
              <textarea
               name="legalChangeReason"
               value={formData.legalChangeReason}
               onChange={handleInputChange}
               className="glass-form-textarea"
               rows="3"
               placeholder="Provide legal basis compelling this registration update"
              />
             </div>
            </>
           )}
           <div className="glass-form-group mb-0 sm:col-span-2">
            <label className="glass-form-label">Physical Address</label>
            <textarea
             name="physicalAddress"
             value={formData.physicalAddress}
             onChange={handleInputChange}
             className="glass-form-textarea"
             rows="3"
            />
           </div>
           <div className="glass-form-group mb-0 sm:col-span-2">
            <label className="glass-form-label">Website Address</label>
            <input
             type="url"
             name="websiteAddress"
             value={formData.websiteAddress}
             onChange={handleInputChange}
             className="glass-form-input"
            />
           </div>
           <div className="glass-form-group mb-0">
            <label className="glass-form-label">New Password (Optional)</label>
            <input
             type="password"
             name="password"
             value={formData.password}
             onChange={handleInputChange}
             className="glass-form-input"
             placeholder="Leave blank to keep current"
            />
           </div>
           <div className="glass-form-group mb-0">
            <label className="glass-form-label">Confirm New Password</label>
            <input
             type="password"
             name="confirmPassword"
             value={formData.confirmPassword}
             onChange={handleInputChange}
             className="glass-form-input"
            />
           </div>
          </div>
         </div>
         <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={handleCancelEdit} className="glass-btn-outline flex-1">
           Cancel
          </button>
          <button type="submit" disabled={loading} className="glass-btn-primary flex-1">
           {loading ? 'Saving updates...' : 'Save Profile Changes'}
          </button>
         </div>
        </form>
       )}
      </section>
     </div>

     {user.role === 'customer' && (
      <div className="mt-6">
       {quoteMsg && (
        <div className="glass-alert-success mb-4">
         <p className="font-medium">{quoteMsg}</p>
        </div>
       )}
       <div className="glass-card p-6">
        <h2 className="text-base font-bold text-white mb-4">📄 Pending Quotations</h2>
        {quotsLoading ? (
         <div className="flex items-center gap-3 py-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400" />
          <span className="text-sm text-white/50">Loading quotations…</span>
         </div>
        ) : pendingQuotations.length === 0 ? (
         <p className="text-sm text-white/40">No pending quotations</p>
        ) : (
         pendingQuotations.map((q) => (
          <div key={q._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-white/10 last:border-0">
           <div className="flex flex-col gap-1 min-w-0">
            <span className="text-sm font-semibold text-white/90">{q.quotationNumber}</span>
            <span className="text-xs text-white/60 truncate">{q.title}</span>
            <span className="text-xs text-white/40">Valid until {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : 'N/A'}</span>
           </div>
           <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <span className="text-sm font-bold text-yellow-300">R {Number(q.totalAmount ?? 0).toFixed(2)}</span>
            <div className="flex gap-2">
             <button
              onClick={() => handleAcceptQuotation(q)}
              className="glass-btn-primary py-1.5 px-4 text-xs"
             >
              Accept
             </button>
             <button
              onClick={() => handleRejectQuotation(q)}
              className="glass-btn-outline py-1.5 px-4 text-xs"
             >
              Decline
             </button>
            </div>
           </div>
          </div>
         ))
        )}
       </div>
      </div>
     )}
    </div>
   </div>
  </>
 );
};

export default UserProfile;
