import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import DashboardPage from './DashboardPage'
import ProductsPage from './ProductsPage'
import './HomePage.css'

type HomePageProps = {
  onLogout: () => void
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
        {activePage === 'Données' ? (
          <ProductsPage />
        ) : activePage === 'Vue générale' ? (
          <DashboardPage />
        ) : (
          <>
            <header className="home-header">
              <span className="home-eyebrow">ESPACE HORIZON</span>
              <h1>{activePage}</h1>
              <p>Une vision claire. Des décisions éclairées.</p>
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
      </main>
    </div>
  )
}