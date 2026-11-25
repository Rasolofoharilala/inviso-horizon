import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { addMovement, cancelMovement, getLot, listLots, lotEvolution, lotHistory, movementLabels } from '../api/lots'
import type { Lot, LotPage, LotEvolution, Movement, MovementPage, MovementType } from '../api/lots'
import { useSession } from '../auth/useSession'
import { placementDateLabel, businessToday } from '../utils/lotAge'
import LotEvolutionChart from '../components/LotEvolutionChart'
import './LotsPage.css'
import './LotWorkspacePage.css'

type View = 'overview' | 'history' | 'timeline' | 'evolution'
const titles: Record<View,string> = { overview: 'Fiche du lot', history: 'Historique des mouvements', timeline: 'Chronologie du lot', evolution: 'Évolution des effectifs' }
const number = new Intl.NumberFormat('fr-FR')
const delta = (value: number) => `${value > 0 ? '+' : ''}${number.format(value)}`
const instant = (value: string) => new Date(value).toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' })
const validCount = (value: string) => /^\d+$/.test(value) && Number(value)<=2147483647
function pageLink(view: View, id: string) {
  return view === 'overview' ? `/lots/${id}` : `/lots/${({ history: 'historique', timeline: 'chronologie', evolution: 'evolution' })[view]}?lot=${encodeURIComponent(id)}`
}
function LotPicker({ view }: { view: View }) {
  const [filter,setFilter] = useState({ query:'', page:0, revision:0 })
  const [search,setSearch] = useState('')
  const [data,setData] = useState<LotPage|null>(null)
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(true)
  useEffect(() => {
    const controller=new AbortController()
    listLots(filter.query,filter.page,controller.signal).then((next)=>{setData(next);setError('')})
      .catch((reason)=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Chargement impossible.')})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return ()=>controller.abort()
  },[filter])
  function load(page:number,query=filter.query){setLoading(true);setData(null);setFilter((old)=>({query,page,revision:old.revision+1}))}
  return <section className="lots-list"><h2>Choisissez un lot</h2><p className="lot-help">Sélectionnez le lot à consulter. Les trois vues utilisent le même journal de mouvements.</p>
    <form className="lots-search" onSubmit={(event)=>{event.preventDefault();load(0,search.trim())}}><div><label htmlFor="lot-picker">Référence ou nom</label><input id="lot-picker" maxLength={150} value={search} onChange={(event)=>setSearch(event.target.value)} /></div><button className="lots-button" disabled={loading}>Rechercher</button></form>
    {error&&<p className="lots-error" role="alert">{error}</p>}{loading&&<p role="status">Chargement des lots…</p>}
    <ul className="lot-picker-list">{data?.items.map((lot)=><li key={lot.id}><Link to={pageLink(view,lot.id)}><strong>{lot.reference}</strong><span>{lot.name}</span><span>{number.format(lot.total)} animaux →</span></Link></li>)}</ul>
    {!loading&&data&&!data.items.length&&<p>Aucun lot trouvé. <Link to="/lots">Revenir à la liste des lots</Link>.</p>}
    <div className="lots-pagination"><button className="lots-button" disabled={loading||filter.page===0} onClick={()=>load(filter.page-1)}>Précédent</button><span>Page {filter.page+1}</span><button className="lots-button" disabled={loading||!data||filter.page+1>=data.totalPages} onClick={()=>load(filter.page+1)}>Suivant</button></div>
  </section>
}
export default function LotWorkspacePage({ view }: { view: View }) {
  const { lotId }=useParams();const [params]=useSearchParams();const {pathname}=useLocation()
  const id=lotId??params.get('lot')
  return <div className="lots-page lot-workspace"><header className="lots-heading"><div><p className="lots-eyebrow">LOTS · SUIVI D’ÉLEVAGE</p><h1>{titles[view]}</h1><p>Un journal daté, trois lectures de la vie du lot.</p></div><Link className="lots-button" to="/lots">Tous les lots</Link></header>
    {id&&/^\d+$/.test(id)?<LotDetail key={`${id}-${view}`} id={id} view={view} changeLink={lotId?'/lots':pathname}/>:<LotPicker view={view}/>}
  </div>
}
function LotDetail({id,view,changeLink}:{id:string;view:View;changeLink:string}) {
  const {user}=useSession();const canEdit=user?.roles.some((role)=>['ADMIN','EDITOR'].includes(role))??false;const canCancel=user?.roles.includes('ADMIN')??false
  const [lot,setLot]=useState<Lot|null>(null);const [history,setHistory]=useState<MovementPage|null>(null);const [graph,setGraph]=useState<LotEvolution|null>(null)
  const [error,setError]=useState('');const [graphError,setGraphError]=useState('');const [loading,setLoading]=useState(true)
  const [page,setPage]=useState(0);const [revision,setRevision]=useState(0)
  const [range,setRange]=useState<{from?:string;to?:string;interval:'day'|'week'}>({interval:'week'})
  const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const [formError,setFormError]=useState('')
  const [candidate,setCandidate]=useState<Movement|null>(null)
  const dialog=useRef<HTMLDialogElement>(null);const cancelDialog=useRef<HTMLDialogElement>(null);const errorRef=useRef<HTMLParagraphElement>(null)
  const requestId=useRef('');const lock=useRef(false)
  useEffect(()=>{
    const controller=new AbortController()
    Promise.all([getLot(id,controller.signal),lotHistory(id,page,view==='timeline'?'asc':'desc',controller.signal)])
      .then(([next,events])=>{setLot(next);setHistory(events);setError('')})
      .catch((reason)=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Chargement impossible.')})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return ()=>controller.abort()
  },[id,page,revision,view])
  useEffect(()=>{
    if(view!=='overview'&&view!=='evolution')return
    const controller=new AbortController()
    lotEvolution(id,range,controller.signal).then((data)=>{setGraph(data);setGraphError('')})
      .catch((reason)=>{if(!controller.signal.aborted)setGraphError(reason instanceof Error?reason.message:'Diagramme indisponible.')})
    return ()=>controller.abort()
  },[id,range,revision,view])
  useEffect(()=>{
    if(!lot)return
    const check=()=>{
      if(document.visibilityState==='visible'&&!lock.current&&!dialog.current?.open&&!cancelDialog.current?.open&&businessToday(lot.timeZone)!==lot.ageAsOf){setGraph(null);setRevision((old)=>old+1)}
    }
    const timer=window.setInterval(check,60_000)
    document.addEventListener('visibilitychange',check)
    return ()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',check)}
  },[lot])
  useEffect(()=>{if(formError)errorRef.current?.focus()},[formError])
  function refresh(){setLoading(true);setGraph(null);setRevision((old)=>old+1)}
  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(lock.current||!lot)return
    const form=event.currentTarget;const data=new FormData(form)
    const m=String(data.get('males')??''),f=String(data.get('females')??''),reason=String(data.get('reason')??'').trim(),date=String(data.get('effectiveDate')??'')
    if(!validCount(m)||!validCount(f)||Number(m)+Number(f)===0||!reason||reason.length>500||!date||date<(lot.creationDate??'')||date>lot.ageAsOf){setFormError('Vérifiez la date, le motif et les quantités entières. Au moins un animal est requis.');return}
    lock.current=true;setBusy(true);setFormError('')
    try{await addMovement(id,{requestId:requestId.current,type:String(data.get('type')) as MovementType,effectiveDate:date,males:Number(m),females:Number(f),reason});dialog.current?.close();form.reset();setNotice('Mouvement enregistré. Les effectifs et les vues ont été recalculés.');refresh()}
    catch(reason){setFormError(reason instanceof Error?reason.message:'Enregistrement impossible.')}
    finally{lock.current=false;setBusy(false)}
  }
  async function cancel(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(lock.current||!candidate)return
    const reason=String(new FormData(event.currentTarget).get('reason')??'').trim()
    if(!reason||reason.length>500){setFormError('Renseignez un motif d’annulation de 1 à 500 caractères.');return}
    lock.current=true;setBusy(true);setFormError('')
    try{await cancelMovement(id,candidate.id,reason);cancelDialog.current?.close();setCandidate(null);setNotice('Mouvement annulé et conservé dans l’historique. Les effectifs ont été recalculés.');refresh()}
    catch(reason){setFormError(reason instanceof Error?reason.message:'Annulation impossible.')}
    finally{lock.current=false;setBusy(false)}
  }
  if(error)return <div className="lots-error" role="alert"><p>{error}</p><button className="lots-button" onClick={refresh}>Réessayer</button></div>
  if(!lot)return <p role="status">Chargement de la fiche…</p>
  const openMovement=()=>{requestId.current=crypto.randomUUID();setFormError('');dialog.current?.showModal()}
  const events=history?.items??[]
  return <>
    <div className="lot-context"><div><strong>{lot.reference}</strong><span>{lot.name}</span><span>{lot.ageWeek!=null?`Semaine ${lot.ageWeek} · J${lot.ageDays}`:'Date de mise en place à renseigner'}</span></div><div className="lots-row-actions"><Link className="lots-button" to={changeLink}>Changer de lot</Link><button className="lots-button" disabled={loading||busy} onClick={refresh}>Actualiser</button>{canEdit&&<button className="lots-button lots-button--primary" disabled={!lot.creationDate||busy} onClick={openMovement}>+ Ajouter un mouvement</button>}</div></div>
    <nav className="lot-view-nav" aria-label="Vues du lot">{(['overview','history','timeline','evolution'] as const).map((item)=><Link key={item} to={pageLink(item,id)} aria-current={item===view?'page':undefined}>{({overview:'Vue d’ensemble',history:'Historique',timeline:'Chronologie',evolution:'Évolution'})[item]}</Link>)}</nav>
    <p className="lots-notice" role="status">{notice}</p>
    <dl className="lots-summary">{[['Mâles présents',lot.maleCount],['Femelles présentes',lot.femaleCount],['Effectif total',lot.total],['Mouvements',lot.movementCount]].map(([label,value])=><div key={label} className={label==='Effectif total'?'lots-summary-total':''}><dt>{label}</dt><dd>{typeof value==='number'?number.format(value):value}</dd></div>)}</dl>
    <p className="lot-help">Mise en place : {lot.creationDate?placementDateLabel(lot.creationDate):'à renseigner'}. Effectifs de référence : {number.format(lot.initialMaleCount)} mâles et {number.format(lot.initialFemaleCount)} femelles. Les effectifs présents sont calculés à partir des mouvements non annulés.</p>
    {(view==='overview'||view==='evolution')&&<section className="lots-list lot-workspace-section" aria-labelledby="lot-evolution-title"><h2 id="lot-evolution-title">Évolution des mâles et des femelles</h2>
      <form key={graph?`${graph.from}-${graph.to}-${graph.interval}`:'initial'} className="lot-range" onSubmit={(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);setGraph(null);setGraphError('');setRange({from:String(data.get('from')??'')||undefined,to:String(data.get('to')??'')||undefined,interval:String(data.get('interval')) as 'day'|'week'})}}>
        <div><label htmlFor="lot-from">Du</label><input id="lot-from" name="from" type="date" min={lot.creationDate??undefined} max={lot.ageAsOf} defaultValue={graph?.from??range.from??''}/></div><div><label htmlFor="lot-to">Au</label><input id="lot-to" name="to" type="date" min={lot.creationDate??undefined} max={lot.ageAsOf} defaultValue={graph?.to??range.to??''}/></div><div><label htmlFor="lot-interval">Regrouper par</label><select id="lot-interval" name="interval" defaultValue={range.interval}><option value="week">Semaine d’élevage</option><option value="day">Jour</option></select></div><button className="lots-button" disabled={busy}>Afficher</button>
      </form>{graphError?<p className="lots-error" role="alert">{graphError}</p>:graph?<LotEvolutionChart data={graph}/>:<p role="status">Calcul du diagramme…</p>}
    </section>}
    {view!=='evolution'&&<section className="lots-list lot-workspace-section" aria-labelledby="lot-events-title"><header className="lots-list-header"><div><h2 id="lot-events-title">{view==='timeline'?'Chronologie':view==='overview'?'Derniers mouvements':'Journal des mouvements'}</h2><p>{view==='timeline'?'Du plus ancien au plus récent.':'Du plus récent au plus ancien.'} Les effectifs après chaque événement intègrent les annulations connues.</p></div>{view==='overview'&&<Link className="lots-button" to={pageLink('history',id)}>Tout l’historique</Link>}</header>
      {view==='timeline'?<ol className="lot-timeline">{page===0&&<li className="lot-timeline-opening"><span className="lot-event-label">MISE EN PLACE · J1</span><h3>{lot.creationDate?placementDateLabel(lot.creationDate):'Date à renseigner'}</h3><p>{number.format(lot.initialMaleCount)} mâles · {number.format(lot.initialFemaleCount)} femelles</p><p className="lot-help">Effectifs de référence du lot.</p></li>}{events.map((event)=><li key={event.id} className={event.cancelledAt?'lot-event-cancelled':''}><span className="lot-event-label">{movementLabels[event.type]}{event.cancelledAt?' · ANNULÉ':''}</span><h3><time dateTime={event.effectiveDate}>{placementDateLabel(event.effectiveDate)}</time></h3><p>{delta(event.maleDelta)} mâles · {delta(event.femaleDelta)} femelles</p><p>{event.reason}</p><p className="lot-help">Saisi le {instant(event.recordedAt)} par {event.recordedBy}.</p>{event.cancelledAt&&<p className="lot-cancellation">Annulé le {instant(event.cancelledAt)} par {event.cancelledBy} : {event.cancellationReason}</p>}<strong>Après : {number.format(event.maleAfter)} mâles · {number.format(event.femaleAfter)} femelles</strong></li>)}</ol>
      :events.length?<div className="lots-table-wrap" tabIndex={0} role="region" aria-label="Journal des mouvements"><table><caption className="lots-sr-only">Mouvements datés et effectifs recalculés</caption><thead><tr><th scope="col">Date effective</th><th scope="col">Mouvement</th><th scope="col">Mâles</th><th scope="col">Femelles</th><th scope="col">Motif et saisie</th><th scope="col">Après mouvement</th>{canCancel&&<th scope="col">Action</th>}</tr></thead><tbody>{(view==='overview'?events.slice(0,5):events).map((event)=><tr key={event.id}><th scope="row">{placementDateLabel(event.effectiveDate)}</th><td>{movementLabels[event.type]}{event.cancelledAt&&<strong className="lot-cancellation">Annulé</strong>}</td><td>{delta(event.maleDelta)}</td><td>{delta(event.femaleDelta)}</td><td><p>{event.reason}</p><small>Saisi le {instant(event.recordedAt)} par {event.recordedBy}</small>{event.cancelledAt&&<p className="lot-cancellation">Annulé par {event.cancelledBy} le {instant(event.cancelledAt)} : {event.cancellationReason}</p>}</td><td>{number.format(event.maleAfter)} M · {number.format(event.femaleAfter)} F</td>{canCancel&&<td>{!event.cancelledAt?<button className="lots-button lots-button--danger" disabled={busy} onClick={()=>{setCandidate(event);setFormError('');cancelDialog.current?.showModal()}} aria-label={`Annuler le mouvement du ${placementDateLabel(event.effectiveDate)}`}>Annuler</button>:'Conservé au journal'}</td>}</tr>)}</tbody></table></div>:<div className="lots-empty"><h3>Aucun mouvement enregistré</h3><p>Le lot possède uniquement ses effectifs de référence. Une entrée, une mortalité, une vente ou une sortie alimentera son suivi.</p></div>}
      {view!=='overview'&&<div className="lots-pagination"><button className="lots-button" disabled={loading||page===0} onClick={()=>{setLoading(true);setPage((old)=>old-1)}}>Précédent</button><span>Page {page+1} sur {Math.max(1,history?.totalPages??1)}</span><button className="lots-button" disabled={loading||!history||page+1>=history.totalPages} onClick={()=>{setLoading(true);setPage((old)=>old+1)}}>Suivant</button></div>}
    </section>}
    <dialog ref={dialog} className="lots-dialog" aria-labelledby="movement-title" onCancel={(event)=>{if(busy)event.preventDefault()}}><h2 id="movement-title">Ajouter un mouvement · {lot.reference}</h2><p>Les quantités sont positives. Le type détermine s’il s’agit d’une entrée ou d’une sortie.</p><form onSubmit={create} noValidate>{formError&&<p ref={errorRef} className="lots-error" role="alert" tabIndex={-1}>{formError}</p>}<div className="lots-fields"><div><label htmlFor="movement-type">Type</label><select id="movement-type" name="type" disabled={busy}>{Object.entries(movementLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div><div><label htmlFor="movement-date">Date effective</label><input id="movement-date" name="effectiveDate" type="date" min={lot.creationDate??undefined} max={lot.ageAsOf} defaultValue={lot.ageAsOf} required disabled={busy}/></div><div><label htmlFor="movement-males">Nombre de mâles</label><input id="movement-males" name="males" type="number" min="0" max="2147483647" step="1" defaultValue="0" required disabled={busy}/></div><div><label htmlFor="movement-females">Nombre de femelles</label><input id="movement-females" name="females" type="number" min="0" max="2147483647" step="1" defaultValue="0" required disabled={busy}/></div></div><label className="lot-reason-label" htmlFor="movement-reason">Motif</label><textarea id="movement-reason" name="reason" maxLength={500} rows={3} required disabled={busy}/><p className="lot-help">Une date passée recalcule aussi les événements suivants. Aucun effectif ne peut devenir négatif.</p><div className="lots-dialog-actions"><button className="lots-button" type="button" disabled={busy} onClick={()=>dialog.current?.close()}>Fermer sans enregistrer</button><button className="lots-button lots-button--primary" disabled={busy}>{busy?'Enregistrement…':'Enregistrer le mouvement'}</button></div></form></dialog>
    <dialog ref={cancelDialog} className="lots-dialog lots-dialog--small" aria-labelledby="movement-cancel-title" onCancel={(event)=>{if(busy)event.preventDefault()}}><h2 id="movement-cancel-title">Annuler ce mouvement ?</h2><p>Il restera visible avec son motif d’annulation. Les effectifs seront recalculés depuis sa date effective.</p><form onSubmit={cancel}>{formError&&<p className="lots-error" role="alert">{formError}</p>}<label htmlFor="movement-cancel-reason">Motif de l’annulation</label><textarea id="movement-cancel-reason" name="reason" rows={3} maxLength={500} required disabled={busy}/><div className="lots-dialog-actions"><button className="lots-button" type="button" disabled={busy} onClick={()=>cancelDialog.current?.close()}>Conserver le mouvement</button><button className="lots-button lots-button--danger" disabled={busy}>{busy?'Annulation…':'Confirmer l’annulation'}</button></div></form></dialog>
  </>
}
