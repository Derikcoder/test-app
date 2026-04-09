import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';

const pageShellClass = 'min-h-screen bg-slate-950 pt-20 pb-8 px-3 sm:px-6 lg:px-8';
const panelClass = 'rounded-2xl border border-slate-700 bg-slate-900/90 shadow-xl';
const inputClass = 'w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30';
const roleLabelMap = {
 superAdmin: 'Super Admin',
 businessAdministrator: 'Business Administrator',
 fieldServiceAgent: 'Field Service Agent',
 customer: 'Customer',
};

const FieldServiceAgents = () => {
 const navigate = useNavigate();
 const { user } = useAuth();
 const isSuperAdmin = user?.role === 'superAdmin' || user?.isSuperUser === true;
 const roleLabel = roleLabelMap[user?.role] || (isSuperAdmin ? 'Super Admin' : 'Platform User');
 const roleToneClass = isSuperAdmin
       ? 'border-fuchsia-700 bg-fuchsia-950 text-fuchsia-200'
       : 'border-cyan-700 bg-cyan-950 text-cyan-200';
 const [agents, setAgents] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [provisionModal, setProvisionModal] = useState(null); // agent object or null
 const [provisionForm, setProvisionForm] = useState({ userName: '' });
 const [provisionLoading, setProvisionLoading] = useState(false);
 const [provisionError, setProvisionError] = useState('');
 const [provisionSuccess, setProvisionSuccess] = useState('');
 const [resendLoadingId, setResendLoadingId] = useState(null);
 const [resendMessage, setResendMessage] = useState({ id: null, text: '', isError: false });
 const [formData, setFormData] = useState({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  skills: '',
  status: 'active',
  assignedArea: '',
  vehicleNumber: '',
  notes: ''
 });

 useEffect(() => {
  fetchAgents();
 }, []);

 const fetchAgents = async () => {
  try {
   const response = await api.get('/agents', {
    headers: { Authorization: `Bearer ${user.token}` }
   });
   setAgents(response.data);
  } catch (err) {
   setError(err.response?.data?.message || 'Failed to fetch agents');
  } finally {
   setLoading(false);
  }
 };

 const handleInputChange = (e) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
 };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  try {
   const dataToSubmit = {
    ...formData,
    skills: formData.skills ? formData.skills.split(',').map(s => s.trim()) : []
   };

   await api.post('/agents', dataToSubmit, {
    headers: { Authorization: `Bearer ${user.token}` }
   });

   setSuccess('Agent created successfully!');
   setFormData({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    skills: '',
    status: 'active',
    assignedArea: '',
    vehicleNumber: '',
    notes: ''
   });
   setShowForm(false);
   fetchAgents();
   setTimeout(() => setSuccess(''), 3000);
  } catch (err) {
   setError(err.response?.data?.message || 'Failed to create agent');
  }
 };

 const handleDelete = async (id) => {
  if (!window.confirm('Are you sure you want to delete this agent?')) return;

  try {
   await api.delete(`/agents/${id}`, {
    headers: { Authorization: `Bearer ${user.token}` }
   });
   setSuccess('Agent deleted successfully!');
   fetchAgents();
   setTimeout(() => setSuccess(''), 3000);
  } catch (err) {
   setError(err.response?.data?.message || 'Failed to delete agent');
  }
 };

 const handleOpenProvisionModal = (agent) => {
  setProvisionModal(agent);
  setProvisionForm({
   userName: `${agent.firstName.toLowerCase()}_${agent.lastName.toLowerCase()}`.replace(/\s+/g, ''),
  });
  setProvisionError('');
  setProvisionSuccess('');
 };

 const handleProvisionSubmit = async (e) => {
  e.preventDefault();
  setProvisionError('');
  setProvisionSuccess('');
  setProvisionLoading(true);
  try {
   await api.post(
    '/auth/admin/provision-user',
    {
     role: 'fieldServiceAgent',
     profileId: provisionModal._id,
     userName: provisionForm.userName,
     email: provisionModal.email,
    },
    { headers: { Authorization: `Bearer ${user.token}` } }
   );
   setProvisionSuccess(`Welcome email sent to ${provisionModal.email}. The agent will set their own password via the link in the email.`);
   fetchAgents();
  } catch (err) {
   setProvisionError(err.response?.data?.message || 'Failed to provision login');
  } finally {
   setProvisionLoading(false);
  }
 };

 const handleResendWelcome = async (agent) => {
  setResendLoadingId(agent._id);
  setResendMessage({ id: null, text: '', isError: false });
  try {
   await api.post(
    `/auth/admin/resend-agent-welcome/${agent._id}`,
    {},
    { headers: { Authorization: `Bearer ${user.token}` } }
   );
   setResendMessage({ id: agent._id, text: `Invitation resent to ${agent.email}.`, isError: false });
   setTimeout(() => setResendMessage({ id: null, text: '', isError: false }), 5000);
  } catch (err) {
   setResendMessage({ id: agent._id, text: err.response?.data?.message || 'Failed to resend invitation.', isError: true });
   setTimeout(() => setResendMessage({ id: null, text: '', isError: false }), 5000);
  } finally {
   setResendLoadingId(null);
  }
 };

 return (
  <>
   <Sidebar />
     <div className={pageShellClass}>
    <div className="max-w-[1200px] mx-auto ">
     {/* Header */}
     <div className="mb-8 flex justify-between items-center">
      <div>
             <h1 className="text-3xl font-bold text-slate-100">Field Service Agents</h1>
             <p className="text-slate-400 mt-1">Manage your service team</p>
      </div>
      <button
       onClick={() => setShowForm(!showForm)}
             className="px-6 py-3 flex items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-950 text-cyan-100 hover:bg-cyan-900 font-semibold"
      >
       + Create Agent
      </button>
     </div>

         <div className="mb-4 flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${roleToneClass}`}>
               Role: {roleLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
               Access Mode: {isSuperAdmin ? 'Directory Governance' : 'Operational Listing'}
              </span>
         </div>

         <div className="mb-6 rounded-xl border border-cyan-800 bg-cyan-950/50 px-4 py-3 text-sm text-cyan-100">
            Entity Focus: Super Admin Directory | Record Type: Field Agent master records
         </div>

     {/* Messages */}
     {success && (
            <div className="mb-4 p-4 rounded-lg bg-emerald-950 text-emerald-200 border border-emerald-700">
       {success}
      </div>
     )}
     {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-950 text-red-200 border border-red-700">
       {error}
      </div>
     )}
     {resendMessage.text && (
      <div className={`mb-4 p-4 rounded-lg border text-sm ${resendMessage.isError ? 'bg-red-950 text-red-200 border-red-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'}`}>
       {resendMessage.text}
      </div>
     )}

     {/* Create Form */}
     {showForm && (
            <div className={`${panelClass} p-8 mb-8`}>
             <h2 className="text-xl font-bold mb-6 text-slate-100">Add New Agent</h2>
       <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-form-group">
                 <label className="dark-label">First Name *</label>
         <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleInputChange}
          required
          className={inputClass}
         />
        </div>
        <div className="glass-form-group">
         <label className="dark-label">Last Name *</label>
         <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleInputChange}
          required
          className={inputClass}
         />
        </div>
        <div className="glass-form-group">
         <label className="dark-label">Email *</label>
         <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          className={inputClass}
         />
        </div>
        <div className="glass-form-group">
         <label className="dark-label">Phone Number *</label>
         <input
          type="text"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          required
          className={inputClass}
         />
        </div>
        <div className="glass-form-group">
         <label className="dark-label">Status</label>
         <select
          name="status"
          value={formData.status}
          onChange={handleInputChange}
          className={inputClass}
         >
          <option value="active" className="bg-slate-900">Active</option>
          <option value="on-leave" className="bg-slate-900">On Leave</option>
          <option value="inactive" className="bg-slate-900">Inactive</option>
         </select>
        </div>
        <div className="glass-form-group">
         <label className="dark-label">Assigned Area</label>
         <input
          type="text"
          name="assignedArea"
          value={formData.assignedArea}
          onChange={handleInputChange}
          className={inputClass}
         />
        </div>
        <div className="glass-form-group">
         <label className="dark-label">Vehicle Number</label>
         <input
          type="text"
          name="vehicleNumber"
          value={formData.vehicleNumber}
          onChange={handleInputChange}
          className={inputClass}
         />
        </div>
        <div className="md:col-span-2 glass-form-group">
         <label className="dark-label">Skills (comma separated)</label>
         <input
          type="text"
          name="skills"
          value={formData.skills}
          onChange={handleInputChange}
          placeholder="e.g., HVAC, Plumbing, Electrical"
          className={inputClass}
         />
        </div>
        <div className="md:col-span-2 glass-form-group">
         <label className="dark-label">Notes</label>
         <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows="3"
          className={inputClass}
         />
        </div>
        <div className="md:col-span-2 flex justify-end gap-3">
         <button
          type="button"
          onClick={() => setShowForm(false)}
          className="px-6 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
         >
          Cancel
         </button>
         <button
          type="submit"
          className="px-6 py-2 rounded-lg border border-cyan-700 bg-cyan-950 text-cyan-100 hover:bg-cyan-900 font-semibold"
         >
          Create Agent
         </button>
        </div>
       </form>
      </div>
     )}

     {/* Agents List */}
         <div className={`${panelClass} overflow-hidden`}>
      {loading ? (
       <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
                <p className="mt-4 text-slate-300">Loading agents...</p>
       </div>
      ) : agents.length === 0 ? (
       <div className="p-8 text-center">
                <p className="text-slate-300">No agents yet. Click "Add New Agent" to get started.</p>
       </div>
      ) : (
       <div className="overflow-x-auto">
        <table className="w-full">
                 <thead className="bg-slate-900 border-b border-slate-700">
          <tr>
                     <th className="th-cyan">Name</th>
                     <th className="th-cyan">Employee ID</th>
                     <th className="th-cyan">Contact</th>
                     <th className="th-cyan">Status</th>
                     <th className="th-cyan">Area</th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-cyan-300 uppercase tracking-wide">Actions</th>
          </tr>
         </thead>
                 <tbody className="divide-y divide-slate-700">
          {agents.map((agent) => (
           <tr 
            key={agent._id} 
            onClick={() => navigate(`/agents/${agent._id}`)}
                        className="hover:bg-slate-800 cursor-pointer transition"
           >
            <td className="px-6 py-4 whitespace-nowrap">
                         <div className="font-medium text-slate-100">{agent.firstName} {agent.lastName}</div>
             {agent.skills?.length > 0 && (
                            <div className="text-sm text-slate-400">{agent.skills.join(', ')}</div>
             )}
            </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{agent.employeeId}</td>
            <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-slate-100">{agent.email}</div>
                         <div className="text-sm text-slate-400">{agent.phoneNumber}</div>
                           <div className="mt-1">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleToneClass}`}>
                             {isSuperAdmin ? 'Admin View' : 'Ops View'}
                            </span>
                           </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
             <span className={`px-2 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${
                            agent.status === 'active' ? 'bg-emerald-950 text-emerald-200 border border-emerald-700' :
                            agent.status === 'on-leave' ? 'bg-amber-950 text-amber-200 border border-amber-700' :
                            'bg-slate-800 text-slate-200 border border-slate-600'
             }`}>
              {agent.status}
             </span>
            </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{agent.assignedArea || '-'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
             {agent.userAccount ? (
              <span className="inline-flex items-center gap-2 mr-3">
               <span className="text-xs text-emerald-400 font-semibold">Login ✓</span>
               <button
                onClick={(e) => { e.stopPropagation(); handleResendWelcome(agent); }}
                disabled={resendLoadingId === agent._id}
                className="text-xs text-cyan-400 hover:text-cyan-200 disabled:opacity-50"
               >
                {resendLoadingId === agent._id ? 'Sending...' : 'Resend Invite'}
               </button>
              </span>
             ) : (
              <button
               onClick={(e) => {
                e.stopPropagation();
                handleOpenProvisionModal(agent);
               }}
               className="mr-3 text-cyan-400 hover:text-cyan-200"
              >
               Provision Login
              </button>
             )}
             <button
              onClick={(e) => {
               e.stopPropagation();
               handleDelete(agent._id);
              }}
                            className="text-red-300 hover:text-red-200"
             >
              Delete
             </button>
            </td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
      )}
     </div>
    </div>
   </div>

  {/* Provision Login Modal */}
  {provisionModal && (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-2xl border border-cyan-700 bg-slate-900 p-8 shadow-2xl mx-4">
     <h2 className="text-xl font-bold text-slate-100 mb-1">Provision Login Credentials</h2>
     <p className="text-sm text-slate-400 mb-6">
      Creating a login account for <span className="text-cyan-300 font-semibold">{provisionModal.firstName} {provisionModal.lastName}</span>
     </p>

     {provisionSuccess ? (
      <div className="mb-4 p-4 rounded-lg bg-emerald-950 text-emerald-200 border border-emerald-700 text-sm">
       <p className="font-semibold mb-1">Account created!</p>
       <p>{provisionSuccess}</p>
       <p className="mt-2 text-emerald-300">The agent will receive a secure link to set their own password. The link expires in 1 hour.</p>
      </div>
     ) : (
      <form onSubmit={handleProvisionSubmit} className="space-y-4">
       <div>
        <label className="dark-label">Email (login email)</label>
        <input
         type="email"
         value={provisionModal.email}
         readOnly
         className={`${inputClass} opacity-60 cursor-not-allowed`}
        />
       </div>
       <div>
        <label className="dark-label">Username *</label>
        <input
         type="text"
         value={provisionForm.userName}
         onChange={(e) => setProvisionForm({ ...provisionForm, userName: e.target.value })}
         required
         className={inputClass}
        />
       </div>
       <p className="text-xs text-slate-400 -mt-2">A secure set-password link will be emailed to the agent. No password required from you.</p>
       {provisionError && (
        <div className="p-3 rounded-lg bg-red-950 text-red-200 border border-red-700 text-sm">{provisionError}</div>
       )}
       <div className="flex justify-end gap-3 pt-2">
        <button
         type="button"
         onClick={() => setProvisionModal(null)}
         className="px-5 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
        >
         Cancel
        </button>
        <button
         type="submit"
         disabled={provisionLoading}
         className="px-5 py-2 rounded-lg border border-cyan-700 bg-cyan-950 text-cyan-100 hover:bg-cyan-900 font-semibold disabled:opacity-50"
        >
         {provisionLoading ? 'Sending...' : 'Send Invitation'}
        </button>
       </div>
      </form>
     )}

     {provisionSuccess && (
      <div className="mt-4 flex justify-end">
       <button
        onClick={() => setProvisionModal(null)}
        className="px-5 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
       >
        Close
       </button>
      </div>
     )}
    </div>
   </div>
  )}
 </>
 );
};

export default FieldServiceAgents;
