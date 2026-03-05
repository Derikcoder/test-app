import { useState } from 'react';
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
  email: user?.email || '',
  phoneNumber: user?.phoneNumber || '',
  taxNumber: user?.taxNumber || '',
  vatNumber: user?.vatNumber || '',
  physicalAddress: user?.physicalAddress || '',
  websiteAddress: user?.websiteAddress || '',
  password: '',
  confirmPassword: '',
 });

 if (!user) {
  navigate('/login');
  return null;
 }

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
   email: user.email,
   phoneNumber: user.phoneNumber,
   taxNumber: user.taxNumber,
   vatNumber: user.vatNumber,
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
   email: user.email,
   phoneNumber: user.phoneNumber,
   taxNumber: user.taxNumber,
   vatNumber: user.vatNumber,
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

  setLoading(true);

  try {
   // Prepare update data (only send password if it's being changed)
   const updateData = {
    email: formData.email,
    phoneNumber: formData.phoneNumber,
    taxNumber: formData.taxNumber,
    vatNumber: formData.vatNumber,
    physicalAddress: formData.physicalAddress,
    websiteAddress: formData.websiteAddress,
   };

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
   <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-[1200px] mx-auto ">
     {/* Header */}
     <div className="glass-card rounded-2xl shadow-xl overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 backdrop-blur-md border-b border-white/20 px-8 py-6">
       <div className="flex justify-between items-center">
        <div>
         <h1 className="glass-heading text-3xl">{user.businessName}</h1>
         <p className="text-white/70 mt-1">SuperUser Account</p>
        </div>
        <button
         onClick={handleLogout}
         className="glass-btn-secondary font-semibold py-2 px-6"
        >
         Logout
        </button>
       </div>
      </div>
     </div>

     {/* User Information */}
     <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
       <div className="glass-card p-6">
        <h2 className="glass-heading-secondary mb-4 flex items-center">
         <svg className="w-5 h-5 mr-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
         </svg>
         User Details
        </h2>
        <div className="space-y-3">
         <div>
          <p className="text-sm text-white/70">Username</p>
          <p className="font-semibold text-white">{user.userName}</p>
         </div>
         <div>
          <p className="text-sm text-white/70">Email</p>
          <p className="font-semibold text-white">{user.email}</p>
         </div>
         <div>
          <p className="text-sm text-white/70">Phone Number</p>
          <p className="font-semibold text-white">{user.phoneNumber}</p>
         </div>
        </div>
       </div>

       <div className="glass-card p-6">
        <h2 className="glass-heading-secondary mb-4 flex items-center">
         <svg className="w-5 h-5 mr-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
         </svg>
         Business Information
        </h2>
        <div className="space-y-3">
         <div>
          <p className="text-sm text-white/70">Business Name</p>
          <p className="font-semibold text-white">{user.businessName}</p>
         </div>
         <div>
          <p className="text-sm text-white/70">Registration Number</p>
          <p className="font-semibold text-white">{user.businessRegistrationNumber}</p>
         </div>
         <div>
          <p className="text-sm text-white/70">Website</p>
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

      {/* Tax Information */}
      <div className="glass-card p-6 mb-6">
       <h2 className="glass-heading-secondary mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Tax Information
       </h2>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
         <p className="text-sm text-white/70">Tax Number</p>
         <p className="font-semibold text-white">{user.taxNumber}</p>
        </div>
        <div>
         <p className="text-sm text-white/70">VAT Number</p>
         <p className="font-semibold text-white">{user.vatNumber}</p>
        </div>
       </div>
      </div>

      {/* Address */}
      <div className="glass-card p-6">
       <h2 className="glass-heading-secondary mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Physical Address
       </h2>
       <p className="text-white">{user.physicalAddress}</p>
      </div>

      {/* Account Status Badge */}
      <div className="mt-6 flex items-center justify-center">
       <span className="glass-alert-success inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
         <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Active SuperUser Account
       </span>
      </div>
     </div>
    </div>
   </div>
  </>
 );
};

export default UserProfile;
