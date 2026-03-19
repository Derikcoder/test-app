import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const TEMPLATE_OPTIONS = [
  { value: 'auto', label: 'Auto (from machine/service data)' },
  { value: 'perkins', label: 'Perkins Template' },
  { value: 'cummins', label: 'Cummins Template' },
  { value: 'emergency', label: 'Emergency Repair Template' },
  { value: 'generic', label: 'Generic Service Template' },
];

const getTemplateLineItemsByType = (templateType) => {
  switch (templateType) {
    case 'perkins':
      return [
        { description: 'Perkins service kit and filters', quantity: 1, unitPrice: 1850 },
        { description: 'Engine oil replacement and disposal', quantity: 1, unitPrice: 1250 },
        { description: 'Load test and diagnostics report', quantity: 1, unitPrice: 1450 },
      ];
    case 'cummins':
      return [
        { description: 'Cummins preventive service kit', quantity: 1, unitPrice: 2100 },
        { description: 'Cooling and fuel system checks', quantity: 1, unitPrice: 1350 },
        { description: 'Controller diagnostics and tuning', quantity: 1, unitPrice: 1650 },
      ];
    case 'emergency':
      return [
        { description: 'Emergency call-out labor', quantity: 2, unitPrice: 950 },
        { description: 'Fault finding and root-cause analysis', quantity: 1, unitPrice: 1400 },
        { description: 'Temporary restoration and safety checks', quantity: 1, unitPrice: 950 },
      ];
    case 'generic':
    default:
      return [
        { description: 'Generator inspection and diagnostics', quantity: 1, unitPrice: 1100 },
        { description: 'Preventive service labor', quantity: 2, unitPrice: 850 },
        { description: 'Consumables and replacement filters', quantity: 1, unitPrice: 950 },
      ];
  }
};

const getSuggestedTemplateLineItems = ({ machineModelNumber = '', serviceType = '' }) => {
  const model = String(machineModelNumber).toLowerCase();
  const type = String(serviceType).toLowerCase();

  if (model.includes('perkins')) {
    return getTemplateLineItemsByType('perkins');
  }

  if (model.includes('cummins')) {
    return getTemplateLineItemsByType('cummins');
  }

  if (type.includes('emergency')) {
    return getTemplateLineItemsByType('emergency');
  }

  return getTemplateLineItemsByType('generic');
};

/**
 * Reusable quote creation modal.
 * Can be used from superAdmin workflows and customer-oriented workflows.
 */
