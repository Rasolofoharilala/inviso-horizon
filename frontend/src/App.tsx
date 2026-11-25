import { lazy, Suspense, useEffect } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from 'react-router'
import { SessionProvider, RequireSession } from './auth/Session'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import LoadingScreen from './components/LoadingScreen'
import LoadingBoundary from './components/LoadingBoundary'
import PlaceholderPage from './pages/PlaceholderPage'
import { navigation } from './config/navigation'

const SandboxPage = lazy(() => import('./pages/SandboxPage'))

const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))

function LoginRoute() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  return (
    <LoginPage
      onLogin={() => navigate(params.get('testLoading') === '1' ? '/apercu-chargement' : '/accueil', { replace: true })}
    />
  )
}

// Seul cet aperçu volontaire impose un délai ; le parcours normal reste immédiat.
function LoadingPreview() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const failed = params.get('erreur') === '1'
  useEffect(() => {
    document.title = 'Ouverture — Horizon'
    if (failed) return
    const timer = window.setTimeout(() => navigate('/accueil', { replace: true }), 4000)
    return () => window.clearTimeout(timer)
  }, [failed, navigate])
  return <LoadingScreen error={failed} onRetry={() => navigate('/apercu-chargement', { replace: true })} />
}

function NotFoundPage() {
  return (
    <section className="home-test-card">
      <h1>Page introuvable</h1>
      <p>Cette adresse ne correspond à aucune page Horizon.</p>
      <Link to="/accueil">Retourner à l’accueil</Link>
    </section>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
      <LoadingBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<RequireSession />}>
          <Route path="/sandbox" element={<SandboxPage />} />
          <Route path="/apercu-chargement" element={<LoadingPreview />} />

          <Route element={<HomePage />}>
            {navigation.map((item) => (
              <Route
                key={item.path}
                path={item.path}
                element={
                  item.path === '/parametres' ? (<ProfilePage />) : item.page === 'dashboard' ? (
                    <DashboardPage />
                  ) : item.page === 'products' ? (
                    <ProductsPage />
                  ) : (
                    <PlaceholderPage title={item.label} />
                  )
                }
              />
            ))}

            <Route path="*" element={<NotFoundPage />} />
          </Route>
          </Route>
          <Route path="/" element={<Navigate to="/accueil" replace />} />
          <Route path="/login" element={<LoginRoute />} />
        </Routes>
      </Suspense>
      </LoadingBoundary>
    </SessionProvider>
    </BrowserRouter>
  )
}