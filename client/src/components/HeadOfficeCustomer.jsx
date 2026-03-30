/**
 * @file HeadOfficeCustomer.jsx
 * @description Profile view for Head Office customers including hub management and branches.
 * Extends BusinessCustomerProfile with:
 * - Hub site display with depot badge
 * - Branch list showing all linked branches
 * - Branch creation and management from profile
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';
import BusinessCustomerProfile from './BusinessCustomerProfile';

const HeadOfficeCustomer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authToken = user?.token || '';

  const [customer, setCustomer] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [submittingBranch, setSubmittingBranch] = useState(false);
  const [branchFormData, setBranchFormData] = useState({
    customerType: 'branch',
    businessName: '',
    contactFirstName: '',
    contactLastName: '',
    email: '',
    phoneNumber: '',
    customerId: '',
    streetAddress: '',
    suburb: '',
    cityDistrict: '',
    province: '',
    postalCode: '',
  });

  // Fetch master customer and branches on mount
  useEffect(() => {
    if (!authToken) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch master customer
        const customerRes = await api.get(`/customers/${id}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setCustomer(customerRes.data);

        // Fetch branches
        const branchesRes = await api.get(`/customers/${id}/branches`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setBranches(branchesRes.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load customer data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, authToken]);

  const handleBranchFormChange = (e) => {
    setBranchFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCreateBranch = useCallback(async (e) => {
    e.preventDefault();
    if (submittingBranch) return;

    try {
      setSubmittingBranch(true);
      setError('');

      const addressDetails = {
        streetAddress: branchFormData.streetAddress,
        suburb: branchFormData.suburb,
        cityDistrict: branchFormData.cityDistrict,
        province: branchFormData.province,
        postalCode: branchFormData.postalCode,
      };

      const payload = {
        customerType: 'branch',
        businessName: branchFormData.businessName,
        contactFirstName: branchFormData.contactFirstName,
        contactLastName: branchFormData.contactLastName,
        email: branchFormData.email,
        phoneNumber: branchFormData.phoneNumber,
        customerId: branchFormData.customerId,
        sites: [
          {
            siteName: branchFormData.businessName,
            address: `${branchFormData.streetAddress}, ${branchFormData.suburb}`,
            addressDetails,
            isDepot: false,
          }
        ]
      };

      const res = await api.post(`/customers/${id}/branches`, payload, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setBranches(prev => [res.data.data, ...prev]);
      setSuccess('Branch created successfully!');
      setShowBranchForm(false);
      setBranchFormData({
        customerType: 'branch',
        businessName: '',
        contactFirstName: '',
        contactLastName: '',
        email: '',
        phoneNumber: '',
        customerId: '',
        streetAddress: '',
        suburb: '',
        cityDistrict: '',
        province: '',
        postalCode: '',
      });

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create branch');
    } finally {
      setSubmittingBranch(false);
    }
  }, [branchFormData, authToken, id, submittingBranch]);

  const handleDeleteBranch = useCallback(async (branchId) => {
    if (!window.confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/customers/${branchId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setBranches(prev => prev.filter(b => b._id !== branchId));
      setSuccess('Branch deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete branch');
    }
  }, [authToken]);

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="glass-bg-particles min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center">
          <div className="glass-card p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-b-transparent mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-white">Loading Head Office...</p>
          </div>
        </div>
      </>
    );
  }

  const hubSite = customer?.sites?.find(s => s.isDepot === true);

  return (
    <>
      <Sidebar />
      <div className="glass-bg-particles min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Alerts */}
          {error && (
            <div className="mb-6 rounded-2xl bg-red-500/20 border border-red-400/50 p-4 text-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 rounded-2xl bg-green-500/20 border border-green-400/50 p-4 text-green-200">
              {success}
            </div>
          )}

          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => navigate('/customers')}
              className="glass-button text-white hover:bg-white/20 transition-all px-4 py-2 rounded-xl"
            >
              ← Back to Customers
            </button>
            <div>
              <h1 className="glass-heading text-3xl">{customer?.businessName}</h1>
              <p className="text-white/70 mt-1 text-sm">{customer?.customerId} • Head Office</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Main Profile */}
            <div className="lg:col-span-2">
              <BusinessCustomerProfile expectedType="headOffice" typeLabel="Head Office" />
            </div>

            {/* Right: Hub & Branches Summary */}
            <div className="space-y-6">
              {/* Hub Site Card */}
              {hubSite && (
                <div className="glass-card rounded-2xl shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <h3 className="glass-heading text-lg">Hub / Depot</h3>
                  </div>
                  <div className="space-y-2 text-sm text-white/80">
                    <p><span className="font-semibold">Name:</span> {hubSite.siteName}</p>
                    <p><span className="font-semibold">Address:</span> {hubSite.address}</p>
                    {hubSite.contactPerson && (
                      <p><span className="font-semibold">Contact:</span> {hubSite.contactPerson}</p>
                    )}
                    {hubSite.contactPhone && (
                      <p><span className="font-semibold">Phone:</span> {hubSite.contactPhone}</p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500/30 border border-yellow-400/50 text-yellow-200">
                      Depot for Loan Assets
                    </span>
                  </div>
                </div>
              )}

              {/* Branches Section */}
              <div className="glass-card rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="glass-heading text-lg">Branches ({branches.length})</h3>
                  <button
                    onClick={() => setShowBranchForm(!showBranchForm)}
                    className="glass-button text-white hover:bg-white/20 transition-all px-3 py-1.5 text-sm rounded-lg"
                  >
                    {showBranchForm ? 'Cancel' : '+ Add Branch'}
                  </button>
                </div>

                {/* Branch Form */}
                {showBranchForm && (
                  <form onSubmit={handleCreateBranch} className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <input
                        type="text"
                        name="businessName"
                        placeholder="Branch Name *"
                        value={branchFormData.businessName}
                        onChange={handleBranchFormChange}
                        required
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50"
                      />
                      <input
                        type="text"
                        name="contactFirstName"
                        placeholder="Contact First Name *"
                        value={branchFormData.contactFirstName}
                        onChange={handleBranchFormChange}
                        required
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50"
                      />
                      <input
                        type="text"
                        name="contactLastName"
                        placeholder="Contact Last Name *"
                        value={branchFormData.contactLastName}
                        onChange={handleBranchFormChange}
                        required
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50"
                      />
                      <input
                        type="email"
                        name="email"
                        placeholder="Email *"
                        value={branchFormData.email}
                        onChange={handleBranchFormChange}
                        required
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50"
                      />
                      <input
                        type="tel"
                        name="phoneNumber"
                        placeholder="Phone *"
                        value={branchFormData.phoneNumber}
                        onChange={handleBranchFormChange}
                        required
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50"
                      />
                      <input
                        type="text"
                        name="customerId"
                        placeholder="Branch Customer ID *"
                        value={branchFormData.customerId}
                        onChange={handleBranchFormChange}
                        required
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50"
                      />
                      <input
                        type="text"
                        name="streetAddress"
                        placeholder="Street Address"
                        value={branchFormData.streetAddress}
                        onChange={handleBranchFormChange}
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50"
                      />
                      <input
                        type="text"
                        name="suburb"
                        placeholder="Suburb"
                        value={branchFormData.suburb}
                        onChange={handleBranchFormChange}
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50"
                      />
                      <input
                        type="text"
                        name="cityDistrict"
                        placeholder="City/District"
                        value={branchFormData.cityDistrict}
                        onChange={handleBranchFormChange}
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50"
                      />
                      <input
                        type="text"
                        name="province"
                        placeholder="Province"
                        value={branchFormData.province}
                        onChange={handleBranchFormChange}
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50"
                      />
                      <input
                        type="text"
                        name="postalCode"
                        placeholder="Postal Code"
                        value={branchFormData.postalCode}
                        onChange={handleBranchFormChange}
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingBranch}
                      className="mt-4 w-full glass-button text-white hover:bg-white/20 transition-all px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {submittingBranch ? 'Creating...' : 'Create Branch'}
                    </button>
                  </form>
                )}

                {/* Branches List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {branches.length === 0 ? (
                    <p className="text-white/50 text-sm italic">No branches created yet</p>
                  ) : (
                    branches.map(branch => (
                      <div
                        key={branch._id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{branch.businessName}</p>
                          <p className="text-white/60 text-xs">{branch.customerId}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteBranch(branch._id)}
                          className="ml-2 px-2 py-1 text-xs bg-red-500/30 hover:bg-red-500/50 text-red-200 rounded transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeadOfficeCustomer;
