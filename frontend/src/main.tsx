import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { PrivacyProvider } from './contexts/PrivacyContext'
import { PainelProvider } from './contexts/PainelContext'
import './design-system/reset.css'
import './design-system/tokens.css'
import './design-system/typography.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <PrivacyProvider>
        <PainelProvider>
          <App />
        </PainelProvider>
      </PrivacyProvider>
    </ThemeProvider>
  </StrictMode>,
)
