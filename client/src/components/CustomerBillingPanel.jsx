/**
 * @file CustomerBillingPanel.jsx
 * @description Authenticated customer billing and payment actions for pro-forma and invoice documents.
 */

import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const formatCurrency = (value) => new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const PAYMENT_METHOD_OPTIONS = [
  { value: 'card', label: 'Card' },
  { value: 'eft', label: 'EFT' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit' },
  { value: 'other', label: 'Other' },
];

const CustomerBillingPanel = ({ customerId, token, isOwnProfile }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [reviewDrafts, setReviewDrafts] = useState({});

  useEffect(() => {
    if (!customerId || !token) {
      setLoading(false);
      return;
    }

    const fetchInvoices = async () => {
      try {
        const res = await api.get(`/invoices?customer=${customerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInvoices(Array.isArray(res.data) ? res.data : []);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Failed to load billing documents.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [customerId, token]);

  const visibleInvoices = useMemo(() => (
    invoices
      .filter((invoice) => (
        invoice?.documentType === 'proForma'
        || Number(invoice?.balance || 0) > 0
        || invoice?.paymentStatus === 'paid'
        || (Array.isArray(invoice?.receipts) && invoice.receipts.length > 0)
      ))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  ), [invoices]);

  const getPaymentDraft = (invoiceId) => ({
    method: 'card',
    reference: '',
    notes: '',
    processing: false,
    ...(paymentDrafts[invoiceId] || {}),
  });

  const updateDraft = (invoiceId, field, value) => {
    setPaymentDrafts((prev) => ({
      ...prev,
      [invoiceId]: {
        ...getPaymentDraft(invoiceId),
        [field]: value,
      },
    }));
  };

  const getReviewDraft = (invoiceId) => ({
    rating: '5',
    feedback: '',
    submitting: false,
    submitted: false,
    ...(reviewDrafts[invoiceId] || {}),
  });

  const updateReviewDraft = (invoiceId, field, value) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [invoiceId]: {
        ...getReviewDraft(invoiceId),
        [field]: value,
      },
    }));
  };

  const downloadReceipt = async (invoice) => {
    try {
      const res = await api.get(`/invoices/${invoice._id}/receipt/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `POP-${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Unable to download receipt. Please try again.');
    }
  };

  const getOutstandingBalance = (invoice) => {
    const explicitBalance = Number(invoice?.balance);
    if (Number.isFinite(explicitBalance) && explicitBalance >= 0) {
      return explicitBalance;
    }

    return Math.max(0, Number(invoice?.totalAmount || 0) - Number(invoice?.paidAmount || 0));
  };

  const getPaymentAmount = (invoice) => {
    const balance = getOutstandingBalance(invoice);

    if (invoice?.documentType === 'proForma' && invoice?.depositRequired) {
      const outstandingDeposit = Math.max(0, Number(invoice.depositAmount || 0) - Number(invoice.paidAmount || 0));
      if (outstandingDeposit > 0) {
        return outstandingDeposit;
      }
    }

    return balance;
  };

  const getActionLabel = (invoice) => {
    if (invoice?.documentType === 'proForma' && invoice?.depositRequired && Number(invoice?.paidAmount || 0) < Number(invoice?.depositAmount || 0)) {
      return 'Pay Deposit';
    }

    if (getOutstandingBalance(invoice) > 0) {
      return invoice?.documentType === 'proForma' ? 'Pay Outstanding Balance' : 'Pay Invoice';
    }

    return 'Settled';
  };

  const handlePayment = async (invoice) => {
    const paymentAmount = getPaymentAmount(invoice);
    if (paymentAmount <= 0) return;

    const draft = getPaymentDraft(invoice._id);
    setError('');
    setSuccessMessage('');
    updateDraft(invoice._id, 'processing', true);

    try {
      const res = await api.post(
        `/invoices/${invoice._id}/payment`,
        {
          amount: paymentAmount,
          method: draft.method || 'card',
          reference: draft.reference || '',
          notes: draft.notes || '',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updatedInvoice = res.data;
      setInvoices((prev) => prev.map((item) => (item._id === invoice._id ? { ...item, ...updatedInvoice } : item)));
      setSuccessMessage(
        updatedInvoice?.latestReceipt?.receiptNumber
          ? `Payment recorded successfully. Receipt ${updatedInvoice.latestReceipt.receiptNumber} has been generated as proof of payment.`
          : updatedInvoice.paymentStatus === 'paid'
            ? 'Payment received successfully. Your work order can now continue to completion.'
            : 'Payment recorded successfully.'
      );
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Unable to record payment right now.');
    } finally {
      updateDraft(invoice._id, 'processing', false);
    }
  };

  const submitInvoiceReview = async (invoice) => {
    if (!invoice?.serviceCall) return;

    const draft = getReviewDraft(invoice._id);
    updateReviewDraft(invoice._id, 'submitting', true);
    setError('');
    setSuccessMessage('');

    try {
      await api.post(
        `/service-calls/${typeof invoice.serviceCall === 'string' ? invoice.serviceCall : invoice.serviceCall._id}/rating`,
        {
          rating: Number(draft.rating || 5),
          feedback: draft.feedback || '',
          stage: invoice.documentType === 'proForma' ? 'proForma' : 'invoice',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      updateReviewDraft(invoice._id, 'submitted', true);
      setSuccessMessage('Thank you. Your stage review has been recorded successfully.');
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Unable to submit your review right now.');
    } finally {
      updateReviewDraft(invoice._id, 'submitting', false);
    }
  };

  if (loading) {
    return <p className="text-sm text-white/50">Loading billing documents…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      {successMessage ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{successMessage}</div> : null}

      {visibleInvoices.length === 0 ? (
        <p className="text-sm text-white/40">No pending billing items right now.</p>
      ) : (
        visibleInvoices.map((invoice) => {
          const draft = getPaymentDraft(invoice._id);
          const reviewDraft = getReviewDraft(invoice._id);
          const paymentAmount = getPaymentAmount(invoice);
          const outstandingBalance = getOutstandingBalance(invoice);
          const isSettled = outstandingBalance <= 0;

          return (
            <div key={invoice._id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white/90">{invoice.invoiceNumber}</span>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-200">
                      {invoice.documentType === 'proForma' ? 'Pro-Forma' : 'Invoice'}
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
                      {invoice.paymentStatus || invoice.workflowStatus || 'pending'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">Due {formatDate(invoice.dueDate)}</p>
                  {invoice.depositRequired ? (
                    <p className="mt-2 text-xs text-amber-200">
                      Deposit required: {formatCurrency(invoice.depositAmount)}{invoice.depositReason ? ` · ${invoice.depositReason}` : ''}
                    </p>
                  ) : null}
                  {Array.isArray(invoice.receipts) && invoice.receipts.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">Receipts</p>
                        <button
                          type="button"
                          onClick={() => downloadReceipt(invoice)}
                          className="rounded-md border border-emerald-600/50 bg-emerald-900/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-800/70 transition-colors"
                        >
                          Download POP
                        </button>
                      </div>
                      <div className="mt-2 space-y-1">
                        {invoice.receipts.slice().reverse().slice(0, 3).map((receipt) => (
                          <div key={receipt.receiptNumber} className="text-xs text-emerald-50/90">
                            <span className="font-semibold">{receipt.receiptNumber}</span> · {formatCurrency(receipt.amount)} · Issued {formatDate(receipt.issuedAt)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Outstanding Balance</p>
                  <p className="text-lg font-extrabold text-yellow-300">{formatCurrency(outstandingBalance)}</p>
                </div>
              </div>

              {isOwnProfile ? (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="flex flex-col gap-1 text-xs text-white/60">
                      Payment Method
                      <select
                        value={draft.method}
                        onChange={(e) => updateDraft(invoice._id, 'method', e.target.value)}
                        className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
                      >
                        {PAYMENT_METHOD_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-white/60 md:col-span-2">
                      Reference / Transaction ID
                      <input
                        type="text"
                        value={draft.reference}
                        onChange={(e) => updateDraft(invoice._id, 'reference', e.target.value)}
                        placeholder="Optional"
                        className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-white/50">
                      Payment amount to submit now: <span className="font-semibold text-white/80">{formatCurrency(paymentAmount)}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => handlePayment(invoice)}
                      disabled={draft.processing || isSettled}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${draft.processing || isSettled
                        ? 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-400'
                        : 'border border-emerald-700 bg-emerald-950 text-emerald-100 hover:bg-emerald-900'}`}
                    >
                      {draft.processing ? 'Processing...' : getActionLabel(invoice)}
                    </button>
                  </div>

                  {invoice.serviceCall ? (
                    <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Service Review Prompt</p>
                      <p className="mt-1 text-xs text-cyan-50/80">Share your experience at this {invoice.documentType === 'proForma' ? 'pro-forma' : 'invoice'} stage so the team can respond early if anything shifts.</p>
                      {!reviewDraft.submitted ? (
                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_auto]">
                          <select
                            value={reviewDraft.rating}
                            onChange={(e) => updateReviewDraft(invoice._id, 'rating', e.target.value)}
                            className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
                          >
                            {[5, 4, 3, 2, 1].map((value) => (
                              <option key={value} value={value}>{value} star{value !== 1 ? 's' : ''}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={reviewDraft.feedback}
                            onChange={(e) => updateReviewDraft(invoice._id, 'feedback', e.target.value)}
                            placeholder="How is the communication and service experience so far?"
                            className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => submitInvoiceReview(invoice)}
                            disabled={reviewDraft.submitting}
                            className="rounded-lg border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-900 disabled:opacity-60"
                          >
                            {reviewDraft.submitting ? 'Sending...' : 'Share Review'}
                          </button>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-emerald-200">Thank you — your review for this stage has been captured.</p>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-white/50">The customer can settle this document from their own portal login.</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default CustomerBillingPanel;
