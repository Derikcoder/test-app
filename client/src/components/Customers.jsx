/**
 * @file Customers.jsx
 * @description Customer list page — displays all customers from the database.
 * Groups and filters by customerType. Clicking a customer navigates to their
 * type-specific profile component.
 * A "Register Customer" button opens the RegisterNewCustomer modal.
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';

const CUSTOMER_TYPE_LABELS = {
 headOffice:      'Head Office',
 branch:          'Branch',
 franchise:       'Franchise',
 singleBusiness:  'Single Business',
 residential:     'Residential',
};

const CUSTOMER_TYPE_COLORS = {
 headOffice:     'bg-purple-500/30 text-purple-200 border-purple-400/50',
 branch:         'bg-blue-500/30 text-blue-200 border-blue-400/50',
 franchise:      'bg-indigo-500/30 text-indigo-200 border-indigo-400/50',
 singleBusiness: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/50',
 residential:    'bg-green-500/30 text-green-200 border-green-400/50',
};

/** Route to navigate to for each customer type */
const customerTypeRoute = (type, id) => {
 const routes = {
  headOffice:     `/customers/head-office/${id}`,
  branch:         `/customers/branch/${id}`,
  franchise:      `/customers/franchise/${id}`,
  singleBusiness: `/customers/single-business/${id}`,
  residential:    `/customers/residential/${id}`,
 };
 return routes[type] || `/customers/${id}`;
};

