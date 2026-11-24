import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import './HomePage.css'
import ProductsPage from './ProductsPage'

type HomePageProps = {
  onLogout: () => void
}

export default function HomePage({ onLogout }: HomePageProps) {
  const [activePage, setActivePage] = useState('Accueil')

  return (
    <div className="home-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={onLogout}
      />

      <main className="home-main">
       {activePage === 'Données' ? (
  <ProductsPage />
) : (
  <>
    <header className="home-header">
      <span className="home-eyebrow">ESPACE HORIZON</span>
      <h1>{activePage}</h1>
      <p>Une vision claire. Des décisions éclairées.</p>
    </header>

    <section className="home-test-card">
      <h2>Navigation opérationnelle</h2>
      <p>
        Vous consultez actuellement : <strong>{activePage}</strong>.
      </p>
    </section>
  </>
)}
      </main>
    </div>
  )
}