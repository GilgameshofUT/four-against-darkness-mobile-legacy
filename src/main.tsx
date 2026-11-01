import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/theme/tokens.css'
import './styles/global.css'
import './styles/shell.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