const Customers = () => {
 const { user } = useAuth();
 const navigate = useNavigate();
 const isSuperAdmin = user?.role === 'superAdmin' || user?.isSuperUser === true;
 const roleLabelMap = {
  superAdmin: 'Super Admin',
  businessAdministrator: 'Business Administrator',
  fieldServiceAgent: 'Field Service Agent',
  customer: 'Customer',
 };
 const roleLabel = roleLabelMap[user?.role] || (isSuperAdmin ? 'Super Admin' : 'Platform User');

 const [customers, setCustomers] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');

 const [search, setSearch] = useState('');
 const [typeFilter, setTypeFilter] = useState('all');

 const [provisionModal, setProvisionModal] = useState(null); // customer object or null
 const [provisionForm, setProvisionForm] = useState({ userName: '', password: '' });
 const [provisionLoading, setProvisionLoading] = useState(false);
 const [provisionError, setProvisionError] = useState('');
 const [provisionSuccess, setProvisionSuccess] = useState('');

 useEffect(() => {
  fetchCustomers();
 }, []);

 const fetchCustomers = async () => {
  setLoading(true);
  try {
   const res = await api.get('/customers', {
    headers: { Authorization: `Bearer ${user.token}` },
   });
   setCustomers(res.data || []);
  } catch (err) {
   setError(err.response?.data?.message || 'Failed to fetch customers');
  } finally {
   setLoading(false);
  }
 };

 const filtered = useMemo(() => {
  return customers.filter((c) => {
   if (typeFilter !== 'all' && c.customerType !== typeFilter) return false;
   if (search.trim()) {
    const q = search.toLowerCase();
    if (
     !c.businessName?.toLowerCase().includes(q) &&
     !c.customerId?.toLowerCase().includes(q) &&
     !c.contactFirstName?.toLowerCase().includes(q) &&
     !c.contactLastName?.toLowerCase().includes(q) &&
     !c.email?.toLowerCase().includes(q)
    ) return false;
   }
   return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
 }, [customers, search, typeFilter]);

 const formatDate = (v) => v ? new Date(v).toLocaleDateString() : '—';

 const handleDeleteCustomer = async (e, customerId) => {
  e.stopPropagation();
  if (!window.confirm('Delete this customer profile? Transaction history (service calls, invoices) will be preserved.')) return;
  try {
   await api.delete(`/customers/${customerId}`, {
    headers: { Authorization: `Bearer ${user.token}` },
   });
   setSuccess('Customer deleted.');
   fetchCustomers();
   setTimeout(() => setSuccess(''), 3000);
  } catch (err) {
   setError(err.response?.data?.message || 'Failed to delete customer');
  }
 };

 const handleOpenProvisionModal = (e, customer) => {
  e.stopPropagation();
  setProvisionModal(customer);
  const nameSlug = (customer.businessName || `${customer.contactFirstName}_${customer.contactLastName}`)
   .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  setProvisionForm({ userName: nameSlug, password: '' });
  setProvisionError('');
  setProvisionSuccess('');
 };

 const handleProvisionSubmit = async (e) => {
  e.preventDefault();
  setProvisionError('');
  setProvisionSuccess('');
  setProvisionLoading(true);
  try {
   await api.post(
    '/auth/admin/provision-user',
    {
     role: 'customer',
     profileId: provisionModal._id,
     userName: provisionForm.userName,
     email: provisionModal.email,
     password: provisionForm.password,
    },
    { headers: { Authorization: `Bearer ${user.token}` } }
   );
   setProvisionSuccess(`Login provisioned! Username: ${provisionForm.userName} | Email: ${provisionModal.email}`);
   fetchCustomers();
  } catch (err) {
   setProvisionError(err.response?.data?.message || 'Failed to provision login');
  } finally {
   setProvisionLoading(false);
  }
 };

 if (loading) {
  return (
   <>
    <Sidebar />
    <div className="page-center">
     <div className="text-center">
      <div className="spinner-lg"></div>
      <p className="mt-4 text-white/70">Loading customers...</p>
     </div>
    </div>
   </>
  );
 }

 return (
  <>
   <Sidebar />
   <div className="page-body sm:px-6 lg:px-8">
    <div className="max-w-[1200px] mx-auto">

     {/* Header */}
     <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
       <h1 className="glass-heading text-3xl">Customers</h1>
       <p className="text-white/70 mt-1">All registered customers</p>
         <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-indigo-400/60 bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-200">
           Entity: Customers
          </span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
           isSuperAdmin
            ? 'border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-200'
            : 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
          }`}>
           Role: {roleLabel}
          </span>
         </div>
      </div>
      <button
        onClick={() => navigate('/customers/register')}
       className="glass-btn-primary px-6 py-3 flex items-center gap-2 whitespace-nowrap"
      >
       + Register Customer
      </button>
     </div>

     {error && <div className="glass-alert-error mb-4 p-4 rounded-lg">{error}</div>}
     {success && <div className="mb-4 p-4 rounded-lg bg-emerald-950 text-emerald-200 border border-emerald-700">{success}</div>}

     {/* Stats strip */}
     <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
      {Object.entries(CUSTOMER_TYPE_LABELS).map(([type, label]) => (
       <div
        key={type}
        onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
        className={`glass-card p-4 text-center cursor-pointer transition hover:bg-white/10 ${typeFilter === type ? 'ring-2 ring-yellow-400/60' : ''}`}
       >
        <div className="text-2xl font-bold text-white">
         {customers.filter(c => c.customerType === type).length}
        </div>
        <div className="text-xs text-white/50 mt-1">{label}</div>
       </div>
      ))}
     </div>

     {/* Filters */}
     <div className="flex flex-wrap gap-3 mb-4">
      <input
       type="text"
       value={search}
       onChange={(e) => setSearch(e.target.value)}
       placeholder="Search by name, ID or email..."
       className="glass-form-input flex-1 min-w-[220px] max-w-sm"
      />
      <select
       value={typeFilter}
       onChange={(e) => setTypeFilter(e.target.value)}
       className="glass-form-select"
      >
       <option value="all">All Types</option>
       {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
       ))}
      </select>
     </div>

     {/* Table */}
     <div className="glass-card rounded-2xl shadow-xl overflow-hidden">
      {filtered.length === 0 ? (
       <div className="p-12 text-center text-white/60">
        {customers.length === 0
         ? 'No customers yet. Click "Register Customer" to add the first one.'
         : 'No customers match your filters.'}
       </div>
      ) : (
       <div className="overflow-x-auto">
        <table className="w-full">
         <thead className="bg-white/10 border-b border-white/20">
          <tr>
           <th className="th-yellow">Customer</th>
           <th className="th-yellow">Type</th>
           <th className="th-yellow">Contact</th>
           <th className="th-yellow">Parent Account</th>
           <th className="th-yellow">Registered</th>
           <th className="px-6 py-3 text-right text-xs font-medium text-yellow-300 uppercase tracking-wide">Actions</th>
          </tr>
         </thead>
         <tbody className="divide-y divide-white/10">
          {filtered.map((customer) => {
           const typeCls = CUSTOMER_TYPE_COLORS[customer.customerType] || 'bg-white/20 text-white/70 border-white/30';
           return (
            <tr
             key={customer._id}
             className="hover:bg-white/5 transition cursor-pointer"
             onClick={() => navigate(customerTypeRoute(customer.customerType, customer._id))}
            >
             <td className="px-6 py-4">
              <div className="font-semibold text-white">
               {customer.businessName || `${customer.contactFirstName} ${customer.contactLastName}`}
              </div>
              <div className="text-xs text-white/50 mt-0.5">{customer.customerId}</div>
             </td>
             <td className="px-6 py-4">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${typeCls}`}>
               {CUSTOMER_TYPE_LABELS[customer.customerType] || customer.customerType}
              </span>
             </td>
             <td className="px-6 py-4">
              <div className="text-sm text-white">
               {[customer.contactFirstName, customer.contactLastName].filter(Boolean).join(' ') || '—'}
              </div>
              <div className="text-xs text-white/50">{customer.email}</div>
             </td>
             <td className="px-6 py-4 text-sm text-white/60">
              {customer.parentAccount?.businessName || '—'}
             </td>
             <td className="px-6 py-4 text-sm text-white/60">
              {formatDate(customer.createdAt)}
             </td>
             <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
              {customer.userAccount ? (
               <span className="mr-3 text-xs text-emerald-400 font-semibold">Login ✓</span>
              ) : (
               <button
                onClick={(e) => handleOpenProvisionModal(e, customer)}
                className="mr-3 text-cyan-400 hover:text-cyan-200"
               >
                Provision Login
               </button>
              )}
              <button
               onClick={(e) => handleDeleteCustomer(e, customer._id)}
               className="text-red-300 hover:text-red-200"
              >
               Delete
              </button>
             </td>
            </tr>
           );
          })}
         </tbody>
        </table>
       </div>
      )}
     </div>

     <p className="text-white/40 text-xs mt-4 text-right">
      {filtered.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}
     </p>
    </div>
   </div>

  {/* Provision Login Modal */}
  {provisionModal && (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-2xl border border-cyan-700 bg-slate-900 p-8 shadow-2xl mx-4">
     <h2 className="text-xl font-bold text-slate-100 mb-1">Provision Login Credentials</h2>
     <p className="text-sm text-slate-400 mb-6">
      Creating a login account for{' '}
      <span className="text-cyan-300 font-semibold">
       {provisionModal.businessName || `${provisionModal.contactFirstName} ${provisionModal.contactLastName}`}
      </span>
     </p>

     {provisionSuccess ? (
      <div className="mb-4 p-4 rounded-lg bg-emerald-950 text-emerald-200 border border-emerald-700 text-sm">
       <p className="font-semibold mb-1">Account created!</p>
       <p>{provisionSuccess}</p>
       <p className="mt-2 text-emerald-300">Share these credentials securely with the customer.</p>
      </div>
     ) : (
      <form onSubmit={handleProvisionSubmit} className="space-y-4">
       <div>
        <label className="dark-label">Email (login email)</label>
        <input
         type="email"
         value={provisionModal.email}
         readOnly
         className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-2 text-slate-100 opacity-60 cursor-not-allowed"
        />
       </div>
       <div>
        <label className="dark-label">Username *</label>
        <input
         type="text"
         value={provisionForm.userName}
         onChange={(e) => setProvisionForm({ ...provisionForm, userName: e.target.value })}
         required
         className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        />
       </div>
       <div>
        <label className="dark-label">Temporary Password *</label>
        <input
         type="text"
         value={provisionForm.password}
         onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
         required
         minLength={6}
         placeholder="Min. 6 characters"
         className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        />
        <p className="mt-1 text-xs text-slate-500">Shown in plain text so you can share it with the customer.</p>
       </div>
       {provisionError && (
        <div className="p-3 rounded-lg bg-red-950 text-red-200 border border-red-700 text-sm">{provisionError}</div>
       )}
       <div className="flex justify-end gap-3 pt-2">
        <button
         type="button"
         onClick={() => setProvisionModal(null)}
         className="px-5 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
        >
         Cancel
        </button>
        <button
         type="submit"
         disabled={provisionLoading}
         className="px-5 py-2 rounded-lg border border-cyan-700 bg-cyan-950 text-cyan-100 hover:bg-cyan-900 font-semibold disabled:opacity-50"
        >
         {provisionLoading ? 'Creating...' : 'Create Login'}
        </button>
       </div>
      </form>
     )}

     {provisionSuccess && (
      <div className="mt-4 flex justify-end">
       <button
        onClick={() => setProvisionModal(null)}
        className="px-5 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
       >
        Close
       </button>
      </div>
     )}
    </div>
   </div>
  )}
  </>
 );
};

export default Customers;
