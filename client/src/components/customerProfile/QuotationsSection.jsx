import PropTypes from 'prop-types';
import { SectionCard } from './shared';

const STATUS_STYLES = {
  draft: 'bg-white/10 text-white/60 border-white/20',
  sent: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
  approved: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
};

const QuotationsSection = ({
  quotations,
  quotsLoading,
  isOwnProfile,
  nonOwnProfileText = 'Customer accepts or declines from their own portal.',
  draftHintText = null,
  quotActionState,
  rejectingId,
  rejectReason,
  setRejectingId,
  setRejectReason,
  handleAcceptQuot,
  handleRejectQuot,
  formatDate,
}) => (
  <SectionCard title="Active Quotations" icon="📄">
    {quotsLoading ? (
      <div className="flex items-center gap-3 py-2">
        <div className="spinner-sm" />
        <span className="text-sm text-white/50">Loading quotations…</span>
      </div>
    ) : quotations.length === 0 ? (
      <p className="text-sm text-white/40">No active quotations</p>
    ) : (
      <>
        {isOwnProfile
          ? <p className="text-xs text-white/40 mb-3">Review and accept or decline your pending quotes below.</p>
          : <p className="text-xs text-white/40 mb-3">{nonOwnProfileText}</p>
        }
        {quotations.map((q) => {
          const badgeClass = STATUS_STYLES[q.status] || STATUS_STYLES.draft;
          return (
            <div key={q._id} className="flex items-start justify-between gap-4 py-3 border-b border-white/10 last:border-0">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white/90">{q.quotationNumber}</span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
                    {q.status}
                  </span>
                </div>
                <span className="text-xs text-white/60 truncate">{q.title}</span>
                <span className="text-xs text-white/40">Valid until {formatDate(q.validUntil)}</span>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-sm font-bold text-yellow-300">R {Number(q.totalAmount ?? 0).toFixed(2)}</span>
                {isOwnProfile && q.status === 'sent' && q.shareToken && (
                  new Date(q.validUntil) < new Date() ? (
                    <span className="text-[10px] text-orange-300/70 italic">Expired</span>
                  ) : quotActionState[q._id] === 'accepted' ? (
                    <span className="text-[10px] font-semibold text-emerald-300">✓ Accepted</span>
                  ) : quotActionState[q._id] === 'rejected' ? (
                    <span className="text-[10px] font-semibold text-red-300">✗ Declined</span>
                  ) : rejectingId === q._id ? (
                    <div className="flex flex-col gap-1 items-end">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white/80 placeholder:text-white/30 w-36 focus:outline-none"
                      />
                      <div className="flex gap-1">
                        <button
                          disabled={quotActionState[q._id] === 'loading'}
                          onClick={() => handleRejectQuot(q)}
                          className="quote-inline-action-btn quote-inline-action-btn--danger"
                        >
                          {quotActionState[q._id] === 'loading' ? '…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        disabled={quotActionState[q._id] === 'loading'}
                        onClick={() => handleAcceptQuot(q)}
                        className="text-[10px] font-semibold text-emerald-300 hover:text-emerald-200 transition-colors px-2 py-0.5 border border-emerald-400/30 rounded"
                      >
                        {quotActionState[q._id] === 'loading' ? '…' : 'Accept'}
                      </button>
                      <button
                        onClick={() => setRejectingId(q._id)}
                        className="quote-inline-action-btn quote-inline-action-btn--danger"
                      >
                        Decline
                      </button>
                    </div>
                  )
                )}
                {!isOwnProfile && q.shareToken && q.status === 'sent' && (
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/quotation-approval/${q.shareToken}`).catch(() => {})}
                    className="text-[10px] font-semibold text-blue-300 hover:text-blue-200 underline underline-offset-2 transition-colors"
                  >
                    Copy acceptance link
                  </button>
                )}
                {draftHintText && q.status === 'draft' && (
                  <span className="text-[10px] text-white/40 italic">{draftHintText}</span>
                )}
              </div>
            </div>
          );
        })}
      </>
    )}
  </SectionCard>
);

QuotationsSection.propTypes = {
  quotations: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      quotationNumber: PropTypes.string,
      status: PropTypes.string,
      title: PropTypes.string,
      validUntil: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      totalAmount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      shareToken: PropTypes.string,
    })
  ),
  quotsLoading: PropTypes.bool,
  isOwnProfile: PropTypes.bool,
  nonOwnProfileText: PropTypes.string,
  draftHintText: PropTypes.string,
  quotActionState: PropTypes.objectOf(PropTypes.string),
  rejectingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  rejectReason: PropTypes.string,
  setRejectingId: PropTypes.func.isRequired,
  setRejectReason: PropTypes.func.isRequired,
  handleAcceptQuot: PropTypes.func.isRequired,
  handleRejectQuot: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
};

QuotationsSection.defaultProps = {
  quotations: [],
  quotsLoading: false,
  isOwnProfile: false,
  nonOwnProfileText: 'Customer accepts or declines from their own portal.',
  draftHintText: null,
  quotActionState: {},
  rejectingId: null,
  rejectReason: '',
};

export default QuotationsSection;
