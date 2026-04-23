/**
 * @file BranchCustomer.jsx
 * @description Full profile view for Branch customers.
 * Branch of a Head Office parent account. Shows parent account link,
 * business info, contacts, sites, service history, and quotations.
 * Customer type: branch
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import CustomerBillingPanel from './CustomerBillingPanel';
import CustomerSelfServicePanel from './CustomerSelfServicePanel';
import api from '../api/axios';

/* ─── helpers ─────────────────────────────────────────────── */

const formatDate = (iso) =>
 iso
  ? new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const formatStructuredAddress = (address = {}) => {
 if (!address || typeof address !== 'object') return '';

 return [
  address.streetAddress,
  address.complexName ? `Complex/Industrial Park: ${address.complexName}` : null,
  address.siteAddressDetail ? `Unit/Site Detail: ${address.siteAddressDetail}` : null,
  address.suburb,
  address.cityDistrict,
  address.province,
  address.postalCode ? `Postal Code: ${address.postalCode}` : null,
 ].filter(Boolean).join(', ');
};

const ACCOUNT_STATUS_STYLES = {
 active:    'bg-green-500/20 text-green-300 border border-green-400/40',
 inactive:  'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40',
 suspended: 'bg-red-500/20 text-red-300 border border-red-400/40',
};

const CALL_STATUS_STYLES = {
 pending:        'bg-yellow-500/20 text-yellow-300',
 scheduled:      'bg-blue-500/20 text-blue-300',
 assigned:       'bg-purple-500/20 text-purple-300',
 'in-progress':  'bg-cyan-500/20 text-cyan-300',
 'on-hold':      'bg-orange-500/20 text-orange-300',
 completed:      'bg-green-500/20 text-green-300',
 invoiced:       'bg-teal-500/20 text-teal-300',
 cancelled:      'bg-red-500/20 text-red-300',
};

