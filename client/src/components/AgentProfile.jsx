import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';

const AgentProfile = () => {
 const { id } = useParams();
 const navigate = useNavigate();
 const { user } = useAuth();
 const [agent, setAgent] = useState(null);
 const [serviceCalls, setServiceCalls] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [activeTab, setActiveTab] = useState('all');

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
   
  } catch (err) {
   setError(err.response?.data?.message || 'Failed to fetch agent data');
  } finally {
   setLoading(false);
  }
 };

 // Calculate statistics
 const stats = {
  total: serviceCalls.length,
  completed: serviceCalls.filter(call => call.status === 'completed').length,
  inProgress: serviceCalls.filter(call => call.status === 'in-progress').length,
  toBeAttended: serviceCalls.filter(call => call.status === 'assigned' || call.status === 'open').length,
 };

 // Filter service calls based on active tab
 const getFilteredCalls = () => {
  switch (activeTab) {
   case 'completed':
    return serviceCalls.filter(call => call.status === 'completed');
   case 'in-progress':
    return serviceCalls.filter(call => call.status === 'in-progress');
   case 'to-attend':
    return serviceCalls.filter(call => call.status === 'assigned' || call.status === 'open');
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

 if (loading) {
  return (
   <>
    <Sidebar />
    <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center">
     <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-300 mx-auto"></div>
      <p className="mt-4 text-white/70">Loading agent profile...</p>
     </div>
    </div>
   </>
  );
 }

 if (error || !agent) {
  return (
   <>
    <Sidebar />
    <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4">
     <div className="max-w-[1200px] mx-auto ">
      <div className="glass-alert-error px-4 py-3 rounded-lg">
       {error || 'Agent not found'}
      </div>
      <button
       onClick={() => navigate('/agents')}
       className="mt-4 text-white hover:text-yellow-300"
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
   <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-[1200px] mx-auto ">
     {/* Back button */}
     <button
      onClick={() => navigate('/agents')}
      className="mb-6 flex items-center text-white hover:text-yellow-300 transition"
     >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Agents
     </button>

     {/* Agent Profile Header */}
     <div className="glass-card rounded-2xl shadow-xl overflow-hidden mb-8">
      <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 backdrop-blur-md border-b border-white/20 px-8 py-6">
       <div className="flex items-center gap-6">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-900 rounded-full flex items-center justify-center text-yellow-300 text-3xl font-bold shadow-lg border border-white/30">
         {agent.firstName?.[0]}{agent.lastName?.[0]}
        </div>
        <div className="flex-1">
         <h1 className="glass-heading text-3xl">
          {agent.firstName} {agent.lastName}
         </h1>
         <p className="text-white/70 mt-1">Employee ID: {agent.employeeId}</p>
         <div className="mt-2 flex gap-4 text-white/70">
          <span>📧 {agent.email}</span>
          <span>📱 {agent.phoneNumber}</span>
         </div>
         {agent.assignedArea && (
          <p className="text-white/70 mt-1">📍 Area: {agent.assignedArea}</p>
         )}
        </div>
        <div>
         <span className={`px-4 py-2 text-sm font-semibold rounded-full ${
          agent.status === 'active' ? 'bg-green-500/40 text-green-100 border border-green-400/50 backdrop-blur-sm' :
          agent.status === 'on-leave' ? 'bg-yellow-500/40 text-yellow-100 border border-yellow-400/50 backdrop-blur-sm' :
          'bg-gray-500/40 text-gray-100 border border-gray-400/50 backdrop-blur-sm'
         }`}>
          {agent.status?.toUpperCase()}
         </span>
        </div>
       </div>
       {agent.skills?.length > 0 && (
        <div className="mt-4">
         <p className="text-white/70 text-sm mb-2">Skills:</p>
         <div className="flex flex-wrap gap-2">
          {agent.skills.map((skill, index) => (
           <span
            key={index}
            className="bg-blue-600/40 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm border border-blue-400/30"
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
     <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="glass-card rounded-xl shadow-md p-6">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-white/70 text-sm font-medium">Total Jobs</p>
         <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
        </div>
        <div className="w-12 h-12 bg-blue-500/40 rounded-lg flex items-center justify-center border border-blue-400/50">
         <svg className="w-6 h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
         </svg>
        </div>
       </div>
      </div>

      <div className="glass-card rounded-xl shadow-md p-6">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-white/70 text-sm font-medium">In Progress</p>
         <p className="text-3xl font-bold text-blue-300 mt-2">{stats.inProgress}</p>
        </div>
        <div className="w-12 h-12 bg-blue-500/40 rounded-lg flex items-center justify-center border border-blue-400/50">
         <svg className="w-6 h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
         </svg>
        </div>
       </div>
      </div>

      <div className="glass-card rounded-xl shadow-md p-6">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-white/70 text-sm font-medium">To Be Attended</p>
         <p className="text-3xl font-bold text-yellow-300 mt-2">{stats.toBeAttended}</p>
        </div>
        <div className="w-12 h-12 bg-yellow-500/40 rounded-lg flex items-center justify-center border border-yellow-400/50">
         <svg className="w-6 h-6 text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
         </svg>
        </div>
       </div>
      </div>

      <div className="glass-card rounded-xl shadow-md p-6">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-white/70 text-sm font-medium">Completed</p>
         <p className="text-3xl font-bold text-green-300 mt-2">{stats.completed}</p>
        </div>
        <div className="w-12 h-12 bg-green-500/40 rounded-lg flex items-center justify-center border border-green-400/50">
         <svg className="w-6 h-6 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
         </svg>
        </div>
       </div>
      </div>
     </div>

     {/* Service Calls Section */}
     <div className="glass-card rounded-2xl shadow-xl overflow-hidden">
      <div className="px-8 py-6 border-b border-white/20 backdrop-blur-sm bg-white/5">
       <h2 className="glass-heading text-2xl">Service Calls</h2>

       {/* Tabs */}
       <div className="mt-4 flex gap-2 border-b border-white/20">
        <button
         onClick={() => setActiveTab('all')}
         className={`px-4 py-2 font-medium transition -mb-px ${
          activeTab === 'all'
           ? 'text-yellow-300 border-b-2 border-yellow-300'
           : 'text-white/60 hover:text-white'
         }`}
        >
         All ({stats.total})
        </button>
        <button
         onClick={() => setActiveTab('to-attend')}
         className={`px-4 py-2 font-medium transition -mb-px ${
          activeTab === 'to-attend'
           ? 'text-yellow-300 border-b-2 border-yellow-300'
           : 'text-white/60 hover:text-white'
         }`}
        >
         To Attend ({stats.toBeAttended})
        </button>
        <button
         onClick={() => setActiveTab('in-progress')}
         className={`px-4 py-2 font-medium transition -mb-px ${
          activeTab === 'in-progress'
           ? 'text-yellow-300 border-b-2 border-yellow-300'
           : 'text-white/60 hover:text-white'
         }`}
        >
         In Progress ({stats.inProgress})
        </button>
        <button
         onClick={() => setActiveTab('completed')}
         className={`px-4 py-2 font-medium transition -mb-px ${
          activeTab === 'completed'
           ? 'text-yellow-300 border-b-2 border-yellow-300'
           : 'text-white/60 hover:text-white'
         }`}
        >
         Completed ({stats.completed})
        </button>
       </div>
      </div>

      {/* Calls List */}
      <div className="p-8">
       {getFilteredCalls().length === 0 ? (
        <div className="text-center py-12 text-white/70">
         <svg className="w-16 h-16 mx-auto text-white/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
         </svg>
         <p className="text-white">No service calls in this category</p>
        </div>
       ) : (
        <div className="space-y-4">
         {getFilteredCalls().map((call) => (
          <div
           key={call._id}
           className="glass-card border border-white/20 rounded-lg p-6 hover:shadow-md transition"
          >
           <div className="flex justify-between items-start">
            <div className="flex-1">
             <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">
               {call.callNumber}
              </h3>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.status)}`}>
               {call.status}
              </span>
              <span className={`text-sm font-medium ${getPriorityColor(call.priority)}`}>
               {call.priority?.toUpperCase()} Priority
              </span>
             </div>

             <p className="text-white/80 mb-3">{call.description}</p>

             {call.bookingRequest && (
              <div className="mb-4 rounded-lg border border-white/15 bg-white/5 p-4 text-sm text-white/85">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                 <span className="text-white/60">Customer Type:</span>
                 <span className="ml-2 capitalize">{call.bookingRequest.contact?.customerType || 'N/A'}</span>
                </div>
                <div>
                 <span className="text-white/60">Contact:</span>
                 <span className="ml-2">{call.bookingRequest.contact?.contactPerson || 'N/A'}</span>
                </div>
                <div>
                 <span className="text-white/60">Machine Model Number:</span>
                 <span className="ml-2">{call.bookingRequest.generatorDetails?.machineModelNumber || 'N/A'}</span>
                </div>
                <div>
                 <span className="text-white/60">Generator:</span>
                 <span className="ml-2">{call.bookingRequest.generatorDetails?.generatorMakeModel || 'N/A'}</span>
                </div>
                <div>
                 <span className="text-white/60">Service History:</span>
                 <span className="ml-2 capitalize">{(call.bookingRequest.serviceHistoryType || 'N/A').replace('-', ' ')}</span>
                </div>
                <div>
                 <span className="text-white/60">Date of Last Service:</span>
                 <span className="ml-2">
                  {call.bookingRequest.dateOfLastService
                   ? new Date(call.bookingRequest.dateOfLastService).toLocaleDateString()
                   : 'N/A'}
                 </span>
                </div>
                <div>
                 <span className="text-white/60">Preferred Service Date:</span>
                 <span className="ml-2">
                  {call.bookingRequest.preferredDate
                   ? new Date(call.bookingRequest.preferredDate).toLocaleDateString()
                   : 'N/A'}
                 </span>
                </div>
                {call.bookingRequest.generatorDetails?.siteName && (
                 <div className="md:col-span-2">
                  <span className="text-white/60">Site Name:</span>
                  <span className="ml-2">{call.bookingRequest.generatorDetails.siteName}</span>
                 </div>
                )}
                <div className="md:col-span-2">
                 <span className="text-white/60">Administrative Address:</span>
                 <span className="ml-2">{formatStructuredAddress(call.bookingRequest.administrativeAddress)}</span>
                </div>
                <div className="md:col-span-2">
                 <span className="text-white/60">Machine Address:</span>
                 <span className="ml-2">{formatStructuredAddress(call.bookingRequest.machineAddress)}</span>
                </div>
               </div>
              </div>
             )}

             <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
               <span className="text-white/60">Customer:</span>
               <span className="ml-2 font-medium text-white">
                {getCustomerLabel(call)}
               </span>
              </div>
              <div>
               <span className="text-white/60">Scheduled:</span>
               <span className="ml-2 text-white">
                {call.scheduledDate
                 ? new Date(call.scheduledDate).toLocaleDateString()
                 : 'Not scheduled'}
               </span>
              </div>
              {(call.serviceLocation || call.location) && (
               <div className="col-span-2">
                <span className="text-white/60">Location:</span>
                <span className="ml-2 text-white">{call.serviceLocation || call.location}</span>
               </div>
              )}
             </div>
            </div>
           </div>
          </div>
         ))}
        </div>
       )}
      </div>
     </div>
    </div>
   </div>
  </>
 );
};

export default AgentProfile;
