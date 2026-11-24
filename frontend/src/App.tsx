import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router'
import LoginPage from './pages/LoginPage'
import PlaceholderPage from './pages/PlaceholderPage'
import { navigation } from './config/navigation'

const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))

function LoginRoute() {
  const navigate = useNavigate()

  return (
    <LoginPage
      onLogin={() => navigate('/accueil', { replace: true })}
    />
  )
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
      <Suspense
        fallback={
          <main className="app-loading">
            <p role="status">Chargement de votre espace Horizon…</p>
          </main>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginRoute />} />

          <Route element={<HomePage />}>
            {navigation.map((item) => (
              <Route
                key={item.path}
                path={item.path}
                element={
                  item.page === 'dashboard' ? (
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
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}