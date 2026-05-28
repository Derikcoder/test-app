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
import CustomerBillingPanel from './CustomerBillingPanel';
import CustomerSelfServicePanel from './CustomerSelfServicePanel';
import api from '../api/axios';
import useQuotationActions from '../hooks/useQuotationActions';
import CustomerProfileLayout from './customerProfile/ProfileLayout';
import QuotationsSection from './customerProfile/QuotationsSection';
import ServiceCallHistorySection from './customerProfile/ServiceCallHistorySection';
import CustomerInfoGrid from './customerProfile/CustomerInfoGrid';
import {
 formatDate,
 formatStructuredAddress,
 ACCOUNT_STATUS_STYLES,
 SectionCard,
 createBusinessProfileMeta,
 createBusinessServiceBookingState,
 createBusinessProfileInfoCards,
} from './customerProfile/shared';

/* ─── main component ──────────────────────────────────────── */

const BranchCustomer = () => {
 const { id } = useParams();
 const { user } = useAuth();
 const navigate = useNavigate();
 const token = user?.token;

 const [customer, setCustomer]         = useState(null);
 const [serviceCalls, setServiceCalls] = useState([]);
 const [quotations, setQuotations]     = useState([]);
 const [loading, setLoading]           = useState(true);
 const [callsLoading, setCallsLoading] = useState(true);
 const [quotsLoading, setQuotsLoading] = useState(true);
 const [error, setError]               = useState('');

 const {
  quotActionState,
  rejectingId,
  rejectReason,
  setRejectingId,
  setRejectReason,
  handleAcceptQuot,
  handleRejectQuot,
 } = useQuotationActions(setQuotations);

 useEffect(() => {
  if (!token) return;

  api.get(`/customers/${id}`, { headers: { Authorization: `Bearer ${token}` } })
   .then((r) => setCustomer(r.data))
   .catch((e) => setError(e.response?.data?.message || 'Failed to fetch customer'))
   .finally(() => setLoading(false));
 }, [id, token]);

 useEffect(() => {
  if (!token) return;

  api.get('/service-calls', { headers: { Authorization: `Bearer ${token}` } })
   .then((r) => {
    const all = Array.isArray(r.data) ? r.data : r.data?.serviceCalls ?? [];
    setServiceCalls(all.filter((c) => c.customer === id || c.customer?._id === id));
   })
   .catch(() => {})
   .finally(() => setCallsLoading(false));
 }, [id, token]);

 useEffect(() => {
  if (!token) return;

  api.get(`/quotations?customer=${id}`, { headers: { Authorization: `Bearer ${token}` } })
   .then((r) =>
    setQuotations(
     Array.isArray(r.data)
      ? r.data.filter((q) => !['converted', 'rejected', 'expired'].includes(q.status))
      : []
    )
   )
   .catch(() => {})
   .finally(() => setQuotsLoading(false));
 }, [id, token]);

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

 const statusStyle = ACCOUNT_STATUS_STYLES[customer?.accountStatus] ?? 'bg-white/10 text-white/60';
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

 const infoCards = createBusinessProfileInfoCards({
  customer,
  physLines,
  billLines,
  fallbackBookingLocation,
  fallbackServiceLocation,
 });

 /* Parent account meta (populated by backend or just an ID) */
 const parentName = customer.parentAccount?.businessName || null;
 const parentId   = customer.parentAccount?._id || customer.parentAccount || null;

 return (
  <CustomerProfileLayout
   loading={loading}
   error={error}
   hasCustomer={Boolean(customer)}
   onBack={() => navigate(backTarget)}
   backLabel={backLabel}
   avatarText={initials}
   title={displayName}
   accountStatus={customer?.accountStatus}
   statusClass={statusStyle}
   badge={<span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">Branch</span>}
  meta={createBusinessProfileMeta({
   customer,
   variantLabel: 'Branch',
   parentName,
   parentId,
   navigate,
  })}
  onBookService={() => navigate('/service-call-registration', {
   state: createBusinessServiceBookingState(customer),
  })}
  >

    {/* Info grid */}
    <CustomerInfoGrid cards={infoCards} />

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
     <QuotationsSection
      quotations={quotations}
      quotsLoading={quotsLoading}
      isOwnProfile={isOwnProfile}
      quotActionState={quotActionState}
      rejectingId={rejectingId}
      rejectReason={rejectReason}
      setRejectingId={setRejectingId}
      setRejectReason={setRejectReason}
      handleAcceptQuot={handleAcceptQuot}
      handleRejectQuot={handleRejectQuot}
      formatDate={formatDate}
     />

     <SectionCard title="Invoices Paid & Receipts" icon="💳">
      <CustomerBillingPanel customerId={id} token={user?.token} isOwnProfile={isOwnProfile} />
     </SectionCard>

     <ServiceCallHistorySection
      callsLoading={callsLoading}
      serviceCalls={serviceCalls}
      emptyMessage="No service calls on record."
      onBookFirstService={() => navigate('/service-call-registration', {
       state: { prefillCustomer: { customerType: 'business', companyName: customer.businessName, contactEmail: customer.email, contactPhone: customer.phoneNumber } },
      })}
     />

  </CustomerProfileLayout>
 );
};

export default BranchCustomer;