const getLocationSourceLabel = (source) => {
 switch (source) {
  case 'explicit-service-location':
   return 'Explicit Location';
  case 'booking-machine-address':
   return 'Machine Address';
  case 'booking-administrative-address':
   return 'Customer Address';
  default:
   return '';
 }
};

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
    {(call.resolvedServiceLocation || call.serviceLocation) && (
     <span className="text-xs text-white/40 truncate">
      {call.resolvedServiceLocation || call.serviceLocation}
      {getLocationSourceLabel(call.resolvedServiceLocationSource) && (
       <span className="ml-2 inline-flex items-center rounded-full border border-cyan-800 bg-cyan-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
      {getLocationSourceLabel(call.resolvedServiceLocationSource)}
       </span>
      )}
     </span>
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

const BranchCustomer = () => {
 const { id } = useParams();
 const { user } = useAuth();
 const navigate = useNavigate();

 const [customer, setCustomer]         = useState(null);
 const [serviceCalls, setServiceCalls] = useState([]);
 const [quotations, setQuotations]     = useState([]);
 const [loading, setLoading]           = useState(true);
 const [callsLoading, setCallsLoading] = useState(true);
 const [quotsLoading, setQuotsLoading] = useState(true);
 const [error, setError]               = useState('');
 const [quotActionState, setQuotActionState] = useState({});
 const [rejectingId, setRejectingId]         = useState(null);
 const [rejectReason, setRejectReason]       = useState('');

 useEffect(() => {
  api.get(`/customers/${id}`, { headers: { Authorization: `Bearer ${user.token}` } })
   .then((r) => setCustomer(r.data))
   .catch((e) => setError(e.response?.data?.message || 'Failed to fetch customer'))
   .finally(() => setLoading(false));
 }, [id]);

 useEffect(() => {
  api.get('/service-calls', { headers: { Authorization: `Bearer ${user.token}` } })
   .then((r) => {
    const all = Array.isArray(r.data) ? r.data : r.data?.serviceCalls ?? [];
    setServiceCalls(all.filter((c) => c.customer === id || c.customer?._id === id));
   })
   .catch(() => {})
   .finally(() => setCallsLoading(false));
 }, [id]);

 useEffect(() => {
  api.get(`/quotations?customer=${id}`, { headers: { Authorization: `Bearer ${user.token}` } })
   .then((r) =>
    setQuotations(
     Array.isArray(r.data)
      ? r.data.filter((q) => !['converted', 'rejected', 'expired'].includes(q.status))
      : []
    )
   )
   .catch(() => {})
   .finally(() => setQuotsLoading(false));
 }, [id]);

 const initials = useMemo(() => {
  if (!customer) return '?';
  return (customer.businessName ?? '?').slice(0, 2).toUpperCase();
 }, [customer]);

 const displayName = customer?.businessName || `${customer?.contactFirstName ?? ''} ${customer?.contactLastName ?? ''}`.trim();

 const addressLines = (d) => {
  if (!d) return [];
  return [d.streetAddress, d.complexName, d.siteAddressDetail, d.suburb,
   [d.cityDistrict, d.province].filter(Boolean).join(', '),
   d.postalCode ? `Postal Code: ${d.postalCode}` : ''].filter(Boolean);
 };

 const isOwnProfile = user?.role === 'customer' && String(user?.customerProfile) === id;
 const backTarget = isOwnProfile ? '/profile' : '/customers';
 const backLabel = isOwnProfile ? 'Back to Dashboard' : 'Back to Customers';

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

 if (error || !customer) {
  return (
   <>
    <Sidebar />
    <div className="page-center px-4">
     <div className="glass-card p-8 text-center max-w-sm w-full">
      <p className="text-red-300 text-sm mb-4">{error || 'Customer not found'}</p>
      <button onClick={() => navigate(backTarget)} className="glass-btn-primary py-2 px-6 text-sm">
       ← {backLabel}
      </button>
     </div>
    </div>
   </>
  );
 }

 const statusStyle = ACCOUNT_STATUS_STYLES[customer.accountStatus] ?? 'bg-white/10 text-white/60';
 const physLines = addressLines(customer.physicalAddressDetails).length > 0
  ? addressLines(customer.physicalAddressDetails)
  : (customer?.physicalAddress ? [customer.physicalAddress] : []);
 const billLines   = addressLines(customer.billingAddressDetails);
 const latestServiceCall = serviceCalls[0] || null;
 const fallbackBookingLocation = formatStructuredAddress(latestServiceCall?.bookingRequest?.administrativeAddress || {});
 const fallbackServiceLocation = String(
  latestServiceCall?.resolvedServiceLocation
  || latestServiceCall?.serviceLocation
  || formatStructuredAddress(latestServiceCall?.bookingRequest?.machineAddress || {})
  || fallbackBookingLocation
  || ''
 ).trim();

 /* Parent account meta (populated by backend or just an ID) */
 const parentName = customer.parentAccount?.businessName || null;
 const parentId   = customer.parentAccount?._id || customer.parentAccount || null;

 return (
  <>
   <Sidebar />
   <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 pt-20 pb-10 px-4 sm:px-6 lg:px-8">
    <div className="max-w-[1040px] mx-auto space-y-6">

     <button onClick={() => navigate(backTarget)}
      className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
      <span>←</span> {backLabel}
     </button>

     {/* Hero */}
     <div className="glass-card p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
       <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-extrabold text-xl sm:text-2xl select-none"
        style={{ background: 'linear-gradient(135deg, #05198C 0%, #1a3ba8 100%)', color: '#FFFB28', border: '2px solid rgba(255,251,40,0.3)' }}>
        {initials}
       </div>
       <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
         <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{displayName}</h1>
         <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${statusStyle}`}>
          {customer.accountStatus}
         </span>
         <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
          Branch
         </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50 mt-1">
         <span>{customer.customerId}</span>
         {parentName && (
          <>
           <span>·</span>
           <span>Branch of: <button onClick={() => navigate(`/customers/${parentId}`)}
            className="text-blue-300 hover:text-blue-200 underline underline-offset-2 transition-colors">{parentName}</button></span>
          </>
         )}
         <span>·</span>
         <span>Member since {formatDate(customer.createdAt)}</span>
        </div>
       </div>
       <div className="shrink-0">
        <button
         onClick={() => navigate('/service-call-registration', {
          state: { prefillCustomer: { customerType: 'business', companyName: customer.businessName,
           contactPerson: `${customer.contactFirstName} ${customer.contactLastName}`.trim(),
           contactEmail: customer.email, contactPhone: customer.phoneNumber } },
         })}
         className="glass-btn-secondary py-2.5 px-6 text-sm" style={{ minWidth: '160px' }}>
         + Book Service
        </button>
       </div>
      </div>
     </div>

     {/* Info grid */}
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <SectionCard title="Business Details" icon="🏢">
       <InfoRow label="Business Name"    value={customer.businessName} />
       <InfoRow label="Registration No." value={customer.registrationNumber} />
       <InfoRow label="VAT Number"       value={customer.vatNumber} />
       <InfoRow label="Tax Number"       value={customer.taxNumber} />
       <InfoRow label="Customer ID"      value={customer.customerId} />
       <InfoRow label="Account Status"   value={customer.accountStatus} />
       <InfoRow label="Registered"       value={formatDate(customer.createdAt)} />
       <InfoRow label="Last Updated"     value={formatDate(customer.updatedAt)} />
      </SectionCard>

      <SectionCard title="Primary Contact" icon="👤">
       <InfoRow label="Contact Person" value={`${customer.contactFirstName} ${customer.contactLastName}`.trim()} />
       <InfoRow label="Email"          value={customer.email} />
       <InfoRow label="Phone"          value={customer.phoneNumber} />
       {customer.alternatePhone && <InfoRow label="Alternate Phone" value={customer.alternatePhone} />}
      </SectionCard>

      <SectionCard title="Physical Address" icon="📍">
       {physLines.length > 0 ? (
        <div className="flex flex-col gap-1">
         {physLines.map((line, i) => <span key={i} className="text-sm font-medium text-white/90">{line}</span>)}
        </div>
       ) : <span className="text-sm text-white/40">No address on record</span>}
      </SectionCard>

      {billLines.length > 0 && (
       <SectionCard title="Billing Address" icon="🧾">
        <div className="flex flex-col gap-1">
         {billLines.map((line, i) => <span key={i} className="text-sm font-medium text-white/90">{line}</span>)}
        </div>
       </SectionCard>
      )}

      <SectionCard title="Service Locations" icon="🗺️">
       <InfoRow label="Booking Location" value={fallbackBookingLocation || null} />
       <InfoRow label="Service Location" value={fallbackServiceLocation || null} />
       {!fallbackBookingLocation && !fallbackServiceLocation && (
        <span className="text-sm text-white/40">No location preferences recorded</span>
       )}
      </SectionCard>

      {(customer.maintenanceManager?.name || customer.maintenanceManager?.email) && (
       <SectionCard title="Maintenance Manager" icon="🔧">
        <InfoRow label="Name"  value={customer.maintenanceManager.name} />
        <InfoRow label="Phone" value={customer.maintenanceManager.phone} />
        <InfoRow label="Email" value={customer.maintenanceManager.email} />
       </SectionCard>
      )}
     </div>

     {/* Sites */}
     {customer.sites?.length > 0 && (
      <SectionCard title={`Service Sites (${customer.sites.length})`} icon="🗺️">
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {customer.sites.map((site) => (
         <div key={site._id} className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
           <span className="text-sm font-semibold text-white/90">{site.siteName}</span>
           <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${site.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/50'}`}>{site.status}</span>
          </div>
          <p className="text-xs text-white/60">{site.address}</p>
          {site.contactPerson && <p className="text-xs text-white/50">Contact: {site.contactPerson}</p>}
          {site.contactPhone  && <p className="text-xs text-white/50">Phone: {site.contactPhone}</p>}
          {site.notes && <p className="text-xs text-white/40 italic">{site.notes}</p>}
         </div>
        ))}
       </div>
      </SectionCard>
     )}

     {customer.notes && (
      <SectionCard title="Additional Notes" icon="📝">
       <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{customer.notes}</p>
      </SectionCard>
     )}

     <SectionCard title="Profile Management & Service Insights" icon="🛠️">
      <CustomerSelfServicePanel
       customerId={id}
       customer={customer}
       setCustomer={setCustomer}
       serviceCalls={serviceCalls}
       token={user?.token}
       isOwnProfile={isOwnProfile}
      />
     </SectionCard>

     {/* Active Quotations */}
     <SectionCard title="Active Quotations" icon="📄">
      {quotsLoading ? (
       <div className="flex items-center gap-3 py-2"><div className="spinner-sm" /><span className="text-sm text-white/50">Loading quotations…</span></div>
      ) : quotations.length === 0 ? (
       <p className="text-sm text-white/40">No active quotations</p>
      ) : (
       <>
        {isOwnProfile
         ? <p className="text-xs text-white/40 mb-3">Review and accept or decline your pending quotes below.</p>
         : <p className="text-xs text-white/40 mb-3">Customer accepts or declines from their own portal.</p>
        }
        {quotations.map((q) => {
         const badgeClass = { draft: 'bg-white/10 text-white/60 border-white/20', sent: 'bg-blue-500/20 text-blue-200 border-blue-400/30', approved: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' }[q.status] || 'bg-white/10 text-white/60 border-white/20';
         return (
          <div key={q._id} className="flex items-start justify-between gap-4 py-3 border-b border-white/10 last:border-0">
           <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
             <span className="text-sm font-semibold text-white/90">{q.quotationNumber}</span>
             <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>{q.status}</span>
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
             <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/quotation-approval/${q.shareToken}`).catch(() => {})}
              className="text-[10px] font-semibold text-blue-300 hover:text-blue-200 underline underline-offset-2 transition-colors">Copy acceptance link</button>
            )}
           </div>
          </div>
         );
        })}
       </>
      )}
     </SectionCard>

     <SectionCard title="Invoices Paid & Receipts" icon="💳">
      <CustomerBillingPanel customerId={id} token={user?.token} isOwnProfile={isOwnProfile} />
     </SectionCard>

     {/* Service History */}
     <SectionCard title="Service Call History" icon="🔧">
      {callsLoading ? (
       <div className="flex items-center gap-3 py-2"><div className="spinner-sm" /><span className="text-sm text-white/50">Loading history…</span></div>
      ) : serviceCalls.length === 0 ? (
       <div className="text-center py-6">
        <p className="text-3xl mb-2">📋</p>
        <p className="text-sm text-white/50">No service calls on record.</p>
        <button onClick={() => navigate('/service-call-registration', { state: { prefillCustomer: { customerType: 'business', companyName: customer.businessName, contactEmail: customer.email, contactPhone: customer.phoneNumber } } })}
         className="mt-4 text-xs font-semibold text-yellow-300 hover:text-yellow-200 underline underline-offset-2 transition-colors">Book the first service call →</button>
       </div>
      ) : (
       <>
        <span className="text-xs text-white/40">{serviceCalls.length} call{serviceCalls.length !== 1 ? 's' : ''} found</span>
        {serviceCalls.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((call) => <CallHistoryRow key={call._id} call={call} />)}
       </>
      )}
     </SectionCard>

    </div>
   </div>
  </>
 );
};

export default BranchCustomer;
