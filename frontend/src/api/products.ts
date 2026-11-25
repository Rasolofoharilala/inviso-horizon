export type Product = {
  id: string
  reference: string
  name: string
  category: string
  price: number
}
export type ProductPage = {
  source: string
  items: Product[]
  page: number
  size: number
  hasNext: boolean
}
export type ApiSession = { authorization: string; headerName: string; token: string }

async function request<T>(path: string, authorization: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', Authorization: authorization, ...init.headers },
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    const hints: Record<number, string> = {
      401: 'Identifiants backend incorrects. Reconnectez-vous.',
      403: 'Session ou jeton CSRF expiré. Reconnectez-vous.',
      404: 'Ce produit n’existe plus. Actualisez la liste.',
      409: 'Référence déjà utilisée ou conflit de données.',
      503: 'La source Sage X3 n’est pas encore connectée.',
    }
    const errors = problem?.errors?.map((error: { field: string; message: string }) =>
      `${error.field} : ${error.message}`).join(' ; ')
    throw new Error(hints[response.status] ?? errors ?? problem?.detail ?? `Erreur HTTP ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function connect(username: string, password: string): Promise<ApiSession> {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  const authorization = `Basic ${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))}`
  const csrf = await request<{ headerName: string; token: string }>('/api/csrf', authorization)
  return { authorization, ...csrf }
}
export function listProducts(session: ApiSession, page: number, signal?: AbortSignal) {
  return request<ProductPage>(`/api/products?page=${page}&size=20`, session.authorization, { signal })
}
export function saveProduct(session: ApiSession, id: string | null, values: Record<string, string>) {
  return request<Product>(id === null ? '/api/products' : `/api/products/${encodeURIComponent(id)}`,
    session.authorization, {
      method: id === null ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json', [session.headerName]: session.token },
      body: JSON.stringify({ reference: values.reference, name: values.name,
        category: values.category, price: Number(values.price) }),
    })
}
export function deleteProduct(session: ApiSession, id: string) {
  return request<void>(`/api/products/${encodeURIComponent(id)}`, session.authorization, {
    method: 'DELETE', headers: { [session.headerName]: session.token },
  })
}
