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
export { api as request } from './session'
import { api } from './session'
export function listProducts(page: number, signal?: AbortSignal) {
  return api<ProductPage>(`/api/products?page=${page}&size=20`, { signal })
}
export function saveProduct(id: string | null, values: Record<string, string>) {
  return api<Product>(id === null ? '/api/products' : `/api/products/${encodeURIComponent(id)}`, {
    method: id === null ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference: values.reference, name: values.name, category: values.category, price: Number(values.price) }),
  })
}
export function deleteProduct(id: string) {
  return api<void>(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
