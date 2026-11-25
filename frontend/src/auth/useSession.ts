import { createContext, useContext } from 'react'
import type { CurrentUser } from '../api/session'
export const Context = createContext<{
  user: CurrentUser | null; pending: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>; reload: () => Promise<void>;
} | null>(null)
export function useSession() {
  const session = useContext(Context)
  if (!session) throw new Error('SessionProvider requis')
  return session
}
