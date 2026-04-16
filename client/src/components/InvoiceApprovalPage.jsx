/**
 * @file InvoiceApprovalPage.jsx
 * @description Public customer page for reviewing and approving or rejecting a shared pro-forma invoice
 * @module Components/InvoiceApprovalPage
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const formatCurrency = (value) => new Intl.NumberFormat('en-ZA', {
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
  draft: 'bg-white/15 text-white border-white/20',
  awaitingApproval: 'bg-amber-300/20 text-amber-100 border-amber-200/30',
  approved: 'bg-emerald-300/20 text-emerald-100 border-emerald-200/30',
  rejected: 'bg-rose-300/20 text-rose-100 border-rose-200/30',
  finalized: 'bg-sky-300/20 text-sky-100 border-sky-200/30',
};

/**
 * Public approval page for tokenized pro-forma documents.
 *
 * @returns {JSX.Element} Approval page content
 */
function InvoiceApprovalPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [decisionMessage, setDecisionMessage] = useState('');
  const [formState, setFormState] = useState({
    approvalReference: '',
    approvalNotes: '',
    rating: '5',
    feedback: '',
  });

  useEffect(() => {
    let isCancelled = false;

    const loadSharedDocument = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/invoices/share/${token}`);

        if (isCancelled) return;

        setDocumentData(response.data);
        setFormState({
          approvalReference: response.data.siteInstruction?.approvalReference || '',
          approvalNotes: response.data.siteInstruction?.approvalNotes || '',
          rating: '5',
          feedback: '',
        });
      } catch (loadError) {
        if (isCancelled) return;
        setError(loadError.response?.data?.message || 'Unable to load this shared pro-forma.');
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadSharedDocument();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  const handleDecision = async (decision) => {
    try {
      setSubmitting(true);
      setError('');
      setDecisionMessage('');

      const response = await api.post(`/invoices/share/${token}/decision`, {
        decision,
        approvalReference: formState.approvalReference,
        approvalNotes: formState.approvalNotes,
        rating: Number(formState.rating || 5),
        feedback: formState.feedback || '',
      });

      setDecisionMessage(response.data.message);
      setDocumentData((current) => {
        if (!current) return current;

        return {
          ...current,
          workflowStatus: response.data.workflowStatus,
          approvalAllowed: false,
          siteInstruction: {
            ...(current.siteInstruction || {}),
            approvalReference: formState.approvalReference,
            approvalNotes: formState.approvalNotes,
            approvedAt: decision === 'approved' ? new Date().toISOString() : current.siteInstruction?.approvedAt,
            rejectedAt: decision === 'rejected' ? new Date().toISOString() : current.siteInstruction?.rejectedAt,
          },
        };
      });

      if (decision === 'approved' && response.data?.portalUser?.email) {
        navigate('/login', {
          state: {
            email: response.data.portalUser.email,
            password: response.data.portalUser.temporaryAccessKey || '',
            infoMessage: 'Your customer portal is ready. Use the temporary secret access key below as your password, then update it from your profile after login.',
          },
        });
      }
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Unable to submit your decision.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-bg-particles min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 flex items-center justify-center px-6">
        <div className="glass-pane w-full max-w-xl p-8 text-center text-white">
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-white/80 border-b-transparent"></div>
          <p className="text-lg font-semibold">Loading shared pro-forma...</p>
        </div>
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="glass-bg-particles min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 flex items-center justify-center px-6">
        <div className="glass-pane w-full max-w-2xl p-8 text-center text-white">
          <h1 className="text-2xl font-extrabold">Shared Document Unavailable</h1>
          <p className="mt-4 text-sm text-white/80">{error || 'This approval link is unavailable.'}</p>
        </div>
      </div>
    );
  }

  const customerName = [
    documentData.customer?.contactFirstName,
    documentData.customer?.contactLastName,
  ].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,251,40,0.18),_transparent_24%),linear-gradient(160deg,_#020f5f_0%,_#05208f_42%,_#0a4fc0_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="glass-pane overflow-hidden rounded-[28px] border border-white/20 shadow-2xl">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="border-b border-white/10 bg-white/10 p-6 text-white backdrop-blur-xl sm:p-8 lg:border-b-0 lg:border-r">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-950">
                  Customer Review
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${statusStyles[documentData.workflowStatus] || statusStyles.draft}`}>
                  {documentData.workflowStatus}
                </span>
              </div>

              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-300/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
                  Entity: Invoices / Pro-Forma
                </span>
                <span className="rounded-full border border-cyan-300/40 bg-cyan-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">
                  Access: Public Customer Approval
                </span>
              </div>

              <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
                {documentData.title || 'Pro-forma Site Instruction'}
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
                Review the work proposal, site instruction notes, pricing, and deposit requirements. Use the approval controls once you are satisfied with the additional work requested on site.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="sub-card">
                  <p className="field-kicker">Document</p>
                  <p className="mt-2 text-lg font-bold">{documentData.invoiceNumber}</p>
                  <p className="mt-1 text-sm text-white/70">{documentData.documentType === 'proForma' ? 'Pro-forma site instruction' : documentData.documentType}</p>
                </div>
                <div className="sub-card">
                  <p className="field-kicker">Customer</p>
                  <p className="mt-2 text-lg font-bold">{documentData.customer?.businessName || customerName || 'Customer'}</p>
                  <p className="mt-1 text-sm text-white/70">{customerName || 'Customer contact not specified'}</p>
                </div>
                <div className="sub-card">
                  <p className="field-kicker">Service Date</p>
                  <p className="mt-2 text-lg font-bold">{formatDate(documentData.serviceDate)}</p>
                  <p className="mt-1 text-sm text-white/70">{documentData.serviceType || 'General service work'}</p>
                </div>
                <div className="sub-card">
                  <p className="field-kicker">Total Value</p>
                  <p className="mt-2 text-lg font-bold text-yellow-200">{formatCurrency(documentData.totalAmount)}</p>
                  <p className="mt-1 text-sm text-white/70">VAT included</p>
                </div>
              </div>

              {documentData.description ? (
                <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-5">
                  <p className="field-kicker">Summary</p>
                  <p className="mt-3 text-sm leading-6 text-white/85">{documentData.description}</p>
                </div>
              ) : null}

              <div className="mt-8 grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
                  <p className="field-kicker">Problems Found</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/85">
                    {documentData.siteInstruction?.problemsFound || 'No site findings were captured on this document.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
                  <p className="field-kicker">Recommended Solution</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/85">
                    {documentData.siteInstruction?.recommendedSolution || 'No recommended solution was captured on this document.'}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-white/15 bg-slate-950/25 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="field-kicker">Line Items</p>
                    <p className="mt-1 text-sm text-white/70">Detailed pricing for the requested work.</p>
                  </div>
                  <a
                    href={documentData.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-yellow-300/70 bg-yellow-300 px-4 py-2 text-sm font-extrabold uppercase tracking-[0.14em] text-blue-950 transition hover:bg-yellow-200"
                  >
                    View PDF
                  </a>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  <div className="grid grid-cols-[minmax(0,1.4fr)_auto_auto_auto] gap-3 bg-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white/65">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Rate</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {(documentData.lineItems || []).map((item, index) => (
                    <div key={`${item.description || 'item'}-${index}`} className="grid grid-cols-[minmax(0,1.4fr)_auto_auto_auto] gap-3 border-t border-white/10 px-4 py-3 text-sm text-white/85">
                      <span className="min-w-0">{item.description || 'Line item'}</span>
                      <span className="text-right">{item.quantity || 0}</span>
                      <span className="text-right">{formatCurrency(item.unitPrice)}</span>
                      <span className="text-right font-semibold">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="bg-slate-950/35 p-6 text-white backdrop-blur-xl sm:p-8">
              <h2 className="text-2xl font-extrabold">Approval Decision</h2>
              <p className="mt-3 text-sm leading-6 text-white/75">
                Enter an approval reference if your internal process requires one, add any notes for the field agent, then approve or reject the requested work.
              </p>

              {error ? (
                <div className="mt-6 rounded-2xl border border-rose-300/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              {decisionMessage ? (
                <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
                  {decisionMessage}
                </div>
              ) : null}

              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">Service Experience Check-In</p>
                  <p className="mt-2 text-sm text-cyan-50/80">Share how the process feels at this pro-forma stage so the team can realign quickly if needed.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr]">
                    <select
                      value={formState.rating}
                      onChange={(event) => setFormState((current) => ({ ...current, rating: event.target.value }))}
                      disabled={!documentData.approvalAllowed || submitting}
                      className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-300"
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>{value} star{value !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={formState.feedback}
                      onChange={(event) => setFormState((current) => ({ ...current, feedback: event.target.value }))}
                      disabled={!documentData.approvalAllowed || submitting}
                      className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-yellow-300"
                      placeholder="Optional comment on communication, confidence, or turnaround"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/60" htmlFor="approvalReference">
                    Approval Reference
                  </label>
                  <input
                    id="approvalReference"
                    type="text"
                    value={formState.approvalReference}
                    onChange={(event) => setFormState((current) => ({ ...current, approvalReference: event.target.value }))}
                    disabled={!documentData.approvalAllowed || submitting}
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-yellow-300"
                    placeholder="PO number, approval code, or internal ref"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/60" htmlFor="approvalNotes">
                    Notes
                  </label>
                  <textarea
                    id="approvalNotes"
                    value={formState.approvalNotes}
                    onChange={(event) => setFormState((current) => ({ ...current, approvalNotes: event.target.value }))}
                    disabled={!documentData.approvalAllowed || submitting}
                    className="min-h-[140px] w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-yellow-300"
                    placeholder="Add any instructions or conditions for the field team"
                  />
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-5">
                <p className="field-kicker">Cost Summary</p>
                <div className="mt-4 space-y-3 text-sm text-white/85">
                  <div className="flex items-center justify-between gap-4">
                    <span>Parts</span>
                    <span>{formatCurrency(documentData.partsCost)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Labour</span>
                    <span>{formatCurrency(documentData.laborCost)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Travel</span>
                    <span>{formatCurrency(documentData.travelCost)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Consumables</span>
                    <span>{formatCurrency(documentData.consumablesCost)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3">
                    <span>Subtotal</span>
                    <span>{formatCurrency(documentData.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>VAT</span>
                    <span>{formatCurrency(documentData.vatAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3 text-base font-bold text-yellow-200">
                    <span>Total</span>
                    <span>{formatCurrency(documentData.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {documentData.depositRequired ? (
                <div className="mt-6 rounded-2xl border border-yellow-300/35 bg-yellow-300/10 p-5 text-sm text-yellow-50">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-yellow-100/80">Deposit Required</p>
                  <p className="mt-3 text-2xl font-extrabold">{formatCurrency(documentData.depositAmount)}</p>
                  <p className="mt-2 leading-6 text-yellow-50/85">{documentData.depositReason || 'A deposit is required before additional work proceeds.'}</p>
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleDecision('approved')}
                  disabled={!documentData.approvalAllowed || submitting}
                  className="flex-1 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Approve Work'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision('rejected')}
                  disabled={!documentData.approvalAllowed || submitting}
                  className="flex-1 rounded-2xl border border-rose-300/40 bg-rose-500/15 px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Reject Work'}
                </button>
              </div>

              {!documentData.approvalAllowed ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                  This pro-forma is no longer awaiting a customer decision. Current status: <strong className="text-white">{documentData.workflowStatus}</strong>.
                </div>
              ) : null}

              {(documentData.notes || documentData.terms) ? (
                <div className="mt-8 space-y-4">
                  {documentData.notes ? (
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
                      <p className="field-kicker">Notes</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/85">{documentData.notes}</p>
                    </div>
                  ) : null}
                  {documentData.terms ? (
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
                      <p className="field-kicker">Terms</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/85">{documentData.terms}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceApprovalPage;