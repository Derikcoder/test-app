/**
 * @file CustomerAssetHistoryPage.jsx
 * @description Customer-facing machine history page showing all services rendered on a selected asset.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deriveCustomerAssets } from '../utils/customerAssets';
import Sidebar from './Sidebar';
import api from '../api/axios';

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const CustomerAssetHistoryPage = () => {
  const { id, profileType, assetKey } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [customer, setCustomer] = useState(null);
  const [serviceCalls, setServiceCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customerRes, callsRes] = await Promise.all([
          api.get(`/customers/${id}`, { headers: { Authorization: `Bearer ${user.token}` } }),
          api.get('/service-calls', { headers: { Authorization: `Bearer ${user.token}` } }),
        ]);

        setCustomer(customerRes.data);
        const allCalls = Array.isArray(callsRes.data) ? callsRes.data : callsRes.data?.serviceCalls ?? [];
        setServiceCalls(allCalls.filter((call) => call.customer === id || call.customer?._id === id));
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Unable to load this machine history right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user?.token]);

  const assets = useMemo(() => deriveCustomerAssets(customer, serviceCalls), [customer, serviceCalls]);
  const selectedAsset = useMemo(() => (
    assets.find((asset) => asset.assetKey === assetKey) || location.state?.asset || null
  ), [assetKey, assets, location.state]);

  const backTarget = `/customers/${profileType}/${id}`;

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="page-center">
          <div className="text-center">
            <div className="spinner-lg" />
            <p className="mt-4 text-sm text-white/70">Loading machine history…</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !selectedAsset) {
    return (
      <>
        <Sidebar />
        <div className="page-center px-4">
          <div className="glass-card max-w-xl p-8 text-center">
            <p className="text-sm text-red-300">{error || 'Machine history could not be found.'}</p>
            <button
              type="button"
              onClick={() => navigate(backTarget)}
              className="mt-4 rounded-lg border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm font-semibold text-cyan-100"
            >
              ← Back to Customer Profile
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 pt-20 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1040px] space-y-6">
          <button
            type="button"
            onClick={() => navigate(backTarget)}
            className="flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
          >
            <span>←</span> Back to Customer Profile
          </button>

          <div className="glass-card p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Machine Service History</p>
                <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{selectedAsset.assetName}</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/75">
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Brand: {selectedAsset.brand || '—'}</span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Model: {selectedAsset.model || '—'}</span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Category: {selectedAsset.category || 'General'}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">Total Services</p>
                <p className="mt-1 text-2xl font-extrabold text-white">{selectedAsset.serviceCount || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white/90">Services Rendered On This Machine</p>
            {selectedAsset.relatedCalls?.length ? (
              <div className="mt-4 space-y-3">
                {selectedAsset.relatedCalls
                  .slice()
                  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                  .map((call) => (
                    <div key={call._id} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white/90">{call.callNumber || 'Service Job'}</p>
                          <p className="mt-1 text-xs text-cyan-100">{call.serviceType || 'General Service'}</p>
                          <p className="mt-2 text-sm text-white/75">{call.title || call.description || 'Service activity recorded for this machine.'}</p>
                        </div>
                        <div className="text-xs text-white/55 sm:text-right">
                          <p>{call.status || 'pending'}</p>
                          <p className="mt-1">{formatDate(call.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/45">No service history has been linked to this machine yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerAssetHistoryPage;
