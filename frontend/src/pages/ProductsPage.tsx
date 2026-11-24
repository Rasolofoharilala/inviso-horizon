import CrudPage from '../components/crud/CrudPage'
import type {
  CrudField,
  CrudRecord,
} from '../components/crud/CrudPage'

const fields: CrudField[] = [
  { key: 'reference', label: 'Référence', required: true },
  { key: 'name', label: 'Nom du produit', required: true },
  { key: 'category', label: 'Catégorie', required: true },
  {
    key: 'price',
    label: 'Prix (Ar)',
    type: 'number',
    required: true,
    min: 0,
    step: '0.01',
  },
]

const initialRecords: CrudRecord[] = [
  {
    id: 'product-1',
    values: {
      reference: 'PRD-001',
      name: 'Aliment démarrage',
      category: 'Alimentation',
      price: '45000',
    },
  },
  {
    id: 'product-2',
    values: {
      reference: 'PRD-002',
      name: 'Abreuvoir',
      category: 'Équipement',
      price: '18000',
    },
  },
]

export default function ProductsPage() {
  return (
    <CrudPage
      title="Produits"
      description="Consultez et gérez votre catalogue de produits."
      fields={fields}
      initialRecords={initialRecords}
    />
  )
}