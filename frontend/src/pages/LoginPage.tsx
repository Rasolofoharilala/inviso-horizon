import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import logoLogin from '../assets/logo-login.svg'
import logoLight from '../assets/logo-navbar.svg'
import './LoginPage.css'

type LoginPageProps = { onLogin: () => void }
type FieldErrors = { identifier?: string; password?: string }

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [appearance, setAppearance] = useState('standard')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState('')
  const identifierRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Connexion — Horizon'
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    if (!identifier.trim()) nextErrors.identifier = 'Renseignez votre identifiant.'
    if (!password.trim()) nextErrors.password = 'Renseignez votre mot de passe.'
    setErrors(nextErrors)
    setMessage('')
    if (nextErrors.identifier) {
      identifierRef.current?.focus()
      return
    }
    if (nextErrors.password) {
      passwordRef.current?.focus()
      return
    }
    // Démonstration uniquement : aucune vérification serveur ni conservation du mot de passe.
    onLogin()
  }

  function showHelp() {
    setMessage('Pour obtenir un accès ou réinitialiser votre mot de passe, contactez votre administrateur.')
  }

  return (
    <main className={`login-layout login-layout--${appearance}`}>
      <div className="login-shell">
        <section className="login-intro" aria-label="Présentation Horizon">
          <img src={logoLight} alt="Horizon" className="login-intro-logo" />
          <div className="login-intro-copy">
            <span className="login-eyebrow">VOTRE ESPACE DE PILOTAGE</span>
            <p className="login-slogan">Une vision claire.<br />Des décisions éclairées.</p>
            <p className="login-intro-description">Votre activité, vos données,<br />vos décisions.</p>
          </div>
          <div className="login-waves" aria-hidden="true"><span /><span /><span /></div>
          <p className="login-signature">Une solution pour <strong>AGRIFARM</strong></p>
        </section>

        <section className="login-panel" aria-labelledby="login-heading">
          <div className="login-content">
            <div className="login-appearance">
              <label htmlFor="login-appearance">Affichage</label>
              <select id="login-appearance" value={appearance} onChange={(event) => setAppearance(event.target.value)}>
                <option value="standard">Standard</option>
                <option value="reading">Lecture confortable</option>
                <option value="dark">Contraste sombre</option>
              </select>
            </div>
            <img src={logoLogin} alt="Horizon" className="login-logo-image" />
            <header className="login-header">
              <h1 id="login-heading">Bienvenue sur Horizon</h1>
              <p>Connectez-vous à votre espace de pilotage.</p>
            </header>
            <form className="login-form" onSubmit={handleSubmit} noValidate aria-describedby="login-instructions">
              <p id="login-instructions" className="login-instructions">Les deux champs sont obligatoires.</p>
              <div className="login-error-summary" role="alert" aria-atomic="true">
                {Object.keys(errors).some((key) => errors[key as keyof FieldErrors])
                  ? 'Connexion non effectuée. Corrigez les champs indiqués ci-dessous.'
                  : ''}
              </div>
              <div className="login-field">
                <label htmlFor="identifier">Identifiant</label>
                <input
                  ref={identifierRef}
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Votre identifiant"
                  value={identifier}
                  required
                  aria-invalid={Boolean(errors.identifier)}
                  aria-describedby={`identifier-help${errors.identifier ? ' identifier-error' : ''}`}
                  onChange={(event) => {
                    setIdentifier(event.target.value)
                    setErrors((current) => ({ ...current, identifier: undefined }))
                  }}
                />
                <p id="identifier-help" className="login-field-help">Utilisez l’identifiant fourni par votre administrateur.</p>
                {errors.identifier && <p className="login-error" id="identifier-error">{errors.identifier}</p>}
              </div>

              <div className="login-field">
                <label htmlFor="password">Mot de passe</label>
                <div className="login-password">
                  <input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Votre mot de passe"
                    value={password}
                    required
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={`password-help${errors.password ? ' password-error' : ''}`}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setErrors((current) => ({ ...current, password: undefined }))
                    }}
                  />
                  <button
                    className="login-password-toggle"
                    type="button"
                    aria-controls="password"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                      {showPassword && <path d="m3 3 18 18" />}
                    </svg>
                    <span>{showPassword ? 'Masquer' : 'Afficher'}</span>
                  </button>
                </div>
                <p id="password-help" className="login-field-help">Vous pouvez coller votre mot de passe ou utiliser votre gestionnaire de mots de passe.</p>
                {errors.password && <p className="login-error" id="password-error">{errors.password}</p>}
              </div>

              <button className="login-forgot" type="button" onClick={showHelp}>Besoin d’aide ?</button>
              <button className="login-submit" type="submit">Se connecter <span aria-hidden="true">→</span></button>
              <p className="login-message" role="status">{message}</p>
            </form>
            <p className="login-access-help">Besoin d’un accès ?<br /><button type="button" onClick={showHelp}>Contactez votre administrateur.</button></p>
          </div>
        </section>
      </div>
    </main>
  )
}
