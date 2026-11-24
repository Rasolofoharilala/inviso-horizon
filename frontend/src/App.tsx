import { lazy, Suspense, useState } from 'react'
import LoginPage from './pages/LoginPage'

const HomePage = lazy(() => import('./pages/HomePage'))

export default function App() {
  const [showHome, setShowHome] = useState(false)

  return (
    <Suspense
      fallback={
        <main className="app-loading" aria-busy="true">
          <p role="status">Chargement de votre espace Horizon…</p>
        </main>
      }
    >
      {showHome ? (
        <HomePage onLogout={() => setShowHome(false)} />
      ) : (
        <LoginPage onLogin={() => setShowHome(true)} />
      )}
    </Suspense>
  )
}