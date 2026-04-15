import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';
import {
 DEFAULT_AGENT_CATEGORY,
 VISIBLE_AGENT_CATEGORIES,
 getAllowedSkillsForCategory,
} from '../constants/agentTaxonomy';

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
 const getEmptyFormData = () => ({
  firstName: '',
  lastName: '',
  email: '',
  backupEmail: '',
  phoneNumber: '',
  category: DEFAULT_AGENT_CATEGORY,
  skills: [],
  status: 'active',
  assignedArea: '',
  vehicleNumber: '',
  notes: ''
 });
 const [agents, setAgents] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [editingAgentId, setEditingAgentId] = useState(null);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [provisionModal, setProvisionModal] = useState(null); // agent object or null
 const [provisionForm, setProvisionForm] = useState({ userName: '' });
 const [provisionLoading, setProvisionLoading] = useState(false);
 const [provisionError, setProvisionError] = useState('');
 const [provisionSuccess, setProvisionSuccess] = useState('');
 const [resendLoadingId, setResendLoadingId] = useState(null);
 const [resendMessage, setResendMessage] = useState({ id: null, text: '', isError: false });
 const [categoryFilter, setCategoryFilter] = useState('all');
 const [skillFilter, setSkillFilter] = useState('all');
 const [formData, setFormData] = useState(getEmptyFormData());

 const categorySkills = useMemo(
       () => getAllowedSkillsForCategory(formData.category),
       [formData.category]
 );

 const filterSkillOptions = useMemo(() => {
       if (categoryFilter === 'all') {
        return [...new Set(VISIBLE_AGENT_CATEGORIES.flatMap((category) => getAllowedSkillsForCategory(category)))];
       }
       return getAllowedSkillsForCategory(categoryFilter);
 }, [categoryFilter]);

 const filteredAgents = useMemo(
       () =>
        agents.filter((agent) => {
              const categoryMatches = categoryFilter === 'all' || agent.category === categoryFilter;
              const skillMatches = skillFilter === 'all' || (agent.skills || []).includes(skillFilter);
              return categoryMatches && skillMatches;
        }),
       [agents, categoryFilter, skillFilter]
 );

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
       const { name, value } = e.target;

       if (name === 'category') {
        setFormData({ ...formData, category: value, skills: [] });
        return;
       }

       setFormData({ ...formData, [name]: value });
 };

 const handleSkillToggle = (skill) => {
       setFormData((prev) => {
        const selectedSkills = prev.skills || [];
        const isSelected = selectedSkills.includes(skill);
        return {
              ...prev,
              skills: isSelected
               ? selectedSkills.filter((item) => item !== skill)
               : [...selectedSkills, skill],
        };
       });
 };

 const resetFormState = () => {
  setEditingAgentId(null);
  setFormData(getEmptyFormData());
 };

 const handleEditAgent = (agent) => {
  setEditingAgentId(agent._id);
  setFormData({
   firstName: agent.firstName || '',
   lastName: agent.lastName || '',
   email: agent.email || '',
   backupEmail: agent.backupEmail || '',
   phoneNumber: agent.phoneNumber || '',
   category: agent.category || DEFAULT_AGENT_CATEGORY,
   skills: agent.skills || [],
   status: agent.status || 'active',
   assignedArea: agent.assignedArea || '',
   vehicleNumber: agent.vehicleNumber || '',
   notes: agent.notes || '',
  });
  setError('');
  setSuccess('');
  setShowForm(true);
 };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  try {
   const dataToSubmit = {
    ...formData,
       skills: formData.skills || []
   };

   if (editingAgentId) {
    await api.put(`/agents/${editingAgentId}`, dataToSubmit, {
     headers: { Authorization: `Bearer ${user.token}` }
    });
   } else {
    await api.post('/agents', dataToSubmit, {
     headers: { Authorization: `Bearer ${user.token}` }
    });
   }

   setSuccess(editingAgentId ? 'Agent updated successfully!' : 'Agent created successfully!');
   resetFormState();
   setShowForm(false);
   await fetchAgents();
   setTimeout(() => setSuccess(''), 3000);
  } catch (err) {
   setError(err.response?.data?.message || (editingAgentId ? 'Failed to update agent' : 'Failed to create agent'));
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
       onClick={() => {
        if (showForm) {
         setShowForm(false);
         resetFormState();
         return;
        }
        resetFormState();
        setShowForm(true);
       }}
             className="px-6 py-3 flex items-center gap-2 rounded-lg border border-cyan-700 bg-cyan-950 text-cyan-100 hover:bg-cyan-900 font-semibold"
      >
       {showForm ? 'Close Form' : '+ Create Agent'}
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
             <h2 className="text-xl font-bold mb-6 text-slate-100">{editingAgentId ? 'Edit Agent Details' : 'Add New Agent'}</h2>
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
         <p className="mt-2 text-xs text-slate-400">This email can be updated later if the agent's address changes.</p>
        </div>
        <div className="glass-form-group">
         <label className="dark-label">Backup Recovery Email</label>
         <input
          type="email"
          name="backupEmail"
          value={formData.backupEmail || ''}
          onChange={handleInputChange}
          placeholder="Optional personal recovery email"
          className={inputClass}
         />
         <p className="mt-2 text-xs text-slate-400">Optional personal email for account recovery purposes. It should be different from the main login email.</p>
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
        <div className="glass-form-group">
         <label className="dark-label">Category *</label>
         <select
          name="category"
          value={formData.category}
          onChange={handleInputChange}
          required
          className={inputClass}
         >
          {VISIBLE_AGENT_CATEGORIES.map((category) => (
           <option key={category} value={category} className="bg-slate-900">{category}</option>
          ))}
         </select>
         <p className="mt-2 text-xs text-slate-400">Starter categories are loaded here, including Multi-Disciplinary for cross-sector agents with valuable mixed skillsets.</p>
        </div>
        <div className="md:col-span-2 glass-form-group">
         <label className="dark-label">Skills (select all that apply)</label>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border border-slate-600 bg-slate-950 p-3 max-h-64 overflow-y-auto">
          {categorySkills.map((skill) => (
           <label key={skill} className="flex items-center gap-2 text-sm text-slate-200">
            <input
             type="checkbox"
             checked={(formData.skills || []).includes(skill)}
             onChange={() => handleSkillToggle(skill)}
             className="form-checkbox-dark"
            />
            <span>{skill}</span>
           </label>
          ))}
         </div>
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
          onClick={() => {
           setShowForm(false);
           resetFormState();
          }}
          className="px-6 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
         >
          Cancel
         </button>
         <button
          type="submit"
          className="px-6 py-2 rounded-lg border border-cyan-700 bg-cyan-950 text-cyan-100 hover:bg-cyan-900 font-semibold"
         >
          {editingAgentId ? 'Save Changes' : 'Create Agent'}
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
                            <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/70 flex flex-wrap gap-3">
                             <select
                                   value={categoryFilter}
                                   onChange={(e) => {
                                    setCategoryFilter(e.target.value);
                                    setSkillFilter('all');
                                   }}
                                   className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                             >
                                   <option value="all">All Categories</option>
                                   {VISIBLE_AGENT_CATEGORIES.map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                   ))}
                             </select>
                             <select
                                   value={skillFilter}
                                   onChange={(e) => setSkillFilter(e.target.value)}
                                   className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                             >
                                   <option value="all">All Skills</option>
                                   {filterSkillOptions.map((skill) => (
                                    <option key={skill} value={skill}>{skill}</option>
                                   ))}
                             </select>
                            </div>
        <table className="w-full">
                 <thead className="bg-slate-900 border-b border-slate-700">
          <tr>
                     <th className="th-cyan">Employee ID</th>
                     <th className="th-cyan">Name</th>
                     <th className="th-cyan">Category</th>
                     <th className="th-cyan">Skills</th>
                     <th className="th-cyan">Contact</th>
                     <th className="th-cyan">Status</th>
                     <th className="th-cyan">Area</th>
                     <th className="th-cyan">Jobs Completed</th>
                     <th className="th-cyan">Jobs In Progress</th>
                     <th className="th-cyan">Quotes Awaiting Approval</th>
                     <th className="th-cyan">Average Service Rating</th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-cyan-300 uppercase tracking-wide">Actions</th>
          </tr>
         </thead>
                 <tbody className="divide-y divide-slate-700">
          {filteredAgents.map((agent) => (
           <tr 
            key={agent._id} 
            onClick={() => navigate(`/agents/${agent._id}`)}
                        className="hover:bg-slate-800 cursor-pointer transition"
           >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{agent.employeeId}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                           <div className="font-medium text-slate-100">{agent.firstName} {agent.lastName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{agent.category || 'Uncategorized'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{agent.skills?.length ? agent.skills.join(', ') : '-'}</td>
            <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-slate-100">{agent.email}</div>
                         {agent.backupEmail ? <div className="text-xs text-amber-300">Backup: {agent.backupEmail}</div> : null}
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
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{agent.jobsCompleted ?? agent.totalJobsAttended ?? 0}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{agent.jobsInProgress ?? 0}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{agent.quotesAwaitingApproval ?? 0}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{Number(agent.averageRating || 0).toFixed(2)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
             <button
              onClick={(e) => {
               e.stopPropagation();
               handleEditAgent(agent);
              }}
              className="mr-3 text-amber-300 hover:text-amber-200"
             >
              Edit
             </button>
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
       {!filteredAgents.length && (
        <div className="p-6 text-center text-sm text-slate-400">
         No agents match the selected category/skill filters.
        </div>
       )}
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
