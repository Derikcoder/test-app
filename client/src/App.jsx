/**
 * @file App.jsx
 * @description Main application component with routing and authentication
 * @module App
 * 
 * Sets up the application structure including:
 * - Authentication context provider
 * - React Router configuration
 * - Protected route handling
 * - Route definitions for all pages
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Register from './components/Register';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import UserProfile from './components/UserProfile';
import FieldServiceAgents from './components/FieldServiceAgents';
import AgentProfile from './components/AgentProfile';
import Customers from './components/Customers';
import HeadOfficeCustomer from './components/HeadOfficeCustomer';
import BranchCustomer from './components/BranchCustomer';
import FranchiseCustomer from './components/FranchiseCustomer';
import SingleBusinessCustomer from './components/SingleBusinessCustomer';
import ResidentialCustomer from './components/ResidentialCustomer';
import ServiceCalls from './components/ServiceCalls';

/**
 * Protected Route Wrapper Component
 * 
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * 
 * @description
 * Higher-order component that protects routes requiring authentication.
 * Displays loading spinner while checking auth status.
 * Redirects to login if user is not authenticated.
 * 
 * @example
 * <ProtectedRoute>
 *   <UserProfile />
 * </ProtectedRoute>
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while authentication status is being determined
  if (loading) {
    return (
      <div className="glass-bg-particles min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-b-transparent mx-auto mb-4"></div>
          <p className="text-lg font-semibold opacity-90" style={{ color: 'white' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated, otherwise render children
  return user ? children : <Navigate to="/login" />;
};

/**
 * Main Application Component
 * 
 * @component
 * @returns {JSX.Element} The complete application with routing
 * 
 * @description
 * Root component that sets up:
 * - Authentication context (AuthProvider)
 * - Client-side routing (Router)
 * - Route protection for authenticated pages
 * - Default route redirect to login
 * 
 * Routes:
 * - Public: /register, /login
 * - Protected: /profile, /agents, /agents/:id, /customers, /service-calls
 * - Default: / → redirects to /login
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes - Accessible without authentication */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Protected Routes - Require authentication */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute>
                <FieldServiceAgents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents/:id"
            element={
              <ProtectedRoute>
                <AgentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/head-office/:id"
            element={
              <ProtectedRoute>
                <HeadOfficeCustomer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/branch/:id"
            element={
              <ProtectedRoute>
                <BranchCustomer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/franchise/:id"
            element={
              <ProtectedRoute>
                <FranchiseCustomer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/single-business/:id"
            element={
              <ProtectedRoute>
                <SingleBusinessCustomer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/residential/:id"
            element={
              <ProtectedRoute>
                <ResidentialCustomer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-calls"
            element={
              <ProtectedRoute>
                <ServiceCalls />
              </ProtectedRoute>
            }
          />
          
          {/* Default Route - Redirect to login */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

