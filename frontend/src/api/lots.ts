import { api } from './session'
export type Lot = { id: string; reference: string; name: string; maleCount: number; femaleCount: number; total: number; version: number; initialMaleCount: number; initialFemaleCount: number; movementCount: number; timeZone: string; creationDate: string | null; ageDays: number | null; ageWeek: number | null; ageAsOf: string }
export type LotValues = { reference: string; name: string; maleCount: number; femaleCount: number; version?: number; creationDate: string }
export type LotPage = { ageAsOf: string; timeZone: string; items: Lot[]; page: number; size: number; totalElements: number; totalPages: number; totals: { lotCount: number; maleCount: number; femaleCount: number; total: number } }
export function listLots(query: string, page: number, signal?: AbortSignal) {
  return api<LotPage>(`/api/lots?${new URLSearchParams({ q: query, page: String(page), size: '20' })}`, { signal })
}
export function saveLot(id: string | null, values: LotValues) {
  return api<Lot>(id ? `/api/lots/${encodeURIComponent(id)}` : '/api/lots', {
    method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
  })
}
export function deleteLot(lot: Lot) {
  return api<void>(`/api/lots/${encodeURIComponent(lot.id)}?version=${lot.version}`, { method: 'DELETE' })
}

export type MovementType = 'ENTRY' | 'MORTALITY' | 'SALE' | 'EXIT'
export type Movement = { id: string; type: MovementType; effectiveDate: string; maleDelta: number; femaleDelta: number; reason: string; recordedAt: string; recordedBy: string; cancelledAt: string | null; cancelledBy: string | null; cancellationReason: string | null; maleAfter: number; femaleAfter: number }
export type MovementPage = { items: Movement[]; page: number; size: number; totalElements: number; totalPages: number }
export type EvolutionPoint = { date: string; day: number; week: number; males: number; females: number; total: number }
export type LotEvolution = { from: string; to: string; interval: 'day' | 'week'; points: EvolutionPoint[] }
export const movementLabels: Record<MovementType, string> = { ENTRY: 'Entrée', MORTALITY: 'Mortalité', SALE: 'Vente', EXIT: 'Autre sortie' }
export function getLot(id: string, signal?: AbortSignal) { return api<Lot>(`/api/lots/${encodeURIComponent(id)}`, { signal }) }
export function lotHistory(id: string, page: number, order: 'asc' | 'desc', signal?: AbortSignal) {
  return api<MovementPage>(`/api/lots/${encodeURIComponent(id)}/movements?${new URLSearchParams({ page: String(page), size: '20', order })}`, { signal })
}
export function lotEvolution(id: string, query: { from?: string; to?: string; interval: 'day' | 'week' }, signal?: AbortSignal) {
  const params = new URLSearchParams({ interval: query.interval })
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  return api<LotEvolution>(`/api/lots/${encodeURIComponent(id)}/evolution?${params}`, { signal })
}
export function addMovement(id: string, input: { requestId: string; type: MovementType; effectiveDate: string; males: number; females: number; reason: string }) {
  return api<Movement>(`/api/lots/${encodeURIComponent(id)}/movements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
}
export function cancelMovement(lotId: string, id: string, reason: string) {
  return api<Movement>(`/api/lots/${encodeURIComponent(lotId)}/movements/${encodeURIComponent(id)}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
}
