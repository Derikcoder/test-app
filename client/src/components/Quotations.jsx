import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import CreateQuoteModal from './CreateQuoteModal';

/**
 * Source label map for autoResolutionSnapshot source values
 */
const AUTO_RESOLUTION_SOURCE_LABELS = {
  'equipment-history': 'Equipment History',
  'booking-request': 'Service Booking Data',
  'generic-fallback': 'Generic Fallback',
};

/**
 * Confidence badge colour classes
 */
const CONFIDENCE_CLASS = {
  high: 'bg-green-500/30 text-green-200 border-green-400/50',
  medium: 'bg-yellow-500/30 text-yellow-200 border-yellow-400/50',
  low: 'bg-red-500/30 text-red-200 border-red-400/50',
};

/**
 * Format a date value to a readable locale string.
 * Returns 'N/A' for falsy values.
 * @param {string|Date|null} value
 * @returns {string}
 */
const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return 'N/A';
  }
};

/**
 * Format a number as ZAR currency.
 * @param {number} value
 * @returns {string}
 */
const formatCurrency = (value) => {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value);
};

/**
 * Status badge style map
 */
const STATUS_CLASS = {
  draft: 'bg-white/20 text-white/80 border-white/30',
  sent: 'bg-blue-500/30 text-blue-200 border-blue-400/50',
  approved: 'bg-green-500/30 text-green-200 border-green-400/50',
  rejected: 'bg-red-500/30 text-red-200 border-red-400/50',
  expired: 'bg-orange-500/30 text-orange-200 border-orange-400/50',
  converted: 'bg-purple-500/30 text-purple-200 border-purple-400/50',
};

/**
 * QuotationAuditPanel
 *
 * Renders the full autoResolutionSnapshot for a quotation in a collapsible
 * section so teams can audit the Auto template selection at any time.
 *
 * @param {{ snapshot: object }} props
 */
