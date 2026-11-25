import { useId, useState } from 'react'
import type { LotEvolution } from '../api/lots'
import { placementDateLabel } from '../utils/lotAge'
const number = new Intl.NumberFormat('fr-FR')
const axisNumber = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })
export default function LotEvolutionChart({ data }: { data: LotEvolution }) {
  const id = useId()
  const [males, setMales] = useState(true)
  const [females, setFemales] = useState(true)
  const points = data.points
  const max = Math.max(4, Math.ceil(Math.max(0, ...points.flatMap((point) => [point.males, point.females])) / 4) * 4)
  const start = Date.parse(data.from), end = Date.parse(data.to)
  const x = (date: string) => 76 + (end === start ? .5 : (Date.parse(date) - start) / (end - start)) * 654
  const y = (value: number) => 225 - value / max * 180
  const coordinates = (field: 'males' | 'females') => points.map((point) => `${x(point.date)},${y(point[field])}`).join(' ')
  if (!points.length) return <p>Aucune valeur calculée pour cette période.</p>
  return <>
    <fieldset className="lot-chart-legend"><legend>Courbes affichées</legend><label><input type="checkbox" checked={males} onChange={(event) => setMales(event.target.checked)} /><span className="lot-line lot-line--male" />Mâles · trait continu</label><label><input type="checkbox" checked={females} onChange={(event) => setFemales(event.target.checked)} /><span className="lot-line lot-line--female" />Femelles · trait discontinu</label></fieldset>
    {!males && !females && <p role="status">Cochez au moins une série pour afficher sa courbe.</p>}
    <div className="lot-chart-scroll" tabIndex={0} role="region" aria-label="Diagramme des effectifs, défilement horizontal sur petit écran">
      <svg viewBox="0 0 800 290" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>Évolution des effectifs mâles et femelles</title><desc id={`${id}-desc`}>Du {placementDateLabel(data.from)} au {placementDateLabel(data.to)}. {points.length} points calculés à partir des mouvements non annulés. Les valeurs exactes figurent dans le tableau sous le diagramme.</desc>
        {[0,1,2,3,4].map((tick) => <g key={tick}><line x1="76" x2="730" y1={y(tick*max/4)} y2={y(tick*max/4)} stroke="#a3b0a6" /><text x="65" y={y(tick*max/4)+4} textAnchor="end" fill="#172c21" fontSize="12">{axisNumber.format(tick*max/4)}</text></g>)}
        <text x="76" y="24" fill="#172c21" fontSize="13">Effectif (animaux)</text>
        {males && <polyline points={coordinates('males')} fill="none" stroke="#154a2b" strokeWidth="3" />}
        {females && <polyline points={coordinates('females')} fill="none" stroke="#762b22" strokeWidth="3" strokeDasharray="8 5" />}
        {points.length === 1 && <>{males && <circle cx={x(points[0].date)} cy={y(points[0].males)} r="5" fill="#154a2b" />}{females && <circle cx={x(points[0].date)} cy={y(points[0].females)} r="5" fill="#762b22" />}</>}
        <text x="76" y="255" fill="#172c21" fontSize="12">{placementDateLabel(data.from)}</text><text x="730" y="255" textAnchor="end" fill="#172c21" fontSize="12">{placementDateLabel(data.to)}</text>
      </svg>
    </div>
    <p className="lot-help">Effectifs reconstitués d’après les mouvements saisis. {data.interval === 'week' ? 'Points de début, fin de semaine d’élevage et fin de période.' : 'Un point par jour.'} Les segments relient les points calculés.</p>
    <details className="lot-chart-values"><summary>Consulter les valeurs du diagramme</summary><div className="lots-table-wrap" tabIndex={0} role="region" aria-label="Valeurs du diagramme"><table><caption className="lots-sr-only">Valeurs exactes des courbes</caption><thead><tr><th scope="col">Date</th><th scope="col">Âge</th><th scope="col">Mâles</th><th scope="col">Femelles</th><th scope="col">Total</th></tr></thead><tbody>{points.map((point) => <tr key={point.date}><th scope="row">{placementDateLabel(point.date)}</th><td>S{point.week} · J{point.day}</td><td>{number.format(point.males)}</td><td>{number.format(point.females)}</td><td>{number.format(point.total)}</td></tr>)}</tbody></table></div></details>
  </>
}
