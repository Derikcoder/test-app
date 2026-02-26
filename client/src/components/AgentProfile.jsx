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
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'open':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading agent profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !agent) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error || 'Agent not found'}
            </div>
            <button
              onClick={() => navigate('/agents')}
              className="mt-4 text-indigo-600 hover:text-indigo-800"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate('/agents')}
            className="mb-6 flex items-center text-indigo-600 hover:text-indigo-800 transition"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Agents
          </button>

          {/* Agent Profile Header */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-8 py-6">
              <div className="flex items-center gap-6">
                {/* Profile Picture */}
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-indigo-600 text-3xl font-bold shadow-lg">
                  {agent.firstName?.[0]}{agent.lastName?.[0]}
                </div>
                
                {/* Agent Info */}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white">
                    {agent.firstName} {agent.lastName}
                  </h1>
                  <p className="text-indigo-100 mt-1">Employee ID: {agent.employeeId}</p>
                  <div className="mt-2 flex gap-4 text-indigo-100">
                    <span>📧 {agent.email}</span>
                    <span>📱 {agent.phoneNumber}</span>
                  </div>
                  {agent.assignedArea && (
                    <p className="text-indigo-100 mt-1">📍 Area: {agent.assignedArea}</p>
                  )}
                </div>

                {/* Status Badge */}
                <div>
                  <span className={`px-4 py-2 text-sm font-semibold rounded-full ${
                    agent.status === 'active' ? 'bg-green-500 text-white' :
                    agent.status === 'on-leave' ? 'bg-yellow-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {agent.status?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Skills */}
              {agent.skills?.length > 0 && (
                <div className="mt-4">
                  <p className="text-indigo-100 text-sm mb-2">Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {agent.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-indigo-500 bg-opacity-50 text-white px-3 py-1 rounded-full text-sm"
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
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Jobs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.inProgress}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">To Be Attended</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.toBeAttended}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Service Calls Section */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Service Calls</h2>
              
              {/* Tabs */}
              <div className="mt-4 flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 font-medium transition -mb-px ${
                    activeTab === 'all'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setActiveTab('to-attend')}
                  className={`px-4 py-2 font-medium transition -mb-px ${
                    activeTab === 'to-attend'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  To Attend ({stats.toBeAttended})
                </button>
                <button
                  onClick={() => setActiveTab('in-progress')}
                  className={`px-4 py-2 font-medium transition -mb-px ${
                    activeTab === 'in-progress'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  In Progress ({stats.inProgress})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-4 py-2 font-medium transition -mb-px ${
                    activeTab === 'completed'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Completed ({stats.completed})
                </button>
              </div>
            </div>

            {/* Calls List */}
            <div className="p-8">
              {getFilteredCalls().length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>No service calls in this category</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredCalls().map((call) => (
                    <div
                      key={call._id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {call.callNumber}
                            </h3>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.status)}`}>
                              {call.status}
                            </span>
                            <span className={`text-sm font-medium ${getPriorityColor(call.priority)}`}>
                              {call.priority?.toUpperCase()} Priority
                            </span>
                          </div>
                          
                          <p className="text-gray-700 mb-3">{call.description}</p>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Customer:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {call.customer?.businessName || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Scheduled:</span>
                              <span className="ml-2 text-gray-900">
                                {call.scheduledDate 
                                  ? new Date(call.scheduledDate).toLocaleDateString()
                                  : 'Not scheduled'}
                              </span>
                            </div>
                            {call.location && (
                              <div className="col-span-2">
                                <span className="text-gray-500">Location:</span>
                                <span className="ml-2 text-gray-900">{call.location}</span>
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
