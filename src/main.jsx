import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import App from './App.jsx'
import GuestLinkGenerator from './GuestLinkGenerator.jsx'

const isGuestLinkGenerator = window.location.pathname.replace(/\/+$/, '') === '/buat-tautan'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isGuestLinkGenerator ? <GuestLinkGenerator /> : <App />}
  </StrictMode>,
)
