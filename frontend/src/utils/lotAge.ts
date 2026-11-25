/** Dates civiles ISO : calcul en jours calendaires, sans décalage d'heure du navigateur. */
export function validCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false
  const time = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}
export function ageFromDates(creationDate: string, asOf: string): { day: number; week: number } | null {
  if (!validCivilDate(creationDate) || !validCivilDate(asOf) || creationDate > asOf) return null
  const elapsed = Math.round((Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${creationDate}T00:00:00Z`)) / 86400000)
  return { day: elapsed + 1, week: Math.floor(elapsed / 7) + 1 }
}
export function businessToday(zone = 'Indian/Antananarivo', now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}
export function placementDateLabel(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00Z`))
}
