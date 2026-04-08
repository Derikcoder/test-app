/**
 * @file ResidentialCustomer.jsx
 * @description Full bespoke profile view for Residential customers.
 * Displays contact details, address, service location preferences,
 * account metadata, extra notes, and linked service call history.
 * Customer type: residential
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';

/* ─── helpers ─────────────────────────────────────────────── */

const safeParseNotes = (raw) => {
 try {
  return typeof raw === 'string' ? JSON.parse(raw) : raw ?? {};
 } catch {
  return {};
 }
};

const formatDate = (iso) =>
 iso
  ? new Date(iso).toLocaleDateString('en-ZA', {
     day: '2-digit',
     month: 'short',
     year: 'numeric',
    })
  : '—';

const ACCOUNT_STATUS_STYLES = {
 active:    'bg-green-500/20 text-green-300 border border-green-400/40',
 inactive:  'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40',
 suspended: 'bg-red-500/20 text-red-300 border border-red-400/40',
};

const CALL_STATUS_STYLES = {
 pending:   'bg-yellow-500/20 text-yellow-300',
 scheduled: 'bg-blue-500/20 text-blue-300',
 assigned:  'bg-purple-500/20 text-purple-300',
 'in-progress': 'bg-cyan-500/20 text-cyan-300',
 'on-hold': 'bg-orange-500/20 text-orange-300',
 completed: 'bg-green-500/20 text-green-300',
 invoiced:  'bg-teal-500/20 text-teal-300',
 cancelled: 'bg-red-500/20 text-red-300',
};

/* ─── sub-components ──────────────────────────────────────── */

const InfoRow = ({ label, value }) => {
 if (!value) return null;
 return (
  <div className="flex flex-col gap-0.5">
   <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
   <span className="text-sm font-medium text-white/90 break-words">{value}</span>
  </div>
 );
};

const SectionCard = ({ title, icon, children, className = '' }) => (
 <div className={`glass-card p-6 ${className}`}>
  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 mb-5">
   <span className="text-base">{icon}</span>
   {title}
  </h3>
  <div className="flex flex-col gap-4">{children}</div>
 </div>
);