const CreateQuoteModal = ({
  token,
  sourceData = {},
  triggerLabel = 'Create Quote',
  triggerClassName = 'glass-btn-primary font-semibold py-2 px-4',
  onCreated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('auto');

  const canUseServiceCallShortcut = Boolean(sourceData?.serviceCallId && sourceData?.customerId);
  const machineTemplateSource = sourceData?.machineModelNumber || sourceData?.generatorMakeModel || '';

  const initialLineItems = useMemo(
    () => sourceData?.lineItems?.length
      ? sourceData.lineItems
      : [{ partNumber: '', description: sourceData?.serviceType || 'Service Item', quantity: 1, unitPrice: 0 }],
    [sourceData]
  );

  const [formData, setFormData] = useState({
    customerId: sourceData.customerId || '',
    siteId: sourceData.siteId || '',
    equipmentId: sourceData.equipmentId || '',
    serviceType: sourceData.serviceType || 'Preventive Maintenance',
    title: sourceData.title || 'Service Quotation',
    description: sourceData.description || '',
    validUntil: sourceData.validUntil || '',
    vatRate: sourceData.vatRate ?? 15,
    labourHours: sourceData.labourHours ?? 0,
    labourRate: sourceData.labourRate ?? 650,
    travellingCost: sourceData.travellingCost ?? 8.5,
    consumablesRate: sourceData.consumablesRate ?? 2,
    notes: sourceData.notes || '',
    terms: sourceData.terms || 'Payment due within 30 days. Quotation valid for 30 days from date of issue.',
    lineItems: initialLineItems,
  });

  useEffect(() => {
    if (!isOpen || !token) return;

    const fetchCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const response = await api.get('/customers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCustomers(response.data || []);
      } catch {
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, [isOpen, token]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      customerId: sourceData.customerId || prev.customerId,
      siteId: sourceData.siteId || prev.siteId,
      equipmentId: sourceData.equipmentId || prev.equipmentId,
      serviceType: sourceData.serviceType || prev.serviceType,
      title: sourceData.title || prev.title,
      description: sourceData.description || prev.description,
      notes: sourceData.notes || prev.notes,
      lineItems: sourceData?.lineItems?.length ? sourceData.lineItems : prev.lineItems,
    }));
  }, [sourceData]);

  const applySuggestedTemplate = () => {
    const suggested = selectedTemplate === 'auto'
      ? getSuggestedTemplateLineItems({
          machineModelNumber: machineTemplateSource,
          serviceType: formData.serviceType,
        })
      : getTemplateLineItemsByType(selectedTemplate);

    setFormData((prev) => ({
      ...prev,
      lineItems: suggested,
    }));
  };

  const closeModal = () => {
    setIsOpen(false);
    setError('');
    setSuccess('');
  };

  const updateLineItem = (index, key, value) => {
    setFormData((prev) => {
      const nextItems = [...prev.lineItems];
      nextItems[index] = {
        ...nextItems[index],
        [key]: (key === 'description' || key === 'partNumber') ? value : Number(value),
      };
      return { ...prev, lineItems: nextItems };
    });
  };

  const addLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { partNumber: '', description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeLineItem = (index) => {
    setFormData((prev) => {
      if (prev.lineItems.length <= 1) return prev;
      return {
        ...prev,
        lineItems: prev.lineItems.filter((_, idx) => idx !== index),
      };
    });
  };

  const totals = useMemo(() => {
    const partsCost = formData.lineItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return sum + (quantity * unitPrice);
    }, 0);

    const labourHours = Number(formData.labourHours) || 0;
    const labourRate = Number(formData.labourRate) || 0;
    const travellingCost = Number(formData.travellingCost) || 0;
    const consumablesRate = Number(formData.consumablesRate) || 0;

    const labourCost = labourHours * labourRate;
    const halfLabourThreshold = labourCost * 0.5;
    const consumablesCost = partsCost > halfLabourThreshold
      ? partsCost * (consumablesRate / 100)
      : partsCost * (consumablesRate / 100);
    const subtotal = partsCost + labourCost + travellingCost + consumablesCost;

    const vatRate = Number(formData.vatRate) || 0;
    const vatAmount = subtotal * (vatRate / 100);
    const totalAmount = subtotal + vatAmount;

    return {
      partsCost: partsCost.toFixed(2),
      labourCost: labourCost.toFixed(2),
      travellingCost: travellingCost.toFixed(2),
      consumablesCost: consumablesCost.toFixed(2),
      halfLabourThreshold: halfLabourThreshold.toFixed(2),
      subtotal: subtotal.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };
  }, [
    formData.lineItems,
    formData.labourHours,
    formData.labourRate,
    formData.travellingCost,
    formData.consumablesRate,
    formData.vatRate,
  ]);

  const validate = () => {
    if (!formData.customerId && !canUseServiceCallShortcut) return 'Please select a customer.';
    if (!formData.serviceType.trim()) return 'Service type is required.';
    if (!formData.title.trim()) return 'Title is required.';
    if (!formData.lineItems.length) return 'At least one line item is required.';

    const hasInvalid = formData.lineItems.some(
      (item) => !item.description?.trim() || Number(item.quantity) <= 0 || Number(item.unitPrice) < 0
    );

    if (hasInvalid) {
      return 'Each line item must include description, quantity > 0, and unit price >= 0.';
    }

    if (Number(formData.labourHours) < 0) return 'Labour hours cannot be negative.';
    if (Number(formData.labourRate) < 0) return 'Labour rate cannot be negative.';
    if (Number(formData.travellingCost) < 0) return 'Travelling cost cannot be negative.';
    if (Number(formData.consumablesRate) < 0) return 'Consumables rate cannot be negative.';

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        serviceType: formData.serviceType,
        title: formData.title,
        description: formData.description,
        lineItems: formData.lineItems.map((item) => ({
          partNumber: item.partNumber?.trim() || undefined,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        vatRate: Number(formData.vatRate) || 15,
        labourHours: Number(formData.labourHours) || 0,
        labourRate: Number(formData.labourRate) || 650,
        travellingCost: Number(formData.travellingCost) || 8.5,
        consumablesRate: Number(formData.consumablesRate) || 2,
        validUntil: formData.validUntil || undefined,
        notes: formData.notes,
        terms: formData.terms,
      };

      let response;
      if (canUseServiceCallShortcut) {
        response = await api.post(
          `/quotations/from-service-call/${sourceData.serviceCallId}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        response = await api.post(
          '/quotations',
          {
            ...payload,
            customer: formData.customerId,
            siteId: formData.siteId || undefined,
            equipment: formData.equipmentId || undefined,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      setSuccess(`Quotation ${response.data?.quotationNumber || ''} created successfully.`.trim());
      if (onCreated) onCreated(response.data);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Failed to create quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-card w-full max-w-4xl rounded-2xl border border-white/20 bg-slate-900/85 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="glass-heading-secondary">Create Quote</h2>
              <button type="button" onClick={closeModal} className="text-white/80 hover:text-white">Close</button>
            </div>

            {error ? <div className="mb-4 rounded-lg border border-red-300/50 bg-red-500/20 px-4 py-2 text-white">{error}</div> : null}
            {success ? <div className="mb-4 rounded-lg border border-emerald-300/50 bg-emerald-500/20 px-4 py-2 text-white">{success}</div> : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="glass-form-label text-white/90">Customer</label>
                  <select
                    value={formData.customerId}
                    onChange={(event) => setFormData((prev) => ({ ...prev, customerId: event.target.value }))}
                    className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                    disabled={loadingCustomers}
                    required
                  >
                    <option value="" className="text-black">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id} className="text-black">
                        {customer.businessName || `${customer.contactFirstName || ''} ${customer.contactLastName || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="glass-form-label text-white/90">Service Type</label>
                  <input
                    value={formData.serviceType}
                    onChange={(event) => setFormData((prev) => ({ ...prev, serviceType: event.target.value }))}
                    className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="glass-form-label text-white/90">Title</label>
                  <input
                    value={formData.title}
                    onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="glass-form-label text-white/90">Description / Scope</label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                    className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="glass-form-label text-white/90">Template</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={selectedTemplate}
                      onChange={(event) => setSelectedTemplate(event.target.value)}
                      className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                    >
                      {TEMPLATE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="text-black">
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={applySuggestedTemplate}
                      className="glass-btn-secondary px-4 py-3 text-sm font-semibold"
                    >
                      Apply Selected Template
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">Parts</h3>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={addLineItem} className="glass-btn-secondary px-3 py-2 text-sm font-semibold">Add Item</button>
                  </div>
                </div>

                <p className="text-xs text-white/70">
                  Add each part as a separate line item. Labour, consumables, and travel are calculated separately below.
                </p>

                {formData.lineItems.map((item, index) => (
                  <div key={`line-item-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-3">
                      <label className="glass-form-label text-white/80">Part Number (Optional)</label>
                      <input
                        value={item.partNumber || ''}
                        onChange={(event) => updateLineItem(index, 'partNumber', event.target.value)}
                        className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                        placeholder="e.g. A-7003"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="glass-form-label text-white/80">Description</label>
                      <input
                        value={item.description}
                        onChange={(event) => updateLineItem(index, 'description', event.target.value)}
                        className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="glass-form-label text-white/80">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) => updateLineItem(index, 'quantity', event.target.value)}
                        className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="glass-form-label text-white/80">Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) => updateLineItem(index, 'unitPrice', event.target.value)}
                        className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                        required
                      />
                    </div>
                    <div className="md:col-span-1">
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="w-full rounded-lg border border-red-300/50 bg-red-500/20 px-2 py-2 text-white text-sm"
                        title="Remove line item"
                      >
                        X
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-white/20 bg-white/5 p-4">
                <h3 className="text-white font-semibold mb-3">Costing Inputs</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="glass-form-label text-white/90">Labour Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={formData.labourHours}
                      onChange={(event) => setFormData((prev) => ({ ...prev, labourHours: event.target.value }))}
                      className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="glass-form-label text-white/90">Labour Rate (R/hour)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.labourRate}
                      onChange={(event) => setFormData((prev) => ({ ...prev, labourRate: event.target.value }))}
                      className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="glass-form-label text-white/90">Travelling Cost (R)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.travellingCost}
                      onChange={(event) => setFormData((prev) => ({ ...prev, travellingCost: event.target.value }))}
                      className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="glass-form-label text-white/90">Consumables Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.consumablesRate}
                      onChange={(event) => setFormData((prev) => ({ ...prev, consumablesRate: event.target.value }))}
                      className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="glass-form-label text-white/90">Valid Until</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(event) => setFormData((prev) => ({ ...prev, validUntil: event.target.value }))}
                    className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                  />
                </div>
                <div>
                  <label className="glass-form-label text-white/90">VAT Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.vatRate}
                    onChange={(event) => setFormData((prev) => ({ ...prev, vatRate: event.target.value }))}
                    className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                  />
                </div>
                <div className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white">
                  <p>Parts Cost: R {totals.partsCost}</p>
                  <p>Labour Cost: R {totals.labourCost}</p>
                  <p>Travelling Cost: R {totals.travellingCost}</p>
                  <p>Consumables Cost: R {totals.consumablesCost}</p>
                  <p className="text-xs text-white/70 mt-1">Rule reference: 50% labour threshold = R {totals.halfLabourThreshold}</p>
                  <p className="mt-1">Subtotal: R {totals.subtotal}</p>
                  <p>VAT: R {totals.vatAmount}</p>
                  <p className="font-semibold text-yellow-200">Total: R {totals.totalAmount}</p>
                </div>
              </div>

              <div>
                <label className="glass-form-label text-white/90">Notes</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                />
              </div>

              <div>
                <label className="glass-form-label text-white/90">Terms</label>
                <textarea
                  rows="2"
                  value={formData.terms}
                  onChange={(event) => setFormData((prev) => ({ ...prev, terms: event.target.value }))}
                  className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="glass-btn-primary font-semibold py-2 px-5 disabled:opacity-60"
                >
                  {submitting ? 'Creating...' : 'Create Quote'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="glass-btn-secondary font-semibold py-2 px-5"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default CreateQuoteModal;
