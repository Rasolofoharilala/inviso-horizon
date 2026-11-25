import { useEffect, useState } from 'react'
import { Context, useSession } from './useSession'
import type { ReactNode } from 'react'
import { api, signIn, signOut } from '../api/session'
import type { CurrentUser } from '../api/session'
import { Navigate, Outlet } from 'react-router'
import LoadingScreen from '../components/LoadingScreen'
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [pending, setPending] = useState(true)
  useEffect(() => {
    let active = true
    const expire = () => setUser(null)
    window.addEventListener('session-expired', expire)
    api<CurrentUser>('/api/auth/me').then((next) => { if (active) setUser(next) })
      .catch(() => { if (active) setUser(null) }).finally(() => { if (active) setPending(false) })
    return () => { active = false; window.removeEventListener('session-expired', expire) }
  }, [])
  return <Context.Provider value={{ user, pending,
    login: async (username, password) => { setUser(await signIn(username, password)) },
    logout: async () => { await signOut(); setUser(null) },
    reload: async () => { setUser(await api<CurrentUser>('/api/auth/me')) },
  }}>{children}</Context.Provider>
}
export function RequireSession() {
  const { user, pending } = useSession()
  if (pending) return <LoadingScreen />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
