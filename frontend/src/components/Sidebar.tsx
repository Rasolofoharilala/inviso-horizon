import { useState } from 'react'
import './Sidebar.css'
import logoNavbar from '../assets/logo-navbar.svg'

type IconName = 'home' | 'settings' | 'logout'

function Icon({ name }: { name: IconName }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'home' && (
        <>
          <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
          <path d="M9 21v-9h6v9" />
        </>
      )}

      {name === 'settings' && (
        <>
          <path d="m10 3-.6 2.2-2 .9-2-.6-2 3.5L5 10.5v3L3.4 15l2 3.5 2-.6 2 .9L10 21h4l.6-2.2 2-.9 2 .6 2-3.5-1.6-1.5v-3L20.6 9l-2-3.5-2 .6-2-.9L14 3Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}

      {name === 'logout' && (
        <>
          <path d="M10 4H4v16h6" />
          <path d="M9 12h12m-5-5 5 5-5 5" />
        </>
      )}
    </svg>
  )
}

type SidebarProps = {
  activePage: string
  onNavigate: (page: string) => void
  onLogout: () => void
}

const workspaces = ['Vue générale', 'Comparaison']
const reports = ['Rapport mensuel', 'Rapport annuel']

export default function Sidebar({
  activePage,
  onNavigate,
  onLogout,
}: SidebarProps) {
  const [workspaceOpen, setWorkspaceOpen] = useState(true)
  const [reportsOpen, setReportsOpen] = useState(true)

  function navigationButton(
    label: string,
    options?: { nested?: boolean; count?: number },
  ) {
    const active = activePage === label

    return (
      <button
        key={label}
        type="button"
        className={[
          'sidebar-item',
          options?.nested ? 'sidebar-item--nested' : '',
          active ? 'sidebar-item--active' : '',
        ].join(' ')}
        aria-current={active ? 'page' : undefined}
        onClick={() => onNavigate(label)}
      >
        <Icon name="home" />
        <span className="sidebar-label">{label}</span>

        {options?.count !== undefined && (
          <span className="sidebar-count">{options.count}</span>
        )}
      </button>
    )
  }

  return (
    <aside className="sidebar">
      <img src={logoNavbar} alt="Horizon" className="sidebar-logo-image" />
      <nav className="sidebar-nav" aria-label="Navigation principale">
        {navigationButton('Accueil')}

        <div className="sidebar-group">
          <button
            className="sidebar-item sidebar-group-toggle"
            type="button"
            aria-expanded={workspaceOpen}
            aria-controls="workspace-menu"
            onClick={() => setWorkspaceOpen((open) => !open)}
          >
            <Icon name="home" />
            <span className="sidebar-label">Espaces de travail</span>
            <span className="sidebar-toggle" aria-hidden="true">
              {workspaceOpen ? '−' : '+'}
            </span>
          </button>

          <div id="workspace-menu" hidden={!workspaceOpen}>
            {workspaces.map((label) =>
              navigationButton(label, { nested: true }),
            )}
          </div>
        </div>

        {navigationButton('Données', { count: 10 })}
        {navigationButton('Alertes', { count: 10 })}
        {navigationButton('Historique', { count: 10 })}

        <div className="sidebar-group">
          <button
            className="sidebar-item sidebar-group-toggle"
            type="button"
            aria-expanded={reportsOpen}
            aria-controls="reports-menu"
            onClick={() => setReportsOpen((open) => !open)}
          >
            <Icon name="home" />
            <span className="sidebar-label">Rapports</span>
            <span className="sidebar-toggle" aria-hidden="true">
              {reportsOpen ? '−' : '+'}
            </span>
            <span className="sidebar-count">10</span>
          </button>

          <div id="reports-menu" hidden={!reportsOpen}>
            {reports.map((label) =>
              navigationButton(label, { nested: true }),
            )}
          </div>
        </div>
      </nav>

      <footer className="sidebar-footer">
        <div className="sidebar-profile">
          <span className="sidebar-avatar" aria-hidden="true" />
          <span>Utilisateur 1</span>
        </div>

        <button
          className={[
            'sidebar-item',
            activePage === 'Paramètres' ? 'sidebar-item--active' : '',
          ].join(' ')}
          type="button"
          aria-current={activePage === 'Paramètres' ? 'page' : undefined}
          onClick={() => onNavigate('Paramètres')}
        >
          <Icon name="settings" />
          <span>Paramètres</span>
        </button>

        <button
          className="sidebar-logout"
          type="button"
          onClick={onLogout}
        >
          <Icon name="logout" />
          <span>Se déconnecter</span>
        </button>
      </footer>
    </aside>
  )
}