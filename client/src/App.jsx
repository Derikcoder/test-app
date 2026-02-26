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
import UserProfile from './components/UserProfile';
import FieldServiceAgents from './components/FieldServiceAgents';
import AgentProfile from './components/AgentProfile';
import Customers from './components/Customers';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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

