/**
 * @file MachineSelector.jsx
 * @description Machine selection component for ServiceCallRegistration
 * Allows agents to select existing machines and auto-fill equipment details
 */

import { useEffect, useState } from 'react';
import api from '../api/axios';

const MachineSelector = ({ 
  userToken, 
  serviceCategory, 
  onMachineSelected, 
  onMachineDeselected,
  selectedMachineId 
}) => {
  const [machines, setMachines] = useState([]);
  const [filteredMachines, setFilteredMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [quotationTemplate, setQuotationTemplate] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Fetch machines for current agent
  const fetchMachines = async () => {
    try {
      setLoading(true);
      const url = serviceCategory 
        ? `/api/machines/category/${serviceCategory}`
        : '/api/machines';
      
      const response = await api.get(url, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      
      setMachines(response.data || []);
      filterMachinesByCategory(response.data || [], serviceCategory);
    } catch (err) {
      console.error('Error fetching machines:', err);
      setMachines([]);
      setFilteredMachines([]);
    } finally {
      setLoading(false);
    }
  };

  const filterMachinesByCategory = (allMachines, category) => {
    if (!category) {
      setFilteredMachines(allMachines);
      return;
    }
    
    const filtered = allMachines.filter((m) => m.serviceCategory === category);
    setFilteredMachines(filtered);
  };

  // Fetch quotation template from last service
  const fetchQuotationTemplate = async (machineId) => {
    try {
      setTemplateLoading(true);
      const response = await api.get(
        `/api/machines/${machineId}/quotation-template`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setQuotationTemplate(response.data);
    } catch (err) {
      console.error('Error fetching quotation template:', err);
      setQuotationTemplate(null);
    } finally {
      setTemplateLoading(false);
    }
  };

  useEffect(() => {
    if (!userToken) return;
    fetchMachines();
  }, [userToken, serviceCategory]);

  const handleSelectMachine = async (machine) => {
    setSelectedMachine(machine);
    setShowSelector(false);
    
    // Fetch quotation template
    await fetchQuotationTemplate(machine._id);
    
    // Notify parent
    onMachineSelected({
      machineId: machine._id,
      machine,
      quotationTemplate,
    });
  };

  const handleDeselect = () => {
    setSelectedMachine(null);
    setQuotationTemplate(null);
    setShowSelector(false);
    onMachineDeselected();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <label className="dark-label">Select Existing Machine (Optional)</label>
        {selectedMachine && (
          <button
            type="button"
            onClick={handleDeselect}
            className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Selected Machine Display */}
      {selectedMachine && (
        <div className="glass-card machine-selector-panel">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-bold text-slate-900">{selectedMachine.machineType}</h4>
              <p className="text-sm text-slate-600">{selectedMachine.serviceCategory}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{selectedMachine.serviceCount}</div>
              <div className="text-xs text-slate-600">services</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            {selectedMachine.generatorMakeModel && (
              <div>
                <span className="text-slate-600">Make:</span>{' '}
                <span className="font-medium">{selectedMachine.generatorMakeModel}</span>
              </div>
            )}
            {selectedMachine.machineModelNumber && (
              <div>
                <span className="text-slate-600">Model:</span>{' '}
                <span className="font-medium">{selectedMachine.machineModelNumber}</span>
              </div>
            )}
            {selectedMachine.generatorCapacityKva && (
              <div>
                <span className="text-slate-600">Capacity:</span>{' '}
                <span className="font-medium">{selectedMachine.generatorCapacityKva} kVA</span>
              </div>
            )}
            {selectedMachine.siteName && (
              <div>
                <span className="text-slate-600">Site:</span>{' '}
                <span className="font-medium">{selectedMachine.siteName}</span>
              </div>
            )}
          </div>

          {selectedMachine.notes && (
            <div className="text-sm bg-slate-100 p-2 rounded mb-3">
              <strong>Notes:</strong> {selectedMachine.notes}
            </div>
          )}

          <div className="text-xs text-slate-600">
            Last serviced: <strong>{formatDate(selectedMachine.lastServicedAt)}</strong>
          </div>
        </div>
      )}

      {/* Quotation Template Display */}
      {selectedMachine && quotationTemplate && !templateLoading && (
        <div className="glass-card mb-4 p-4 bg-blue-50 border border-blue-200">
          <h5 className="font-bold text-slate-900 mb-3">Last Service Summary</h5>
          
          <div className="space-y-3 text-sm">
            {quotationTemplate.lastService?.date && (
              <div className="machine-kv-row">
                <span className="text-slate-600">Service Date:</span>
                <span className="font-medium">{formatDate(quotationTemplate.lastService.date)}</span>
              </div>
            )}
            
            {quotationTemplate.lastService?.labourHours && (
              <div className="machine-kv-row">
                <span className="text-slate-600">Labour Hours:</span>
                <span className="font-medium">{quotationTemplate.lastService.labourHours} hrs</span>
              </div>
            )}

            {quotationTemplate.suggestedCosts && (
              <>
                <div className="machine-kv-row">
                  <span className="text-slate-600">Last Labour Cost:</span>
                  <span className="font-medium">
                    R{quotationTemplate.suggestedCosts.labour?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="machine-kv-row">
                  <span className="text-slate-600">Last Parts Cost:</span>
                  <span className="font-medium">
                    R{quotationTemplate.suggestedCosts.parts?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </>
            )}

            {quotationTemplate.lastService?.partsUsed && quotationTemplate.lastService.partsUsed.length > 0 && (
              <div>
                <div className="font-semibold text-slate-700 mb-2">Parts Used Previously:</div>
                <div className="space-y-1">
                  {quotationTemplate.lastService.partsUsed.map((part, idx) => (
                    <div key={idx} className="text-slate-600 text-xs">
                      • {part.description} ({part.quantity}x)
                      {part.actualBrand && <span> - {part.actualBrand}</span>}
                      {part.availabilityNote && (
                        <span className="text-orange-600"> [{part.availabilityNote}]</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {quotationTemplate.note && (
            <div className="text-xs text-slate-600 mt-3 italic border-t pt-3">
              {quotationTemplate.note}
            </div>
          )}
        </div>
      )}

      {selectedMachine && templateLoading && (
        <div className="text-center py-6">
          <div className="machine-loader-spinner"></div>
          <p className="machine-loader-text">Loading quotation template...</p>
        </div>
      )}

      {/* Machine Selector Toggle */}
      {!selectedMachine && (
        <button
          type="button"
          onClick={() => setShowSelector(!showSelector)}
          className="dark-field-input w-full text-left px-4 py-3 bg-slate-800 border-2 border-cyan-400 rounded-lg hover:border-cyan-300 transition-colors"
        >
          {filteredMachines.length > 0
            ? `+ Select from ${filteredMachines.length} available machines`
            : '+ No machines available for this category'}
        </button>
      )}

      {/* Machine Selector Dropdown */}
      {showSelector && !selectedMachine && (
        <div className="glass-card machine-selector-panel">
          {loading && (
            <div className="text-center py-6">
              <div className="machine-loader-spinner"></div>
              <p className="machine-loader-text">Loading machines...</p>
            </div>
          )}

          {!loading && filteredMachines.length === 0 && (
            <div className="text-center py-4">
              <p className="text-slate-600">No machines available for this service category</p>
            </div>
          )}

          {!loading && filteredMachines.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredMachines.map((machine) => (
                <button
                  key={machine._id}
                  type="button"
                  onClick={() => handleSelectMachine(machine)}
                  className="w-full text-left p-3 border border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-semibold text-slate-900">{machine.machineType}</h5>
                      {machine.generatorMakeModel && (
                        <p className="text-xs text-slate-600">{machine.generatorMakeModel}</p>
                      )}
                      {machine.siteName && (
                        <p className="text-xs text-slate-600">📍 {machine.siteName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{machine.serviceCount}</div>
                      <div className="text-xs text-slate-600">services</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowSelector(false)}
            className="w-full mt-3 px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default MachineSelector;
