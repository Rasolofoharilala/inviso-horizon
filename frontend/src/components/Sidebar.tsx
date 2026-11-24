import type { Dispatch, SetStateAction } from 'react'
import logoNavbar from '../assets/logo-navbar.svg'
import './Sidebar.css'

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
  activePage: string
  onNavigate: (page: string) => void
  onLogout: () => void
  collapsed: boolean
  setCollapsed: Dispatch<SetStateAction<boolean>>
}

const groups: {
  label: string
  items: { label: string; icon: IconName }[]
}[] = [
  {
    label: 'Navigation',
    items: [{ label: 'Accueil', icon: 'home' }],
  },
  {
    label: 'Espaces de travail',
    items: [
      { label: 'Vue générale', icon: 'dashboard' },
      { label: 'Comparaison', icon: 'compare' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { label: 'Données', icon: 'data' },
      { label: 'Alertes', icon: 'alerts' },
      { label: 'Historique', icon: 'history' },
    ],
  },
  {
    label: 'Rapports',
    items: [
      { label: 'Rapport mensuel', icon: 'report' },
      { label: 'Rapport annuel', icon: 'report' },
    ],
  },
]

export default function Sidebar({
  activePage,
  onNavigate,
  onLogout,
  collapsed,
  setCollapsed,
}: SidebarProps) {
  function navigate(page: string) {
    onNavigate(page)

    // La navigation actuelle remplace le contenu sans changer d'URL.
    // On place donc le focus sur ce nouveau contenu.
    requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus()
    })
  }

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      aria-label="Navigation Horizon"
    >
      <header className="sidebar-header">
        <button
          className="sidebar-brand"
          type="button"
          aria-label="Horizon — aller à l’accueil"
          title="Horizon — accueil"
          onClick={() => navigate('Accueil')}
        >
          <img
            src={collapsed ? '/favicon.svg?v=2' : logoNavbar}
            alt=""
            className={
              collapsed ? 'sidebar-brand-icon' : 'sidebar-brand-logo'
            }
          />
        </button>

        <button
          className="sidebar-collapse"
          type="button"
          aria-label={
            collapsed ? 'Agrandir la navigation' : 'Réduire la navigation'
          }
          title={
            collapsed ? 'Agrandir la navigation' : 'Réduire la navigation'
          }
          aria-expanded={!collapsed}
          aria-controls="horizon-navigation"
          onClick={() => setCollapsed((current) => !current)}
        >
          <Icon name="collapse" />
        </button>
      </header>

      <nav
        id="horizon-navigation"
        className="sidebar-nav"
        aria-label="Navigation principale"
      >
        {groups.map((group) => (
          <section
            className="sidebar-group"
            key={group.label}
            aria-label={group.label}
          >
            <h2 className="sidebar-group-title">{group.label}</h2>

            <ul className="sidebar-list">
              {group.items.map((item) => {
                const active = activePage === item.label

                return (
                  <li key={item.label}>
                    <button
                      className={`sidebar-item ${
                        active ? 'sidebar-item--active' : ''
                      }`}
                      type="button"
                      aria-label={item.label}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      onClick={() => navigate(item.label)}
                    >
                      <Icon name={item.icon} />
                      <span className="sidebar-label">{item.label}</span>

                      {active && (
                        <span className="sidebar-selected" aria-hidden="true">
                          ●
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </nav>

      <footer className="sidebar-footer">
        <div className="sidebar-profile" title="Utilisateur 1">
          <span className="sidebar-avatar" aria-hidden="true">U</span>
          <span className="sidebar-label">Utilisateur 1</span>
          {collapsed && (
            <span className="sidebar-sr-only">Utilisateur 1</span>
          )}
        </div>

        <button
          className={`sidebar-item ${
            activePage === 'Paramètres' ? 'sidebar-item--active' : ''
          }`}
          type="button"
          aria-label="Paramètres"
          title={collapsed ? 'Paramètres' : undefined}
          aria-current={activePage === 'Paramètres' ? 'page' : undefined}
          onClick={() => navigate('Paramètres')}
        >
          <Icon name="settings" />
          <span className="sidebar-label">Paramètres</span>
          {activePage === 'Paramètres' && (
            <span className="sidebar-selected" aria-hidden="true">●</span>
          )}
        </button>

        <button
          className="sidebar-item sidebar-logout"
          type="button"
          aria-label="Se déconnecter"
          title={collapsed ? 'Se déconnecter' : undefined}
          onClick={onLogout}
        >
          <Icon name="logout" />
          <span className="sidebar-label">Se déconnecter</span>
        </button>
      </footer>
    </aside>
  )
}