const QuotationAuditPanel = ({ snapshot }) => {
  if (!snapshot) return null;

  const {
    source,
    confidence,
    equipment,
    recentServiceHistory,
    historyStats,
    requestedContext,
    bookingSeed,
    evaluatedEquipment,
  } = snapshot;

  const sourceLabel = AUTO_RESOLUTION_SOURCE_LABELS[source] || source || 'Unknown';
  const confidenceLower = (confidence || '').toLowerCase();
  const confidenceBadgeClass = CONFIDENCE_CLASS[confidenceLower] || 'bg-white/20 text-white/80 border-white/30';

  return (
    <div className="mt-4 rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-4 space-y-4 text-sm">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <svg className="w-4 h-4 text-cyan-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        </svg>
        <span className="text-cyan-200 font-semibold">Auto Template Resolution Audit</span>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceBadgeClass}`}>
          {sourceLabel}
        </span>
        {confidence && (
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceBadgeClass}`}>
            {confidence} confidence
          </span>
        )}
      </div>

      {/* Requested context */}
      {requestedContext && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-cyan-100/80">
          {requestedContext.serviceType && (
            <div><span className="text-cyan-300/70">Requested service type:</span> {requestedContext.serviceType}</div>
          )}
          {requestedContext.siteId && (
            <div><span className="text-cyan-300/70">Site ID:</span> {String(requestedContext.siteId)}</div>
          )}
        </div>
      )}

      {/* Equipment identity */}
      {equipment && (
        <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-1">
          <p className="text-cyan-300/80 text-xs font-semibold uppercase tracking-wide mb-1">Selected Equipment</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {equipment.equipmentId && (
              <div><span className="text-white/60">Equipment ID:</span> <span className="text-white">{equipment.equipmentId}</span></div>
            )}
            {(equipment.brand || equipment.model) && (
              <div>
                <span className="text-white/60">Machine:</span>{' '}
                <span className="text-white">
                  {[equipment.brand, equipment.model].filter(Boolean).join(' ')}
                </span>
              </div>
            )}
            {equipment.equipmentType && (
              <div><span className="text-white/60">Type:</span> <span className="text-white">{equipment.equipmentType}</span></div>
            )}
            {equipment.serialNumber && (
              <div><span className="text-white/60">Serial:</span> <span className="text-white">{equipment.serialNumber}</span></div>
            )}
          </div>
        </div>
      )}

      {/* History stats */}
      {historyStats && (
        <div className="text-xs text-cyan-100/80">
          <span className="text-cyan-300/70">History considered: </span>
          <span>
            {historyStats.totalHistoryEventsConsidered ?? 0} event{historyStats.totalHistoryEventsConsidered !== 1 ? 's' : ''} across{' '}
            {historyStats.totalEquipmentEvaluated ?? 0} equipment record{historyStats.totalEquipmentEvaluated !== 1 ? 's' : ''}
          </span>
          {historyStats.matchedServiceTypeEvents > 0 && (
            <span className="ml-2 text-cyan-300/70">
              — {historyStats.matchedServiceTypeEvents} matched service type
            </span>
          )}
          {historyStats.selectedEquipmentScore > 0 && (
            <span className="ml-2">
              <span className="text-cyan-300/70">| Score: </span>
              <span className="text-white">{historyStats.selectedEquipmentScore}</span>
            </span>
          )}
        </div>
      )}

      {/* Recent service history */}
      {recentServiceHistory && recentServiceHistory.length > 0 && (
        <div className="rounded-lg bg-white/5 border border-white/10 p-3">
          <p className="text-cyan-300/80 text-xs font-semibold uppercase tracking-wide mb-2">
            Recent Service History ({recentServiceHistory.length} event{recentServiceHistory.length !== 1 ? 's' : ''})
          </p>
          <ul className="space-y-1">
            {recentServiceHistory.map((event, idx) => (
              <li key={event.callNumber || idx} className="text-xs text-white/80 flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="font-mono text-cyan-200">{event.callNumber || '—'}</span>
                <span>{event.serviceType || '—'}</span>
                <span className="text-white/50">{event.status || '—'}</span>
                <span className="text-white/40">{formatDate(event.completedDate || event.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evaluated equipment candidates */}
      {evaluatedEquipment && evaluatedEquipment.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-cyan-300/70 hover:text-cyan-200 select-none list-none flex items-center gap-1">
            <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            {evaluatedEquipment.length} equipment candidate{evaluatedEquipment.length !== 1 ? 's' : ''} evaluated
          </summary>
          <ul className="mt-2 space-y-1">
            {evaluatedEquipment.map((eq, idx) => (
              <li key={eq.equipmentId || idx} className="text-xs text-white/70 flex flex-wrap gap-x-3 gap-y-0.5 pl-4">
                <span className="font-mono text-white/50">{eq.equipmentId || '—'}</span>
                <span>{[eq.brand, eq.model].filter(Boolean).join(' ') || '—'}</span>
                <span className="text-cyan-300/60">score: {eq.score ?? '—'}</span>
                {eq.historyCount > 0 && (
                  <span className="text-white/40">{eq.historyCount} event{eq.historyCount !== 1 ? 's' : ''}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Booking seed (when source = booking-request) */}
      {bookingSeed && source === 'booking-request' && (
        <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-1">
          <p className="text-cyan-300/80 text-xs font-semibold uppercase tracking-wide mb-1">Booking Seed Data</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {bookingSeed.machineModelNumber && (
              <div><span className="text-white/60">Model Number:</span> <span className="text-white">{bookingSeed.machineModelNumber}</span></div>
            )}
            {bookingSeed.generatorMakeModel && (
              <div><span className="text-white/60">Generator:</span> <span className="text-white">{bookingSeed.generatorMakeModel}</span></div>
            )}
            {bookingSeed.generatorCapacityKva && (
              <div><span className="text-white/60">Capacity (kVA):</span> <span className="text-white">{bookingSeed.generatorCapacityKva}</span></div>
            )}
            {bookingSeed.siteName && (
              <div><span className="text-white/60">Site:</span> <span className="text-white">{bookingSeed.siteName}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Quotations page
 *
 * Lists all quotations for the authenticated user with filter controls.
 * Each quotation card exposes a collapsible "Template Resolution Audit"
 * panel that renders the full autoResolutionSnapshot so any team member
 * can audit how the Auto template was selected after quote creation.
 *
 * @returns {JSX.Element}
 */
const Quotations = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superAdmin' || user?.isSuperUser === true;
  const roleLabelMap = {
    superAdmin: 'Super Admin',
    businessAdministrator: 'Business Administrator',
    fieldServiceAgent: 'Field Service Agent',
    customer: 'Customer',
  };
  const roleLabel = roleLabelMap[user?.role] || (isSuperAdmin ? 'Super Admin' : 'Platform User');

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedAudit, setExpandedAudit] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [purging, setPurging] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  const isAdmin = isSuperAdmin || user?.role === 'businessAdministrator';

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const response = await api.get('/quotations', {
        headers: { Authorization: `Bearer ${user.token}` },
        params,
      });
      setQuotations(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  }, [user.token, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const toggleAudit = (id) => {
    setExpandedAudit((prev) => (prev === id ? null : id));
  };

  const handleDeleteQuotation = async (q) => {
    setDeletingId(q._id);
    setActionMsg('');
    setActionError('');
    try {
      await api.delete(`/quotations/${q._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setActionMsg(`Quotation ${q.quotationNumber} deleted.`);
      setPendingDeleteId('');
      await fetchQuotations();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to delete quotation.');
    } finally {
      setDeletingId('');
    }
  };

  const handlePurgeStale = async () => {
    setPurging(true);
    setActionMsg('');
    setActionError('');
    try {
      const res = await api.delete('/quotations/purge', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setActionMsg(res.data?.message || 'Purge complete.');
      await fetchQuotations();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Purge failed.');
    } finally {
      setPurging(false);
    }
  };

  const auditableCount = quotations.filter((q) => q.autoResolutionSnapshot).length;

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">

          {/* Page header */}
          <div className="mb-8">
            <h1 className="glass-heading text-3xl text-white">Quotations</h1>
            <p className="text-white/70 mt-1">
              Review all quotations and audit Auto template selections
              {auditableCount > 0 && (
                <span className="ml-2 text-cyan-300">
                  — {auditableCount} with template resolution data
                </span>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-orange-400/60 bg-orange-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-200">
                Entity: Quotations
              </span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                isSuperAdmin
                  ? 'border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-200'
                  : 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
              }`}>
                Role: {roleLabel}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="glass-pane rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-white/70 text-sm">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="glass-form-select rounded-lg px-3 py-1.5 bg-white/20 text-white border border-white/30 text-sm"
              >
                <option value="" className="bg-blue-900">All statuses</option>
                <option value="draft" className="bg-blue-900">Draft</option>
                <option value="sent" className="bg-blue-900">Sent</option>
                <option value="approved" className="bg-blue-900">Approved</option>
                <option value="rejected" className="bg-blue-900">Rejected</option>
                <option value="expired" className="bg-blue-900">Expired</option>
                <option value="converted" className="bg-blue-900">Converted</option>
              </select>
            </div>
            <button
              onClick={fetchQuotations}
              disabled={loading}
              className="glass-btn-secondary px-4 py-1.5 text-sm disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {isSuperAdmin && (
              <button
                onClick={handlePurgeStale}
                disabled={purging || loading}
                className="ml-auto glass-btn-secondary px-4 py-1.5 text-sm text-red-300 border-red-400/40 hover:bg-red-500/20 disabled:opacity-50"
              >
                {purging ? 'Purging…' : '🗑 Purge Stale'}
              </button>
            )}
          </div>

          {/* Action feedback */}
          {actionMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 text-sm">
              {actionMsg}
            </div>
          )}
          {actionError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-200 border border-red-400/40 text-sm">
              {actionError}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/30 text-red-200 border border-red-400/50">
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="glass-pane rounded-2xl p-6 animate-pulse">
                  <div className="h-4 bg-white/20 rounded w-1/3 mb-3" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && quotations.length === 0 && !error && (
            <div className="glass-pane rounded-2xl p-10 text-center text-white/60">
              <svg className="w-12 h-12 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-semibold text-white/70">No quotations found</p>
              <p className="text-sm mt-1">
                {statusFilter ? `No quotations with status "${statusFilter}".` : 'No quotations have been created yet.'}
              </p>
            </div>
          )}

          {/* Quotation cards */}
          {!loading && quotations.length > 0 && (
            <div className="space-y-4">
              {quotations.map((q) => {
                const hasSnapshot = Boolean(q.autoResolutionSnapshot);
                const isExpanded = expandedAudit === q._id;
                const statusClass = STATUS_CLASS[q.status] || 'bg-white/20 text-white/80 border-white/30';
                const customerName =
                  q.customer?.businessName ||
                  [q.customer?.contactFirstName, q.customer?.contactLastName].filter(Boolean).join(' ') ||
                  'Unknown customer';

                return (
                  <div key={q._id} className="glass-pane rounded-2xl p-6 shadow-lg">
                    {/* Card header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-white/50 text-xs">{q.quotationNumber}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusClass}`}>
                            {q.status}
                          </span>
                          {hasSnapshot && (
                            <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-300">
                              Auto resolved
                            </span>
                          )}
                        </div>
                        <h2 className="text-white font-semibold text-base leading-snug">{q.title}</h2>
                        <p className="text-white/60 text-sm">{customerName}</p>
                      </div>

                      {/* Financials */}
                      <div className="text-right space-y-1">
                        <p className="text-white font-bold text-lg">{formatCurrency(q.totalAmount)}</p>
                        <p className="text-white/50 text-xs">incl. VAT</p>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/60">
                      <span>
                        <span className="text-white/40">Service type: </span>
                        {q.serviceType || 'N/A'}
                      </span>
                      <span>
                        <span className="text-white/40">Created: </span>
                        {formatDate(q.createdAt)}
                      </span>
                      <span>
                        <span className="text-white/40">Valid until: </span>
                        {formatDate(q.validUntil)}
                      </span>
                      {q.convertedToServiceCall?.callNumber && (
                        <span>
                          <span className="text-white/40">Converted to: </span>
                          <span className="text-purple-300">{q.convertedToServiceCall.callNumber}</span>
                        </span>
                      )}
                    </div>

                    {/* Audit toggle */}
                    {hasSnapshot && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => toggleAudit(q._id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                          </svg>
                          {isExpanded ? 'Hide' : 'View'} Template Resolution Audit
                          <svg
                            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isExpanded && (
                          <QuotationAuditPanel snapshot={q.autoResolutionSnapshot} />
                        )}
                      </div>
                    )}

                    {/* No snapshot notice */}
                    {!hasSnapshot && (
                      <p className="mt-3 text-xs text-white/30 italic">
                        No template resolution data — quote was created manually or before auto-resolution was enabled.
                      </p>
                    )}

                    {/* Edit action — for draft/sent quotations */}
                    {(q.status === 'draft' || q.status === 'sent') && (
                      <div className="mt-3">
                        <CreateQuoteModal
                          token={user?.token}
                          isSuperUser={isAdmin}
                          editMode
                          existingQuotation={q}
                          triggerLabel="Edit quotation"
                          triggerClassName="text-xs text-amber-300/80 hover:text-amber-200 underline underline-offset-2"
                          onCreated={fetchQuotations}
                        />
                      </div>
                    )}

                    {/* Delete action — admin only, blocked for converted/approved */}
                    {isAdmin && q.status !== 'converted' && q.status !== 'approved' && (
                      <div className="mt-4 flex items-center gap-3">
                        {pendingDeleteId === q._id ? (
                          <>
                            <span className="text-xs text-red-300">Delete this quotation?</span>
                            <button
                              type="button"
                              disabled={deletingId === q._id}
                              onClick={() => handleDeleteQuotation(q)}
                              className="rounded-lg bg-red-500/25 border border-red-400/40 text-red-200 text-xs px-3 py-1 hover:bg-red-500/40 disabled:opacity-50"
                            >
                              {deletingId === q._id ? 'Deleting…' : 'Yes, delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId('')}
                              className="text-xs text-white/50 hover:text-white/80"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setPendingDeleteId(q._id); setActionMsg(''); setActionError(''); }}
                            className="text-xs text-red-400/70 hover:text-red-300 underline underline-offset-2"
                          >
                            Delete quotation
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Quotations;
