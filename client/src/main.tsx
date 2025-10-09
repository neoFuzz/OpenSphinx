/**
 * Main entry point for the OpenSphinx React application
 * 
 * Initializes the React application with:
 * - Bootstrap CSS for styling
 * - React StrictMode for development checks
 * - Error handling for missing root element and render failures
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App'

/** Get the root DOM element where React will mount */
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
  throw new Error('Root element not found');
}

/** Render the React application with error handling */
try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  console.error('Failed to render app:', error);
}
