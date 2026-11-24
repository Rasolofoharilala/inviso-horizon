type PlaceholderPageProps = {
  title: string
}

export default function PlaceholderPage({
  title,
}: PlaceholderPageProps) {
  return (
    <>
      <header className="home-header">
        <span className="home-eyebrow">ESPACE HORIZON</span>
        <h1>{title}</h1>
        <p>Une vision claire. Des décisions éclairées.</p>
      </header>

      <section className="home-test-card">
        <h2>
          {title === 'Accueil'
            ? 'Bienvenue sur Horizon'
            : 'Page en préparation'}
        </h2>

        <p>
          {title === 'Accueil'
            ? 'Ouvrez Vue générale pour consulter le dashboard ou Données pour gérer les produits.'
            : 'Le contenu de cette page sera disponible prochainement.'}
        </p>
      </section>
    </>
  )
}