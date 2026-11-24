import { useState } from 'react'
import './DashboardPage.css'

const datasets = {
  week: {
    label: 'Cette semaine',
    revenue: '12 450 000 Ar',
    expenses: '8 200 000 Ar',
    margin: '4 250 000 Ar',
    alerts: '3',
    chart: [
      { label: 'Lun', revenue: 65, expenses: 42 },
      { label: 'Mar', revenue: 82, expenses: 55 },
      { label: 'Mer', revenue: 58, expenses: 40 },
      { label: 'Jeu', revenue: 90, expenses: 62 },
      { label: 'Ven', revenue: 76, expenses: 48 },
      { label: 'Sam', revenue: 55, expenses: 35 },
      { label: 'Dim', revenue: 43, expenses: 30 },
    ],
  },
  month: {
    label: 'Ce mois',
    revenue: '48 600 000 Ar',
    expenses: '32 100 000 Ar',
    margin: '16 500 000 Ar',
    alerts: '8',
    chart: [
      { label: 'S1', revenue: 68, expenses: 45 },
      { label: 'S2', revenue: 85, expenses: 60 },
      { label: 'S3', revenue: 74, expenses: 48 },
      { label: 'S4', revenue: 95, expenses: 65 },
    ],
  },
}

const activities = [
  {
    id: 'ACT-001',
    name: 'Import des données',
    date: '24/11/2026',
    status: 'Terminé',
  },
  {
    id: 'ACT-002',
    name: 'Contrôle des dépenses',
    date: '24/11/2026',
    status: 'À vérifier',
  },
  {
    id: 'ACT-003',
    name: 'Mise à jour du catalogue',
    date: '23/11/2026',
    status: 'Terminé',
  },
]

export default function DashboardPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  const data = datasets[period]

  const indicators = [
    { label: 'Chiffre d’affaires', value: data.revenue },
    { label: 'Dépenses', value: data.expenses },
    { label: 'Marge', value: data.margin },
    { label: 'Alertes à traiter', value: data.alerts },
  ]

  return (
    <section className="dashboard" aria-labelledby="dashboard-title">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">PILOTAGE</span>
          <h1 id="dashboard-title">Vue générale</h1>
          <p>Les indicateurs essentiels de votre activité.</p>
        </div>

        <div className="dashboard-filter">
          <label htmlFor="dashboard-period">Période</label>
          <select
            id="dashboard-period"
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as 'week' | 'month')
            }
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
        </div>
      </header>

      <p className="dashboard-demo">
        Démonstration — données fictives.
      </p>

      <div className="dashboard-indicators">
        {indicators.map((indicator) => (
          <article className="dashboard-kpi" key={indicator.label}>
            <h2>{indicator.label}</h2>
            <p>{indicator.value}</p>
            <span>{data.label}</span>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section
          className="dashboard-card dashboard-chart-card"
          aria-labelledby="chart-title"
        >
          <header className="dashboard-card-header">
            <div>
              <h2 id="chart-title">Revenus et dépenses</h2>
              <p>Comparaison de la période sélectionnée.</p>
            </div>
          </header>

          <div className="dashboard-legend" aria-hidden="true">
            <span>
              <i className="legend-revenue" />
              Revenus
            </span>
            <span>
              <i className="legend-expenses" />
              Dépenses
            </span>
          </div>

          <p className="dashboard-chart-note">
            Indice de démonstration, de 0 à 100.
          </p>

          <div className="dashboard-chart" aria-hidden="true">
            {data.chart.map((item) => (
              <div className="dashboard-chart-column" key={item.label}>
                <div className="dashboard-bars">
                  <div
                    className="dashboard-bar dashboard-bar--revenue"
                    style={{ height: `${item.revenue}%` }}
                  />
                  <div
                    className="dashboard-bar dashboard-bar--expenses"
                    style={{ height: `${item.expenses}%` }}
                  />
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <details className="dashboard-chart-details">
            <summary>Voir les valeurs du graphique</summary>
            <table className="dashboard-table">
              <caption className="dashboard-sr-only">
                Revenus et dépenses — indices de démonstration
              </caption>
              <thead>
                <tr>
                  <th scope="col">Période</th>
                  <th scope="col">Revenus</th>
                  <th scope="col">Dépenses</th>
                </tr>
              </thead>
              <tbody>
                {data.chart.map((item) => (
                  <tr key={item.label}>
                    <th scope="row">{item.label}</th>
                    <td>{item.revenue}</td>
                    <td>{item.expenses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>

        <section
          className="dashboard-card"
          aria-labelledby="attention-title"
        >
          <header className="dashboard-card-header">
            <div>
              <h2 id="attention-title">Points d’attention</h2>
              <p>Exemples d’éléments à surveiller.</p>
            </div>
          </header>

          <ul className="dashboard-attention">
            <li>
              <span className="dashboard-dot dashboard-dot--warning" />
              <div>
                <h3>Dépenses à vérifier</h3>
                <p>Un écart a été relevé sur les coûts d’alimentation.</p>
              </div>
            </li>
            <li>
              <span className="dashboard-dot" />
              <div>
                <h3>Dernier import terminé</h3>
                <p>Le jeu de données de démonstration est disponible.</p>
              </div>
            </li>
          </ul>
        </section>

        <section
          className="dashboard-card dashboard-activity"
          aria-labelledby="activity-title"
        >
          <header className="dashboard-card-header">
            <div>
              <h2 id="activity-title">Activité récente</h2>
              <p>Exemples d’opérations enregistrées.</p>
            </div>
          </header>

          <div className="dashboard-table-scroll">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th scope="col">Référence</th>
                  <th scope="col">Opération</th>
                  <th scope="col">Date</th>
                  <th scope="col">Statut</th>
                </tr>
              </thead>

              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>{activity.id}</td>
                    <td>{activity.name}</td>
                    <td>{activity.date}</td>
                    <td>
                      <span
                        className={
                          activity.status === 'Terminé'
                            ? 'dashboard-badge'
                            : 'dashboard-badge dashboard-badge--warning'
                        }
                      >
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  )
}
