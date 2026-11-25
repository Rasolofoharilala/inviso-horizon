export type NavigationIcon =
  | 'home'
  | 'dashboard'
  | 'compare'
  | 'data'
  | 'alerts'
  | 'history'
  | 'report'
  | 'settings'

export type PageKey = 'placeholder' | 'dashboard' | 'products' | 'lots' | 'lot-history' | 'lot-timeline' | 'lot-evolution'

export type NavigationItem = {
  path: string
  label: string
  group: string
  icon: NavigationIcon
  page: PageKey
  visible: boolean
}

export const navigation: NavigationItem[] = [
  {
    path: '/accueil',
    label: 'Accueil',
    group: 'Navigation',
    icon: 'home',
    page: 'placeholder',
    visible: true,
  },
  {
    path: '/dashboard',
    label: 'Vue générale',
    group: 'Espaces de travail',
    icon: 'dashboard',
    page: 'dashboard',
    visible: true,
  },
  {
    path: '/comparaison',
    label: 'Comparaison',
    group: 'Espaces de travail',
    icon: 'compare',
    page: 'placeholder',
    visible: true,
  },
  {
    path: '/lots',
    label: 'Liste des lots',
    group: 'Lots',
    icon: 'data',
    page: 'lots',
    visible: true,
  },
  { path: '/lots/historique', label: 'Historique des mouvements', group: 'Lots', icon: 'history', page: 'lot-history', visible: true },
  { path: '/lots/chronologie', label: 'Chronologie', group: 'Lots', icon: 'history', page: 'lot-timeline', visible: true },
  { path: '/lots/evolution', label: 'Évolution des effectifs', group: 'Lots', icon: 'dashboard', page: 'lot-evolution', visible: true },
  {
    path: '/alertes',
    label: 'Alertes',
    group: 'Gestion',
    icon: 'alerts',
    page: 'placeholder',
    visible: true,
  },
  {
    path: '/historique',
    label: 'Historique',
    group: 'Gestion',
    icon: 'history',
    page: 'placeholder',
    visible: true,
  },
  {
    path: '/rapports/mensuel',
    label: 'Rapport mensuel',
    group: 'Rapports',
    icon: 'report',
    page: 'placeholder',
    visible: true,
  },
  {
    path: '/rapports/annuel',
    label: 'Rapport annuel',
    group: 'Rapports',
    icon: 'report',
    page: 'placeholder',
    visible: true,
  },
  {
    path: '/parametres',
    label: 'Paramètres',
    group: 'Compte',
    icon: 'settings',
    page: 'placeholder',
    visible: true,
  },
]

// Les groupes visibles deviennent automatiquement les modules du rail.
export function getNavigationModules() {
  const visible = navigation.filter((item) => item.visible)
  return [...new Set(visible.map((item) => item.group))].map((group) => {
    const items = visible.filter((item) => item.group === group)
    return { id: group, label: group, icon: items[0].icon, items }
  })
}

export function navigationItemActive(item: NavigationItem, pathname: string) {
  return item.path === pathname || (item.path === '/lots' && /^\/lots\/\d+\/?$/.test(pathname))
}
