import { useState } from 'react'
import type { FormEvent } from 'react'
import './LoginPage.css'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('Formulaire valide. Connexion au serveur à intégrer.')
  }

  return (
    <main className="login-layout">
      <section className="login-intro" aria-label="Présentation Horizon">
        <h1>
          Une vision claire.
          <br />
          Des décisions éclairées.
        </h1>
      </section>

      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-content">
          <a className="horizon-logo" href="/" aria-label="Horizon — accueil">
            HORIZON
          </a>

          <header className="login-header">
            <h2 id="login-heading">Connectez-vous</h2>
            <p>Accédez à votre espace Horizon.</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="identifier">Identifiant</label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value)
                  setMessage('')
                }}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setMessage('')
                }}
                required
              />
            </div>

            <label className="login-remember">
              <input
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>Se souvenir de moi</span>
            </label>

            <button
              className="login-forgot"
              type="button"
              onClick={() =>
                setMessage(
                  'Pour réinitialiser votre mot de passe, contactez votre administrateur.',
                )
              }
            >
              Mot de passe oublié ?
            </button>

            <button className="login-submit" type="submit">
              Se connecter
            </button>

            <p className="login-message" role="status">
              {message}
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}