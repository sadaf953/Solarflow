// Imported first so the browser's install offer (beforeinstallprompt), which
// can fire before React renders, is never missed.
import './pwa/installState'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import PwaLayer from './pwa/PwaLayer'
import { registerServiceWorker } from './pwa/registerSW'

import GlobalErrorBoundary from './components/GlobalErrorBoundary'
import { GlobalPopupProvider } from './components/GlobalPopup'
import { setupGlobalErrorHandling } from './utils/globalErrors'
import './index.css'

// Setup global error and unhandled promise rejection listeners
setupGlobalErrorHandling()

// Production builds only; a no-op in `npm run dev`.
registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <GlobalPopupProvider>
        <App />
        <PwaLayer />
      </GlobalPopupProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
)