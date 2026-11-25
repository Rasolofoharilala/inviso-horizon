import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { api } from '../api/session'
import { useSession } from '../auth/useSession'
import './ProfilePage.css'

type Photo = { id: string; createdAt: string; url: string }
type Selection = { file: File; preview: string }
const roles: Record<string, string> = { ADMIN: 'Administrateur', EDITOR: 'Éditeur', VIEWER: 'Lecteur' }
const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
function photoDate(date: string) {
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? 'Date indisponible' : dateFormat.format(parsed)
}
function Symbol({ name }: { name: 'photo' | 'shield' | 'check' | 'history' }) {
  const paths = {
    photo: 'M4 6h4l2-3h4l2 3h4v14H4ZM16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0',
    shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6ZM8 12l3 3 5-6',
    check: 'm5 12 4 4L19 6',
    history: 'M3 10a9 9 0 1 1 2 8M3 3v7h7M12 7v5l3 2',
  }
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

export default function ProfilePage() {
  const { user, reload } = useSession()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [fieldError, setFieldError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [validating, setValidating] = useState(false)
  const [candidate, setCandidate] = useState<Photo | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const selectionVersion = useRef(0)
  const mutationLock = useRef(false)
  const initial = user?.username.charAt(0).toLocaleUpperCase('fr-FR') ?? 'U'
  const roleLabel = user?.roles.map((role) => roles[role] ?? role).join(', ')

  useEffect(() => {
    const controller = new AbortController()
    api<Photo[]>('/api/profile/photos', { signal: controller.signal }).then(setPhotos)
      .catch(() => { if (!controller.signal.aborted) setHistoryError('Votre historique n’a pas pu être chargé. Réessayez.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort(); selectionVersion.current += 1 }
  }, [])
  useEffect(() => () => { if (selection) URL.revokeObjectURL(selection.preview) }, [selection])
  useEffect(() => {
    if (candidate && !dialogRef.current?.open) dialogRef.current?.showModal()
  }, [candidate])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  async function loadHistory() {
    setLoading(true); setHistoryError('')
    try { setPhotos(await api<Photo[]>('/api/profile/photos')) }
    catch { setHistoryError('Votre historique n’a pas pu être chargé. Réessayez.') }
    finally { setLoading(false) }
  }
  async function refreshAfterSave() {
    // L’enregistrement est déjà confirmé. Un échec de rafraîchissement ne doit pas inviter à renvoyer le fichier.
    try { await reload() }
    catch { setError('La photo est enregistrée, mais le profil n’a pas pu être actualisé. Rechargez la page.') }
    await loadHistory()
  }
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const version = ++selectionVersion.current
    const file = event.target.files?.[0]
    setFieldError(''); setError(''); setNotice(''); setSelection(null)
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) {
      setFieldError('Choisissez une image JPEG ou PNG de 2 Mo maximum.'); event.target.value = ''; return
    }
    const preview = URL.createObjectURL(file)
    setValidating(true)
    try {
      const image = new Image()
      image.src = preview
      await image.decode()
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096 || image.naturalWidth * image.naturalHeight > 4_000_000) {
        throw new Error('Choisissez une image de 4 millions de pixels maximum, sans côté supérieur à 4 096 pixels.')
      }
      if (selectionVersion.current !== version) { URL.revokeObjectURL(preview); return }
      setSelection({ file, preview })
    } catch (reason) {
      URL.revokeObjectURL(preview)
      if (selectionVersion.current === version) {
        setFieldError(reason instanceof Error && reason.message.startsWith('Choisissez') ? reason.message : 'Cette image ne peut pas être lue. Choisissez un autre fichier.')
        if (inputRef.current) inputRef.current.value = ''
      }
    } finally { if (selectionVersion.current === version) setValidating(false) }
  }
  function cancelSelection() {
    selectionVersion.current += 1
    setSelection(null); setFieldError(''); setValidating(false)
    if (inputRef.current) { inputRef.current.value = ''; inputRef.current.focus() }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mutationLock.current || validating) return
    if (!selection) { setFieldError('Sélectionnez d’abord une photo.'); inputRef.current?.focus(); return }
    mutationLock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      const data = new FormData(); data.set('file', selection.file)
      await api('/api/profile/photos', { method: 'POST', body: data })
      setSelection(null)
      if (inputRef.current) inputRef.current.value = ''
      setNotice('Votre nouvelle photo est enregistrée. L’ancienne reste dans votre historique.')
      await refreshAfterSave()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'La photo n’a pas pu être enregistrée. Réessayez.') }
    finally { mutationLock.current = false; setBusy(false) }
  }
  async function restore() {
    if (!candidate || mutationLock.current) return
    mutationLock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      await api(`/api/profile/photos/${candidate.id}/current`, { method: 'PUT' })
      dialogRef.current?.close(); setCandidate(null)
      setNotice('La photo choisie est maintenant votre photo de profil.')
      await refreshAfterSave()
    } catch (reason) {
      dialogRef.current?.close(); setCandidate(null)
      setError(reason instanceof Error ? reason.message : 'La photo n’a pas pu être réutilisée. Réessayez.')
    } finally { mutationLock.current = false; setBusy(false) }
  }

  return <div className="profile-settings">
    <header className="profile-heading">
      <p className="profile-eyebrow">VOTRE COMPTE HORIZON</p>
      <h1>Paramètres du compte</h1>
      <p>Une photo qui vous ressemble. Un compte facile à retrouver.</p>
    </header>
    <nav className="profile-sections" aria-label="Sections des paramètres">
      <a href="#profile-identity">Profil et photo</a>
      <a href="#profile-history">Historique des photos</a>
      <a href="#profile-access">Droits d’accès</a>
    </nav>
    <div className="profile-feedback" role="status" aria-live="polite" aria-atomic="true">
      {notice && <p className="profile-success"><Symbol name="check" />{notice}</p>}
    </div>
    {error && <div ref={errorRef} className="profile-error" role="alert" tabIndex={-1}><strong>Vérification nécessaire</strong><p>{error}</p></div>}

    <div className="profile-layout">
      <aside className="profile-summary" aria-label="Résumé du compte">
        <div className="profile-summary-top"><span>VOTRE PROFIL</span><Symbol name="shield" /></div>
        <div className="profile-avatar profile-avatar--large">
          {user?.avatarUrl ? <img src={user.avatarUrl} alt={`Photo actuelle de ${user.username}`} width="112" height="112" /> : <span aria-label="Aucune photo de profil">{initial}</span>}
        </div>
        <h2>{user?.username}</h2><p className="profile-role">{roleLabel}</p>
        <p className="profile-session"><Symbol name="check" />Session ouverte</p>
        <p className="profile-summary-note">Votre photo vous identifie dans votre espace Horizon.</p>
      </aside>

      <section id="profile-identity" className="profile-card" aria-labelledby="profile-photo-title" tabIndex={-1}>
        <header className="profile-card-heading"><span className="profile-icon"><Symbol name="photo" /></span><div><h2 id="profile-photo-title">Photo de profil</h2><p>Choisissez une image, vérifiez l’aperçu, puis enregistrez.</p></div></header>
        <form onSubmit={upload} noValidate aria-busy={busy}>
          <div className="profile-upload-layout">
            <figure className="profile-preview">
              <div className="profile-avatar profile-avatar--preview">
                {selection ? <img src={selection.preview} alt="Aperçu de la nouvelle photo, pas encore enregistrée" width="144" height="144" />
                  : user?.avatarUrl ? <img src={user.avatarUrl} alt="Photo de profil actuelle" width="144" height="144" /> : <span aria-hidden="true">{initial}</span>}
              </div>
              <figcaption>{selection ? 'Nouvel aperçu' : 'Photo actuelle'}</figcaption>
            </figure>
            <div className="profile-file-field">
              <label htmlFor="profile-photo">Choisir une nouvelle photo</label>
              <p id="profile-photo-help">JPEG ou PNG · 2 Mo maximum.<br />4 millions de pixels maximum ; 4 096 pixels par côté.</p>
              <input ref={inputRef} id="profile-photo" name="file" type="file" accept="image/jpeg,image/png" disabled={busy || validating}
                aria-invalid={Boolean(fieldError)} aria-describedby={`profile-photo-help${fieldError ? ' profile-photo-error' : ''}`} onChange={choose} />
              {fieldError && <p id="profile-photo-error" className="profile-field-error" role="alert">{fieldError}</p>}
              <p className="profile-selection" role="status">{validating ? 'Vérification de l’image…' : selection ? `${selection.file.name} · ${Math.ceil(selection.file.size / 1024)} Ko · prête à enregistrer` : 'Aucun changement en attente.'}</p>
            </div>
          </div>
          <div className="profile-save-bar"><p>L’ancienne photo restera disponible.</p><div className="profile-actions">
            {selection && <button type="button" className="profile-button profile-button--secondary" disabled={busy} onClick={cancelSelection}>Annuler</button>}
            <button className="profile-button profile-button--primary" disabled={busy || validating || !selection} type="submit">{busy ? 'Enregistrement…' : 'Enregistrer la photo'}</button>
          </div></div>
        </form>
      </section>
    </div>

    <section id="profile-history" className="profile-card profile-history" aria-labelledby="profile-history-title" tabIndex={-1}>
      <header className="profile-history-heading"><div className="profile-card-heading"><span className="profile-icon"><Symbol name="history" /></span><div><h2 id="profile-history-title">Votre historique de photos</h2><p>Retrouvez vos photos précédentes et réutilisez celle de votre choix.</p></div></div><span className="profile-count">{photos.length} photo{photos.length > 1 ? 's' : ''}</span></header>
      {loading && <p role="status">Chargement de votre historique…</p>}
      {historyError && <div className="profile-error" role="alert"><p>{historyError}</p><button type="button" className="profile-button profile-button--secondary" onClick={loadHistory} disabled={loading || busy}>Réessayer</button></div>}
      {!loading && !historyError && !photos.length && <div className="profile-empty"><Symbol name="photo" /><h3>Votre première photo commence ici</h3><p>Ajoutez une photo depuis le formulaire ci-dessus. Les prochaines seront conservées dans cet espace.</p><a href="#profile-photo" className="profile-button profile-button--secondary">Choisir ma première photo</a></div>}
      {!!photos.length && <ul className="profile-photo-grid">{photos.map((photo, index) => {
        const current = user?.avatarUrl === photo.url
        return <li key={photo.id} className={`profile-photo-card${current ? ' profile-photo-card--current' : ''}`}>
          <div className="profile-photo-top"><span className="profile-photo-label">{current ? <><Symbol name="check" />Photo actuelle</> : 'Photo précédente'}</span><span className="profile-photo-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span></div>
          <img src={photo.url} alt={`Photo ajoutée le ${photoDate(photo.createdAt)}`} width="112" height="112" loading="lazy" />
          <p>Ajoutée le <time dateTime={photo.createdAt}>{photoDate(photo.createdAt)}</time></p>
          {current ? <p className="profile-current-note">Utilisée sur votre profil</p> : <button type="button" className="profile-button profile-button--secondary" disabled={busy} aria-label={`Réutiliser la photo du ${photoDate(photo.createdAt)}`} onClick={() => setCandidate(photo)}>Réutiliser cette photo</button>}
        </li>
      })}</ul>}
    </section>

    <section id="profile-access" className="profile-card profile-access" aria-labelledby="profile-access-title" tabIndex={-1}>
      <div className="profile-card-heading"><span className="profile-icon"><Symbol name="shield" /></span><div><h2 id="profile-access-title">Identité et droits d’accès</h2><p>Ces informations sont gérées par votre administrateur.</p></div></div>
      <dl className="profile-details"><div><dt>Identifiant</dt><dd>{user?.username}</dd></div><div><dt>Rôle dans Horizon</dt><dd>{roleLabel}</dd></div></dl>
      <p className="profile-access-note">Pour modifier votre identifiant ou vos droits, contactez votre administrateur.</p>
    </section>

    <dialog ref={dialogRef} className="profile-confirm" aria-labelledby="profile-confirm-title" aria-describedby="profile-confirm-description" onCancel={(event) => { if (busy) event.preventDefault() }} onClose={() => setCandidate(null)}>
      <h2 id="profile-confirm-title">Réutiliser cette photo ?</h2>
      <p id="profile-confirm-description">Elle remplacera votre photo actuelle. Toutes vos photos resteront dans l’historique.</p>
      {candidate && <img src={candidate.url} alt={`Photo du ${photoDate(candidate.createdAt)}`} width="112" height="112" />}
      <div className="profile-actions"><button type="button" className="profile-button profile-button--secondary" disabled={busy} onClick={() => dialogRef.current?.close()}>Annuler</button><button type="button" className="profile-button profile-button--primary" disabled={busy} onClick={restore}>{busy ? 'Enregistrement…' : 'Confirmer la photo'}</button></div>
    </dialog>
  </div>
}
