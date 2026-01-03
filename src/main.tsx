/**
 * InsightCast Entry Point
 * 
 * Bootstraps the React application with the InsightProvider context.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { InsightProvider } from './hooks';
import './index.css';

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root element');
}

// Create React root and render
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <InsightProvider>
      <App />
    </InsightProvider>
  </React.StrictMode>
);
