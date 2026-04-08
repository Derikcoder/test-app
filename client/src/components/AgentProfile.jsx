import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';
import CreateQuoteModal from './CreateQuoteModal';
import SiteInstructionModal from './SiteInstructionModal';

const pageShellClass = 'min-h-screen bg-slate-950 pt-20 pb-8 px-3 sm:px-6 lg:px-8';
const panelClass = 'rounded-2xl border border-slate-700 bg-slate-900/90 shadow-xl';
const statCardClass = 'rounded-xl border border-slate-700 bg-slate-900/85 p-6';
const tabActiveClass = 'text-cyan-300 border-b-2 border-cyan-300';
const tabInactiveClass = 'text-slate-300 hover:text-slate-100';
const roleLabelMap = {
 superAdmin: 'Super Admin',
 businessAdministrator: 'Business Administrator',
 fieldServiceAgent: 'Field Service Agent',
 customer: 'Customer',
};

const AgentProfile = () => {
 const { id } = useParams();
 const navigate = useNavigate();
 const { user } = useAuth();
 const isSuperAdmin = user?.role === 'superAdmin' || user?.isSuperUser === true;
 const roleLabel = roleLabelMap[user?.role] || (isSuperAdmin ? 'Super Admin' : 'Platform User');
 const roleToneClass = isSuperAdmin
  ? 'border-fuchsia-700 bg-fuchsia-950 text-fuchsia-200'
  : 'border-cyan-700 bg-cyan-950 text-cyan-200';
 const [agent, setAgent] = useState(null);
 const [serviceCalls, setServiceCalls] = useState([]);
 const [eligibleUnassignedCalls, setEligibleUnassignedCalls] = useState([]);
 const [selfDispatchMeta, setSelfDispatchMeta] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [actionError, setActionError] = useState('');
 const [actionSuccess, setActionSuccess] = useState('');
 const [acceptingCallId, setAcceptingCallId] = useState('');
 const [completingCallId, setCompletingCallId] = useState(null);
 const [creatingInvoiceCallId, setCreatingInvoiceCallId] = useState(null);
 const [activeTab, setActiveTab] = useState('all');
 const [editingQuotation, setEditingQuotation] = useState(null);

 const handleEditQuotation = async (quotationId) => {
  try {
   const res = await api.get(`/quotations/${quotationId}`, {
    headers: { Authorization: `Bearer ${user.token}` },
   });
   setEditingQuotation(res.data);
  } catch (err) {
   setActionError(err?.response?.data?.message || 'Failed to load quotation for editing.');
  }
 };

 useEffect(() => {
  fetchAgentData();
 }, [id]);

 const fetchAgentData = async () => {
  try {
   setLoading(true);
   
   // Fetch agent details
   const agentResponse = await api.get(`/agents/${id}`, {
    headers: { Authorization: `Bearer ${user.token}` }
   });
   setAgent(agentResponse.data);

   // Fetch service calls for this agent
   const callsResponse = await api.get('/service-calls', {
    headers: { Authorization: `Bearer ${user.token}` }
   });

   // Filter calls assigned to this agent
   const agentCalls = callsResponse.data.filter(
    call => call.assignedAgent?._id === id || call.assignedAgent === id
   );
   setServiceCalls(agentCalls);

  const eligibleResponse = await api.get(`/service-calls/eligible-unassigned/${id}`, {
   headers: { Authorization: `Bearer ${user.token}` }
  });
  setEligibleUnassignedCalls(eligibleResponse.data.jobs || []);
  setSelfDispatchMeta(eligibleResponse.data.meta || null);
   
  } catch (err) {
  if (err.response?.data?.jobs) {
   setEligibleUnassignedCalls([]);
   setSelfDispatchMeta(err.response?.data?.meta || null);
   setActionError(err.response?.data?.message || 'Unable to load self-dispatch jobs');
  } else {
   setError(err.response?.data?.message || 'Failed to fetch agent data');
  }
  } finally {
   setLoading(false);
  }
 };

 const acceptUnassignedJob = async (callId) => {
  setActionError('');
  setActionSuccess('');
  setAcceptingCallId(callId);

  try {
  const response = await api.post(
   `/service-calls/${callId}/self-accept`,
   { agentId: id },
    {
     headers: { Authorization: `Bearer ${user.token}` },
    }
   );

   setActionSuccess("Job accepted successfully and added to this agent's queue.");
  setSelfDispatchMeta(response.data.meta || null);
   await fetchAgentData();
   setActiveTab('to-attend');
  } catch (err) {
   setActionError(err.response?.data?.message || 'Failed to accept the job. Please try again.');
  setSelfDispatchMeta(err.response?.data?.meta || null);
  } finally {
   setAcceptingCallId('');
  }
 };

 const markJobComplete = async (callId) => {
  setActionError('');
  setActionSuccess('');
  setCompletingCallId(callId);
  try {
   await api.put(
    `/service-calls/${callId}`,
    { status: 'completed' },
    { headers: { Authorization: `Bearer ${user.token}` } }
   );
   setActionSuccess('Job marked as completed.');
   await fetchAgentData();
  } catch (err) {
   setActionError(err.response?.data?.message || 'Failed to mark job as complete.');
  } finally {
   setCompletingCallId(null);
  }
 };

 const createFinalInvoice = async (callId) => {
  setActionError('');
  setActionSuccess('');
  setCreatingInvoiceCallId(callId);
  try {
   await api.post(
    `/invoices/from-service-call/${callId}/final`,
    {},
    { headers: { Authorization: `Bearer ${user.token}` } }
   );
   setActionSuccess('Invoice created successfully.');
   await fetchAgentData();
  } catch (err) {
   setActionError(err.response?.data?.message || 'Failed to create invoice.');
  } finally {
   setCreatingInvoiceCallId(null);
  }
 };

 // Calculate statistics
 const stats = {
  total: serviceCalls.length,
  completed: serviceCalls.filter(call => call.status === 'completed').length,
  inProgress: serviceCalls.filter(call => call.status === 'in-progress' || call.status === 'awaiting-quote-approval').length,
  toBeAttended: serviceCalls.filter(call => call.status === 'assigned' || call.status === 'open').length,
  unassigned: eligibleUnassignedCalls.length,
 };

 // Filter service calls based on active tab
 const getFilteredCalls = () => {
  switch (activeTab) {
   case 'completed':
    return serviceCalls.filter(call => call.status === 'completed');
   case 'in-progress':
    return serviceCalls.filter(call => call.status === 'in-progress' || call.status === 'awaiting-quote-approval');
   case 'to-attend':
    return serviceCalls.filter(call => call.status === 'assigned' || call.status === 'open');
   case 'unassigned':
    return eligibleUnassignedCalls;
   default:
    return serviceCalls;
  }
 };

 const getStatusColor = (status) => {
  switch (status) {
   case 'completed':
    return 'bg-green-500/30 text-green-100 border border-green-400/50';
   case 'in-progress':
    return 'bg-blue-500/30 text-blue-100 border border-blue-400/50';
   case 'awaiting-quote-approval':
    return 'bg-purple-500/30 text-purple-100 border border-purple-400/50';
   case 'invoiced':
    return 'bg-teal-500/30 text-teal-100 border border-teal-400/50';
   case 'assigned':
    return 'bg-yellow-500/30 text-yellow-100 border border-yellow-400/50';
   case 'open':
    return 'bg-gray-500/30 text-gray-100 border border-gray-400/50';
   default:
    return 'bg-gray-500/30 text-gray-100 border border-gray-400/50';
  }
 };

 const getPriorityColor = (priority) => {
  switch (priority) {
   case 'high':
    return 'text-red-200';
   case 'medium':
    return 'text-yellow-200';
   case 'low':
    return 'text-green-200';
   default:
    return 'text-gray-200';
  }
 };

 const formatStructuredAddress = (address) => {
  if (!address) return 'N/A';

  return [
   address.streetAddress,
   address.complexName ? `Complex/Industrial Park: ${address.complexName}` : null,
   address.siteAddressDetail ? `Unit/Site Detail: ${address.siteAddressDetail}` : null,
   address.suburb,
   address.cityDistrict,
   address.province,
   address.postalCode ? `Postal Code: ${address.postalCode}` : null,
  ].filter(Boolean).join(', ') || 'N/A';
 };

 const getCustomerLabel = (call) => {
  if (call.customer?.businessName) return call.customer.businessName;
  if (call.bookingRequest?.contact?.companyName) return call.bookingRequest.contact.companyName;
  if (call.bookingRequest?.contact?.contactPerson) return call.bookingRequest.contact.contactPerson;
  return 'N/A';
 };

 const getCustomerPhone = (call) => {
  return (
   call.bookingRequest?.contact?.contactPhone
   || call.customer?.phoneNumber
   || call.customer?.alternatePhone
   || ''
  );
 };

 const buildQuoteSourceFromCall = (call) => {
  const descriptionPreview = getDescriptionPreview(call?.description || '');
  return {
   serviceCallId: call?._id || '',
   customerId: call?.customer?._id || call?.customer || '',
   customerLabel: getCustomerLabel(call),
   siteId: call?.siteId || '',
   equipmentId: call?.equipment?._id || call?.equipment || '',
   machineModelNumber: call?.bookingRequest?.generatorDetails?.machineModelNumber || '',
   generatorMakeModel: call?.bookingRequest?.generatorDetails?.generatorMakeModel || '',
   serviceType: call?.serviceType || 'Scheduled Maintenance',
   title: call?.title || `Quotation for ${call?.callNumber || 'Service Call'}`,
   description: descriptionPreview,
   notes: call?.bookingRequest?.additionalNotes || '',
   lineItems: [
    {
      description: call?.serviceType || 'Service Work',
      quantity: 1,
      unitPrice: 0,
    },
   ],
  };
 };

 const normalizePhoneForTel = (phone) => {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  const normalized = trimmed.replace(/[^\d+]/g, '');

  if (normalized.startsWith('+')) return normalized;
  if (normalized.startsWith('0') && normalized.length === 10) return `+27${normalized.slice(1)}`;
  if (normalized.startsWith('27')) return `+${normalized}`;

  return normalized;
 };

 const normalizePhoneForWhatsApp = (phone) => {
  const telNumber = normalizePhoneForTel(phone);
  return telNumber.replace(/[^\d]/g, '');
 };

 const getDescriptionPreview = (description) => {
  if (!description) return 'No description provided.';

  const normalized = String(description).trim();
  if (!normalized) return 'No description provided.';

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const preview = lines.slice(0, 3).join(' • ');

  return preview.length > 220 ? `${preview.slice(0, 220)}...` : preview;
 };

 if (loading) {
  return (
   <>
    <Sidebar />
    <div className={`${pageShellClass} flex items-center justify-center`}>
     <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto"></div>
      <p className="mt-4 text-slate-300">Loading agent profile...</p>
     </div>
    </div>
   </>
  );
 }

 if (error || !agent) {
  return (
   <>
    <Sidebar />
    <div className={`${pageShellClass} py-12 px-4`}>
     <div className="max-w-[1200px] mx-auto ">
      <div className="px-4 py-3 rounded-lg border border-red-700 bg-red-950 text-red-200">
       {error || 'Agent not found'}
      </div>
      <button
       onClick={() => navigate('/agents')}
       className="mt-4 text-slate-200 hover:text-cyan-300"
      >
       ← Back to Agents
      </button>
     </div>
    </div>
   </>
  );
 }

 return (
  <>
   <Sidebar />
  <div className={pageShellClass}>
    <div className="max-w-[1200px] mx-auto ">
     {/* Back button */}
     <button
      onClick={() => navigate('/agents')}
    className="mb-4 flex items-center text-slate-200 hover:text-cyan-300 transition"
     >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Agents
     </button>

    <div className="mb-4 flex flex-wrap gap-2">
     <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${roleToneClass}`}>
      Role: {roleLabel}
     </span>
     <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
      Access Mode: {isSuperAdmin ? 'Governance + Override' : 'Operational'}
     </span>
    </div>

    <div className="mb-6 rounded-xl border border-cyan-800 bg-cyan-950/50 px-4 py-3 text-sm text-cyan-100">
     Entity Focus: Field Agent Workspace | Record Type: Agent Profile + Assigned Service Calls
    </div>

     {/* Agent Profile Header */}
    <div className={`${panelClass} overflow-hidden mb-8`}>
     <div className="bg-slate-900 border-b border-slate-700 px-5 sm:px-8 py-6">
       <div className="flex items-center gap-6">
       <div className="w-24 h-24 bg-gradient-to-br from-cyan-800 to-slate-900 rounded-full flex items-center justify-center text-cyan-200 text-3xl font-bold shadow-lg border border-slate-600">
         {agent.firstName?.[0]}{agent.lastName?.[0]}
        </div>
        <div className="flex-1">
        <h1 className="text-3xl font-bold text-slate-100">
          {agent.firstName} {agent.lastName}
         </h1>
        <p className="text-slate-300 mt-1 font-medium">Employee ID: {agent.employeeId}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-slate-300 text-sm">
          <span>📧 {agent.email}</span>
          <span>📱 {agent.phoneNumber}</span>
         </div>
         {agent.assignedArea && (
      <p className="text-slate-300 mt-1 text-sm">📍 Area: {agent.assignedArea}</p>
         )}
        </div>
        <div>
         <span className={`px-4 py-2 text-sm font-semibold rounded-full ${
      agent.status === 'active' ? 'bg-emerald-950 text-emerald-200 border border-emerald-700' :
      agent.status === 'on-leave' ? 'bg-amber-950 text-amber-200 border border-amber-700' :
      'bg-slate-800 text-slate-200 border border-slate-600'
         }`}>
          {agent.status?.toUpperCase()}
         </span>
        </div>
       </div>
       {agent.skills?.length > 0 && (
        <div className="mt-4">
           <p className="text-slate-300 text-sm font-medium mb-2">Skills:</p>
         <div className="flex flex-wrap gap-2">
          {agent.skills.map((skill, index) => (
           <span
            key={index}
              className="bg-cyan-950 text-cyan-200 px-3 py-1 rounded-full text-sm border border-cyan-800"
           >
            {skill}
           </span>
          ))}
         </div>
        </div>
       )}
      </div>
     </div>

     {/* Statistics Cards */}
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
      <div className={statCardClass}>
       <div className="flex items-center justify-between">
        <div>
         <p className="text-slate-400 text-sm font-medium">Total Jobs</p>
         <p className="text-3xl font-bold text-slate-100 mt-2">{stats.total}</p>
        </div>
        <div className="w-12 h-12 bg-cyan-950 rounded-lg flex items-center justify-center border border-cyan-800">
         <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
         </svg>
        </div>
       </div>
      </div>

      <div className={statCardClass}>
       <div className="flex items-center justify-between">
        <div>
         <p className="text-slate-400 text-sm font-medium">In Progress</p>
         <p className="text-3xl font-bold text-blue-300 mt-2">{stats.inProgress}</p>
        </div>
        <div className="w-12 h-12 bg-blue-950 rounded-lg flex items-center justify-center border border-blue-800">
         <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
         </svg>
        </div>
       </div>
      </div>

      <div className={statCardClass}>
       <div className="flex items-center justify-between">
        <div>
         <p className="text-slate-400 text-sm font-medium">To Be Attended</p>
         <p className="text-3xl font-bold text-yellow-300 mt-2">{stats.toBeAttended}</p>
        </div>
        <div className="w-12 h-12 bg-amber-950 rounded-lg flex items-center justify-center border border-amber-800">
         <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
         </svg>
        </div>
       </div>
      </div>

      <div className={statCardClass}>
       <div className="flex items-center justify-between">
        <div>
         <p className="text-slate-400 text-sm font-medium">Completed</p>
         <p className="text-3xl font-bold text-green-300 mt-2">{stats.completed}</p>
        </div>
        <div className="w-12 h-12 bg-emerald-950 rounded-lg flex items-center justify-center border border-emerald-800">
         <svg className="w-6 h-6 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
         </svg>
        </div>
       </div>
      </div>

      <button
       type="button"
       onClick={() => setActiveTab('unassigned')}
      className={`${statCardClass} text-left transition hover:border-amber-700 ${
       activeTab === 'unassigned' ? 'ring-2 ring-amber-500/70' : ''
       }`}
      >
       <div className="flex items-center justify-between">
        <div>
         <p className="text-slate-400 text-sm font-medium">Unassigned Jobs</p>
         <p className="text-3xl font-bold text-orange-300 mt-2">{stats.unassigned}</p>
        </div>
        <div className="w-12 h-12 bg-orange-950 rounded-lg flex items-center justify-center border border-orange-800">
         <svg className="w-6 h-6 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
         </svg>
        </div>
       </div>
      </button>
     </div>

     {actionError && (
      <div className="mb-4 p-4 rounded-lg border border-red-700 bg-red-950 text-red-200">{actionError}</div>
     )}
     {actionSuccess && (
      <div className="mb-4 p-4 rounded-lg border border-emerald-700 bg-emerald-950 text-emerald-200">{actionSuccess}</div>
     )}
    {selfDispatchMeta && (
         <div className="mb-4 p-4 rounded-lg border border-slate-700 bg-slate-900 text-sm text-slate-200">
      Self-dispatch remaining today: {selfDispatchMeta.remainingDailySelfAccepts} | Participation days used this week: {selfDispatchMeta.weeklyParticipationDaysUsed}/5
     </div>
    )}

     {/* Service Calls Section */}
         <div className={`${panelClass} overflow-hidden`}>
      <div className="px-5 sm:px-8 py-6 border-b border-slate-700 bg-slate-900/95">
       <h2 className="text-2xl font-bold text-slate-100">Service Calls</h2>
       <p className="mt-1 text-sm text-slate-400">Entity Focus: Service Call records linked to this field agent</p>

       {/* Tabs */}
       <div className="mt-4 flex gap-2 border-b border-slate-700 overflow-x-auto">
        <button
         onClick={() => setActiveTab('all')}
         className={`px-4 py-2 font-medium transition -mb-px ${
          activeTab === 'all'
           ? tabActiveClass
           : tabInactiveClass
         }`}
        >
         All ({stats.total})
        </button>
        <button
         onClick={() => setActiveTab('to-attend')}
         className={`px-4 py-2 font-medium transition -mb-px ${
          activeTab === 'to-attend'
           ? tabActiveClass
           : tabInactiveClass
         }`}
        >
         To Attend ({stats.toBeAttended})
        </button>
        <button
         onClick={() => setActiveTab('in-progress')}
         className={`px-4 py-2 font-medium transition -mb-px ${
          activeTab === 'in-progress'
           ? tabActiveClass
           : tabInactiveClass
         }`}
        >
         In Progress ({stats.inProgress})
        </button>
        <button
         onClick={() => setActiveTab('completed')}
         className={`px-4 py-2 font-medium transition -mb-px ${
          activeTab === 'completed'
           ? tabActiveClass
           : tabInactiveClass
         }`}
        >
         Completed ({stats.completed})
        </button>
        <button
         onClick={() => setActiveTab('unassigned')}
         className={`px-4 py-2 font-medium transition -mb-px ${
          activeTab === 'unassigned'
           ? tabActiveClass
           : tabInactiveClass
         }`}
        >
         Unassigned ({stats.unassigned})
        </button>
       </div>
      </div>

      {/* Calls List */}
      <div className="p-8">
       {getFilteredCalls().length === 0 ? (
        <div className="text-center py-12 text-slate-400">
         <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
         </svg>
         <p className="text-slate-200">No service calls in this category</p>
        </div>
       ) : (
        <div className="space-y-4">
         {getFilteredCalls().map((call) => (
          <div
           key={call._id}
           className="rounded-lg border border-slate-700 bg-slate-900/85 p-6 hover:border-cyan-700 transition"
          >
             {(() => {
              const customerPhone = getCustomerPhone(call);
              const whatsappPhone = normalizePhoneForWhatsApp(customerPhone);
              const telPhone = normalizePhoneForTel(customerPhone);
              const hasPhone = Boolean(whatsappPhone && telPhone);

              return (
           <div className="flex justify-between items-start">
            <div className="flex-1">
             <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">
               {call.callNumber}
              </h3>
                <span className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide rounded-full border border-cyan-700 bg-cyan-950 text-cyan-200">
                 Service Call
                </span>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.status)}`}>
               {call.status}
              </span>
              <span className={`text-sm font-medium ${getPriorityColor(call.priority)}`}>
               {call.priority?.toUpperCase()} Priority
              </span>
             </div>

             {call.title && (
                <p className="text-slate-100 text-base font-semibold mb-2">{call.title}</p>
             )}

               <p className="text-slate-200 text-sm leading-relaxed mb-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              {getDescriptionPreview(call.description)}
             </p>

             {call.bookingRequest && (
                <div className="mb-4 rounded-lg border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-slate-400">Customer Type:</span>
                 <span className="ml-2 capitalize">{call.bookingRequest.contact?.customerType || 'N/A'}</span>
                </div>
                <div>
                 <span className="text-slate-400">Contact:</span>
                 <span className="ml-2">{call.bookingRequest.contact?.contactPerson || 'N/A'}</span>
                </div>
                <div>
                 <span className="text-slate-400">Machine Model Number:</span>
                 <span className="ml-2">{call.bookingRequest.generatorDetails?.machineModelNumber || 'N/A'}</span>
                </div>
                <div>
                 <span className="text-slate-400">Generator:</span>
                 <span className="ml-2">{call.bookingRequest.generatorDetails?.generatorMakeModel || 'N/A'}</span>
                </div>
                <div>
                 <span className="text-slate-400">Service History:</span>
                 <span className="ml-2 capitalize">{(call.bookingRequest.serviceHistoryType || 'N/A').replace('-', ' ')}</span>
                </div>
                <div>
                 <span className="text-slate-400">Date of Last Service:</span>
                 <span className="ml-2">
                  {call.bookingRequest.dateOfLastService
                   ? new Date(call.bookingRequest.dateOfLastService).toLocaleDateString()
                   : 'N/A'}
                 </span>
                </div>
                <div>
                 <span className="text-slate-400">Preferred Service Date:</span>
                 <span className="ml-2">
                  {call.bookingRequest.preferredDate
                   ? new Date(call.bookingRequest.preferredDate).toLocaleDateString()
                   : 'N/A'}
                 </span>
                </div>
                <div>
                 <span className="text-slate-400">Progress Status:</span>
                 <span className="ml-2">{call.bookingRequest.progressStatus || 'N/A'}</span>
                </div>
                <div>
                 <span className="text-slate-400">Services In Progress:</span>
                 <span className="ml-2">{call.bookingRequest.servicesInProgress || 'N/A'}</span>
                </div>
                <div>
                 <span className="text-slate-400">Quotation History:</span>
                 <span className="ml-2">{call.bookingRequest.quotationHistory || 'N/A'}</span>
                </div>
                <div>
                 <span className="text-slate-400">Invoicing History:</span>
                 <span className="ml-2">{call.bookingRequest.invoicingHistory || 'N/A'}</span>
                </div>
                {call.bookingRequest.generatorDetails?.siteName && (
                 <div className="md:col-span-2">
                  <span className="text-slate-400">Site Name:</span>
                  <span className="ml-2">{call.bookingRequest.generatorDetails.siteName}</span>
                 </div>
                )}
                <div className="md:col-span-2">
                 <span className="text-slate-400">Administrative Address:</span>
                 <span className="ml-2">{formatStructuredAddress(call.bookingRequest.administrativeAddress)}</span>
                </div>
                <div className="md:col-span-2">
                 <span className="text-slate-400">Machine Address:</span>
                 <span className="ml-2">{formatStructuredAddress(call.bookingRequest.machineAddress)}</span>
                </div>
               </div>
              </div>
             )}

             <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
               <span className="text-slate-400">Customer:</span>
               <span className="ml-2 font-medium text-slate-100">
                {getCustomerLabel(call)}
               </span>
              </div>
              <div>
               <span className="text-slate-400">Contact Phone:</span>
               <span className="ml-2 text-slate-100">{customerPhone || 'N/A'}</span>
              </div>
              <div>
               <span className="text-slate-400">Scheduled:</span>
               <span className="ml-2 text-slate-100">
                {call.scheduledDate
                 ? new Date(call.scheduledDate).toLocaleDateString()
                 : 'Not scheduled'}
               </span>
              </div>
              {call.proFormaInvoice ? (
               <div>
                <span className="text-white/60">Site Instruction:</span>
                <span className="ml-2 text-cyan-200">
                 {call.proFormaInvoice.invoiceNumber} ({call.proFormaInvoice.workflowStatus})
                </span>
               </div>
              ) : null}
              {call.invoice ? (
               <div>
                <span className="text-white/60">Final Invoice:</span>
                <span className="ml-2 text-emerald-200">
                 {call.invoice.invoiceNumber} ({call.invoice.paymentStatus || call.invoice.workflowStatus})
                </span>
               </div>
              ) : null}
              {(call.serviceLocation || call.location) && (
               <div className="col-span-2">
                <span className="text-white/60">Location:</span>
                <span className="ml-2 text-slate-100">{call.serviceLocation || call.location}</span>
               </div>
              )}
              {call.quotation && ['sent', 'approved'].includes(call.quotation.status) && (
               <div className="col-span-2 rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
                <span className="font-semibold">
                 {call.quotation.status === 'approved' ? '✓ Approved Quotation' : '⏳ Quotation Sent — Awaiting Approval'}
                </span>{': '}
                {call.quotation.quotationNumber}
                {call.quotation.title ? ` — ${call.quotation.title}` : ''}
                {call.quotation.totalAmount != null ? ` — R${Number(call.quotation.totalAmount).toLocaleString()}` : ''}
                {call.quotation.createdBy && (
                 <span className="ml-2 text-xs text-emerald-400">
                  · Created by: {call.quotation.createdBy.userName}
                  {call.quotation.createdBy.role ? ` (${roleLabelMap[call.quotation.createdBy.role] || call.quotation.createdBy.role})` : ''}
                 </span>
                )}
               </div>
              )}
              <div className="col-span-2 pt-1">
               {hasPhone ? (
                <div className="flex flex-wrap gap-2 items-center">
                 <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-action-emerald"
                  title="Start WhatsApp call/chat with customer"
                 >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                   <path d="M20.52 3.48A11.77 11.77 0 0012.07 0C5.57 0 .26 5.3.26 11.8c0 2.08.54 4.1 1.56 5.88L0 24l6.48-1.7a11.86 11.86 0 005.6 1.43h.01c6.5 0 11.8-5.3 11.8-11.8 0-3.15-1.23-6.12-3.37-8.45zM12.08 21.7h-.01a9.86 9.86 0 01-5.03-1.38l-.36-.21-3.84 1.01 1.03-3.74-.24-.39a9.79 9.79 0 01-1.5-5.2c0-5.43 4.43-9.86 9.88-9.86 2.63 0 5.1 1.02 6.95 2.88a9.8 9.8 0 012.89 6.97c0 5.44-4.43 9.87-9.87 9.87zm5.41-7.42c-.3-.15-1.78-.88-2.06-.98-.28-.11-.48-.15-.68.15-.2.3-.78.98-.96 1.17-.18.2-.36.22-.66.07-.3-.15-1.28-.47-2.43-1.5-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.68-1.64-.93-2.25-.24-.58-.49-.5-.68-.5h-.58c-.2 0-.52.08-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.11 3.21 5.11 4.5.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.78-.73 2.03-1.43.25-.7.25-1.3.17-1.43-.07-.12-.27-.2-.57-.35z" />
                  </svg>
                  WhatsApp Call
                 </a>
                 <a
                  href={`tel:${telPhone}`}
                  className="btn-action-blue"
                  title="Place a regular phone call"
                 >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.17 1.09a11.04 11.04 0 005.31 5.31l1.09-2.17a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                  </svg>
                  Call Customer
                 </a>
                 {(!call.quotation || !['sent', 'approved', 'converted'].includes(call.quotation.status)) && (
                  <CreateQuoteModal
                   token={user?.token}
                   isSuperUser={Boolean(user?.isSuperUser)}
                   sourceData={buildQuoteSourceFromCall(call)}
                   triggerLabel="Create Quote"
                   triggerClassName="btn-action-amber"
                   onCreated={fetchAgentData}
                  />
                 )}
                 {call.quotation && call.quotation.status === 'sent' && (
                  <button
                   type="button"
                   onClick={() => handleEditQuotation(call.quotation._id)}
                   className="btn-action-amber"
                  >
                   Edit Quote
                  </button>
                 )}
                 <SiteInstructionModal
                  token={user?.token}
                  serviceCall={call}
                  roleLabel={roleLabel}
                  isSuperAdmin={isSuperAdmin}
                  triggerClassName="btn-action-cyan"
                  onUpdated={fetchAgentData}
                 />
                 {call.status === 'in-progress' && (
                  <button
                   type="button"
                   onClick={() => markJobComplete(call._id)}
                   disabled={completingCallId === call._id}
                   className={`btn-action text-white ${
                    completingCallId === call._id
                     ? 'cursor-not-allowed border-slate-700 bg-slate-800 opacity-70'
                     : 'btn-action-green'
                   }`}
                  >
                   {completingCallId === call._id ? 'Completing...' : 'Mark Job Complete'}
                  </button>
                 )}
                 {call.status === 'completed' && !call.invoice && (
                  <button
                   type="button"
                   onClick={() => createFinalInvoice(call._id)}
                   disabled={creatingInvoiceCallId === call._id}
                   className={`btn-action text-white ${
                    creatingInvoiceCallId === call._id
                     ? 'cursor-not-allowed border-slate-700 bg-slate-800 opacity-70'
                     : 'btn-action-emerald'
                   }`}
                  >
                   {creatingInvoiceCallId === call._id ? 'Creating Invoice...' : 'Create Invoice'}
                  </button>
                 )}
                  {activeTab === 'unassigned' && (
                   <button
                    type="button"
                    onClick={() => acceptUnassignedJob(call._id)}
                    disabled={acceptingCallId === call._id}
                    className={`btn-action text-white ${
                     acceptingCallId === call._id
                      ? 'cursor-not-allowed border-slate-700 bg-slate-800 opacity-70'
                      : 'btn-action-orange'
                    }`}
                   >
                    {acceptingCallId === call._id ? 'Accepting...' : 'Accept Job'}
                   </button>
                  )}
                </div>
               ) : (
                <div className="flex flex-wrap gap-2 items-center">
                 <p className="text-xs text-slate-400">No valid customer phone number available for call actions.</p>
                 {(!call.quotation || !['sent', 'approved', 'converted'].includes(call.quotation.status)) && (
                  <CreateQuoteModal
                   token={user?.token}
                   isSuperUser={Boolean(user?.isSuperUser)}
                   sourceData={buildQuoteSourceFromCall(call)}
                   triggerLabel="Create Quote"
                   triggerClassName="btn-action-amber"
                   onCreated={fetchAgentData}
                  />
                 )}
                 {call.quotation && call.quotation.status === 'sent' && (
                  <button
                   type="button"
                   onClick={() => handleEditQuotation(call.quotation._id)}
                   className="btn-action-amber"
                  >
                   Edit Quote
                  </button>
                 )}
                 <SiteInstructionModal
                  token={user?.token}
                  serviceCall={call}
                  roleLabel={roleLabel}
                  isSuperAdmin={isSuperAdmin}
                  triggerClassName="btn-action-cyan"
                  onUpdated={fetchAgentData}
                 />
                 {call.status === 'in-progress' && (
                  <button
                   type="button"
                   onClick={() => markJobComplete(call._id)}
                   disabled={completingCallId === call._id}
                   className={`btn-action text-white ${
                    completingCallId === call._id
                     ? 'cursor-not-allowed border-slate-700 bg-slate-800 opacity-70'
                     : 'border-green-700 bg-green-950 hover:bg-green-900'
                   }`}
                  >
                   {completingCallId === call._id ? 'Completing...' : 'Mark Job Complete'}
                  </button>
                 )}
                 {call.status === 'completed' && !call.invoice && (
                  <button
                   type="button"
                   onClick={() => createFinalInvoice(call._id)}
                   disabled={creatingInvoiceCallId === call._id}
                   className={`btn-action text-white ${
                    creatingInvoiceCallId === call._id
                     ? 'cursor-not-allowed border-slate-700 bg-slate-800 opacity-70'
                     : 'border-emerald-600 bg-emerald-950 hover:bg-emerald-900'
                   }`}
                  >
                   {creatingInvoiceCallId === call._id ? 'Creating Invoice...' : 'Create Invoice'}
                  </button>
                 )}
                 {activeTab === 'unassigned' && (
                  <button
                   type="button"
                   onClick={() => acceptUnassignedJob(call._id)}
                   disabled={acceptingCallId === call._id}
                   className={`btn-action text-white ${
                    acceptingCallId === call._id
                     ? 'cursor-not-allowed border-slate-700 bg-slate-800 opacity-70'
                     : 'border-orange-700 bg-orange-950 hover:bg-orange-900'
                   }`}
                  >
                   {acceptingCallId === call._id ? 'Accepting...' : 'Accept Job'}
                  </button>
                 )}
                </div>
               )}
              </div>
                  <span className={`inline-flex items-center rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${roleToneClass}`}>
                   {isSuperAdmin ? 'Super Admin Controls Visible' : 'Operational Controls'}
                  </span>
             </div>
            </div>
           </div>
            );
           })()}
          </div>
         ))}
                 <span className={`inline-flex items-center rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${roleToneClass}`}>
                  {isSuperAdmin ? 'Super Admin Controls Visible' : 'Operational Controls'}
                 </span>
        </div>
       )}
      </div>
     </div>
    </div>
   </div>
   {editingQuotation && (
    <CreateQuoteModal
     token={user?.token}
     isSuperUser={Boolean(user?.isSuperUser)}
     editMode
     existingQuotation={editingQuotation}
     forceOpen
     onClose={() => setEditingQuotation(null)}
     onCreated={() => { setEditingQuotation(null); fetchAgentData(); }}
    />
   )}
  </>
 );
};

export default AgentProfile;
