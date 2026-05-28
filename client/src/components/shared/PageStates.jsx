import PropTypes from 'prop-types';

const shellVariants = {
  full: 'page-shell page-shell--full glass-bg-particles bg-fixed',
  body: 'page-shell page-body',
  center: 'page-shell page-shell--center',
};

export const PageShell = ({ children, variant = 'body', className = '' }) => (
  <div className={`${shellVariants[variant] || shellVariants.body} ${className}`.trim()}>
    {children}
  </div>
);

export const LoadingState = ({
  message = 'Loading...',
  spinnerClassName = 'spinner-lg',
  className = '',
  messageClassName = 'state-loading__message state-loading__message--sm text-white/70',
}) => (
  <div className={`state-loading ${className}`.trim()}>
    <div className={spinnerClassName} />
    <p className={messageClassName}>{message}</p>
  </div>
);

export const ErrorState = ({
  message,
  defaultMessage = 'Something went wrong',
  className = '',
  title = 'Unable to continue',
  titleClassName = 'state-error__title text-lg font-bold text-white',
  messageClassName = 'state-error__message',
  onRetry,
  retryLabel = 'Try again',
}) => (
  <div className={`state-card state-card--panel text-center max-w-sm w-full ${className}`.trim()}>
    <h2 className={`state-error__title ${titleClassName}`.trim()}>{title}</h2>
    <p className={`state-error__message ${messageClassName}`.trim()}>{message || defaultMessage}</p>
    {onRetry && (
      <button onClick={onRetry} className="glass-btn-primary state-action-btn">
        {retryLabel}
      </button>
    )}
  </div>
);

export const EmptyState = ({
  title,
  message,
  defaultTitle = 'Nothing here yet',
  defaultMessage = 'There is no content to display right now.',
  icon,
  className = '',
  titleClassName = 'state-empty__title text-lg font-semibold text-white/70',
  messageClassName = 'state-empty__message',
  iconClassName = 'mx-auto mb-4 text-4xl',
  actionLabel,
  onAction,
}) => (
  <div className={`state-empty ${className}`.trim()}>
    {icon && <div className={iconClassName}>{icon}</div>}
    <p className={`state-empty__title ${titleClassName}`.trim()}>{title || defaultTitle}</p>
    <p className={`state-empty__message ${messageClassName}`.trim()}>{message || defaultMessage}</p>
    {actionLabel && onAction && (
      <button onClick={onAction} className="glass-btn-secondary state-action-btn">
        {actionLabel}
      </button>
    )}
  </div>
);

PageShell.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['full', 'body', 'center']),
  className: PropTypes.string,
};

LoadingState.propTypes = {
  message: PropTypes.string,
  spinnerClassName: PropTypes.string,
  className: PropTypes.string,
  messageClassName: PropTypes.string,
};

ErrorState.propTypes = {
  message: PropTypes.string,
  defaultMessage: PropTypes.string,
  className: PropTypes.string,
  title: PropTypes.string,
  titleClassName: PropTypes.string,
  messageClassName: PropTypes.string,
  onRetry: PropTypes.func,
  retryLabel: PropTypes.string,
};

EmptyState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  defaultTitle: PropTypes.string,
  defaultMessage: PropTypes.string,
  icon: PropTypes.node,
  className: PropTypes.string,
  titleClassName: PropTypes.string,
  messageClassName: PropTypes.string,
  iconClassName: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
};
