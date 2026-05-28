import PropTypes from 'prop-types';
import Sidebar from '../Sidebar';
import { ErrorState, LoadingState, PageShell } from '../shared/PageStates';

const avatarStyle = {
  background: 'linear-gradient(135deg, #05198C 0%, #1a3ba8 100%)',
  color: '#FFFB28',
  border: '2px solid rgba(255,251,40,0.3)',
};

const CustomerProfileLayout = ({
  loading,
  error,
  hasCustomer,
  onBack,
  backLabel,
  avatarText,
  title,
  accountStatus,
  statusClass,
  meta,
  badge,
  onBookService,
  children,
}) => {
  if (loading) {
    return (
      <>
        <Sidebar />
        <PageShell variant="center">
          <LoadingState message="Loading profile…" />
        </PageShell>
      </>
    );
  }

  if (error || !hasCustomer) {
    return (
      <>
        <Sidebar />
        <PageShell variant="center" className="px-4">
          <ErrorState message={error || 'Customer not found'} onRetry={onBack} retryLabel={`← ${backLabel}`} />
        </PageShell>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <PageShell variant="full" className="bg-fixed pt-20 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1040px] mx-auto space-y-6">
          <button onClick={onBack} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
            <span>←</span> {backLabel}
          </button>

          <div className="glass-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div
                className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-extrabold text-xl sm:text-2xl select-none"
                style={avatarStyle}
              >
                {avatarText}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{title}</h1>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${statusClass}`}>
                    {accountStatus}
                  </span>
                  {badge}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50 mt-1">{meta}</div>
              </div>
              <div className="shrink-0">
                <button
                  onClick={onBookService}
                  className="glass-btn-secondary page-action-button py-2.5 px-6 text-sm w-full sm:w-auto"
                >
                  + Book Service
                </button>
              </div>
            </div>
          </div>

          {children}
        </div>
      </PageShell>
    </>
  );
};

CustomerProfileLayout.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  hasCustomer: PropTypes.bool,
  onBack: PropTypes.func.isRequired,
  backLabel: PropTypes.string,
  avatarText: PropTypes.string,
  title: PropTypes.string,
  accountStatus: PropTypes.string,
  statusClass: PropTypes.string,
  meta: PropTypes.node,
  badge: PropTypes.node,
  onBookService: PropTypes.func.isRequired,
  children: PropTypes.node,
};

CustomerProfileLayout.defaultProps = {
  loading: false,
  error: '',
  hasCustomer: false,
  backLabel: 'Back',
  avatarText: '?',
  title: '',
  accountStatus: 'unknown',
  statusClass: 'bg-white/10 text-white/60',
  meta: null,
  badge: null,
  children: null,
};

export default CustomerProfileLayout;
