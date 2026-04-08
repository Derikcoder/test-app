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

 // --- Status bucket useMemos ---
 const unassignedCalls = useMemo(
  () => serviceCalls.filter((call) => !call.assignedAgent || call.status === 'pending'),
  [serviceCalls]
 );
 const awaitingAcceptanceCalls = useMemo(
  () => serviceCalls.filter((call) => call.assignedAgent && call.agentAccepted === false),
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
    {call.serviceLocation && <p>Location: {call.serviceLocation}</p>}
    {call.assignedAgent && (
     <p>
      Agent:{' '}
      {typeof call.assignedAgent === 'object'
       ? `${call.assignedAgent.firstName || ''} ${call.assignedAgent.lastName || ''}`.trim()
       : call.assignedAgent}
     </p>
    )}
   </div>
   {showAssignControls && (
    <div className="pt-2 flex items-center gap-2 flex-wrap">
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
      className="rounded-lg bg-blue-500/30 hover:bg-blue-500/40 border border-blue-300/30 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition"
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
       className="rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-300/30 px-4 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-50 transition"
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
       className="rounded-lg bg-teal-500/25 hover:bg-teal-500/35 border border-teal-300/30 px-4 py-1.5 text-xs font-semibold text-teal-200 disabled:opacity-50 transition"
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
       className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors self-start"
      >
       Delete call
      </button>
     ) : (
      <div className="flex items-center gap-3 flex-wrap">
       <span className="text-xs text-white/70">Remove this service call?</span>
       <button
        type="button"
        disabled={deletingCallId === call._id}
        onClick={() => handleDeleteCall(call)}
        className="rounded-lg bg-red-500/30 hover:bg-red-500/40 border border-red-300/30 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition"
       >
        {deletingCallId === call._id ? 'Deleting...' : 'Yes, delete'}
       </button>
       <button
        type="button"
        onClick={() => setPendingDeleteId('')}
        className="text-xs text-white/50 hover:text-white/80 transition-colors"
       >
        Cancel
       </button>
      </div>
     )}
    </div>
   )}
  </div>
 );

 const Section = ({ title, calls, colorClass, showAssignControls = false, emptyMsg }) => (
  <div className="glass-card rounded-2xl shadow-xl p-6">
   <div className="flex items-center justify-between mb-4">
    <h2 className="glass-heading text-lg">{title}</h2>
    <span
     className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${colorClass}`}
    >
     {calls.length}
    </span>
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
      <div className="flex gap-3 flex-wrap">
       <button
        type="button"
        onClick={() => navigate('/service-call-registration')}
        className="glass-btn-primary font-semibold py-2.5 px-5"
       >
        + Book Service
       </button>
       <button
        type="button"
        onClick={() => { fetchServiceCalls(); fetchAgents(); }}
        className="glass-btn-outline font-semibold py-2.5 px-5"
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
      colorClass="border-yellow-400/40 bg-yellow-500/20 text-yellow-200"
      showAssignControls
      emptyMsg="No unassigned calls — great!"
     />

     <Section
      title="Assigned — Awaiting Agent Acceptance"
      calls={awaitingAcceptanceCalls}
      colorClass="border-blue-400/40 bg-blue-500/20 text-blue-200"
      emptyMsg="No calls awaiting agent acceptance."
     />

     <Section
      title="Accepted — Not Yet Attended"
      calls={acceptedNotAttendedCalls}
      colorClass="border-cyan-400/40 bg-cyan-500/20 text-cyan-200"
      emptyMsg="No accepted calls pending attendance."
     />

     <Section
      title="Attended — Quotation Submitted, Awaiting Approval"
      calls={awaitingQuoteApprovalCalls}
      colorClass="border-orange-400/40 bg-orange-500/20 text-orange-200"
      emptyMsg="No calls awaiting quote approval."
     />

     <Section
      title="Quotation Accepted — Job In Progress"
      calls={inProgressCalls}
      colorClass="border-indigo-400/40 bg-indigo-500/20 text-indigo-200"
      emptyMsg="No jobs currently in progress."
     />

     <Section
      title="Completed / Invoiced"
      calls={completedCalls}
      colorClass="border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
      emptyMsg="No completed calls yet."
     />

    </div>
   </div>
  </>
 );
};

export default ServiceCalls;
