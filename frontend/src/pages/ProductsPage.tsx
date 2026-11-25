import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import CrudPage from '../components/crud/CrudPage'
import type { CrudField, CrudRecord } from '../components/crud/CrudPage'
import { connect, listProducts, saveProduct, deleteProduct } from '../api/products'
import type { ApiSession, Product, ProductPage } from '../api/products'
import './ProductsPage.css'

const fields: CrudField[] = [
  { key: 'reference', label: 'Référence', required: true },
  { key: 'name', label: 'Nom du produit', required: true },
  { key: 'category', label: 'Catégorie', required: true },
  { key: 'price', label: 'Prix (Ar)', type: 'number', required: true, min: 0, step: '0.01' },
]
function toRecord(product: Product): CrudRecord {
  return { id: product.id, values: { reference: product.reference, name: product.name,
    category: product.category, price: String(product.price) } }
}

export default function ProductsPage() {
  const [session, setSession] = useState<ApiSession | null>(null)
  const [username, setUsername] = useState('user')
  const [password, setPassword] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<ProductPage | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session) return
    const controller = new AbortController()
    listProducts(session, page, controller.signal).then((result) => {
      setData(result)
      setError('')
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setData(null)
        setError(reason instanceof Error ? reason.message : 'Chargement impossible.')
      }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [session, page, revision])

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (connecting) return
    setConnecting(true)
    setError('')
    try {
      const next = await connect(username.trim(), password)
      setPassword('')
      setData(null)
      setPage(0)
      setLoading(true)
      setSession(next)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Connexion impossible.')
    } finally { setConnecting(false) }
  }
  function refresh(nextPage = page) {
    setLoading(true)
    setData(null)
    setPage(nextPage)
    setRevision((current) => current + 1)
  }

  return (
    <div className="products-api-page">
      <section className="products-api-connection" aria-labelledby="products-connection-title">
        <h2 id="products-connection-title">Connexion à l’API produits</h2>
        {!session ? (
          <form onSubmit={login}>
            <p>Utilisez les identifiants backend définis dans votre .env. Le login Horizon est encore une démonstration.</p>
            <label htmlFor="api-username">Identifiant backend</label>
            <input id="api-username" autoComplete="username" required value={username}
              onChange={(event) => setUsername(event.target.value)} disabled={connecting} />
            <label htmlFor="api-password">Mot de passe backend</label>
            <input id="api-password" type="password" autoComplete="current-password" required value={password}
              onChange={(event) => setPassword(event.target.value)} disabled={connecting} />
            <button className="crud-button" disabled={connecting} type="submit">
              {connecting ? 'Connexion…' : 'Connecter l’API'}
            </button>
          </form>
        ) : (
          <>
            <p>Identifiants conservés uniquement en mémoire sur cette page.</p>
            <button className="crud-button" type="button" onClick={() => {
              setSession(null); setData(null); setPassword(''); setError(''); setLoading(false)
            }}>Effacer les identifiants de cette page</button>
          </>
        )}
      </section>
      {error && <p role="alert">{error}</p>}
      {session && <>
        <div className="products-api-toolbar">
          <button className="crud-button" disabled={loading} onClick={() => refresh()} type="button">Actualiser</button>
          <button className="crud-button" disabled={loading || page === 0} onClick={() => refresh(page - 1)} type="button">Précédent</button>
          <span>Page {page + 1}</span>
          <button className="crud-button" disabled={loading || !data?.hasNext} onClick={() => refresh(page + 1)} type="button">Suivant</button>
        </div>
        {loading && <p role="status">Chargement des produits…</p>}
        {data && <CrudPage key={`${page}-${revision}`} title="Produits"
          description={`Source : ${data.source}. Recherche sur la page chargée. Actualisez pour resynchroniser la pagination après une modification.`}
          fields={fields} initialRecords={data.items.map(toRecord)}
          onSave={async (id, values) => toRecord(await saveProduct(session, id, values))}
          onDelete={async (id) => { await deleteProduct(session, id) }} />}
      </>}
    </div>
  )
}
