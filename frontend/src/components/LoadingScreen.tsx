import logo from '../assets/logo-login.svg'
import './LoadingScreen.css'

type Props = { error?: boolean; onRetry?: () => void }

export default function LoadingScreen({ error = false, onRetry }: Props) {
  return (
    <main className="loading-screen" aria-label="Ouverture de Horizon">
      <div className="loading-screen-content">
        <img className="loading-screen-logo" src={logo} alt="Horizon" />
        <div className="loading-screen-dots" aria-hidden="true"><span /><span /><span /></div>
        <div role={error ? 'alert' : 'status'} aria-atomic="true">
          <p className="loading-screen-message">{error ? 'Impossible de charger votre espace.' : 'Ouverture de votre espace…'}</p>
          {error && <p className="loading-screen-help">Vérifiez votre connexion, puis réessayez.</p>}
        </div>
        {error && <button className="loading-screen-retry" type="button" onClick={onRetry}>Réessayer</button>}
      </div>
      <p className="loading-screen-signature">Une solution pour <strong>AGRIFARM</strong></p>
    </main>
  )
}
