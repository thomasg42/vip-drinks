import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './visuals.css'
import App from './App.tsx'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL, updateViaCache: 'none',
    }).catch(() => { /* Saving still works if this browser blocks offline caching. */ })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
