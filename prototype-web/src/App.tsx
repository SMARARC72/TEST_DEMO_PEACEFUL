import './App.css'

/**
 * Peacefull.ai — React entry point (future)
 *
 * The current prototype demo lives in /index.html as a single-page
 * vanilla-JS application (2,400+ lines). This React scaffold will be
 * used for the production web client once the prototype is promoted.
 *
 * For now this component renders when Vite's dev server serves from
 * src/main.tsx — it simply redirects to the prototype demo.
 */
function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', 'Plus Jakarta Sans', sans-serif",
      background: 'linear-gradient(135deg, #3B2D9E 0%, #6C5CE7 30%, #00B4D8 70%, #48CAE4 100%)',
      color: 'white',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 24,
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        fontSize: 36,
        border: '1px solid rgba(255,255,255,0.2)',
      }}>
        🧠
      </div>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
        Peacefull.ai
      </h1>
      <p style={{ fontSize: '1.1rem', opacity: 0.9, marginTop: 8, maxWidth: 480 }}>
        Clinician-Supervised AI for Behavioral Health
      </p>
      <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: 16 }}>
        React scaffold — production client coming soon
      </p>
      <a
        href="/index.html"
        style={{
          marginTop: 32,
          padding: '14px 32px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.2)',
          color: 'white',
          textDecoration: 'none',
          fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.3)',
          transition: 'all 0.2s',
        }}
      >
        View Prototype Demo →
      </a>
    </div>
  )
}

export default App
