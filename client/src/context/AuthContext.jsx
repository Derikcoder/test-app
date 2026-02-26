/**
 * @file AuthContext.jsx
 * @description Global authentication state management using React Context API
 * @module Context/Auth
 * 
 * Provides authentication state and methods to the entire application.
 * Manages user data, login/logout operations, and JWT token storage.
 */

import { createContext, useContext, useState, useEffect } from 'react';

/**
 * Authentication Context
 * 
 * @type {React.Context}
 * @description
 * React Context for sharing authentication state across the component tree.
 * Provides user data and authentication methods to all child components.
 */
const AuthContext = createContext(null);

/**
 * Authentication Provider Component
 * 
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to wrap with auth context
 * 
 * @description
 * Wraps the application and provides authentication state/methods via Context API.
 * Automatically restores user session from localStorage on mount.
 * 
 * State Management:
 * - user: Current user object (null if not logged in)
 * - loading: Boolean indicating if auth status is being checked
 * 
 * Methods Provided:
 * - login(userData): Log in user and store data
 * - logout(): Clear user data and log out
 * - updateUser(userData): Update current user data
 * 
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export const AuthProvider = ({ children }) => {
  // Current authenticated user data (null if not logged in)
  const [user, setUser] = useState(null);
  
  // Loading state for initial auth check
  const [loading, setLoading] = useState(true);

  /**
   * Initialize Authentication State
   * 
   * @description
   * Runs once on component mount to restore user session from localStorage.
   * Prevents users from being logged out on page refresh.
   * 
   * Sets loading to false after checking, allowing app to render.
   */
  useEffect(() => {
    // Attempt to retrieve stored user data from localStorage
    const userInfo = localStorage.getItem('userInfo');
    
    if (userInfo) {
      // Parse and restore user session
      setUser(JSON.parse(userInfo));
    }
    
    // Mark initialization complete
    setLoading(false);
  }, []); // Empty dependency array = run once on mount

  /**
   * Login User
   * 
   * @function login
   * @param {Object} userData - User data from successful login/registration
   * @param {string} userData.token - JWT authentication token
   * @param {string} userData.email - User's email
   * @param {string} userData._id - User's database ID
   * 
   * @description
   * Stores user data in state and localStorage.
   * Called after successful login or registration.
   * 
   * @example
   * const { login } = useAuth();
   * login({ token: 'jwt123...', email: 'user@example.com', ... });
   */
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('userInfo', JSON.stringify(userData));
  };

  /**
   * Logout User
   * 
   * @function logout
   * 
   * @description
   * Clears user data from state and localStorage.
   * User will be redirected to login page by ProtectedRoute components.
   * 
   * @example
   * const { logout } = useAuth();
   * logout(); // User is logged out and session cleared
   */
  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
  };

  /**
   * Update User Data
   * 
   * @function updateUser
   * @param {Object} userData - Updated user data
   * 
   * @description
   * Updates user data in state and localStorage.
   * Called after successful profile updates.
   * Keeps user session in sync with backend changes.
   * 
   * @example
   * const { updateUser } = useAuth();
   * updateUser({ ...user, phoneNumber: '+27123456789' });
   */
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('userInfo', JSON.stringify(userData));
  };

  /**
   * Context Value
   * Object containing all authentication state and methods
   * available to consuming components
   */
  const value = {
    user,        // Current user object or null
    login,       // Login function
    logout,      // Logout function
    updateUser,  // Update user function
    loading,     // Loading state (true during initial check)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth Hook
 * 
 * @hook
 * @returns {Object} Authentication context value
 * @returns {Object|null} returns.user - Current user or null
 * @returns {Function} returns.login - Login function
 * @returns {Function} returns.logout - Logout function
 * @returns {Function} returns.updateUser - Update user function
 * @returns {boolean} returns.loading - Loading state
 * 
 * @throws {Error} If used outside of AuthProvider
 * 
 * @description
 * Custom hook to access authentication context in components.
 * Must be used within an AuthProvider component.
 * 
 * @example
 * function MyComponent() {
 *   const { user, login, logout, loading } = useAuth();
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <div>Please login</div>;
 *   
 *   return <div>Welcome, {user.userName}!</div>;
 * }
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Ensure hook is used within AuthProvider
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
