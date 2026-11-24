import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Link } from 'react-router'
import './SandboxPage.css'

type Panel = { id: string; title: string; type: 'chart' | 'table' | 'kpi'; width: number; height: number }
const defaults: Panel[] = [
  { id: 'selection', title: 'Indicateur', type: 'kpi', width: 4, height: 240 },
  { id: 'comparison', title: 'Comparaison', type: 'chart', width: 8, height: 320 },
  { id: 'details', title: 'Détail des écarts', type: 'table', width: 12, height: 280 },
]
const rows = [{ name: 'Lot A', value: 120, expense: 85 }, { name: 'Lot B', value: 150, expense: 110 }, { name: 'Lot C', value: 95, expense: 70 }]
const storageKey = 'horizon:sandbox:layout:v1'

export default function SandboxPage() {
  const [newType, setNewType] = useState<Panel['type']>('chart')
  const resizeStart = useRef<{ id: string; x: number; y: number; width: number; height: number; step: number } | null>(null)
  const [panels, setPanels] = useState<Panel[]>(defaults)
  const [editing, setEditing] = useState(true)
  const [dragged, setDragged] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  function update(id: string, patch: Partial<Panel>) {
    setPanels((current) => current.map((panel) => panel.id === id ? { ...panel, ...patch } : panel))
  }
  function move(id: string, delta: number) {
    setPanels((current) => {
      const index = current.findIndex((panel) => panel.id === id)
      const target = index + delta
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setMessage('Ordre des panneaux modifié.')
  }
  function drop(target: string) {
    if (!dragged || dragged === target) return
    setPanels((current) => {
      const next = current.filter((panel) => panel.id !== dragged)
      const panel = current.find((item) => item.id === dragged)
      const index = next.findIndex((item) => item.id === target)
      if (panel) next.splice(index, 0, panel)
      return next
    })
    setDragged(null)
    setMessage('Panneau déplacé avant la cible.')
  }
  function startResize(event: PointerEvent<HTMLButtonElement>, panel: Panel) {
    if (event.button !== 0) return
    const element = event.currentTarget.closest<HTMLElement>('.sandbox-panel')
    const grid = element?.parentElement
    if (!element || !grid) return
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 20
    const style = getComputedStyle(grid)
    const innerWidth = grid.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    resizeStart.current = { id: panel.id, x: event.clientX, y: event.clientY, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, step: (innerWidth + gap) / 12 }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
  function resize(event: PointerEvent<HTMLButtonElement>) {
    const start = resizeStart.current
    if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const gridGap = parseFloat(getComputedStyle(event.currentTarget.closest('.sandbox-grid')!).columnGap) || 20
    const width = Math.min(12, Math.max(3, Math.round((start.width + event.clientX - start.x + gridGap) / start.step)))
    const height = Math.min(800, Math.max(240, Math.round((start.height + event.clientY - start.y) / 20) * 20))
    update(start.id, { width, height })
  }
  function stopResize() {
    if (resizeStart.current) setMessage('Dimensions du panneau mises à jour.')
    resizeStart.current = null
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(panels)); setMessage('Disposition du sandbox enregistrée dans ce navigateur.') }
    catch { setMessage('Le navigateur ne permet pas cet enregistrement.') }
  }
  function restore() {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
      if (!Array.isArray(data) || data.length > 30 || !data.every((p: unknown) => {
        if (!p || typeof p !== 'object') return false
        const v = p as Record<string, unknown>
        return typeof v.id === 'string' && typeof v.title === 'string' && ['chart', 'table', 'kpi'].includes(String(v.type)) && typeof v.width === 'number' && Number.isInteger(v.width) && v.width >= 3 && v.width <= 12 && typeof v.height === 'number' && v.height >= 240 && v.height <= 800
      })) { setMessage('Aucune disposition valide à restaurer.'); return }
      if (new Set(data.map((p: Panel) => p.id)).size !== data.length) throw Error('Identifiants dupliqués')
      setPanels(data as Panel[])
      setMessage('Disposition restaurée.')
    } catch { setMessage('Impossible de restaurer cette disposition.') }
  }

  return (
    <main className="sandbox">
      <header className="sandbox-header">
        <div><Link to="/accueil">← Retour à Horizon</Link><h1>Laboratoire de panneaux</h1><p>Sandbox indépendant · données fictives · aucune modification des pages métier.</p></div>
        <button type="button" aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? 'Terminer la personnalisation' : 'Personnaliser'}</button>
      </header>
      <div className="sandbox-toolbar" aria-label="Actions du sandbox">
        <label className="sandbox-add-choice">Fenêtre à ajouter
          <select value={newType} disabled={!editing} onChange={(event) => setNewType(event.target.value as Panel['type'])}>
            <option value="chart">Graphique comparatif</option>
            <option value="table">Tableau de données</option>
            <option value="kpi">Indicateur de valorisation</option>
          </select>
        </label>
        <button type="button" disabled={!editing || panels.length >= 30} onClick={() => {
          const titles = { chart: 'Graphique comparatif', table: 'Tableau de données', kpi: 'Indicateur de valorisation' }
          setPanels((current) => [...current, { id: crypto.randomUUID(), title: titles[newType], type: newType, width: 6, height: 320 }])
          setMessage(`${titles[newType]} ajouté.`)
        }}>+ Ajouter cette fenêtre</button>
        <button type="button" onClick={save}>Enregistrer</button>
        <button type="button" onClick={restore}>Restaurer</button>
        <button type="button" onClick={() => { setPanels(defaults); setMessage('Disposition par défaut rétablie. La sauvegarde reste disponible.'); }}>Disposition par défaut</button>
      </div>
      <p className="sandbox-status" role="status">{message}</p>
      {editing && <p className="sandbox-instructions">Glissez un panneau par sa poignée vers un autre pour le placer avant lui. Tirez la poignée en bas à droite pour redimensionner. Les boutons Avant / Après et les choix de dimensions offrent les mêmes actions au clavier.</p>}
      <div className={`sandbox-grid ${editing ? 'sandbox-grid--editing' : ''}`}>
        {panels.map((panel, index) => (
          <section key={panel.id} className={`sandbox-panel ${dragged === panel.id ? 'sandbox-panel--dragged' : ''}`} style={{ gridColumn: `span ${panel.width}`, height: panel.height }} aria-label={panel.title} onDragOver={(event) => { if (editing) event.preventDefault() }} onDrop={(event) => { event.preventDefault(); if (editing) drop(panel.id) }}>
            <header className="sandbox-panel-header">
              {editing && <span className="sandbox-grip" draggable onDragStart={(event) => { setDragged(panel.id); event.dataTransfer.setData('text/plain', panel.id); event.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => setDragged(null)} aria-hidden="true">⠿</span>}
              <h2>{panel.title}</h2>
              {editing && <button type="button" aria-label={`Supprimer ${panel.title}`} onClick={() => { setPanels((current) => current.filter((item) => item.id !== panel.id)); setMessage('Panneau supprimé.'); }}>×</button>}
            </header>
            {editing && <div className="sandbox-panel-settings">
              <label>Titre<input value={panel.title} maxLength={80} onChange={(event) => update(panel.id, { title: event.target.value })} /></label>
              <label>Affichage<select value={panel.type} onChange={(event) => update(panel.id, { type: event.target.value as Panel['type'] })}><option value="chart">Graphique</option><option value="table">Tableau</option><option value="kpi">Indicateur</option></select></label>
              <label>Largeur<select value={panel.width} onChange={(event) => update(panel.id, { width: Number(event.target.value) })}>{Array.from({ length: 10 }, (_, index) => index + 3).map((width) => <option key={width} value={width}>{width}/12 de la ligne</option>)}</select></label>
              <label>Hauteur<select value={panel.height} onChange={(event) => update(panel.id, { height: Number(event.target.value) })}>{Array.from({ length: 29 }, (_, index) => 240 + index * 20).map((height) => <option key={height} value={height}>{height} px</option>)}</select></label>
              <div className="sandbox-order"><button type="button" disabled={index === 0} aria-label={`Déplacer ${panel.title} avant`} onClick={() => move(panel.id, -1)}>← Avant</button><button type="button" disabled={index === panels.length - 1} aria-label={`Déplacer ${panel.title} après`} onClick={() => move(panel.id, 1)}>Après →</button></div>
            </div>}
            <div className="sandbox-panel-content">
              {panel.type === 'kpi' && <div className="sandbox-kpi"><span>Valorisation fictive</span><strong>12 450 000 Ar</strong><span>3 lots · exemple de présentation</span></div>}
              {panel.type === 'table' && <div className="sandbox-table-scroll"><table><caption>Valeurs fictives par lot</caption><thead><tr><th scope="col">Lot</th><th scope="col">Valeur</th><th scope="col">Dépense</th><th scope="col">Écart</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.value}</td><td>{row.expense}</td><td>{row.value - row.expense}</td></tr>)}</tbody></table></div>}
              {panel.type === 'chart' && <><div className="sandbox-chart" role="img" aria-label="Valeurs fictives : lot A 120, lot B 150, lot C 95.">{rows.map((row) => <div key={row.name}><span>{row.value}</span><div className="sandbox-bar" style={{ height: row.value }} /><span>{row.name}</span></div>)}</div><p className="sandbox-caption">Valeur par lot · unités fictives</p></>}
            </div>
            {editing && <button
              className="sandbox-resize"
              type="button"
              aria-label={`Redimensionner ${panel.title} : utilisez les flèches, Maj pour la largeur`}
              title="Glisser pour redimensionner ; flèches pour la hauteur, Maj + flèches pour la largeur"
              onPointerDown={(event) => startResize(event, panel)}
              onPointerMove={resize}
              onPointerUp={stopResize}
              onPointerCancel={stopResize}
              onLostPointerCapture={stopResize}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
                event.preventDefault()
                const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
                if (event.shiftKey) update(panel.id, { width: Math.min(12, Math.max(3, panel.width + delta)) })
                else update(panel.id, { height: Math.min(800, Math.max(240, panel.height + delta * 20)) })
              }}
            ><span aria-hidden="true">◢</span></button>}
          </section>
        ))}
        {panels.length === 0 && <p className="sandbox-empty">Aucun panneau. Utilisez « Ajouter un panneau » ou rétablissez la disposition par défaut.</p>}
      </div>
    </main>
  )
}
