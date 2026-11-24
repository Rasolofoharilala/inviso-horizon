import { lazy, Suspense, useState } from 'react'
import Sidebar from '../components/Sidebar'
import './HomePage.css'

const DashboardPage = lazy(() => import('./DashboardPage'))
const ProductsPage = lazy(() => import('./ProductsPage'))

type HomePageProps = {
  onLogout: () => void
}

function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true">
      <p className="page-skeleton-status" role="status">
        Chargement de la page…
      </p>

      <div aria-hidden="true">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-description" />

        <div className="skeleton-cards">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="skeleton-block skeleton-card"
              key={index}
            />
          ))}
        </div>

        <div className="skeleton-block skeleton-content" />
      </div>
    </div>
  )
}

export default function HomePage({ onLogout }: HomePageProps) {
  const [activePage, setActivePage] = useState('Accueil')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div
      className={`home-layout ${
        sidebarCollapsed ? 'home-layout--collapsed' : ''
      }`}
    >
      <a className="skip-link" href="#main-content">
        Aller au contenu principal
      </a>

      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <main
        id="main-content"
        className="home-main"
        tabIndex={-1}
      >
        <Suspense fallback={<PageSkeleton />}>
          {activePage === 'Données' ? (
            <ProductsPage />
          ) : activePage === 'Vue générale' ? (
            <DashboardPage />
          ) : (
            <>
              <header className="home-header">
                <span className="home-eyebrow">
                  ESPACE HORIZON
                </span>

                <h1>{activePage}</h1>

                <p>
                  Une vision claire. Des décisions éclairées.
                </p>
              </header>

              <section
                className="home-test-card"
                aria-labelledby="home-section-title"
              >
                <h2 id="home-section-title">
                  {activePage === 'Accueil'
                    ? 'Bienvenue sur Horizon'
                    : 'Page en préparation'}
                </h2>

                <p>
                  Vous consultez actuellement :{' '}
                  <strong>{activePage}</strong>.
                </p>

                <p>
                  {activePage === 'Accueil'
                    ? 'Sélectionnez Vue générale pour consulter le dashboard ou Données pour gérer les produits.'
                    : 'Le contenu de cette page sera disponible prochainement.'}
                </p>
              </section>
            </>
          )}
        </Suspense>
      </main>
    </div>
  )
}