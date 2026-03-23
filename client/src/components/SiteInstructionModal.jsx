import { useMemo, useState } from 'react';
import api from '../api/axios';

const TRAVEL_RATE_PER_KM = 8.5;
const CALL_OUT_FLOOR_DISTANCE_KM = 45;
const CALL_OUT_FLOOR_TIME_MINUTES = 30;
const CALL_OUT_FLOOR_AMOUNT = 650;

const formatCurrency = (value) => `R ${Number(value || 0).toFixed(2)}`;

const buildFormState = (invoice) => ({
  invoiceId: invoice?._id || '',
  invoiceNumber: invoice?.invoiceNumber || '',
  documentType: invoice?.documentType || 'proForma',
  workflowStatus: invoice?.workflowStatus || 'draft',
  title: invoice?.title || '',
  description: invoice?.description || '',
  serviceType: invoice?.serviceType || '',
  lineItems: Array.isArray(invoice?.lineItems) && invoice.lineItems.length
    ? invoice.lineItems.map((item) => ({
      description: item.description || '',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
    }))
    : [{ description: 'Service Work', quantity: 1, unitPrice: 0 }],
  partsFulfilmentMode: invoice?.partsFulfilmentMode || 'inHouseProcurement',
  deliveryProvider: invoice?.deliveryProvider || '',
  partsProcurementCost: invoice?.partsProcurementCost ?? 0,
  thirdPartyDeliveryCost: invoice?.thirdPartyDeliveryCost ?? 0,
  laborHours: invoice?.laborHours ?? 0,
  laborRate: invoice?.laborRate ?? 650,
  distanceTravelledKm: invoice?.distanceTravelledKm ?? 0,
  travelRatePerKm: invoice?.travelRatePerKm ?? TRAVEL_RATE_PER_KM,
  travelTimeMinutes: invoice?.travelTimeMinutes ?? 0,
  timeTravelledCost: invoice?.timeTravelledCost ?? 0,
  consumablesRate: invoice?.consumablesRate ?? 0,
  vatRate: invoice?.vatRate ?? 15,
  depositRequired: Boolean(invoice?.depositRequired),
  depositAmount: invoice?.depositAmount ?? 0,
  depositReason: invoice?.depositReason || '',
  siteInstruction: {
    problemsFound: invoice?.siteInstruction?.problemsFound || '',
    recommendedSolution: invoice?.siteInstruction?.recommendedSolution || '',
    requiredPartsAndMaterials: invoice?.siteInstruction?.requiredPartsAndMaterials || '',
    thirdPartyServiceNotes: invoice?.siteInstruction?.thirdPartyServiceNotes || '',
    approvalReference: invoice?.siteInstruction?.approvalReference || '',
    approvalNotes: invoice?.siteInstruction?.approvalNotes || '',
  },
  notes: invoice?.notes || '',
  terms: invoice?.terms || 'Payment due before parts procurement for site-instruction work unless otherwise agreed.',
});

const calculatePreview = (formData) => {
  const lineItems = formData.lineItems.map((item) => ({
    ...item,
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unitPrice) || 0,
  }));
  const partsCost = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const partsProcurementCost = Number(formData.partsProcurementCost) || 0;
  const thirdPartyDeliveryCost = formData.partsFulfilmentMode === 'thirdPartyDelivery'
    ? (Number(formData.thirdPartyDeliveryCost) || 0)
    : 0;
  const estimatedPartsProfit = partsCost - partsProcurementCost - thirdPartyDeliveryCost;
  const laborHours = Number(formData.laborHours) || 0;
  const laborRate = Number(formData.laborRate) || 0;
  const laborCost = laborHours * laborRate;
  const distanceTravelledKm = Number(formData.distanceTravelledKm) || 0;
  const travelRatePerKm = Number(formData.travelRatePerKm) || TRAVEL_RATE_PER_KM;
  const travelTimeMinutes = Number(formData.travelTimeMinutes) || 0;
  const timeTravelledCost = Number(formData.timeTravelledCost) || 0;
  const baseTravelCost = (distanceTravelledKm * travelRatePerKm) + timeTravelledCost;
  const isCallOutFloorApplicable = distanceTravelledKm < CALL_OUT_FLOOR_DISTANCE_KM && travelTimeMinutes < CALL_OUT_FLOOR_TIME_MINUTES;
  const travelCost = isCallOutFloorApplicable ? Math.max(baseTravelCost, CALL_OUT_FLOOR_AMOUNT) : baseTravelCost;
  const consumablesRate = Number(formData.consumablesRate) || 0;
  const consumablesCost = partsCost * (consumablesRate / 100);
  const subtotal = partsCost + laborCost + travelCost + consumablesCost;
  const vatRate = Number(formData.vatRate) || 0;
  const vatAmount = subtotal * (vatRate / 100);
  const totalAmount = subtotal + vatAmount;

  return {
    partsCost: partsCost.toFixed(2),
    partsProcurementCost: partsProcurementCost.toFixed(2),
    thirdPartyDeliveryCost: thirdPartyDeliveryCost.toFixed(2),
    estimatedPartsProfit: estimatedPartsProfit.toFixed(2),
    laborHours: laborHours.toFixed(2),
    laborRate: laborRate.toFixed(2),
    laborCost: laborCost.toFixed(2),
    distanceTravelledKm: distanceTravelledKm.toFixed(2),
    travelRatePerKm: travelRatePerKm.toFixed(2),
    travelTimeMinutes: travelTimeMinutes.toFixed(2),
    timeTravelledCost: timeTravelledCost.toFixed(2),
    travelCost: travelCost.toFixed(2),
    isCallOutFloorApplicable,
    consumablesRate: consumablesRate.toFixed(2),
    consumablesCost: consumablesCost.toFixed(2),
    subtotal: subtotal.toFixed(2),
    vatAmount: vatAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
  };
};

