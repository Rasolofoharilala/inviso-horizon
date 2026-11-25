export type CurrentUser = { username: string; roles: string[]; avatarUrl: string | null }
let csrf: { headerName: string; token: string } | null = null
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? 'GET'
  if (!['GET', 'HEAD'].includes(method) && !csrf) {
    csrf = await api<{ headerName: string; token: string }>('/api/csrf')
  }
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (!['GET', 'HEAD'].includes(method) && csrf) headers.set(csrf.headerName, csrf.token)
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' })
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    if (response.status === 401 && path !== '/api/auth/login') window.dispatchEvent(new Event('session-expired'))
    if (response.status === 403) csrf = null
    throw new Error(response.status === 401 ? 'Compte, mot de passe ou droit d’accès invalide.'
      : response.status === 403 ? 'Action non autorisée ou jeton expiré. Réessayez.'
      : response.status === 413 ? 'Image trop volumineuse (2 Mo maximum).'
      : problem?.detail ?? `Erreur HTTP ${response.status}`)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}
export async function signIn(username: string, password: string) {
  csrf = null
  await api<void>('/api/auth/login', { method: 'POST', body: new URLSearchParams({ username, password }) })
  csrf = null // Spring renouvelle le jeton après authentification.
  return api<CurrentUser>('/api/auth/me')
}
export async function signOut() {
  await api<void>('/api/auth/logout', { method: 'POST' })
  csrf = null
}
