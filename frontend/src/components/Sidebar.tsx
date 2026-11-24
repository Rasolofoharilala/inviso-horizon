import type { Dispatch, SetStateAction } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { navigation } from '../config/navigation'
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
  collapsed: boolean
  setCollapsed: Dispatch<SetStateAction<boolean>>
}

export default function Sidebar({
  collapsed,
  setCollapsed,
}: SidebarProps) {
  const navigate = useNavigate()

  const visibleItems = navigation.filter((item) => item.visible)

  const groups = [
    ...new Set(
      visibleItems
        .filter((item) => item.group !== 'Compte')
        .map((item) => item.group),
    ),
  ]

  function renderItem(item: (typeof navigation)[number]) {
    return (
      <li key={item.path}>
        <NavLink
          to={item.path}
          end
          title={collapsed ? item.label : undefined}
          aria-label={item.label}
          className={({ isActive }) =>
            `sidebar-item ${isActive ? 'sidebar-item--active' : ''}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} />
              <span className="sidebar-label">{item.label}</span>

              {isActive && (
                <span className="sidebar-selected" aria-hidden="true">
                  ●
                </span>
              )}
            </>
          )}
        </NavLink>
      </li>
    )
  }

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      aria-label="Navigation Horizon"
    >
      <header className="sidebar-header">
        <Link
          className="sidebar-brand"
          to="/accueil"
          aria-label="Horizon — aller à l’accueil"
        >
          <img
            src={collapsed ? '/favicon.svg?v=2' : logoNavbar}
            alt=""
            className={
              collapsed ? 'sidebar-brand-icon' : 'sidebar-brand-logo'
            }
          />
        </Link>

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
            key={group}
            aria-label={group}
          >
            <h2 className="sidebar-group-title">{group}</h2>

            <ul className="sidebar-list">
              {visibleItems
                .filter((item) => item.group === group)
                .map(renderItem)}
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

        <nav aria-label="Compte utilisateur">
          <ul className="sidebar-list">
            {visibleItems
              .filter((item) => item.group === 'Compte')
              .map(renderItem)}
          </ul>
        </nav>

        <button
          className="sidebar-item sidebar-logout"
          type="button"
          title={collapsed ? 'Se déconnecter' : undefined}
          aria-label="Se déconnecter"
          onClick={() => navigate('/login', { replace: true })}
        >
          <Icon name="logout" />
          <span className="sidebar-label">Se déconnecter</span>
        </button>
      </footer>
    </aside>
  )
}