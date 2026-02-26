/**
 * @file axios.js
 * @description Centralized Axios configuration for API requests
 * @module API/Axios
 * 
 * Provides a pre-configured Axios instance with:
 * - Base URL configuration
 * - Request/response interceptors
 * - Global error handling
 * - Authentication token injection (ready for implementation)
 */

import axios from 'axios';

/**
 * Axios Instance Configuration
 * 
 * @constant {AxiosInstance} api
 * 
 * @description
 * Pre-configured Axios instance for all API calls.
 * Base URL is set to '/api' which Vite proxy forwards to http://localhost:5000
 * (see vite.config.js for proxy configuration)
 * 
 * Default headers:
 * - Content-Type: application/json
 */
const api = axios.create({
  baseURL: '/api', // Proxied to backend server via Vite
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * 
 * @description
 * Runs before every API request.
 * Used to inject JWT token from localStorage into Authorization header.
 * 
 * @example
 * // Token is automatically added to all requests:
 * api.get('/auth/profile') // Header: Authorization: Bearer <token>
 */
api.interceptors.request.use(
  (config) => {
    // Inject JWT token if available in localStorage
    // Uncomment these lines once AuthContext stores token in localStorage
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    // Handle request errors (e.g., network issues before request sent)
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * 
 * @description
 * Runs after every API response (success or error).
 * Used for global error handling and response transformation.
 * 
 * Common use cases:
 * - Log API errors for debugging
 * - Handle 401 Unauthorized (token expired)
 * - Handle 403 Forbidden (insufficient permissions)
 * - Display global error notifications
 */
api.interceptors.response.use(
  (response) => {
    // Pass through successful responses unchanged
    return response;
  },
  (error) => {
    // Handle errors globally
    console.error('API Error:', error);
    
    // Could add additional error handling here:
    // - if (error.response?.status === 401) { redirect to login }
    // - if (error.response?.status === 500) { show error toast }
    
    return Promise.reject(error);
  }
);

/**
 * @exports api - Configured Axios instance for making API requests
 * 
 * @example
 * import api from './api/axios';
 * 
 * // GET request
 * const response = await api.get('/users');
 * 
 * // POST request
 * const response = await api.post('/auth/login', { email, password });
 * 
 * // PUT request
 * const response = await api.put('/users/123', userData);
 * 
 * // DELETE request
 * const response = await api.delete('/users/123');
 */
export default api;
