import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';

const FieldServiceAgents = () => {
 const navigate = useNavigate();
 const { user } = useAuth();
 const [agents, setAgents] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [formData, setFormData] = useState({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  employeeId: '',
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
    employeeId: '',
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

 return (
  <>
   <Sidebar />
   <div className="min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-[1200px] mx-auto ">
     {/* Header */}
     <div className="mb-8 flex justify-between items-center">
      <div>
       <h1 className="glass-heading text-3xl text-white">Field Service Agents</h1>
       <p className="text-white/70 mt-1">Manage your service team</p>
      </div>
      <button
       onClick={() => setShowForm(!showForm)}
       className="glass-btn-primary px-6 py-3 flex items-center gap-2"
      >
       + Create Agent
      </button>
     </div>

     {/* Messages */}
     {success && (
      <div className="glass-alert-success mb-4 p-4 rounded-lg bg-green-500/30 text-green-200 border border-green-400/50">
       {success}
      </div>
     )}
     {error && (
      <div className="glass-alert-error mb-4 p-4 rounded-lg bg-red-500/30 text-red-200 border border-red-400/50">
       {error}
      </div>
     )}

     {/* Create Form */}
     {showForm && (
      <div className="glass-form rounded-2xl shadow-xl p-8 mb-8 bg-white/10 backdrop-blur-sm">
       <h2 className="glass-heading text-xl mb-6 text-white">Add New Agent</h2>
       <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-form-group">
         <label className="glass-form-label text-white/90">First Name *</label>
         <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleInputChange}
          required
          className="glass-form-input w-full px-4 py-2 bg-white/20 text-white placeholder-white/50 rounded-lg border border-white/30"
         />
        </div>
        <div className="glass-form-group">
         <label className="glass-form-label text-white/90">Last Name *</label>
         <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleInputChange}
          required
          className="glass-form-input w-full px-4 py-2 bg-white/20 text-white placeholder-white/50 rounded-lg border border-white/30"
         />
        </div>
        <div className="glass-form-group">
         <label className="glass-form-label text-white/90">Employee ID *</label>
         <input
          type="text"
          name="employeeId"
          value={formData.employeeId}
          onChange={handleInputChange}
          required
          className="glass-form-input w-full px-4 py-2 bg-white/20 text-white placeholder-white/50 rounded-lg border border-white/30"
         />
        </div>
        <div className="glass-form-group">
         <label className="glass-form-label text-white/90">Email *</label>
         <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          className="glass-form-input w-full px-4 py-2 bg-white/20 text-white placeholder-white/50 rounded-lg border border-white/30"
         />
        </div>
        <div className="glass-form-group">
         <label className="glass-form-label text-white/90">Phone Number *</label>
         <input
          type="text"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          required
          className="glass-form-input w-full px-4 py-2 bg-white/20 text-white placeholder-white/50 rounded-lg border border-white/30"
         />
        </div>
        <div className="glass-form-group">
         <label className="glass-form-label text-white/90">Status</label>
         <select
          name="status"
          value={formData.status}
          onChange={handleInputChange}
          className="glass-form-select w-full px-4 py-2 bg-white/20 text-white rounded-lg border border-white/30"
         >
          <option value="active" className="bg-blue-900">Active</option>
          <option value="on-leave" className="bg-blue-900">On Leave</option>
          <option value="inactive" className="bg-blue-900">Inactive</option>
         </select>
        </div>
        <div className="glass-form-group">
         <label className="glass-form-label text-white/90">Assigned Area</label>
         <input
          type="text"
          name="assignedArea"
          value={formData.assignedArea}
          onChange={handleInputChange}
          className="glass-form-input w-full px-4 py-2 bg-white/20 text-white placeholder-white/50 rounded-lg border border-white/30"
         />
        </div>
        <div className="glass-form-group">
         <label className="glass-form-label text-white/90">Vehicle Number</label>
         <input
          type="text"
          name="vehicleNumber"
          value={formData.vehicleNumber}
          onChange={handleInputChange}
          className="glass-form-input w-full px-4 py-2 bg-white/20 text-white placeholder-white/50 rounded-lg border border-white/30"
         />
        </div>
        <div className="md:col-span-2 glass-form-group">
         <label className="glass-form-label text-white/90">Skills (comma separated)</label>
         <input
          type="text"
          name="skills"
          value={formData.skills}
          onChange={handleInputChange}
          placeholder="e.g., HVAC, Plumbing, Electrical"
          className="glass-form-input w-full px-4 py-2 bg-white/20 text-white placeholder-white/50 rounded-lg border border-white/30"
         />
        </div>
        <div className="md:col-span-2 glass-form-group">
         <label className="glass-form-label text-white/90">Notes</label>
         <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows="3"
          className="glass-form-textarea w-full px-4 py-2 bg-white/20 text-white placeholder-white/50 rounded-lg border border-white/30"
         />
        </div>
        <div className="md:col-span-2 flex justify-end gap-3">
         <button
          type="button"
          onClick={() => setShowForm(false)}
          className="glass-btn-outline px-6 py-2 bg-white/20 text-white hover:bg-white/30 rounded-lg border border-white/30"
         >
          Cancel
         </button>
         <button
          type="submit"
          className="glass-btn-primary px-6 py-2 bg-yellow-400 text-blue-900 hover:bg-yellow-300 rounded-lg font-semibold"
         >
          Create Agent
         </button>
        </div>
       </form>
      </div>
     )}

     {/* Agents List */}
     <div className="glass-card rounded-2xl shadow-xl overflow-hidden bg-white/10 backdrop-blur-sm">
      {loading ? (
       <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
        <p className="mt-4 text-white/70">Loading agents...</p>
       </div>
      ) : agents.length === 0 ? (
       <div className="p-8 text-center">
        <p className="text-white/70">No agents yet. Click "Add New Agent" to get started.</p>
       </div>
      ) : (
       <div className="overflow-x-auto">
        <table className="w-full">
         <thead className="bg-white/10 border-b border-white/20 backdrop-blur-sm">
          <tr>
           <th className="px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase">Name</th>
           <th className="px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase">Employee ID</th>
           <th className="px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase">Contact</th>
           <th className="px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase">Status</th>
           <th className="px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase">Area</th>
           <th className="px-6 py-3 text-right text-xs font-medium text-yellow-300 uppercase">Actions</th>
          </tr>
         </thead>
         <tbody className="divide-y divide-white/10">
          {agents.map((agent) => (
           <tr 
            key={agent._id} 
            onClick={() => navigate(`/agents/${agent._id}`)}
            className="hover:bg-white/10 cursor-pointer transition backdrop-blur-sm"
           >
            <td className="px-6 py-4 whitespace-nowrap">
             <div className="font-medium text-white">{agent.firstName} {agent.lastName}</div>
             {agent.skills?.length > 0 && (
              <div className="text-sm text-white/60">{agent.skills.join(', ')}</div>
             )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{agent.employeeId}</td>
            <td className="px-6 py-4 whitespace-nowrap">
             <div className="text-sm text-white">{agent.email}</div>
             <div className="text-sm text-white/60">{agent.phoneNumber}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
             <span className={`px-2 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${
              agent.status === 'active' ? 'bg-green-500/30 text-green-200 border border-green-400/50' :
              agent.status === 'on-leave' ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50' :
              'bg-gray-500/30 text-gray-200 border border-gray-400/50'
             }`}>
              {agent.status}
             </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{agent.assignedArea || '-'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
             <button
              onClick={(e) => {
               e.stopPropagation();
               handleDelete(agent._id);
              }}
              className="text-red-300 hover:text-red-100"
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
  </>
 );
};

export default FieldServiceAgents;
