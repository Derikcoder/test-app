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

 const [search, setSearch] = useState('');
 const [typeFilter, setTypeFilter] = useState('all');

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

  </>
 );
};

export default Customers;
