/**
 * @file QuotationApprovalPage.jsx
 * @description Public customer page for reviewing and accepting or rejecting a shared quotation
 * @module Components/QuotationApprovalPage
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return 'Not specified';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not specified';
  return parsed.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const statusStyles = {
  draft:    'bg-white/15 text-white border-white/20',
  sent:     'bg-sky-300/20 text-sky-100 border-sky-200/30',
  approved: 'bg-emerald-300/20 text-emerald-100 border-emerald-200/30',
  rejected: 'bg-rose-300/20 text-rose-100 border-rose-200/30',
  expired:  'bg-orange-300/20 text-orange-100 border-orange-200/30',
  converted:'bg-purple-300/20 text-purple-100 border-purple-200/30',
};

const statusLabel = {
  draft:     'Draft',
  sent:      'Awaiting Your Response',
  approved:  'Accepted',
  rejected:  'Declined',
  expired:   'Expired',
  converted: 'Converted to Job',
};

/**
 * Public approval page for tokenized quotation documents.
 *
 * @returns {JSX.Element} Quotation approval page
 */
function QuotationApprovalPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation]           = useState(null);
  const [loading, setLoading]               = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState('');
  const [decisionMessage, setDecisionMessage] = useState('');
  const [decisionType, setDecisionType]     = useState(null); // 'accepted' | 'rejected'
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reviewState, setReviewState] = useState({
    rating: '5',
    feedback: '',
  });

  useEffect(() => {
    let isCancelled = false;

    const loadQuotation = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/quotations/share/${token}`);
        if (isCancelled) return;
        setQuotation(response.data);
      } catch (loadError) {
        if (isCancelled) return;
        setError(loadError.response?.data?.message || 'Unable to load this quotation.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadQuotation();
    return () => { isCancelled = true; };
  }, [token]);

  const handleAccept = async () => {
    try {
      setSubmitting(true);
      setError('');
      const response = await api.patch(`/quotations/share/${token}/accept`, {
        rating: Number(reviewState.rating || 5),
        feedback: reviewState.feedback || '',
      });
      setDecisionMessage(response.data.message);
      setDecisionType('accepted');
      setQuotation((q) => q ? { ...q, status: 'approved', approvedDate: new Date().toISOString() } : q);
      setShowRejectForm(false);

      if (response.data?.portalAccountCreated && response.data?.portalUser?.email) {
        navigate('/login', {
          state: {
            email: response.data.portalUser.email,
            password: response.data.portalUser.temporaryAccessKey || '',
            infoMessage: 'Your customer portal is ready. Use the temporary secret access key below as your password, then update it from your profile after login.',
          },
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept the quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setSubmitting(true);
      setError('');
      const response = await api.patch(`/quotations/share/${token}/reject`, {
        reason: rejectionReason.trim() || undefined,
        rating: Number(reviewState.rating || 5),
        feedback: reviewState.feedback || '',
      });
      setDecisionMessage(response.data.message);
      setDecisionType('rejected');
      setQuotation((q) => q ? { ...q, status: 'rejected', rejectedDate: new Date().toISOString() } : q);
      setShowRejectForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit your response.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 flex items-center justify-center px-6">
        <div className="glass-pane w-full max-w-xl p-8 text-center text-white">
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-white/80 border-b-transparent" />
          <p className="text-lg font-semibold">Loading quotation...</p>
        </div>
      </div>
    );
  }

  // ── Error / Not found ────────────────────────────────────────────────────
  if (!quotation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 flex items-center justify-center px-6">
        <div className="glass-pane w-full max-w-2xl p-8 text-center text-white">
          <h1 className="text-2xl font-extrabold">Quotation Unavailable</h1>
          <p className="mt-4 text-sm text-white/80">{error || 'This quotation link is unavailable or has expired.'}</p>
        </div>
      </div>
    );
  }

  const canDecide = quotation.status === 'sent';
  const lineItems = quotation.lineItems || [];

  // ── Main page ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,251,40,0.18),_transparent_24%),linear-gradient(160deg,_#020f5f_0%,_#05208f_42%,_#0a4fc0_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="glass-pane overflow-hidden rounded-[28px] border border-white/20 shadow-2xl">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">

            {/* ── Left column: quote details ────────────────────────────── */}
            <section className="border-b border-white/10 bg-white/10 p-6 text-white backdrop-blur-xl sm:p-8 lg:border-b-0 lg:border-r">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-950">
                  Quotation Review
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${statusStyles[quotation.status] || statusStyles.draft}`}>
                  {statusLabel[quotation.status] || quotation.status}
                </span>
              </div>

              <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
                {quotation.quotationNumber}
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
                Please review the pricing below and indicate whether you accept or decline this quotation.
              </p>

              {/* Key details ─────────────────────────────────────────────── */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="sub-card">
                  <p className="field-kicker">Customer</p>
                  <p className="mt-2 text-base font-bold">{quotation.customer?.name || 'Customer'}</p>
                  {quotation.customer?.customerId && (
                    <p className="mt-1 text-xs text-white/60">{quotation.customer.customerId}</p>
                  )}
                </div>
                <div className="sub-card">
                  <p className="field-kicker">Valid Until</p>
                  <p className="mt-2 text-base font-bold">{formatDate(quotation.validUntil)}</p>
                  <p className="mt-1 text-xs text-white/60">After this date the quotation expires</p>
                </div>
                {quotation.equipment && (
                  <div className="sub-card sm:col-span-2">
                    <p className="field-kicker">Equipment</p>
                    <p className="mt-2 text-base font-bold">
                      {[quotation.equipment.makeOrBrand, quotation.equipment.modelNumber].filter(Boolean).join(' — ') || quotation.equipment.type || 'Equipment on site'}
                    </p>
                    {quotation.equipment.serialNumber && (
                      <p className="mt-1 text-xs text-white/60">S/N: {quotation.equipment.serialNumber}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Line items ───────────────────────────────────────────────── */}
              {lineItems.length > 0 && (
                <div className="mt-8">
                  <p className="mb-3 field-kicker">Line Items</p>
                  <div className="overflow-hidden rounded-2xl border border-white/15">
                    <table className="w-full text-sm text-white">
                      <thead>
                        <tr className="border-b border-white/15 bg-slate-950/30">
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Description</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-white/60">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-white/60">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-white/60">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, i) => (
                          <tr key={i} className="border-b border-white/10 last:border-0">
                            <td className="px-4 py-3">{item.description}</td>
                            <td className="px-4 py-3 text-right text-white/80">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-white/80">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.total ?? item.quantity * item.unitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals ───────────────────────────────────────────────────── */}
              <div className="mt-6 space-y-2 sub-card">
                <div className="flex justify-between text-sm text-white/80">
                  <span>Subtotal</span>
                  <span>{formatCurrency(quotation.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-white/80">
                  <span>VAT ({((quotation.vatRate ?? 0.15) * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(quotation.vatAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-white/15 pt-2 text-base font-extrabold text-yellow-200">
                  <span>Total (incl. VAT)</span>
                  <span>{formatCurrency(quotation.totalAmount)}</span>
                </div>
              </div>

              {/* Notes ────────────────────────────────────────────────────── */}
              {quotation.notes && (
                <div className="mt-6 sub-card">
                  <p className="mb-1 field-kicker">Notes</p>
                  <p className="text-sm leading-6 text-white/80">{quotation.notes}</p>
                </div>
              )}
            </section>

            {/* ── Right column: decision panel ──────────────────────────── */}
            <section className="bg-white/5 p-6 text-white backdrop-blur-xl sm:p-8">
              <h2 className="text-xl font-extrabold">Your Response</h2>
              <p className="mt-2 text-sm text-white/70">
                Your decision is legally binding. Once submitted it cannot be changed through this link.
              </p>

              {/* Success message ─────────────────────────────────────────── */}
              {decisionMessage && (
                <div className={`mt-6 rounded-2xl border p-4 text-sm font-semibold ${
                  decisionType === 'accepted'
                    ? 'border-emerald-300/40 bg-emerald-500/20 text-emerald-100'
                    : 'border-rose-300/40 bg-rose-500/20 text-rose-100'
                }`}>
                  {decisionMessage}
                  {decisionType === 'accepted' && (
                    <p className="mt-2 text-xs font-normal text-emerald-200/80">
                      Our team will be in touch to confirm the work schedule.
                    </p>
                  )}
                </div>
              )}

              {/* Error message ───────────────────────────────────────────── */}
              {error && !decisionMessage && (
                <div className="mt-6 rounded-2xl border border-rose-300/40 bg-rose-500/20 p-4 text-sm text-rose-100">
                  {error}
                </div>
              )}

              {/* Already decided ─────────────────────────────────────────── */}
              {!canDecide && !decisionMessage && (
                <div className="mt-6 space-y-4">
                  <div className={`rounded-2xl border p-4 text-sm ${statusStyles[quotation.status] || statusStyles.draft}`}>
                    <p className="font-bold">{statusLabel[quotation.status] || quotation.status}</p>
                    {quotation.status === 'approved' && quotation.approvedDate && (
                      <p className="mt-1 text-xs opacity-80">Accepted on {formatDate(quotation.approvedDate)}</p>
                    )}
                    {quotation.status === 'rejected' && quotation.rejectedDate && (
                      <p className="mt-1 text-xs opacity-80">Declined on {formatDate(quotation.rejectedDate)}</p>
                    )}
                    {quotation.rejectionReason && (
                      <p className="mt-2 text-xs opacity-80">Reason: {quotation.rejectionReason}</p>
                    )}
                  </div>
                  {quotation.status === 'rejected' && (
                    <p className="text-xs text-white/60">
                      If you have changed your mind, please contact us directly to request a revised quotation.
                    </p>
                  )}
                </div>
              )}

              {canDecide && !decisionMessage && (
                <div className="mt-8 rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">Service Experience Check-In</p>
                  <p className="mt-2 text-sm text-cyan-50/80">Tell us how you feel at the quotation stage so we can correct any concern early.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr]">
                    <select
                      value={reviewState.rating}
                      onChange={(e) => setReviewState((current) => ({ ...current, rating: e.target.value }))}
                      className="rounded-xl border border-white/20 bg-slate-950/30 px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>{value} star{value !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={reviewState.feedback}
                      onChange={(e) => setReviewState((current) => ({ ...current, feedback: e.target.value }))}
                      placeholder="Optional comment about clarity, pricing, or communication"
                      className="rounded-xl border border-white/20 bg-slate-950/30 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Decision buttons ────────────────────────────────────────── */}
              {canDecide && !decisionMessage && (
                <div className="mt-8 space-y-4">
                  {/* Accept ───────────────────────────────────────────────── */}
                  <button
                    onClick={handleAccept}
                    disabled={submitting || showRejectForm}
                    className="w-full rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting && !showRejectForm ? 'Processing...' : '✓ Accept Quotation'}
                  </button>

                  {/* Reject ───────────────────────────────────────────────── */}
                  {!showRejectForm ? (
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={submitting}
                      className="w-full rounded-2xl border border-rose-400/60 bg-rose-500/20 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ✕ Decline Quotation
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 space-y-3">
                      <p className="text-sm font-semibold text-rose-100">Reason for declining (optional)</p>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Let us know why you are declining so we can improve our proposal..."
                        className="w-full rounded-xl border border-white/20 bg-slate-950/30 p-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-rose-400/50 resize-none"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleReject}
                          disabled={submitting}
                          className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400 disabled:opacity-50"
                        >
                          {submitting ? 'Submitting...' : 'Confirm Decline'}
                        </button>
                        <button
                          onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}
                          disabled={submitting}
                          className="flex-1 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white/80 hover:bg-white/10 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-white/50 text-center">
                    By accepting you confirm that you have reviewed all line items and pricing.
                  </p>
                </div>
              )}

              {/* PDF link ────────────────────────────────────────────────── */}
              <div className="mt-8 border-t border-white/10 pt-6">
                <a
                  href={`/api/quotations/share/${token}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  <span>📄</span> View PDF Version
                </a>
              </div>

              <p className="mt-6 text-center text-xs text-white/40">
                Powered by AppAtunid Field Service Management
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

export default QuotationApprovalPage;
