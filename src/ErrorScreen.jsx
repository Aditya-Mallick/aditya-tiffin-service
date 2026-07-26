import React from 'react'

async function hardReset() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    if (window.caches) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch { /* ignore */ }
  window.location.replace('/manage')
}

// Shows a readable message instead of a blank white screen, plus a one-tap
// "reset" that clears any stale cached version of the app.
export default class ErrorScreen extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('App error:', error, info) }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', background: '#FFF8F0', padding: 24,
        fontFamily: 'Poppins, system-ui, sans-serif', color: '#333',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Something went wrong / कुछ गड़बड़ है
        </h1>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
          Tap the button below to refresh the app.<br />
          ऐप को ठीक करने के लिए नीचे दबाएं।
        </p>
        <button
          onClick={hardReset}
          style={{
            background: '#FF6B2B', color: '#fff', border: 'none', borderRadius: 10,
            padding: '14px 20px', fontSize: 16, fontWeight: 600, marginBottom: 20,
          }}
        >
          Reset &amp; reload / रीसेट करें
        </button>
        <pre style={{
          fontSize: 11, color: '#999', whiteSpace: 'pre-wrap',
          wordBreak: 'break-word', maxHeight: 200, overflow: 'auto',
        }}>
          {String(this.state.error?.message || this.state.error)}
        </pre>
      </div>
    )
  }
}

export { hardReset }
