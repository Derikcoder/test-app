/**
 * @file main.jsx
 * @description React application entry point
 * @module Main
 * 
 * Bootstraps the React application and mounts it to the DOM.
 * Wraps the app in StrictMode for additional development checks.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // Global styles including Tailwind CSS
import App from './App.jsx'

/**
 * Application Bootstrap
 * 
 * - Finds the root DOM element (id="root" in index.html)
 * - Creates a React root using React 18's createRoot API
 * - Renders the App component wrapped in StrictMode
 * 
 * StrictMode enables:
 * - Detection of unsafe lifecycles
 * - Warning about legacy string ref API
 * - Warning about deprecated findDOMNode usage
 * - Detection of unexpected side effects
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
