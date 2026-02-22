import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import apiClient from './api/client'
import { FULL_VERSION } from './version'
import './index.css'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('SW registered:', registration)
      },
      (error) => {
        console.log('SW registration failed:', error)
      }
    )
  })
}

// Log frontend version on startup
console.log(`Chore-Ganizer Frontend v${FULL_VERSION}`)

// Initialize CSRF token on app load
apiClient.initCsrfToken().catch(console.error)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
