import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import apiClient from './api/client'
import { debugLog, debugError } from './utils/debug'
import { FULL_VERSION } from './version'
import './index.css'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        debugLog('SW registered:', registration)
      },
      (error) => {
        debugLog('SW registration failed:', error)
      }
    )
  })
}

// Log frontend version on startup
debugLog(`Chore-Ganizer Frontend v${FULL_VERSION}`)

// Initialize CSRF token on app load
apiClient.initCsrfToken().catch(debugError)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
