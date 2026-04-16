/**
 * @file Login.jsx
 * @description User login page component
 * @module Components/Login
 * 
 * Provides authentication interface for existing users.
 * Handles login form submission and JWT token storage.
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getPostLoginRedirect } from '../utils/authRedirect';

/**
 * Login Component
 * 
 * @component
 * @returns {JSX.Element} Login form page
 * 
 * @description
 * Renders login form with email and password inputs.
 * Authenticates user against backend API and stores JWT token.
 * Redirects to profile page on successful login.
 * 
 * Features:
 * - Form validation (required fields, email format)
 * - Error message display
 * - Loading state during authentication
 * - Auto-redirect on success
 * - Link to registration page
 * 
 * @example
 * // In App.jsx routes:
 * <Route path="/login" element={<Login />} />
 */
const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [infoMessage, setInfoMessage] = useState('');

    useEffect(() => {
        const nextEmail = location.state?.email || '';
        const nextPassword = location.state?.password || '';
        const nextInfoMessage = location.state?.infoMessage || '';

        if (nextEmail || nextPassword) {
            setFormData({ email: nextEmail, password: nextPassword });
        }

        setInfoMessage(nextInfoMessage);
    }, [location.state]);

 /**
  * Handle Input Changes
  * 
  * @function handleChange
  * @param {Event} e - Input change event
  * 
  * @description
  * Updates form data state when user types in inputs.
  * Uses computed property names to update the correct field.
  * Clears any error messages when user starts typing again.
  */
    const handleChange = (e) => {
        if (error) {
            setError('');
        }

        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

 /**
  * Handle Form Submission
  * 
  * @async
  * @function handleSubmit
  * @param {Event} e - Form submit event
  * 
  * @description
  * Authenticates user credentials against the backend API.
  * On success:
  * - Stores user data and JWT token via AuthContext
  * - Redirects to profile page
  * On failure:
  * - Displays error message to user
  * 
  * @throws Displays user-friendly error if API call fails
  */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', formData);
            const data = response.data;
            login(data);
            navigate(getPostLoginRedirect(data));
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

 /**
  * Render Login Form
  * 
  * @description
  * Renders a centered login form with glassmorphic design.
  * Features:
  * - Frosted glass effect with backdrop blur
  * - Brand color scheme (primary blue, secondary yellow)
  * - Email and password inputs with glass styling
  * - Error message display with glass alert
  * - Submit button with primary brand gradient
  * - Link to registration page with glass link styling
  */
    return (
        <div className="glass-bg-particles min-h-screen bg-fixed auth-surface px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
                <section className="auth-aside-card">
                    <p className="auth-kicker">Appatunid Enterprise Suite</p>
                    <h1 className="auth-aside-title">Service Intelligence for Every Role</h1>
                    <p className="auth-aside-copy">
                        Secure sign-in for management, field technicians, and customer portals with auditable identity controls.
                    </p>
                    <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="auth-stat-card">
                            <p className="auth-stat-label">Identity</p>
                            <p className="auth-stat-value">Role-aware</p>
                        </div>
                        <div className="auth-stat-card">
                            <p className="auth-stat-label">Onboarding</p>
                            <p className="auth-stat-value">One-time key</p>
                        </div>
                        <div className="auth-stat-card">
                            <p className="auth-stat-label">Operations</p>
                            <p className="auth-stat-value">Audit trail</p>
                        </div>
                    </div>
                </section>

                <section className="glass-form max-w-none p-7 sm:p-9">
                    <h2 className="glass-heading text-left">Sign In</h2>
                    <p className="glass-heading-secondary mb-6 text-left">Access your dashboard with enterprise-grade security.</p>

                    {infoMessage && (
                        <div className="mb-5 rounded-2xl border border-cyan-400/40 bg-cyan-500/15 p-4 text-sm text-cyan-50">
                            <p className="font-semibold">Customer onboarding ready</p>
                            <p className="mt-1 text-cyan-100/90">{infoMessage}</p>
                            {location.state?.password ? (
                                <p className="mt-2 font-mono text-base font-bold tracking-[0.2em] text-yellow-200">
                                    {location.state.password}
                                </p>
                            ) : null}
                        </div>
                    )}

                    {error && (
                        <div className="glass-alert-error mb-5">
                            <svg className="mr-3 h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="font-medium" style={{ color: '#ee5a52' }}>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="glass-form-group mb-0">
                            <label htmlFor="email" className="glass-form-label">Business Email</label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoComplete="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="glass-form-input"
                                placeholder="you@company.com"
                            />
                        </div>

                        <div className="glass-form-group mb-0">
                            <div className="mb-2 flex items-center justify-between">
                                <label htmlFor="password" className="glass-form-label mb-0">Password</label>
                                <button
                                    type="button"
                                    onClick={() => navigate('/forgot-password')}
                                    className="text-sm font-semibold transition-colors duration-200"
                                    style={{ color: 'var(--secondary)' }}
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                value={formData.password}
                                onChange={handleChange}
                                className="glass-form-input"
                                placeholder="Enter your secure password"
                            />
                        </div>

                        <button type="submit" disabled={loading} className="glass-btn-primary mt-2">
                            {loading ? 'Authenticating...' : 'Sign In Securely'}
                        </button>

                        <div className="glass-divider my-5">
                            <span className="glass-divider-text">NEW TO APPATUNID</span>
                        </div>

                        <button type="button" onClick={() => navigate('/register')} className="glass-btn-outline">
                            Create Enterprise Account
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default Login;
