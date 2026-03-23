/**
 * @file PageLoader.jsx
 * @description Loading spinner component used as Suspense fallback for lazy-loaded routes
 * @module PageLoader
 * 
 * Displays a full-screen loading indicator with glassmorphism styling,
 * used by React.lazy routes during code-splitting delays.
 */

/**
 * Page Loading Component
 * 
 * @component
 * @param {Object} props
 * @param {string} [props.message='Loading...'] - Optional loading message text
 * @returns {JSX.Element} Full-screen loading spinner with glass effect
 * 
 * @description
 * Displays a centered loading spinner with glassmorphism background.
 * Ideal for use as a Suspense fallback during route transitions.
 * 
 * @example
 * <Suspense fallback={<PageLoader />}>
 *   <YourComponent />
 * </Suspense>
 */
const PageLoader = ({ message = 'Loading...' }) => {
  return (
    <div className="glass-bg-particles min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 flex items-center justify-center px-6">
      <div className="glass-pane w-full max-w-xl p-8 text-center text-white">
        <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-white/80 border-b-transparent"></div>
        <p className="text-lg font-semibold">{message}</p>
      </div>
    </div>
  );
};

export default PageLoader;
