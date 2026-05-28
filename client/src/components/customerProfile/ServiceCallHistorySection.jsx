import PropTypes from 'prop-types';
import { SectionCard, CallHistoryRow } from './shared';

const ServiceCallHistorySection = ({
  callsLoading,
  serviceCalls,
  emptyMessage,
  onBookFirstService,
  callSummaryResolver,
  showCountWrapper = false,
}) => (
  <SectionCard title="Service Call History" icon="🔧">
    {callsLoading ? (
      <div className="flex items-center gap-3 py-2">
        <div className="spinner-sm" />
        <span className="text-sm text-white/50">Loading history…</span>
      </div>
    ) : serviceCalls.length === 0 ? (
      <div className="text-center py-6">
        <p className="text-3xl mb-2">📋</p>
        <p className="text-sm text-white/50">{emptyMessage}</p>
        <button
          onClick={onBookFirstService}
          className="mt-4 text-xs font-semibold text-yellow-300 hover:text-yellow-200 underline underline-offset-2 transition-colors"
        >
          Book the first service call →
        </button>
      </div>
    ) : (
      <>
        {showCountWrapper ? (
          <div className="flex items-center justify-between mb-1">
            <span className="service-call-count-text">{serviceCalls.length} call{serviceCalls.length !== 1 ? 's' : ''} found</span>
          </div>
        ) : (
          <span className="service-call-count-text">{serviceCalls.length} call{serviceCalls.length !== 1 ? 's' : ''} found</span>
        )}
        {serviceCalls
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map((call) => (
            <CallHistoryRow
              key={call._id}
              call={call}
              summaryResolver={callSummaryResolver}
            />
          ))}
      </>
    )}
  </SectionCard>
);

ServiceCallHistorySection.propTypes = {
  callsLoading: PropTypes.bool,
  serviceCalls: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    })
  ),
  emptyMessage: PropTypes.string,
  onBookFirstService: PropTypes.func,
  callSummaryResolver: PropTypes.func,
  showCountWrapper: PropTypes.bool,
};

ServiceCallHistorySection.defaultProps = {
  callsLoading: false,
  serviceCalls: [],
  emptyMessage: 'No service calls on record.',
  onBookFirstService: () => {},
  callSummaryResolver: null,
  showCountWrapper: false,
};

export default ServiceCallHistorySection;
