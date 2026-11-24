import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import Sidebar from '../components/Sidebar'
import { navigation } from '../config/navigation'
import './HomePage.css'

function PageSkeleton() {
  return (
    <div className="page-skeleton">
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

export default function HomePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    const page = navigation.find((item) => item.path === pathname)
    document.title = `${page?.label ?? 'Page introuvable'} — Horizon`

    mainRef.current?.scrollTo(0, 0)
    mainRef.current?.focus()
  }, [pathname])

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
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <main
        ref={mainRef}
        id="main-content"
        className="home-main"
        tabIndex={-1}
      >
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}