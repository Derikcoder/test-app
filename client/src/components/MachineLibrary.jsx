/**
 * @file MachineLibrary.jsx
 * @description Machine library view for service agents
 * Shows all machines an agent has worked on with service history and quick actions
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const MachineLibrary = () => {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineHistory, setMachineHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch machines for current agent
  const fetchMachines = async (category = 'all') => {
    try {
      setLoading(true);
      setError('');

      let url = '/api/machines';
      if (category !== 'all') {
        url = `/api/machines/category/${category}`;
      }

      const response = await api.get(url, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      setMachines(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch machines');
      setMachines([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch service history for selected machine
  const fetchMachineHistory = async (machineId) => {
    try {
      setHistoryLoading(true);
      const response = await api.get(`/api/machines/${machineId}/service-history`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setMachineHistory(response.data || []);
    } catch (err) {
      setMachineHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.token) return;
    fetchMachines(selectedCategory);
  }, [selectedCategory, user?.token]);

  const handleSelectMachine = (machine) => {
    setSelectedMachine(machine);
    fetchMachineHistory(machine._id);
  };

  const handleCloseModal = () => {
    setSelectedMachine(null);
    setMachineHistory([]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategories = () => {
    const uniqueCategories = [...new Set(machines.map((m) => m.serviceCategory))];
    return uniqueCategories;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="executive-title">My Machines</h1>
          <p className="executive-subtitle mt-2">
            Track all machines you've serviced and view service history
          </p>
        </div>

        {/* Category Filter */}
        {getCategories().length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              All Categories ({machines.length})
            </button>
            {getCategories().map((category) => {
              const count = machines.filter((m) => m.serviceCategory === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
            <p className="mt-4 text-slate-600">Loading machines...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && machines.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 text-lg mb-4">No machines found</p>
            <p className="text-slate-500">
              Machines will appear here once you service your first one
            </p>
          </div>
        )}

        {/* Machines Grid */}
        {!loading && !error && machines.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {machines.map((machine) => (
              <div
                key={machine._id}
                onClick={() => handleSelectMachine(machine)}
                className="glass-card cursor-pointer hover:shadow-xl transition-all group"
              >
                <div className="p-6">
                  {/* Machine Type & Category */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      {machine.serviceCategory}
                    </div>
                    <h3 className="glass-heading text-lg mt-1">{machine.machineType}</h3>
                  </div>

                  {/* Machine Specs */}
                  <div className="space-y-2 mb-4 text-sm">
                    {machine.generatorMakeModel && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Make:</span>
                        <span className="font-medium text-slate-900">{machine.generatorMakeModel}</span>
                      </div>
                    )}
                    {machine.machineModelNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Model:</span>
                        <span className="font-medium text-slate-900">{machine.machineModelNumber}</span>
                      </div>
                    )}
                    {machine.generatorCapacityKva && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Capacity:</span>
                        <span className="font-medium text-slate-900">{machine.generatorCapacityKva} kVA</span>
                      </div>
                    )}
                    {machine.siteName && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Site:</span>
                        <span className="font-medium text-slate-900">{machine.siteName}</span>
                      </div>
                    )}
                  </div>

                  {/* Service Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-slate-200">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{machine.serviceCount}</div>
                      <div className="text-xs text-slate-600">Services</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-600 uppercase">Last Service</div>
                      <div className="text-sm font-medium text-slate-900">
                        {formatDate(machine.lastServicedAt)}
                      </div>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors group-hover:shadow-md">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Machine Details Modal */}
      {selectedMachine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{selectedMachine.machineType}</h2>
                <p className="text-blue-100 text-sm mt-1">{selectedMachine.serviceCategory}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-white hover:bg-blue-800 rounded-full p-2 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Machine Details */}
              <div className="mb-6">
                <h3 className="font-bold text-lg text-slate-900 mb-4">Machine Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedMachine.generatorMakeModel && (
                    <div>
                      <div className="text-slate-600">Make/Model</div>
                      <div className="font-medium">{selectedMachine.generatorMakeModel}</div>
                    </div>
                  )}
                  {selectedMachine.machineModelNumber && (
                    <div>
                      <div className="text-slate-600">Model Number</div>
                      <div className="font-medium">{selectedMachine.machineModelNumber}</div>
                    </div>
                  )}
                  {selectedMachine.generatorCapacityKva && (
                    <div>
                      <div className="text-slate-600">Capacity</div>
                      <div className="font-medium">{selectedMachine.generatorCapacityKva} kVA</div>
                    </div>
                  )}
                  {selectedMachine.siteName && (
                    <div>
                      <div className="text-slate-600">Site Name</div>
                      <div className="font-medium">{selectedMachine.siteName}</div>
                    </div>
                  )}
                  {selectedMachine.serialNumber && (
                    <div>
                      <div className="text-slate-600">Serial Number</div>
                      <div className="font-medium">{selectedMachine.serialNumber}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-slate-600">Services Performed</div>
                    <div className="font-medium">{selectedMachine.serviceCount}</div>
                  </div>
                  <div>
                    <div className="text-slate-600">Last Serviced</div>
                    <div className="font-medium">{formatDate(selectedMachine.lastServicedAt)}</div>
                  </div>
                </div>
                {selectedMachine.notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <div className="text-sm font-semibold text-slate-700 mb-1">Notes</div>
                    <div className="text-sm text-slate-600">{selectedMachine.notes}</div>
                  </div>
                )}
              </div>

              {/* Service History */}
              <div>
                <h3 className="font-bold text-lg text-slate-900 mb-4">Service History</h3>

                {historyLoading && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin h-6 w-6 border-3 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}

                {!historyLoading && machineHistory.length === 0 && (
                  <p className="text-slate-600 text-sm">No service history yet</p>
                )}

                {!historyLoading && machineHistory.length > 0 && (
                  <div className="space-y-4">
                    {machineHistory.map((service, idx) => (
                      <div key={service._id || idx} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-slate-900">{service.serviceType}</div>
                            <div className="text-xs text-slate-600">
                              {formatDate(service.servicedAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-blue-600">
                              R{service.totalServiceCost?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        </div>

                        {service.servicesPerformed && (
                          <div className="text-sm text-slate-700 mb-2">
                            <strong>Work:</strong> {service.servicesPerformed}
                          </div>
                        )}

                        {service.issuesFound && (
                          <div className="text-sm text-red-600 mb-2">
                            <strong>Issues:</strong> {service.issuesFound}
                          </div>
                        )}

                        {service.partsUsed && service.partsUsed.length > 0 && (
                          <div className="text-sm">
                            <strong>Parts Used:</strong>
                            <div className="mt-1 space-y-1">
                              {service.partsUsed.map((part, partIdx) => (
                                <div key={partIdx} className="text-slate-600">
                                  • {part.description} ({part.quantity}x) - {part.actualBrand || part.brand}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {service.recommendations && (
                          <div className="text-sm text-slate-700 mt-2 p-2 bg-blue-50 rounded">
                            <strong>Recommendations:</strong> {service.recommendations}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineLibrary;