const SiteInstructionModal = ({ token, serviceCall, triggerClassName, onUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shareChannels, setShareChannels] = useState({ email: true, whatsapp: true, telegram: false });
  const [formData, setFormData] = useState(buildFormState(null));

  const preview = useMemo(() => calculatePreview(formData), [formData]);

  const openModal = async () => {
    setIsOpen(true);
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(
        `/invoices/from-service-call/${serviceCall._id}/pro-forma`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData(buildFormState(response.data?.invoice));
    } catch (loadError) {
      setError(loadError?.response?.data?.message || 'Failed to load pro-forma site instruction.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setError('');
    setSuccess('');
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateSiteInstruction = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      siteInstruction: {
        ...prev.siteInstruction,
        [field]: value,
      },
    }));
  };

  const updateLineItem = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeLineItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const buildPayload = () => ({
    title: formData.title,
    description: formData.description,
    serviceType: formData.serviceType,
    lineItems: formData.lineItems.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
    })),
    partsFulfilmentMode: formData.partsFulfilmentMode,
    deliveryProvider: formData.partsFulfilmentMode === 'thirdPartyDelivery' ? formData.deliveryProvider : '',
    partsProcurementCost: Number(formData.partsProcurementCost) || 0,
    thirdPartyDeliveryCost: formData.partsFulfilmentMode === 'thirdPartyDelivery' ? (Number(formData.thirdPartyDeliveryCost) || 0) : 0,
    laborHours: Number(formData.laborHours) || 0,
    laborRate: Number(formData.laborRate) || 0,
    distanceTravelledKm: Number(formData.distanceTravelledKm) || 0,
    travelRatePerKm: Number(formData.travelRatePerKm) || TRAVEL_RATE_PER_KM,
    travelTimeMinutes: Number(formData.travelTimeMinutes) || 0,
    timeTravelledCost: Number(formData.timeTravelledCost) || 0,
    consumablesRate: Number(formData.consumablesRate) || 0,
    vatRate: Number(formData.vatRate) || 15,
    depositRequired: Boolean(formData.depositRequired),
    depositAmount: Boolean(formData.depositRequired) ? (Number(formData.depositAmount) || 0) : 0,
    depositReason: formData.depositRequired ? formData.depositReason : '',
    siteInstruction: formData.siteInstruction,
    notes: formData.notes,
    terms: formData.terms,
  });

  const saveDraft = async (nextMessage = 'Pro-forma draft saved.') => {
    if (!formData.invoiceId) return null;
    setSaving(true);
    setError('');

    try {
      const response = await api.put(
        `/invoices/${formData.invoiceId}`,
        buildPayload(),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData(buildFormState(response.data));
      setSuccess(nextMessage);
      if (onUpdated) onUpdated(response.data);
      return response.data;
    } catch (saveError) {
      setError(saveError?.response?.data?.message || 'Failed to save site instruction draft.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    const saved = await saveDraft();
    if (!saved) return;

    const selectedChannels = Object.entries(shareChannels)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([channel]) => channel);

    if (!selectedChannels.length) {
      setError('Select at least one send channel before sharing with the customer.');
      return;
    }

    setSending(true);
    setError('');
    try {
      const response = await api.post(
        `/invoices/${formData.invoiceId}/send`,
        { channels: selectedChannels },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.whatsappUrl) {
        window.open(response.data.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
      if (response.data?.telegramUrl) {
        window.open(response.data.telegramUrl, '_blank', 'noopener,noreferrer');
      }

      setSuccess(`${response.data?.message || 'Document sent successfully.'}`);
      setFormData((prev) => ({ ...prev, workflowStatus: 'awaitingApproval' }));
    } catch (sendError) {
      setError(sendError?.response?.data?.message || 'Failed to send pro-forma for approval.');
    } finally {
      setSending(false);
    }
  };

  const handleWorkflowAction = async (workflowStatus, successMessage) => {
    if (!formData.invoiceId) return;
    setProcessing(true);
    setError('');
    try {
      const response = await api.patch(
        `/invoices/${formData.invoiceId}/workflow-status`,
        {
          workflowStatus,
          approvalReference: formData.siteInstruction.approvalReference,
          approvalNotes: formData.siteInstruction.approvalNotes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData(buildFormState(response.data));
      setSuccess(successMessage);
      if (onUpdated) onUpdated(response.data);
    } catch (actionError) {
      setError(actionError?.response?.data?.message || 'Failed to update approval workflow.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalize = async () => {
    const saved = await saveDraft();
    if (!saved) return;

    setProcessing(true);
    setError('');
    try {
      const response = await api.post(
        `/invoices/${formData.invoiceId}/finalize`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData(buildFormState(response.data));
      setSuccess('Final invoice created from the approved pro-forma.');
      if (onUpdated) onUpdated(response.data);
    } catch (finalizeError) {
      setError(finalizeError?.response?.data?.message || 'Failed to finalize invoice.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <button type="button" onClick={openModal} className={triggerClassName}>
        {serviceCall?.proFormaInvoice ? 'Open Site Instruction' : 'Create Site Instruction'}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-card w-full max-w-5xl rounded-2xl border border-white/20 bg-slate-900/85 p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="glass-heading-secondary">Site Instruction / Pro-Forma Invoice</h2>
                <p className="text-xs text-white/65 mt-1">
                  Source of truth for on-site work. Field agents can adjust imported quote values, capture additional work, request deposit approval, and finalize the invoice on completion.
                </p>
              </div>
              <button type="button" onClick={closeModal} className="text-white/80 hover:text-white">Close</button>
            </div>

            {error ? <div className="mb-4 rounded-lg border border-red-300/50 bg-red-500/20 px-4 py-2 text-white">{error}</div> : null}
            {success ? <div className="mb-4 rounded-lg border border-emerald-300/50 bg-emerald-500/20 px-4 py-2 text-white">{success}</div> : null}

            {loading ? (
              <div className="py-16 text-center text-white/70">Loading pro-forma invoice...</div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-white text-sm">
                    <p className="text-white/60 text-xs">Document</p>
                    <p className="font-semibold">{formData.invoiceNumber || 'Pending number'}</p>
                  </div>
                  <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-white text-sm">
                    <p className="text-white/60 text-xs">Type</p>
                    <p className="font-semibold">{formData.documentType === 'proForma' ? 'Pro-forma' : 'Final invoice'}</p>
                  </div>
                  <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-white text-sm">
                    <p className="text-white/60 text-xs">Workflow</p>
                    <p className="font-semibold">{formData.workflowStatus}</p>
                  </div>
                  <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-white text-sm">
                    <p className="text-white/60 text-xs">Linked Quote</p>
                    <p className="font-semibold">{serviceCall?.quotation?.quotationNumber || 'Direct service call seed'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="glass-form-label text-white/90">Title</label>
                    <input value={formData.title} onChange={(e) => updateField('title', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                  </div>
                  <div>
                    <label className="glass-form-label text-white/90">Service Type</label>
                    <input value={formData.serviceType} onChange={(e) => updateField('serviceType', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="glass-form-label text-white/90">Description / Scope</label>
                    <textarea rows="3" value={formData.description} onChange={(e) => updateField('description', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                  </div>
                </div>

                <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-3">
                  <div>
                    <h3 className="text-white font-semibold">Billable Items (parts / materials)</h3>
                  </div>
                  {formData.lineItems.map((item, index) => (
                    <div key={`site-line-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-6">
                        <label className="glass-form-label text-white/80">Description</label>
                        <input value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="glass-form-label text-white/80">Qty</label>
                        <input type="number" min="0" step="1" value={item.quantity} onChange={(e) => updateLineItem(index, 'quantity', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2" />
                      </div>
                      <div className="md:col-span-3">
                        <label className="glass-form-label text-white/80">Unit Price (R)</label>
                        <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2" />
                      </div>
                      <div className="md:col-span-1">
                        <button type="button" onClick={() => removeLineItem(index)} className="w-full rounded-lg border border-red-300/50 bg-red-500/20 px-2 py-2 text-white text-sm">X</button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2">
                    <button type="button" onClick={addLineItem} className="glass-btn-secondary px-3 py-2 text-sm font-semibold">Add Item</button>
                  </div>
                </div>

                <div className="rounded-lg border border-white/20 bg-white/5 p-4">
                  <h3 className="text-white font-semibold mb-3">Costing Controls</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <label className="glass-form-label text-white/90">Parts Fulfilment</label>
                      <select value={formData.partsFulfilmentMode} onChange={(e) => updateField('partsFulfilmentMode', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3">
                        <option value="inHouseProcurement" className="text-black">In-house Procurement</option>
                        <option value="thirdPartyDelivery" className="text-black">Third-party Delivery</option>
                      </select>
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">Parts Procurement Cost (R)</label>
                      <input type="number" min="0" step="0.01" value={formData.partsProcurementCost} onChange={(e) => updateField('partsProcurementCost', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">Delivery Provider</label>
                      <input value={formData.deliveryProvider} onChange={(e) => updateField('deliveryProvider', e.target.value)} disabled={formData.partsFulfilmentMode !== 'thirdPartyDelivery'} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">Third-party Delivery Cost (R)</label>
                      <input type="number" min="0" step="0.01" value={formData.thirdPartyDeliveryCost} onChange={(e) => updateField('thirdPartyDeliveryCost', e.target.value)} disabled={formData.partsFulfilmentMode !== 'thirdPartyDelivery'} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">Labour Hours</label>
                      <input type="number" min="0" step="0.25" value={formData.laborHours} onChange={(e) => updateField('laborHours', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">Labour Rate (R/hour)</label>
                      <input type="number" min="0" step="0.01" value={formData.laborRate} onChange={(e) => updateField('laborRate', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">Distance Travelled (km)</label>
                      <input type="number" min="0" step="0.01" value={formData.distanceTravelledKm} onChange={(e) => updateField('distanceTravelledKm', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">Rate per km (R)</label>
                      <input type="number" min="0" step="0.01" value={formData.travelRatePerKm} onChange={(e) => updateField('travelRatePerKm', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">Travel Time (minutes)</label>
                      <input type="number" min="0" step="1" value={formData.travelTimeMinutes} onChange={(e) => updateField('travelTimeMinutes', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">Time Travelled Cost (R)</label>
                      <input type="number" min="0" step="0.01" value={formData.timeTravelledCost} onChange={(e) => updateField('timeTravelledCost', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">Consumables Rate (%)</label>
                      <input type="number" min="0" step="0.01" value={formData.consumablesRate} onChange={(e) => updateField('consumablesRate', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">VAT Rate (%)</label>
                      <input type="number" min="0" max="100" step="0.01" value={formData.vatRate} onChange={(e) => updateField('vatRate', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div className="md:col-span-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white">
                      <p>Parts Cost: {formatCurrency(preview.partsCost)}</p>
                      <p>Parts Procurement Cost: {formatCurrency(preview.partsProcurementCost)}</p>
                      <p>Third-party Delivery Cost: {formatCurrency(preview.thirdPartyDeliveryCost)}</p>
                      <p className="font-semibold">Estimated Parts Profit: {formatCurrency(preview.estimatedPartsProfit)}</p>
                      <p>Labour: {preview.laborHours} h x {formatCurrency(preview.laborRate)} = {formatCurrency(preview.laborCost)}</p>
                      <p>Travel: ({preview.distanceTravelledKm} km x {formatCurrency(preview.travelRatePerKm)}) + {formatCurrency(preview.timeTravelledCost)}</p>
                      {preview.isCallOutFloorApplicable ? <p className="text-xs text-yellow-200">Call-out floor rule applied: minimum {formatCurrency(CALL_OUT_FLOOR_AMOUNT)}</p> : null}
                      <p>Travel Cost: {formatCurrency(preview.travelCost)}</p>
                      <p>Consumables Cost: {formatCurrency(preview.consumablesCost)}</p>
                      <p>Subtotal: {formatCurrency(preview.subtotal)}</p>
                      <p>VAT: {formatCurrency(preview.vatAmount)}</p>
                      <p className="font-semibold text-yellow-200">Total: {formatCurrency(preview.totalAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <input id={`deposit-required-${serviceCall._id}`} type="checkbox" checked={Boolean(formData.depositRequired)} onChange={(e) => updateField('depositRequired', e.target.checked)} className="h-4 w-4 rounded border-white/30 bg-white/10" />
                    <label htmlFor={`deposit-required-${serviceCall._id}`} className="glass-form-label text-white/90 mb-0">Deposit required before additional work starts</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="glass-form-label text-white/90">Deposit Amount (R)</label>
                      <input type="number" min="0" step="0.01" value={formData.depositAmount} onChange={(e) => updateField('depositAmount', e.target.value)} disabled={!formData.depositRequired} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                    <div>
                      <label className="glass-form-label text-white/90">Deposit Reason</label>
                      <input value={formData.depositReason} onChange={(e) => updateField('depositReason', e.target.value)} disabled={!formData.depositRequired} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-cyan-300/40 bg-cyan-500/10 p-4 space-y-4">
                  <h3 className="text-white font-semibold">Site Instruction</h3>
                  <textarea rows="3" value={formData.siteInstruction.problemsFound} onChange={(e) => updateSiteInstruction('problemsFound', e.target.value)} placeholder="Problems found on site" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
                  <textarea rows="3" value={formData.siteInstruction.recommendedSolution} onChange={(e) => updateSiteInstruction('recommendedSolution', e.target.value)} placeholder="Recommended solution / additional work" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
                  <textarea rows="3" value={formData.siteInstruction.requiredPartsAndMaterials} onChange={(e) => updateSiteInstruction('requiredPartsAndMaterials', e.target.value)} placeholder="Required parts / materials / components" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
                  <textarea rows="2" value={formData.siteInstruction.thirdPartyServiceNotes} onChange={(e) => updateSiteInstruction('thirdPartyServiceNotes', e.target.value)} placeholder="Third-party service requirements (e.g. injectors, turbo, alternator, diesel pump)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input value={formData.siteInstruction.approvalReference} onChange={(e) => updateSiteInstruction('approvalReference', e.target.value)} placeholder="Customer approval reference / PO / verbal ref" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
                    <input value={formData.siteInstruction.approvalNotes} onChange={(e) => updateSiteInstruction('approvalNotes', e.target.value)} placeholder="Approval notes" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="glass-form-label text-white/90">Internal Notes</label>
                    <textarea rows="3" value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                  </div>
                  <div>
                    <label className="glass-form-label text-white/90">Terms</label>
                    <textarea rows="3" value={formData.terms} onChange={(e) => updateField('terms', e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" />
                  </div>
                </div>

                <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-3">
                  <h3 className="text-white font-semibold">Share Channels</h3>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(shareChannels).map(([channel, enabled]) => (
                      <label key={channel} className="flex items-center gap-2 text-sm text-white/90">
                        <input type="checkbox" checked={enabled} onChange={(e) => setShareChannels((prev) => ({ ...prev, [channel]: e.target.checked }))} className="h-4 w-4 rounded border-white/30 bg-white/10" />
                        {channel.charAt(0).toUpperCase() + channel.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-end">
                  <button type="button" onClick={() => saveDraft()} disabled={saving} className="glass-btn-secondary px-4 py-3 text-sm font-semibold disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button type="button" onClick={handleSend} disabled={sending || saving} className="glass-btn-secondary px-4 py-3 text-sm font-semibold disabled:opacity-50">
                    {sending ? 'Sending...' : 'Send For Approval'}
                  </button>
                  <button type="button" onClick={() => handleWorkflowAction('approved', 'Customer approval recorded.')} disabled={processing} className="glass-btn-secondary px-4 py-3 text-sm font-semibold disabled:opacity-50">
                    Mark Approved
                  </button>
                  <button type="button" onClick={handleFinalize} disabled={processing || saving} className="glass-btn-primary px-4 py-3 text-sm font-semibold disabled:opacity-50">
                    {processing ? 'Processing...' : 'Finalize Invoice'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SiteInstructionModal;