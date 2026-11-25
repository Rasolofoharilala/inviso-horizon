import { Link } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { deleteLot, listLots, saveLot } from '../api/lots'
import type { Lot, LotPage } from '../api/lots'
import { useSession } from '../auth/useSession'
import './LotsPage.css'
import { ageFromDates, businessToday, placementDateLabel, validCivilDate } from '../utils/lotAge'

const number = new Intl.NumberFormat('fr-FR')
type Fields = { reference: string; name: string; maleCount: string; femaleCount: string; creationDate: string }
const empty: Fields = { reference: '', name: '', maleCount: '0', femaleCount: '0', creationDate: '' }
const countValid = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647

export default function LotsPage() {
  const { user } = useSession()
  const canEdit = user?.roles.some((role) => ['ADMIN', 'EDITOR'].includes(role)) ?? false
  const canDelete = user?.roles.includes('ADMIN') ?? false
  const [filter, setFilter] = useState({ query: '', page: 0, revision: 0 })
  const [search, setSearch] = useState('')
  const [data, setData] = useState<LotPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Lot | null>(null)
  const [values, setValues] = useState<Fields>(empty)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Fields, string>>>({})
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Lot | null>(null)
  const formDialog = useRef<HTMLDialogElement>(null)
  const deleteDialog = useRef<HTMLDialogElement>(null)
  const mutationLock = useRef(false)
  const submitError = useRef<HTMLParagraphElement>(null)
  const deleteError = useRef<HTMLParagraphElement>(null)
  const [deleteMessage, setDeleteMessage] = useState('')
  const addButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    listLots(filter.query, filter.page, controller.signal).then((result) => {
      setData(result); setError('')
    }).catch((reason) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Impossible de charger les lots.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [filter])
  // Recalcul serveur au changement de jour métier, sans interrompre un formulaire ouvert.
  useEffect(() => {
    if (!data) return
    const checkDay = () => {
      if (document.visibilityState !== 'visible' || mutationLock.current || formDialog.current?.open || deleteDialog.current?.open) return
      if (businessToday(data.timeZone) !== data.ageAsOf) setFilter((current) => ({ ...current, revision: current.revision + 1 }))
    }
    const timer = window.setInterval(checkDay, 60_000)
    document.addEventListener('visibilitychange', checkDay)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', checkDay) }
  }, [data])
  useEffect(() => { if (formError) submitError.current?.focus() }, [formError])
  useEffect(() => { if (deleteMessage) deleteError.current?.focus() }, [deleteMessage])

  function refresh(page = filter.page, query = filter.query) {
    setLoading(true); setError(''); setData(null)
    setFilter((previous) => ({ query, page, revision: previous.revision + 1 }))
  }
  function openForm(lot: Lot | null) {
    setEditing(lot); setFormError(''); setFieldErrors({})
    setValues(lot ? { reference: lot.reference, name: lot.name, maleCount: String(lot.initialMaleCount), femaleCount: String(lot.initialFemaleCount), creationDate: lot.creationDate ?? '' } : empty)
    formDialog.current?.showModal()
  }
  function change(field: keyof Fields, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mutationLock.current || !canEdit) return
    const errors: Partial<Record<keyof Fields, string>> = {}
    if (!values.reference.trim() || values.reference.trim().length > 80) errors.reference = 'Saisissez une référence de 1 à 80 caractères.'
    if (!values.name.trim() || values.name.trim().length > 150) errors.name = 'Saisissez un nom de 1 à 150 caractères.'
    if (!countValid(values.maleCount)) errors.maleCount = 'Saisissez un entier entre 0 et 2 147 483 647.'
    if (!countValid(values.femaleCount)) errors.femaleCount = 'Saisissez un entier entre 0 et 2 147 483 647.'
    const today = businessToday(data?.timeZone)
    if (!validCivilDate(values.creationDate) || values.creationDate > today) errors.creationDate = 'Renseignez la date de mise en place, au plus tard aujourd’hui.'
    setFieldErrors(errors); setFormError('')
    const invalid = Object.keys(errors)[0]
    if (invalid) { document.getElementById(`lot-${invalid}`)?.focus(); return }
    mutationLock.current = true; setBusy(true)
    try {
      await saveLot(editing?.id ?? null, { reference: values.reference.trim(), name: values.name.trim(),
        maleCount: Number(values.maleCount), femaleCount: Number(values.femaleCount), version: editing?.version, creationDate: values.creationDate })
      formDialog.current?.close()
      setNotice(editing ? 'Le lot a été mis à jour.' : 'Le nouveau lot a été créé.')
      refresh(editing ? filter.page : 0)
      requestAnimationFrame(() => addButton.current?.focus())
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Enregistrement impossible.') }
    finally { mutationLock.current = false; setBusy(false) }
  }
  async function remove() {
    if (!pendingDelete || mutationLock.current || !canDelete) return
    mutationLock.current = true; setBusy(true); setDeleteMessage('')
    try {
      await deleteLot(pendingDelete)
      deleteDialog.current?.close(); setPendingDelete(null)
      setNotice('Le lot a été supprimé.')
      refresh(data?.items.length === 1 && filter.page > 0 ? filter.page - 1 : filter.page)
      requestAnimationFrame(() => addButton.current?.focus())
    } catch (reason) { setDeleteMessage(reason instanceof Error ? reason.message : 'Suppression impossible.') }
    finally { mutationLock.current = false; setBusy(false) }
  }
  const previewTotal = countValid(values.maleCount) && countValid(values.femaleCount) ? number.format(Number(values.maleCount) + Number(values.femaleCount)) : '—'

  const today = businessToday(data?.timeZone)
  const previewAge = ageFromDates(values.creationDate, today)

  return <div className="lots-page">
    <header className="lots-heading"><div><p className="lots-eyebrow">ÉLEVAGE · CHEPTEL</p><h1>Vos lots, en un regard.</h1><p>Suivez les effectifs mâles et femelles de chaque lot.</p></div>
      {canEdit && <button ref={addButton} className="lots-button lots-button--primary" onClick={() => openForm(null)} type="button">+ Ajouter un lot</button>}
    </header>
    <p className="lots-notice" role="status" aria-live="polite">{notice}</p>
    <dl className="lots-summary" aria-label={filter.query ? 'Totaux de tous les lots correspondant à la recherche' : 'Totaux de tous les lots'}>
      {[['Lots', data?.totals.lotCount], ['Effectif mâle', data?.totals.maleCount], ['Effectif femelle', data?.totals.femaleCount], ['Effectif total', data?.totals.total]].map(([label, value]) =>
        <div key={label} className={label === 'Effectif total' ? 'lots-summary-total' : ''}><dt>{label}</dt><dd>{typeof value === 'number' ? number.format(value) : '—'}</dd></div>)}
    </dl>
    <section className="lots-list" aria-labelledby="lots-list-title" aria-busy={loading}>
      <header className="lots-list-header"><div><h2 id="lots-list-title">Liste des lots</h2><p>{filter.query ? `Recherche : « ${filter.query} ». ` : ''}Les totaux portent sur tous les résultats, pas seulement cette page.</p></div><button className="lots-button" type="button" disabled={loading || busy} onClick={() => refresh()}>Actualiser</button></header>
      <form className="lots-search" onSubmit={(event) => { event.preventDefault(); refresh(0, search.trim()) }}>
        <div><label htmlFor="lots-search">Rechercher un lot</label><input id="lots-search" type="search" maxLength={150} placeholder="Référence ou nom du lot" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <button className="lots-button" disabled={loading || busy} type="submit">Rechercher</button>
        {filter.query && <button className="lots-button" type="button" disabled={loading || busy} onClick={() => { setSearch(''); refresh(0, '') }}>Effacer le filtre</button>}
      </form>
      {error && <div className="lots-error" role="alert"><p>{error}</p><button className="lots-button" type="button" onClick={() => refresh()} disabled={loading}>Réessayer</button></div>}
      {loading && <p className="lots-state" role="status">Chargement des lots…</p>}
      {!loading && !error && data && (data.items.length ? <div className="lots-table-wrap" tabIndex={0} role="region" aria-label="Tableau des lots, défilement horizontal sur petit écran"><table>
        <caption className="lots-sr-only">Lots de cheptel : référence, nom, date de mise en place, semaine d’élevage, effectifs mâles, femelles et total</caption>
        <thead><tr><th scope="col">Référence</th><th scope="col">Nom du lot</th><th scope="col">Mise en place · J1</th><th scope="col">Âge du lot</th><th scope="col" className="lots-number">Mâles</th><th scope="col" className="lots-number">Femelles</th><th scope="col" className="lots-number">Total</th><th scope="col">Actions</th></tr></thead>
        <tbody>{data.items.map((lot) => <tr key={lot.id}><th scope="row">{lot.reference}</th><td>{lot.name}</td><td className="lots-date">{lot.creationDate ? <time dateTime={lot.creationDate}>{placementDateLabel(lot.creationDate)}</time> : <span className="lots-date-missing">À renseigner</span>}</td><td className="lots-age">{lot.ageWeek != null && lot.ageDays != null ? <><strong>Semaine {lot.ageWeek}</strong><span>J{lot.ageDays}</span></> : 'Âge inconnu'}</td><td className="lots-number">{number.format(lot.maleCount)}</td><td className="lots-number">{number.format(lot.femaleCount)}</td><td className="lots-number lots-total">{number.format(lot.total)}</td><td><div className="lots-row-actions"><Link className="lots-button" to={`/lots/${lot.id}`} aria-label={`Voir la fiche complète du lot ${lot.reference}`}>Voir le lot</Link>{canEdit && <><button className="lots-button" type="button" aria-label={`Modifier le lot ${lot.reference}`} disabled={busy} onClick={() => openForm(lot)}>Modifier</button>{canDelete && <button className="lots-button lots-button--danger" type="button" aria-label={`Supprimer le lot ${lot.reference}`} disabled={busy} onClick={() => { setPendingDelete(lot); setDeleteMessage(''); deleteDialog.current?.showModal() }}>Supprimer</button>}</>}</div></td></tr>)}</tbody>
      </table></div> : <div className="lots-empty"><h3>{filter.query ? 'Aucun lot ne correspond à cette recherche.' : 'Votre premier lot commence ici.'}</h3><p>{filter.query ? 'Essayez une autre référence ou effacez le filtre.' : 'Ajoutez un lot et renseignez ses effectifs mâle et femelle. Le total sera calculé automatiquement.'}</p>{canEdit && !filter.query && <button className="lots-button lots-button--primary" type="button" onClick={() => openForm(null)}>Créer mon premier lot</button>}</div>)}
      <p className="lots-age-help">La mise en place est le J1 : J1 à J7 = semaine 1 ; J8 à J14 = semaine 2.{data ? ` Calcul au ${placementDateLabel(data.ageAsOf)} (${data.timeZone}).` : ''}</p>
      <nav className="lots-pagination" aria-label="Pagination des lots"><button className="lots-button" type="button" disabled={loading || busy || filter.page === 0} onClick={() => refresh(filter.page - 1)}>Précédent</button><p aria-live="polite">Page {filter.page + 1} sur {Math.max(1, data?.totalPages ?? 1)} · {data ? number.format(data.totalElements) : '—'} lot(s)</p><button className="lots-button" type="button" disabled={loading || busy || !data || filter.page + 1 >= data.totalPages} onClick={() => refresh(filter.page + 1)}>Suivant</button></nav>
    </section>
    <dialog ref={formDialog} className="lots-dialog" aria-labelledby="lot-form-title" aria-describedby="lot-form-help" onCancel={(event) => { if (busy) event.preventDefault() }}>
      <h2 id="lot-form-title">{editing ? 'Modifier le lot' : 'Nouveau lot de cheptel'}</h2><p id="lot-form-help">Tous les champs sont obligatoires. Un effectif peut être égal à zéro.</p>
      <form onSubmit={submit} noValidate>
        {formError && <p ref={submitError} className="lots-error" role="alert" tabIndex={-1}>{formError}</p>}
        <div className="lots-placement-field"><label htmlFor="lot-creationDate">Date de création du lot · mise en place (J1)</label>
          <p id="lot-date-help">Date à laquelle les poussins ont été installés dans leur emplacement. Elle peut être antérieure à la saisie dans Horizon.</p>
          <input id="lot-creationDate" name="creationDate" type="date" min="0001-01-01" max={today} required disabled={busy || Boolean(editing?.movementCount)} value={values.creationDate} onChange={(event) => change('creationDate', event.target.value)} aria-invalid={Boolean(fieldErrors.creationDate)} aria-describedby={`lot-date-help${fieldErrors.creationDate ? ' lot-date-error' : ''}`} />
          {fieldErrors.creationDate && <p id="lot-date-error" className="lots-field-error">{fieldErrors.creationDate}</p>}
          <p className="lots-age-preview" role="status">{previewAge ? <>Âge aujourd’hui : <strong>Semaine {previewAge.week} · J{previewAge.day}</strong></> : 'L’âge sera calculé à partir de cette date.'}</p>
        </div>
        {Boolean(editing?.movementCount) && <p className="lots-placement-warning">Ce lot possède un historique. J1 et les effectifs initiaux sont verrouillés ; utilisez « Ajouter un mouvement » dans sa fiche pour modifier les effectifs.</p>}
        <div className="lots-fields">{([
          ['reference', 'Référence du lot', 'text', 80], ['name', 'Nom du lot', 'text', 150],
          ['maleCount', 'Effectif initial mâle', 'number', undefined], ['femaleCount', 'Effectif initial femelle', 'number', undefined],
        ] as const).map(([field, label, type, maxLength]) => <div key={field}><label htmlFor={`lot-${field}`}>{label}</label><input id={`lot-${field}`} name={field} type={type} maxLength={maxLength} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 2147483647 : undefined} step={type === 'number' ? 1 : undefined} required disabled={busy || Boolean(editing?.movementCount && (field === 'maleCount' || field === 'femaleCount'))} value={values[field]} onChange={(event) => change(field, event.target.value)} aria-invalid={Boolean(fieldErrors[field])} aria-describedby={fieldErrors[field] ? `lot-${field}-error` : undefined} />{fieldErrors[field] && <p className="lots-field-error" id={`lot-${field}-error`}>{fieldErrors[field]}</p>}</div>)}</div>
        <p className="lots-preview-total" role="status">Effectif total : <strong>{previewTotal}</strong><span>Calculé automatiquement à partir des deux effectifs.</span></p>
        <div className="lots-dialog-actions"><button className="lots-button" type="button" disabled={busy} onClick={() => formDialog.current?.close()}>Annuler</button><button className="lots-button lots-button--primary" type="submit" disabled={busy}>{busy ? 'Enregistrement…' : editing ? 'Enregistrer les modifications' : 'Créer le lot'}</button></div>
      </form>
    </dialog>
    <dialog ref={deleteDialog} className="lots-dialog lots-dialog--small" aria-labelledby="lot-delete-title" aria-describedby="lot-delete-help" onCancel={(event) => { if (busy) event.preventDefault() }}>
      <h2 id="lot-delete-title">Supprimer le lot {pendingDelete?.reference} ?</h2><p id="lot-delete-help">Le lot et ses effectifs seront supprimés définitivement. Cette action ne peut pas être annulée.</p>
      {deleteMessage && <p ref={deleteError} className="lots-error" role="alert" tabIndex={-1}>{deleteMessage}</p>}
      <div className="lots-dialog-actions"><button className="lots-button" type="button" disabled={busy} onClick={() => deleteDialog.current?.close()}>Conserver le lot</button><button className="lots-button lots-button--danger" type="button" disabled={busy} onClick={remove}>{busy ? 'Suppression…' : 'Supprimer le lot'}</button></div>
    </dialog>
  </div>
}
