/**
 * @file ServiceCalls.jsx
 * @description Service calls status dashboard.
 * Shows all service calls grouped by status.
 * Ops queue for assigning unassigned calls.
 * "Book Service" button navigates to /service-call-registration.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const ServiceCalls = () => {
 const navigate = useNavigate();
 const { user } = useAuth();

 const [serviceCalls, setServiceCalls] = useState([]);
 const [agents, setAgents] = useState([]);
 const [selectedAssignments, setSelectedAssignments] = useState({});
 const [queueActionError, setQueueActionError] = useState('');
 const [queueActionSuccess, setQueueActionSuccess] = useState('');
 const [assigningCallId, setAssigningCallId] = useState('');
 const [loading, setLoading] = useState(true);
 const [pendingDeleteId, setPendingDeleteId] = useState('');
 const [deletingCallId, setDeletingCallId] = useState('');
 const [markingCompleteId, setMarkingCompleteId] = useState('');
 const [creatingInvoiceId, setCreatingInvoiceId] = useState('');
 const [invoiceSuccessMap, setInvoiceSuccessMap] = useState({});
 const [expandedCallId, setExpandedCallId] = useState('');

 const fetchServiceCalls = async () => {
  try {
   const response = await api.get('/service-calls', {
    headers: { Authorization: `Bearer ${user?.token}` },
   });
   setServiceCalls(response.data || []);
  } catch {
   setServiceCalls([]);
  } finally {
   setLoading(false);
  }
 };

 const fetchAgents = async () => {
  try {
   const response = await api.get('/agents/available/list', {
    headers: { Authorization: `Bearer ${user?.token}` },
   });
   setAgents(response.data || []);
  } catch {
   try {
    const fallback = await api.get('/agents', {
     headers: { Authorization: `Bearer ${user?.token}` },
    });
    setAgents(fallback.data || []);
   } catch {
    setAgents([]);
   }
  }
 };

 useEffect(() => {
  if (!user?.token) return;
  fetchServiceCalls();
  fetchAgents();
 }, [user?.token]);

 const getCustomerLabel = (call) => {
  const c = call?.bookingRequest?.contact;
  if (c?.companyName) return c.companyName;
  if (c?.contactPerson) return c.contactPerson;
  if (call?.customer?.businessName) return call.customer.businessName;
  return 'Unlinked customer';
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

 // --- Status bucket useMemos ---
 const unassignedCalls = useMemo(
  () => serviceCalls.filter((call) => !call.assignedAgent || call.status === 'pending'),
  [serviceCalls]
 );
 const awaitingAcceptanceCalls = useMemo(
  () =>
   serviceCalls.filter(
    (call) =>
     call.assignedAgent &&
     call.agentAccepted === false &&
     call.status !== 'completed' &&
     call.status !== 'invoiced'
   ),
  [serviceCalls]
 );
 const acceptedNotAttendedCalls = useMemo(
  () =>
   serviceCalls.filter(
    (call) =>
     call.agentAccepted === true &&
     (call.status === 'assigned' || call.status === 'scheduled')
   ),
  [serviceCalls]
 );
 const awaitingQuoteApprovalCalls = useMemo(
  () => serviceCalls.filter((call) => call.status === 'awaiting-quote-approval'),
  [serviceCalls]
 );
 const inProgressCalls = useMemo(
  () => serviceCalls.filter((call) => call.status === 'in-progress'),
  [serviceCalls]
 );
 const completedCalls = useMemo(
  () => serviceCalls.filter((call) => call.status === 'completed' || call.status === 'invoiced'),
  [serviceCalls]
 );

 const handleAssignmentSelect = (callId, agentId) => {
  setSelectedAssignments((prev) => ({ ...prev, [callId]: agentId }));
 };

 const assignCallToAgent = async (call) => {
  const selectedAgent = selectedAssignments[call._id];
  if (!selectedAgent) {
   setQueueActionError('Please select a field service agent before assigning the call.');
   setQueueActionSuccess('');
   return;
  }
  setQueueActionError('');
  setQueueActionSuccess('');
  setAssigningCallId(call._id);
  try {
   await api.put(
    `/service-calls/${call._id}`,
    { assignedAgent: selectedAgent, status: 'assigned', agentAccepted: false },
    { headers: { Authorization: `Bearer ${user?.token}` } }
   );
   setQueueActionSuccess(
    `Service call ${call.callNumber || call._id} assigned and crew alert queued.`
   );
   await fetchServiceCalls();
   await fetchAgents();
  } catch (error) {
   setQueueActionError(
    error?.response?.data?.message || 'Failed to assign the service call. Please try again.'
   );
  } finally {
   setAssigningCallId('');
  }
 };

 const isAdmin = user?.role === 'superAdmin' || user?.role === 'businessAdministrator';

 const handleDeleteCall = async (call) => {
  setDeletingCallId(call._id);
  try {
   await api.delete(`/service-calls/${call._id}`, {
    headers: { Authorization: `Bearer ${user?.token}` },
   });
   setPendingDeleteId('');
   await fetchServiceCalls();
  } catch (err) {
   setQueueActionError(err?.response?.data?.message || 'Failed to delete service call.');
  } finally {
   setDeletingCallId('');
  }
 };

 const handleMarkComplete = async (call) => {
  setMarkingCompleteId(call._id);
  setQueueActionError('');
  try {
   await api.put(
    `/service-calls/${call._id}`,
    { status: 'completed' },
    { headers: { Authorization: `Bearer ${user?.token}` } }
   );
   setQueueActionSuccess(`${call.callNumber || call._id} marked as completed.`);
   await fetchServiceCalls();
  } catch (err) {
   setQueueActionError(err?.response?.data?.message || 'Failed to mark call as complete.');
  } finally {
   setMarkingCompleteId('');
  }
 };

 const handleCreateInvoice = async (call) => {
  setCreatingInvoiceId(call._id);
  setQueueActionError('');
  try {
   const res = await api.post(
    `/invoices/from-service-call/${call._id}/final`,
    {},
    { headers: { Authorization: `Bearer ${user?.token}` } }
   );
   const num = res.data?.invoice?.invoiceNumber;
   setInvoiceSuccessMap((prev) => ({ ...prev, [call._id]: num || 'Created' }));
   setQueueActionSuccess(`Invoice ${num} created for ${call.callNumber || call._id}.`);
   await fetchServiceCalls();
  } catch (err) {
   setQueueActionError(err?.response?.data?.message || 'Failed to create invoice.');
  } finally {
   setCreatingInvoiceId('');
  }
 };

 const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-ZA', {
   year: 'numeric',
   month: 'short',
   day: 'numeric',
  });
 };

 const getProgressSummary = (call) => {
  if (call.status === 'on-hold') {
   return 'Work is paused. Review payment or approval blockers below.';
  }

  if (call.status === 'awaiting-quote-approval') {
   return 'Quotation sent. Awaiting customer approval before field work can proceed.';
  }

  if (call.status === 'in-progress') {
   return 'Field work is active. Review agent notes, billing state, and timestamps below.';
  }

  if (call.status === 'completed') {
   return 'Field work is complete. Final invoicing can proceed.';
  }

  if (call.status === 'invoiced') {
   return 'Work is complete and invoiced.';
  }

  return 'Review the current job state and linked documents below.';
 };

 const getBlockerItems = (call) => {
  const blockers = [];

  if (call.status === 'on-hold') {
   blockers.push('Job is explicitly marked on hold.');
  }

  if (call.proFormaInvoice && call.proFormaInvoice.paymentStatus !== 'paid') {
   blockers.push(
    `Pro-forma ${call.proFormaInvoice.invoiceNumber || 'invoice'} is ${call.proFormaInvoice.paymentStatus || call.proFormaInvoice.workflowStatus || 'pending'}.`
   );
  }

  if (call.quotation && call.quotation.status && !['approved', 'converted'].includes(call.quotation.status)) {
   blockers.push(
    `Quotation ${call.quotation.quotationNumber || ''} is ${call.quotation.status}.`
   );
  }

  if (!call.startedDate && call.status === 'in-progress') {
   blockers.push('No recorded start timestamp yet.');
  }

  return blockers;
 };

 const StatusBadge = ({ status }) => {
  const colorMap = {
   pending: 'bg-yellow-500/25 text-yellow-200 border-yellow-400/40',
   assigned: 'bg-blue-500/25 text-blue-200 border-blue-400/40',
   scheduled: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/40',
   'in-progress': 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40',
   'awaiting-quote-approval': 'bg-amber-500/25 text-amber-200 border-amber-400/40',
   'on-hold': 'bg-orange-500/25 text-orange-200 border-orange-400/40',
   completed: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40',
   invoiced: 'bg-teal-500/25 text-teal-200 border-teal-400/40',
   cancelled: 'bg-red-500/25 text-red-200 border-red-400/40',
  };
  return (
   <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${colorMap[status] || 'bg-white/10 text-white/70 border-white/20'}`}
   >
    {status}
   </span>
  );
 };

 const CallCard = ({ call, showAssignControls = false }) => (
  <div className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-2">
   <div className="flex items-start justify-between gap-2 flex-wrap">
    <div>
     <p className="text-sm font-semibold text-white">{call.callNumber || call._id}</p>
     <p className="text-xs text-white/70">{getCustomerLabel(call)}</p>
    </div>
    <StatusBadge status={call.status} />
   </div>
   {call.title && <p className="text-sm text-white/80">{call.title}</p>}
   <div className="text-xs text-white/55 space-y-0.5">
    {call.scheduledDate && <p>Scheduled: {formatDate(call.scheduledDate)}</p>}
    {call.startedDate && <p>Started: {formatDate(call.startedDate)}</p>}
    {call.completedDate && <p>Completed: {formatDate(call.completedDate)}</p>}
    {(call.resolvedServiceLocation || call.serviceLocation) && (
     <p>
      Location: {call.resolvedServiceLocation || call.serviceLocation}
      {getLocationSourceLabel(call.resolvedServiceLocationSource) && (
       <span className="ml-2 inline-flex items-center rounded-full border border-cyan-800 bg-cyan-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
      {getLocationSourceLabel(call.resolvedServiceLocationSource)}
       </span>
      )}
     </p>
    )}
    {call.assignedAgent && (
     <p>
      Agent:{' '}
      {typeof call.assignedAgent === 'object'
       ? `${call.assignedAgent.firstName || ''} ${call.assignedAgent.lastName || ''}`.trim()
       : call.assignedAgent}
     </p>
    )}
   </div>
   {!showAssignControls && isAdmin && (
    <button
     type="button"
     onClick={() => setExpandedCallId((prev) => (prev === call._id ? '' : call._id))}
     className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
    >
     {expandedCallId === call._id ? 'Hide Progress' : 'View Progress'}
    </button>
   )}
   {expandedCallId === call._id && (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-4">
     <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">Job Progress</p>
      <p className="mt-2 text-sm text-white/80">{getProgressSummary(call)}</p>
     </div>

     <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
       <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Timeline</p>
       <div className="mt-2 space-y-1 text-xs text-white/75">
        <p>Scheduled: {formatDate(call.scheduledDate)}</p>
        <p>Started: {formatDate(call.startedDate)}</p>
        <p>Completed: {formatDate(call.completedDate)}</p>
        <p>Invoiced: {formatDate(call.invoicedDate)}</p>
       </div>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
       <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Linked Documents</p>
       <div className="mt-2 space-y-1 text-xs text-white/75">
        <p>Quotation: {call.quotation?.quotationNumber || 'None linked'}{call.quotation?.status ? ` · ${call.quotation.status}` : ''}</p>
        <p>Pro-forma: {call.proFormaInvoice?.invoiceNumber || 'None linked'}{call.proFormaInvoice?.paymentStatus ? ` · ${call.proFormaInvoice.paymentStatus}` : call.proFormaInvoice?.workflowStatus ? ` · ${call.proFormaInvoice.workflowStatus}` : ''}</p>
        <p>Final Invoice: {call.invoice?.invoiceNumber || invoiceSuccessMap[call._id] || 'None linked'}{call.invoice?.paymentStatus ? ` · ${call.invoice.paymentStatus}` : ''}</p>
       </div>
      </div>
     </div>

     {getBlockerItems(call).length > 0 && (
      <div className="rounded-lg border border-amber-300/20 bg-amber-500/10 p-3">
       <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">Potential Hold-Ups</p>
       <div className="mt-2 space-y-1 text-xs text-amber-100/90">
        {getBlockerItems(call).map((item) => (
         <p key={item}>{item}</p>
        ))}
       </div>
      </div>
     )}

     {(call.notes || call.agentNotes || call.internalNotes) && (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
       {call.notes && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
         <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Customer Notes</p>
         <p className="mt-2 text-xs text-white/80 whitespace-pre-wrap">{call.notes}</p>
        </div>
       )}
       {call.agentNotes && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
         <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Agent Notes</p>
         <p className="mt-2 text-xs text-white/80 whitespace-pre-wrap">{call.agentNotes}</p>
        </div>
       )}
       {call.internalNotes && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
         <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Internal Notes</p>
         <p className="mt-2 text-xs text-white/80 whitespace-pre-wrap">{call.internalNotes}</p>
        </div>
       )}
      </div>
     )}
    </div>
   )}
   {showAssignControls && (
    <div className="pt-2 quick-actions-wrap">
     <select
      value={selectedAssignments[call._id] || ''}
      onChange={(e) => handleAssignmentSelect(call._id, e.target.value)}
      className="flex-1 min-w-[160px] rounded-lg bg-white/10 border border-white/20 text-white text-xs px-3 py-2"
     >
      <option value="" className="text-black">Select agent</option>
      {agents.map((agent) => (
       <option key={agent._id} value={agent._id} className="text-black">
        {agent.firstName} {agent.lastName}
       </option>
      ))}
     </select>
     <button
      type="button"
      disabled={assigningCallId === call._id}
      onClick={() => assignCallToAgent(call)}
      className="quick-action-btn quick-action-btn-sm quick-action-btn-info disabled:opacity-50"
     >
      {assigningCallId === call._id ? 'Assigning...' : 'Assign'}
     </button>
    </div>
   )}
   {isAdmin && (
    <div className="pt-2 border-t border-white/10 mt-1 flex flex-col gap-2">

     {/* Mark Complete — for in-progress calls */}
     {call.status === 'in-progress' && (
      <button
       type="button"
       disabled={markingCompleteId === call._id}
       onClick={() => handleMarkComplete(call)}
      className="quick-action-btn quick-action-btn-sm quick-action-btn-success disabled:opacity-50"
      >
       {markingCompleteId === call._id ? 'Marking complete…' : '✓ Mark as Complete'}
      </button>
     )}

     {/* Create Invoice — for completed (not yet invoiced) calls */}
     {call.status === 'completed' && !call.invoice && (
      <button
       type="button"
       disabled={creatingInvoiceId === call._id}
       onClick={() => handleCreateInvoice(call)}
      className="quick-action-btn quick-action-btn-sm quick-action-btn-info disabled:opacity-50"
      >
       {creatingInvoiceId === call._id ? 'Creating invoice…' : '+ Create Invoice'}
      </button>
     )}

     {/* Invoice reference — for invoiced calls or freshly created */}
     {(call.status === 'invoiced' || invoiceSuccessMap[call._id]) && (
      <div className="flex items-center gap-2 flex-wrap">
       <span className="text-[10px] font-bold uppercase tracking-wide text-teal-300">Invoice</span>
       <span className="text-xs font-semibold text-white/80">
        {call.invoice?.invoiceNumber || invoiceSuccessMap[call._id] || '—'}
       </span>
       {call.invoice?.totalAmount != null && (
        <span className="text-xs text-yellow-300 font-bold">
         R {Number(call.invoice.totalAmount).toFixed(2)}
        </span>
       )}
      </div>
     )}

     {/* Delete */}
     {pendingDeleteId !== call._id ? (
      <button
       type="button"
       onClick={() => setPendingDeleteId(call._id)}
      className="quick-action-link-danger self-start"
      >
       Delete call
      </button>
     ) : (
      <div className="quick-actions-wrap">
       <span className="text-xs text-white/70">Remove this service call?</span>
       <button
        type="button"
        disabled={deletingCallId === call._id}
        onClick={() => handleDeleteCall(call)}
        className="quick-action-btn quick-action-btn-sm quick-action-btn-danger disabled:opacity-50"
       >
        {deletingCallId === call._id ? 'Deleting...' : 'Yes, delete'}
       </button>
       <button
        type="button"
        onClick={() => setPendingDeleteId('')}
        className="quick-action-link"
       >
        Cancel
       </button>
      </div>
     )}
    </div>
   )}
  </div>
 );

 const Section = ({ title, calls, showAssignControls = false, emptyMsg }) => (
  <div className="card card-glass glass-card rounded-2xl shadow-xl p-6">
   <div className="flex items-center justify-between mb-4">
    <h2 className="glass-heading text-lg">{title}</h2>
    <span className="count-badge">{calls.length}</span>
   </div>
   {calls.length === 0 ? (
    <p className="text-sm text-white/50">{emptyMsg || 'No calls in this category.'}</p>
   ) : (
    <div className="space-y-3">
     {calls.map((call) => (
      <CallCard key={call._id} call={call} showAssignControls={showAssignControls} />
     ))}
    </div>
   )}
  </div>
 );

 if (loading) {
  return (
   <>
    <Sidebar />
    <div className="page-center">
     <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="mt-4 text-white/70">Loading service calls...</p>
     </div>
    </div>
   </>
  );
 }

 return (
  <>
   <Sidebar />
   <div className="page-body sm:px-6 lg:px-8">
    <div className="max-w-[1200px] mx-auto space-y-8">

     {/* Page header */}
     <div className="flex items-start justify-between flex-wrap gap-4">
      <div>
       <h1 className="glass-heading text-3xl">Service Calls</h1>
       <p className="text-white/70 mt-1">Status dashboard — {serviceCalls.length} total calls</p>
      </div>
      <div className="quick-actions-grid w-full sm:w-auto">
       <button
        type="button"
        onClick={() => navigate('/service-call-registration')}
        className="quick-action-btn quick-action-btn-primary"
       >
        + Book Service
       </button>
       <button
        type="button"
        onClick={() => { fetchServiceCalls(); fetchAgents(); }}
        className="quick-action-btn quick-action-btn-secondary"
       >
        Refresh
       </button>
      </div>
     </div>

     {/* Ops queue feedback */}
     {queueActionError && (
      <div className="rounded-lg px-4 py-3 border border-red-300/40 bg-red-500/20 text-white text-sm">
       {queueActionError}
      </div>
     )}
     {queueActionSuccess && (
      <div className="rounded-lg px-4 py-3 border border-emerald-300/40 bg-emerald-500/20 text-white text-sm">
       {queueActionSuccess}
      </div>
     )}

     {/* Summary strip */}
     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {[
       { label: 'Unassigned', count: unassignedCalls.length, color: 'text-yellow-300' },
       { label: 'Awaiting Acceptance', count: awaitingAcceptanceCalls.length, color: 'text-blue-300' },
       { label: 'Accepted', count: acceptedNotAttendedCalls.length, color: 'text-cyan-300' },
       { label: 'On Hold', count: awaitingQuoteApprovalCalls.length, color: 'text-orange-300' },
       { label: 'In Progress', count: inProgressCalls.length, color: 'text-indigo-300' },
       { label: 'Completed', count: completedCalls.length, color: 'text-emerald-300' },
      ].map(({ label, count, color }) => (
       <div key={label} className="rounded-xl border border-white/15 bg-white/5 p-3 text-center">
        <p className={`text-2xl font-bold ${color}`}>{count}</p>
        <p className="text-xs text-white/60 mt-1">{label}</p>
       </div>
      ))}
     </div>

     {/* Status sections */}
     <Section
      title="Unassigned"
      calls={unassignedCalls}
      showAssignControls
      emptyMsg="No unassigned calls — great!"
     />

     <Section
      title="Assigned — Awaiting Agent Acceptance"
      calls={awaitingAcceptanceCalls}
      emptyMsg="No calls awaiting agent acceptance."
     />

     <Section
      title="Accepted — Not Yet Attended"
      calls={acceptedNotAttendedCalls}
      emptyMsg="No accepted calls pending attendance."
     />

     <Section
      title="Attended — Quotation Submitted, Awaiting Approval"
      calls={awaitingQuoteApprovalCalls}
      emptyMsg="No calls awaiting quote approval."
     />

     <Section
      title="Quotation Accepted — Job In Progress"
      calls={inProgressCalls}
      emptyMsg="No jobs currently in progress."
     />

     <Section
      title="Completed / Invoiced"
      calls={completedCalls}
      emptyMsg="No completed calls yet."
     />

    </div>
   </div>
  </>
 );
};

export default ServiceCalls;
