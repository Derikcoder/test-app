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
 createResidentialServiceBookingState,
 createResidentialProfileInfoCards,
} from './customerProfile/shared';

/* ─── helpers ─────────────────────────────────────────────── */

const safeParseNotes = (raw) => {
 try {
  return typeof raw === 'string' ? JSON.parse(raw) : raw ?? {};
 } catch {
  return {};
 }
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

 const {
  quotActionState,
  rejectingId,
  rejectReason,
  setRejectingId,
  setRejectReason,
  handleAcceptQuot,
  handleRejectQuot,
 } = useQuotationActions(setQuotations);

 /* fetch customer profile */
 useEffect(() => {
   if (!user?.token) return;
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
 }, [id, user?.token]);

 /* fetch service call history for this customer */
 useEffect(() => {
   if (!user?.token) return;
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
 }, [id, user?.token]);

 /* fetch pending quotations for this customer */
 useEffect(() => {
   if (!user?.token) return;
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
 }, [id, user?.token]);

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
  if (!customer?.physicalAddressDetails) {
   return customer?.physicalAddress ? [customer.physicalAddress] : [];
  }
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

 const latestServiceCall = useMemo(() => serviceCalls[0] || null, [serviceCalls]);

 const fallbackBookingLocation = useMemo(
  () => formatStructuredAddress(latestServiceCall?.bookingRequest?.administrativeAddress || {}),
  [latestServiceCall]
 );

 const fallbackServiceLocation = useMemo(() => {
  const explicit = String(latestServiceCall?.resolvedServiceLocation || latestServiceCall?.serviceLocation || '').trim();
  if (explicit) return explicit;

  const machineAddress = formatStructuredAddress(latestServiceCall?.bookingRequest?.machineAddress || {});
  return machineAddress || fallbackBookingLocation || '';
 }, [latestServiceCall, fallbackBookingLocation]);

 const isOwnProfile = user?.role === 'customer' && String(user?.customerProfile) === id;
 const backTarget = isOwnProfile ? '/profile' : '/customers';
 const backLabel = isOwnProfile ? 'Back to Dashboard' : 'Back to Customers';

 /* ── loading state ── */
 const statusStyle = ACCOUNT_STATUS_STYLES[customer?.accountStatus] ?? 'bg-white/10 text-white/60';

 const infoCards = createResidentialProfileInfoCards({
  customer,
  displayName,
  addressLines,
  notes,
  fallbackBookingLocation,
  fallbackServiceLocation,
 });

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
   meta={(
    <>
     <span>{customer?.customerId}</span>
     <span>·</span>
     <span>Residential</span>
     <span>·</span>
     <span>Member since {formatDate(customer?.createdAt)}</span>
    </>
   )}
   onBookService={() => navigate('/service-call-registration', {
    state: createResidentialServiceBookingState(customer, displayName),
   })}
  >

     {/* ── Info grid (2 cols) ── */}
     <CustomerInfoGrid cards={infoCards} />

     {/* ── Notes ── */}
     {notes.extraNotes && (
      <SectionCard title="Additional Notes" icon="📝">
       <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{notes.extraNotes}</p>
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

    <QuotationsSection
     quotations={quotations}
     quotsLoading={quotsLoading}
     isOwnProfile={isOwnProfile}
     nonOwnProfileText="Customer accepts or declines from their own portal. Admins cannot accept on behalf of the customer."
     draftHintText="Not sent to customer yet"
     quotActionState={quotActionState}
     rejectingId={rejectingId}
     rejectReason={rejectReason}
     setRejectingId={setRejectingId}
     setRejectReason={setRejectReason}
     handleAcceptQuot={handleAcceptQuot}
     handleRejectQuot={handleRejectQuot}
     formatDate={formatDate}
    />

     <SectionCard title="Pending Billing & Payments" icon="💳">
      <CustomerBillingPanel customerId={id} token={user?.token} isOwnProfile={isOwnProfile} />
     </SectionCard>

     <ServiceCallHistorySection
      callsLoading={callsLoading}
      serviceCalls={serviceCalls}
      emptyMessage="No service calls on record for this customer."
      showCountWrapper
      callSummaryResolver={(entry) => entry.title || entry.description || 'Service activity'}
      onBookFirstService={() => navigate('/service-call-registration', {
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
     />

  </CustomerProfileLayout>
 );
};

export default ResidentialCustomer;
