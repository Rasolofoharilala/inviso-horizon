import { useEffect, useState } from 'react'
import CrudPage from '../components/crud/CrudPage'
import type { CrudField, CrudRecord } from '../components/crud/CrudPage'
import { listProducts, saveProduct, deleteProduct } from '../api/products'
import type { Product, ProductPage } from '../api/products'
import './ProductsPage.css'
import { useSession } from '../auth/useSession'

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
  const { user } = useSession()
  const canEdit = user?.roles.some((role) => ['ADMIN', 'EDITOR'].includes(role)) ?? false
  const canDelete = user?.roles.includes('ADMIN') ?? false
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<ProductPage | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    listProducts(page, controller.signal).then((result) => {
      setData(result)
      setError('')
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setData(null)
        setError(reason instanceof Error ? reason.message : 'Chargement impossible.')
      }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, revision])

  function refresh(nextPage = page) {
    setLoading(true)
    setData(null)
    setPage(nextPage)
    setRevision((current) => current + 1)
  }

  return (
    <div className="products-api-page">
      {error && <p role="alert">{error}</p>}
      <>
        <div className="products-api-toolbar">
          <button className="crud-button" disabled={loading} onClick={() => refresh()} type="button">Actualiser</button>
          <button className="crud-button" disabled={loading || page === 0} onClick={() => refresh(page - 1)} type="button">Précédent</button>
          <span>Page {page + 1}</span>
          <button className="crud-button" disabled={loading || !data?.hasNext} onClick={() => refresh(page + 1)} type="button">Suivant</button>
        </div>
        {loading && <p role="status">Chargement des produits…</p>}
        {data && <CrudPage key={`${page}-${revision}`} title="Produits"
          description={`Source : ${data.source}. Recherche sur la page chargée. Actualisez pour resynchroniser la pagination après une modification.`}
          fields={fields} canEdit={canEdit} canDelete={canDelete} initialRecords={data.items.map(toRecord)}
          onSave={async (id, values) => toRecord(await saveProduct(id, values))}
          onDelete={async (id) => { await deleteProduct(id) }} />}
      </>
    </div>
  )
}
