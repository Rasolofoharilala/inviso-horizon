import { useState, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { getNavigationModules, navigationItemActive } from '../config/navigation'
import type { NavigationItem } from '../config/navigation'
import './Sidebar.css'
import { useSession } from '../auth/useSession'

type IconName =
  | 'home'
  | 'dashboard'
  | 'compare'
  | 'data'
  | 'alerts'
  | 'history'
  | 'report'
  | 'settings'
  | 'logout'
  | 'collapse'

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    home: 'M3 10 12 3 21 10V21H3ZM9 21V12H15V21',
    dashboard: 'M3 3H10V10H3ZM14 3H21V10H14ZM3 14H10V21H3ZM14 14H21V21H14Z',
    compare: 'M8 3V21M16 3V21M3 8H13M11 16H21',
    data: 'M4 3H20V21H4ZM4 9H20M4 15H20M10 3V21',
    alerts: 'M12 3 22 21H2ZM12 9V14M12 17V17.1',
    history: 'M3 11A9 9 0 1 1 5 18M3 4V11H10M12 7V12L15 14',
    report: 'M5 3H15L20 8V21H5ZM14 3V9H20M9 13H16M9 17H16',
    settings:
      'M10 3H14L15 6L18 7L21 10V14L18 17L15 18L14 21H10L9 18L6 17L3 14V10L6 7L9 6ZM15 12A3 3 0 1 0 9 12A3 3 0 1 0 15 12',
    logout: 'M10 4H4V20H10M9 12H21M16 7L21 12L16 17',
    collapse: 'M4 3H20V21H4ZM9 3V21M16 8L12 12L16 16',
  }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  )
}


type SidebarProps = {
  collapsed: boolean
  setCollapsed: Dispatch<SetStateAction<boolean>>
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { user, logout } = useSession()
  const [logoutError, setLogoutError] = useState('')
  const { pathname, search } = useLocation()
  const selectedLot = /^\/lots\/(\d+)\/?$/.exec(pathname)?.[1] ?? new URLSearchParams(search).get('lot')
  const lotLink = (path: string) => path.startsWith('/lots/') && selectedLot ? `${path}?lot=${encodeURIComponent(selectedLot)}` : path
  const navigate = useNavigate()
  const mobileDialog = useRef<HTMLDialogElement>(null)
  const panelToggle = useRef<HTMLButtonElement>(null)
  const modules = getNavigationModules()
  const activeModule = modules.find((module) =>
    module.items.some((item) => navigationItemActive(item, pathname)),
  )
  const hasPanel = Boolean(activeModule && activeModule.items.length > 1)
  const panelOpen = hasPanel && !collapsed

  function renderLink(item: NavigationItem) {
    return (
      <li key={item.path}>
        <NavLink
          to={lotLink(item.path)}
          end
          className={({ isActive }) => `sidebar-page ${isActive || navigationItemActive(item, pathname) ? 'sidebar-page--active' : ''}`}
          onClick={() => mobileDialog.current?.close()}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
          <span className="sidebar-page-check" aria-hidden="true">✓</span>
        </NavLink>
      </li>
    )
  }

  function togglePanel() {
    if (window.matchMedia('(max-width: 800px)').matches) {
      mobileDialog.current?.showModal()
    } else {
      setCollapsed((value) => !value)
    }
  }

  return (
    <aside className="sidebar" aria-label="Navigation Horizon">
      <div className="sidebar-rail">
        <Link className="rail-control sidebar-brand" to="/accueil" aria-label="Horizon — accueil" title="Horizon — accueil">
          <img src="/favicon.svg?v=2" alt="" width="36" height="36" />
        </Link>

        <nav className="rail-navigation" aria-label="Modules">
          <ul className="rail-list">
            {modules.filter((module) => module.id !== 'Compte').map((module) => {
              const active = module.id === activeModule?.id
              return (
                <li key={module.id}>
                  <Link
                    to={module.items[0].path}
                    className={`rail-control ${active ? 'rail-control--active' : ''}`}
                    aria-label={module.label}
                    title={module.label}
                    aria-current={active ? 'location' : undefined}
                    onClick={() => {
                      if (!active) setCollapsed(false)
                    }}
                  >
                    <Icon name={module.icon} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {hasPanel && (
          <button
            ref={panelToggle}
            className="rail-control sidebar-panel-toggle"
            type="button"
            aria-label={panelOpen ? 'Masquer les sous-pages' : 'Afficher les sous-pages'}
            title="Afficher ou masquer les sous-pages"
            aria-expanded={panelOpen}
            aria-controls="sidebar-desktop-panel"
            onClick={togglePanel}
          >
            <Icon name="collapse" />
          </button>
        )}
        {hasPanel && (
          <button className="rail-control sidebar-mobile-toggle" type="button" aria-label="Ouvrir les sous-pages" aria-haspopup="dialog" aria-controls="sidebar-mobile-dialog" onClick={togglePanel}>
            <Icon name="collapse" />
          </button>
        )}

        <div className="rail-footer">
          <Link to="/parametres" className="rail-profile" title={user?.username} aria-label={`Profil de ${user?.username}`}>
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : user?.username.charAt(0).toUpperCase()}
          </Link>
          {logoutError && <span role="alert">{logoutError}</span>}
          {modules.filter((module) => module.id === 'Compte').map((module) => (
            <Link key={module.id} to={module.items[0].path} className={`rail-control ${activeModule?.id === module.id ? 'rail-control--active' : ''}`} aria-label={module.label} title={module.label}>
              <Icon name="settings" />
            </Link>
          ))}
          <button className="rail-control rail-logout" type="button" aria-label="Se déconnecter" title="Se déconnecter" onClick={async () => { try { await logout(); navigate('/login', { replace: true }) } catch { setLogoutError('Déconnexion impossible. Réessayez.') } }}>
            <Icon name="logout" />
          </button>
        </div>
      </div>

      {hasPanel && (
        <section id="sidebar-desktop-panel" className="sidebar-secondary" hidden={!panelOpen} aria-labelledby="sidebar-panel-title">
          <header className="sidebar-secondary-header">
            <div>
              <span className="sidebar-panel-eyebrow">HORIZON</span>
              <h2 id="sidebar-panel-title">{activeModule?.label}</h2>
            </div>
            <button type="button" className="sidebar-panel-close" aria-label="Masquer les sous-pages" onClick={() => { setCollapsed(true); panelToggle.current?.focus() }}>×</button>
          </header>
          <nav aria-label={`Pages — ${activeModule?.label}`}>
            <ul className="sidebar-page-list">{activeModule?.items.map(renderLink)}</ul>
          </nav>
          <p className="sidebar-panel-note">Une vision claire.<br />Des décisions éclairées.</p>
        </section>
      )}

      <dialog ref={mobileDialog} id="sidebar-mobile-dialog" className="sidebar-mobile-dialog" aria-labelledby="sidebar-mobile-title">
        <header className="sidebar-secondary-header">
          <h2 id="sidebar-mobile-title">{activeModule?.label ?? 'Navigation'}</h2>
          <button type="button" className="sidebar-panel-close" aria-label="Fermer les sous-pages" onClick={() => mobileDialog.current?.close()}>×</button>
        </header>
        <nav aria-label="Sous-pages du module"><ul className="sidebar-page-list">{activeModule?.items.map(renderLink)}</ul></nav>
      </dialog>
    </aside>
  )
}
