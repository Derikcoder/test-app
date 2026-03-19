/**
 * @file HeadOfficeCustomer.jsx
 * @description Profile view for Head Office customers.
 * Parent account that may have linked Branch and Franchise child accounts.
 * Customer type: headOffice
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';

const HeadOfficeCustomer = () => {
 const { id } = useParams();
 const { user } = useAuth();
 const navigate = useNavigate();
 const [customer, setCustomer] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');

 useEffect(() => {
  const fetchCustomer = async () => {
   try {
    const res = await api.get(`/customers/${id}`, {
     headers: { Authorization: `Bearer ${user.token}` },
    });
    setCustomer(res.data);
   } catch (err) {
    setError(err.response?.data?.message || 'Failed to fetch customer');
   } finally {
    setLoading(false);
   }
  };
  fetchCustomer();
 }, [id]);

 if (loading) {
  return (
   <>
    <Sidebar />
    <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center">
     <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
      <p className="mt-4 text-white/70">Loading customer...</p>
     </div>
    </div>
   </>
  );
 }

 if (error || !customer) {
  return (
   <>
    <Sidebar />
    <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center">
     <div className="glass-card p-8 text-center">
      <p className="text-red-300">{error || 'Customer not found'}</p>
      <button onClick={() => navigate('/customers')} className="glass-btn-primary mt-4 px-6 py-2">
       Back to Customers
      </button>
     </div>
    </div>
   </>
  );
 }

 return (
  <>
   <Sidebar />
   <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-[1000px] mx-auto">

     {/* Header */}
     <div className="mb-8 flex items-center justify-between">
      <div>
       <button
        onClick={() => navigate('/customers')}
        className="text-white/50 hover:text-white text-sm mb-2 flex items-center gap-1"
       >
        ← Back to Customers
       </button>
       <h1 className="glass-heading text-3xl">
        {customer.businessName || `${customer.contactFirstName} ${customer.contactLastName}`}
       </h1>
       <p className="text-white/50 text-sm mt-1">{customer.customerId} · Head Office</p>
      </div>
     </div>

     {/* TODO: Build out full Head Office profile here */}
     <div className="glass-card p-8">
      <p className="text-yellow-300 font-semibold mb-2">🚧 Head Office Profile — Shell</p>
      <p className="text-white/60 text-sm">This profile view is ready to be built out with Head Office-specific fields and service history.</p>
      <pre className="mt-4 text-xs text-white/40 overflow-auto">{JSON.stringify(customer, null, 2)}</pre>
     </div>

    </div>
   </div>
  </>
 );
};

export default HeadOfficeCustomer;
