import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { z } from 'zod'
import App from './App.jsx'

// Prevent Zod from attempting eval/new Function() probes under strict CSP
z.config({ jitless: true })
import GlobalErrorBoundary from './components/GlobalErrorBoundary'
import { GlobalPopupProvider } from './components/GlobalPopup'
import { setupGlobalErrorHandling } from './utils/globalErrors'
import './index.css'

// Setup global error and unhandled promise rejection listeners
setupGlobalErrorHandling()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <GlobalPopupProvider>
        <App />
      </GlobalPopupProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
)