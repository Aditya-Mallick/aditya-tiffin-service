import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorScreen from './ErrorScreen.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorScreen>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorScreen>
  </React.StrictMode>
)

// Register the service worker so the app can be installed to the home screen.
// Production only — it would otherwise cache things during local development.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')

      // Check for a new version now and every 30 minutes, so a phone that
      // stays open still picks up deploys.
      reg.update?.()
      setInterval(() => reg.update?.(), 30 * 60 * 1000)

      // When a new version takes over, reload once so the page and its
      // assets always come from the same build (this is what caused the
      // blank screen: new HTML paired with an old cached bundle).
      let reloading = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return
        reloading = true
        window.location.reload()
      })
    } catch { /* app still works without the service worker */ }
  })
}

// Last-resort safety net: if the app's own scripts fail to load (a stale or
// missing bundle), clear caches and reload once instead of showing a blank page.
window.addEventListener('error', async (e) => {
  const el = e?.target
  const isAsset = el && (el.tagName === 'SCRIPT' || el.tagName === 'LINK')
  if (!isAsset || sessionStorage.getItem('ats-recovered')) return
  sessionStorage.setItem('ats-recovered', '1')
  try {
    if (window.caches) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
  } catch { /* ignore */ }
  window.location.reload()
}, true)