const CallHistoryRow = ({ call }) => {
 const statusStyle = CALL_STATUS_STYLES[call.status] ?? 'bg-white/10 text-white/60';
 return (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-white/10 last:border-0">
   <div className="flex flex-col gap-1 min-w-0">
    <span className="text-sm font-semibold text-white/90 truncate">
     {call.callNumber ?? call._id.slice(-6).toUpperCase()}
    </span>
    <span className="text-xs text-white/50 truncate">
     {call.serviceType ?? 'Service Call'}{call.urgency ? ` · ${call.urgency}` : ''}
    </span>
    {call.serviceLocation && (
     <span className="text-xs text-white/40 truncate">{call.serviceLocation}</span>
    )}
   </div>
   <div className="flex flex-col items-end gap-1 shrink-0">
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusStyle}`}>
     {call.status}
    </span>
    <span className="text-[10px] text-white/40">{formatDate(call.dateOfPreferredServiceCall ?? call.createdAt)}</span>
   </div>
  </div>
 );
};

/* ─── main component ──────────────────────────────────────── */

const ResidentialCustomer = () => {
 const { id } = useParams();
 const { user } = useAuth();
 const navigate = useNavigate();

 const [customer, setCustomer] = useState(null);
 const [serviceCalls, setServiceCalls] = useState([]);
 const [quotations, setQuotations] = useState([]);
 const [loading, setLoading] = useState(true);
 const [callsLoading, setCallsLoading] = useState(true);
 const [quotsLoading, setQuotsLoading] = useState(true);
 const [error, setError] = useState('');
 const [quotActionState, setQuotActionState] = useState({});
 const [rejectingId, setRejectingId]         = useState(null);
 const [rejectReason, setRejectReason]       = useState('');

 /* fetch customer profile */
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

 /* fetch service call history for this customer */
 useEffect(() => {
  const fetchCalls = async () => {
   try {
    const res = await api.get('/service-calls', {
     headers: { Authorization: `Bearer ${user.token}` },
    });
    const all = Array.isArray(res.data) ? res.data : res.data?.serviceCalls ?? [];
    setServiceCalls(all.filter((c) => c.customer === id || c.customer?._id === id));
   } catch {
    /* non-critical — silently skip */
   } finally {
    setCallsLoading(false);
   }
  };
  fetchCalls();
 }, [id]);

 /* fetch pending quotations for this customer */
 useEffect(() => {
  const fetchQuotations = async () => {
   try {
    const res = await api.get(`/quotations?customer=${id}`, {
     headers: { Authorization: `Bearer ${user.token}` },
    });
    setQuotations(
     Array.isArray(res.data)
      ? res.data.filter((q) => !['converted', 'rejected', 'expired'].includes(q.status))
      : []
    );
   } catch {
    /* non-critical — silently skip */
   } finally {
    setQuotsLoading(false);
   }
  };
  fetchQuotations();
 }, [id]);

 const notes = useMemo(() => safeParseNotes(customer?.notes), [customer]);

 const displayName = useMemo(() => {
  if (!customer) return '';
  return `${customer.contactFirstName} ${customer.contactLastName}`.trim();
 }, [customer]);

 const initials = useMemo(() => {
  if (!customer) return '?';
  return `${customer.contactFirstName?.[0] ?? ''}${customer.contactLastName?.[0] ?? ''}`.toUpperCase();
 }, [customer]);

 const addressLines = useMemo(() => {
  if (!customer?.physicalAddressDetails) return [];
  const d = customer.physicalAddressDetails;
  return [
   d.streetAddress,
   d.complexName,
   d.siteAddressDetail,
   d.suburb,
   [d.cityDistrict, d.province].filter(Boolean).join(', '),
   d.postalCode ? `Postal Code: ${d.postalCode}` : '',
  ].filter(Boolean);
 }, [customer]);

 const isOwnProfile = user?.role === 'customer' && String(user?.customerProfile) === id;

 const handleAcceptQuot = async (q) => {
  setQuotActionState((s) => ({ ...s, [q._id]: 'loading' }));
  try {
   await api.patch(`/quotations/share/${q.shareToken}/accept`);
   setQuotActionState((s) => ({ ...s, [q._id]: 'accepted' }));
   setQuotations((prev) => prev.map((x) => x._id === q._id ? { ...x, status: 'approved' } : x));
  } catch {
   setQuotActionState((s) => ({ ...s, [q._id]: null }));
  }
 };

 const handleRejectQuot = async (q) => {
  setQuotActionState((s) => ({ ...s, [q._id]: 'loading' }));
  try {
   const body = rejectReason.trim() ? { reason: rejectReason.trim() } : {};
   await api.patch(`/quotations/share/${q.shareToken}/reject`, body);
   setQuotActionState((s) => ({ ...s, [q._id]: 'rejected' }));
   setQuotations((prev) => prev.map((x) => x._id === q._id ? { ...x, status: 'rejected' } : x));
   setRejectingId(null);
   setRejectReason('');
  } catch {
   setQuotActionState((s) => ({ ...s, [q._id]: null }));
  }
 };

 /* ── loading state ── */
 if (loading) {
  return (
   <>
    <Sidebar />
    <div className="page-center">
     <div className="text-center">
      <div className="spinner-lg" />
      <p className="mt-4 text-white/70 text-sm">Loading profile…</p>
     </div>
    </div>
   </>
  );
 }

 /* ── error state ── */
 if (error || !customer) {
  return (
   <>
    <Sidebar />
    <div className="page-center px-4">
     <div className="glass-card p-8 text-center max-w-sm w-full">
      <p className="text-red-300 text-sm mb-4">{error || 'Customer not found'}</p>
      <button onClick={() => navigate('/customers')} className="glass-btn-primary py-2 px-6 text-sm">
       ← Back to Customers
      </button>
     </div>
    </div>
   </>
  );
 }

 const statusStyle = ACCOUNT_STATUS_STYLES[customer.accountStatus] ?? 'bg-white/10 text-white/60';

 return (
  <>
   <Sidebar />
   <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-10 px-4 sm:px-6 lg:px-8">
    <div className="max-w-[1040px] mx-auto space-y-6">

     {/* ── Back nav ── */}
     <button
      onClick={() => navigate('/customers')}
      className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
     >
      <span>←</span> Back to Customers
     </button>

     {/* ── Hero header ── */}
     <div className="glass-card p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">

       {/* Avatar */}
       <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-extrabold text-xl sm:text-2xl select-none"
        style={{ background: 'linear-gradient(135deg, #05198C 0%, #1a3ba8 100%)', color: '#FFFB28', border: '2px solid rgba(255,251,40,0.3)' }}
       >
        {initials}
       </div>

       {/* Name + meta */}
       <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
         <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{displayName}</h1>
         <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${statusStyle}`}>
          {customer.accountStatus}
         </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50 mt-1">
         <span>{customer.customerId}</span>
         <span>·</span>
         <span>Residential</span>
         <span>·</span>
         <span>Member since {formatDate(customer.createdAt)}</span>
        </div>
       </div>

       {/* CTA */}
       <div className="shrink-0">
        <button
         onClick={() => navigate('/service-call-registration', {
          state: {
           prefillCustomer: {
            customerType: 'private',
            companyName: displayName,
            contactPerson: displayName,
            contactEmail: customer.email,
            contactPhone: customer.phoneNumber,
            adminStreetAddress: customer.physicalAddressDetails?.streetAddress ?? '',
            adminSuburb: customer.physicalAddressDetails?.suburb ?? '',
            adminCity: customer.physicalAddressDetails?.cityDistrict ?? '',
            adminProvince: customer.physicalAddressDetails?.province ?? '',
            adminPostalCode: customer.physicalAddressDetails?.postalCode ?? '',
            adminCountry: 'South Africa',
           },
          },
         })}
         className="glass-btn-secondary py-2.5 px-6 text-sm w-full sm:w-auto"
         style={{ width: 'auto', minWidth: '160px' }}
        >
         + Book Service
        </button>
       </div>
      </div>
     </div>

     {/* ── Info grid (2 cols) ── */}
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

      {/* Contact Information */}
      <SectionCard title="Contact Information" icon="👤">
       <InfoRow label="Full Name" value={displayName} />
       <InfoRow label="Email" value={customer.email} />
       <InfoRow label="Phone" value={customer.phoneNumber} />
       {customer.alternatePhone && (
        <InfoRow label="Alternate Phone" value={customer.alternatePhone} />
       )}
      </SectionCard>

      {/* Address */}
      <SectionCard title="Residential Address" icon="📍">
       {addressLines.length > 0 ? (
        <div className="flex flex-col gap-1">
         {addressLines.map((line, i) => (
          <span key={i} className="text-sm font-medium text-white/90">{line}</span>
         ))}
        </div>
       ) : (
        <span className="text-sm text-white/40">No address on record</span>
       )}
      </SectionCard>

      {/* Service Location Preferences */}
      <SectionCard title="Service Locations" icon="🗺️">
       <InfoRow label="Booking Location" value={notes.bookingLocation || null} />
       <InfoRow label="Service Location" value={notes.serviceLocation || null} />
       <InfoRow label="Location Relationship" value={notes.locationRelationship || null} />
       {!notes.bookingLocation && !notes.serviceLocation && (
        <span className="text-sm text-white/40">No location preferences recorded</span>
       )}
      </SectionCard>

      {/* Account Details */}
      <SectionCard title="Account Details" icon="🗂️">
       <InfoRow label="Customer ID" value={customer.customerId} />
       <InfoRow label="Account Status" value={customer.accountStatus} />
       <InfoRow label="VAT Number" value={customer.vatNumber || null} />
       <InfoRow label="Equipment on Site" value={notes.machineCount ? `${notes.machineCount} unit(s)` : null} />
       <InfoRow label="Machines Distributed" value={
        notes.machinesDistributed === 'yes' ? 'Yes — multiple locations'
        : notes.machinesDistributed === 'no' ? 'No — single location'
        : null
       } />
       <InfoRow label="Registered" value={formatDate(customer.createdAt)} />
       <InfoRow label="Last Updated" value={formatDate(customer.updatedAt)} />
      </SectionCard>
     </div>

     {/* ── Notes ── */}
     {notes.extraNotes && (
      <SectionCard title="Additional Notes" icon="📝">
       <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{notes.extraNotes}</p>
      </SectionCard>
     )}

     {/* ── Active Quotations ── */}
     <SectionCard title="Active Quotations" icon="📄">
      {quotsLoading ? (
       <div className="flex items-center gap-3 py-2">
        <div className="spinner-sm" />
        <span className="text-sm text-white/50">Loading quotations…</span>
       </div>
      ) : quotations.length === 0 ? (
       <p className="text-sm text-white/40">No active quotations</p>
      ) : (
       <>
        {isOwnProfile
         ? <p className="text-xs text-white/40 mb-3">Review and accept or decline your pending quotes below.</p>
         : <p className="text-xs text-white/40 mb-3">Customer accepts or declines from their own portal. Admins cannot accept on behalf of the customer.</p>
        }
        {quotations.map((q) => {
         const statusStyles = {
          draft: 'bg-white/10 text-white/60 border-white/20',
          sent: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
          approved: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
         };
         const badgeClass = statusStyles[q.status] || 'bg-white/10 text-white/60 border-white/20';
         return (
          <div key={q._id} className="flex items-start justify-between gap-4 py-3 border-b border-white/10 last:border-0">
           <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
             <span className="text-sm font-semibold text-white/90">{q.quotationNumber}</span>
             <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
              {q.status}
             </span>
            </div>
            <span className="text-xs text-white/60 truncate">{q.title}</span>
            <span className="text-xs text-white/40">Valid until {formatDate(q.validUntil)}</span>
           </div>
           <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-sm font-bold text-yellow-300">R {Number(q.totalAmount ?? 0).toFixed(2)}</span>
            {isOwnProfile && q.status === 'sent' && q.shareToken && (
             new Date(q.validUntil) < new Date() ? (
              <span className="text-[10px] text-orange-300/70 italic">Expired</span>
             ) : quotActionState[q._id] === 'accepted' ? (
              <span className="text-[10px] font-semibold text-emerald-300">✓ Accepted</span>
             ) : quotActionState[q._id] === 'rejected' ? (
              <span className="text-[10px] font-semibold text-red-300">✗ Declined</span>
             ) : rejectingId === q._id ? (
              <div className="flex flex-col gap-1 items-end">
               <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason (optional)"
                className="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white/80 placeholder:text-white/30 w-36 focus:outline-none"
               />
               <div className="flex gap-1">
                <button
                 disabled={quotActionState[q._id] === 'loading'}
                 onClick={() => handleRejectQuot(q)}
                 className="text-[10px] font-semibold text-red-300 hover:text-red-200 transition-colors px-2 py-0.5 border border-red-400/30 rounded">
                 {quotActionState[q._id] === 'loading' ? '…' : 'Confirm'}
                </button>
                <button
                 onClick={() => { setRejectingId(null); setRejectReason(''); }}
                 className="text-[10px] text-white/40 hover:text-white/60 transition-colors">
                 Cancel
                </button>
               </div>
              </div>
             ) : (
              <div className="flex gap-2">
               <button
                disabled={quotActionState[q._id] === 'loading'}
                onClick={() => handleAcceptQuot(q)}
                className="text-[10px] font-semibold text-emerald-300 hover:text-emerald-200 transition-colors px-2 py-0.5 border border-emerald-400/30 rounded">
                {quotActionState[q._id] === 'loading' ? '…' : 'Accept'}
               </button>
               <button
                onClick={() => setRejectingId(q._id)}
                className="text-[10px] font-semibold text-red-300 hover:text-red-200 transition-colors px-2 py-0.5 border border-red-400/30 rounded">
                Decline
               </button>
              </div>
             )
            )}
            {!isOwnProfile && q.shareToken && q.status === 'sent' && (
             <button
              onClick={() => {
               const url = `${window.location.origin}/quotation-approval/${q.shareToken}`;
               navigator.clipboard.writeText(url).catch(() => {});
              }}
              className="text-[10px] font-semibold text-blue-300 hover:text-blue-200 underline underline-offset-2 transition-colors"
             >
              Copy acceptance link
             </button>
            )}
            {q.status === 'draft' && (
             <span className="text-[10px] text-white/40 italic">Not sent to customer yet</span>
            )}
           </div>
          </div>
         );
        })}
       </>
      )}
     </SectionCard>

     {/* ── Service Call History ── */}
     <SectionCard title="Service Call History" icon="🔧">
      {callsLoading ? (
       <div className="flex items-center gap-3 py-2">
        <div className="spinner-sm" />
        <span className="text-sm text-white/50">Loading history…</span>
       </div>
      ) : serviceCalls.length === 0 ? (
       <div className="text-center py-6">
        <p className="text-3xl mb-2">📋</p>
        <p className="text-sm text-white/50">No service calls on record for this customer.</p>
        <button
         onClick={() => navigate('/service-call-registration', {
          state: {
           prefillCustomer: {
            customerType: 'private',
            companyName: displayName,
            contactPerson: displayName,
            contactEmail: customer.email,
            contactPhone: customer.phoneNumber,
           },
          },
         })}
         className="mt-4 text-xs font-semibold text-yellow-300 hover:text-yellow-200 underline underline-offset-2 transition-colors"
        >
         Book the first service call →
        </button>
       </div>
      ) : (
       <>
        <div className="flex items-center justify-between mb-1">
         <span className="text-xs text-white/40">{serviceCalls.length} call{serviceCalls.length !== 1 ? 's' : ''} found</span>
        </div>
        {serviceCalls
         .slice()
         .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
         .map((call) => (
          <CallHistoryRow key={call._id} call={call} />
         ))}
       </>
      )}
     </SectionCard>

    </div>
   </div>
  </>
 );
};

export default ResidentialCustomer;
