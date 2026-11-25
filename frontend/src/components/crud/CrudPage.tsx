import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './CrudPage.css'

export type CrudRecord = {
  id: string
  values: Record<string, string>
}

export type CrudField = {
  key: string
  label: string
  type?: 'text' | 'email' | 'number' | 'date'
  required?: boolean
  min?: number
  step?: string
}

type CrudPageProps = {
  title: string
  description: string
  fields: CrudField[]
  initialRecords: CrudRecord[]
  canEdit?: boolean
  canDelete?: boolean
  onSave?: (id: string | null, values: Record<string, string>) => Promise<CrudRecord>
  onDelete?: (id: string) => Promise<void>
}

export default function CrudPage({
  title,
  description,
  fields,
  initialRecords,
  canEdit = true,
  canDelete = true,
  onSave,
  onDelete,
}: CrudPageProps) {
  const formId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [records, setRecords] = useState(initialRecords)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [pendingDelete, setPendingDelete] = useState<CrudRecord | null>(null)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current

    if (formOpen && dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [formOpen])

  const query = search.trim().toLocaleLowerCase('fr')

  const filteredRecords = records.filter((record) =>
    fields.some((field) =>
      (record.values[field.key] ?? '')
        .toLocaleLowerCase('fr')
        .includes(query),
    ),
  )

  function recordLabel(record: CrudRecord) {
    const firstField = fields[0]
    return firstField ? record.values[firstField.key] || 'cet élément' : 'cet élément'
  }

  function closeForm() {
    if (busy) return
    dialogRef.current?.close()
    setFormOpen(false)
    setFormError('')
  }

  function openCreate() {
    setEditingId(null)
    setValues(Object.fromEntries(fields.map((field) => [field.key, ''])))
    setPendingDelete(null)
    setMessage('')
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(record: CrudRecord) {
    setEditingId(record.id)
    setValues({ ...record.values })
    setPendingDelete(null)
    setMessage('')
    setFormError('')
    setFormOpen(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const cleanedValues = Object.fromEntries(
      fields.map((field) => [
        field.key,
        (values[field.key] ?? '').trim(),
      ]),
    )

    const missingField = fields.find(
      (field) => field.required && !cleanedValues[field.key],
    )

    if (missingField) {
      setFormError(`Le champ « ${missingField.label} » est obligatoire.`)
      return
    }

    setBusy(true)
    try {
      const saved = onSave
        ? await onSave(editingId, cleanedValues)
        : { id: editingId ?? crypto.randomUUID(), values: cleanedValues }
      setRecords((current) => editingId !== null
        ? current.map((record) => record.id === editingId ? saved : record)
        : [...current, saved])
      setMessage(editingId !== null ? 'Modification enregistrée.' : 'Élément ajouté.')
      dialogRef.current?.close()
      setFormOpen(false)
      setFormError('')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Enregistrement impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || busy) return
    setBusy(true)
    try {
      await onDelete?.(pendingDelete.id)
      setRecords((current) => current.filter((record) => record.id !== pendingDelete.id))
      setPendingDelete(null)
      setMessage('Élément supprimé.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Suppression impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-busy={busy} className="crud-page" aria-labelledby={`${formId}-title`}>
      <header className="crud-header">
        <div>
          <h1 id={`${formId}-title`}>{title}</h1>
          <p>{description}</p>
        </div>

        <button
          className="crud-button crud-button--primary"
          type="button"
          disabled={busy || !canEdit}
          onClick={openCreate}
        >
          + Ajouter
        </button>
      </header>

      <p className="crud-status" role="status">
        {message}
      </p>

      {formOpen && (
        <dialog
          ref={dialogRef}
          className="crud-modal"
          aria-labelledby={`${formId}-form-title`}
          onCancel={(event) => {
            event.preventDefault()
            closeForm()
          }}
          onClose={() => { if (!busy) setFormOpen(false) }}
        >
          <section className="crud-form-panel">
            <header className="crud-modal-header">
              <h2 id={`${formId}-form-title`}>
                {editingId !== null
                  ? 'Modifier un élément'
                  : 'Ajouter un élément'}
              </h2>

              <button
          disabled={busy}
                className="crud-close"
                type="button"
                aria-label="Fermer le formulaire"
                onClick={closeForm}
              >
                ×
              </button>
            </header>

            <form onSubmit={save}>
              <div className="crud-fields">
                {fields.map((field) => (
                  <div className="crud-field" key={field.key}>
                    <label htmlFor={`${formId}-${field.key}`}>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </label>

                    <input
                      disabled={busy}
                      id={`${formId}-${field.key}`}
                      name={field.key}
                      type={field.type ?? 'text'}
                      required={field.required}
                      min={field.min}
                      step={field.step}
                      value={values[field.key] ?? ''}
                      onChange={(event) => {
                        setValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                        setFormError('')
                      }}
                    />
                  </div>
                ))}
              </div>

              {formError && (
                <p className="crud-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="crud-actions">
                <button
          disabled={busy}
                  className="crud-button"
                  type="button"
                  onClick={closeForm}
                >
                  Annuler
                </button>

                <button
          disabled={busy}
                  className="crud-button crud-button--primary"
                  type="submit"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </section>
        </dialog>
      )}

      {pendingDelete && (
        <section
          className="crud-delete-panel"
          aria-labelledby={`${formId}-delete-title`}
        >
          <h2 id={`${formId}-delete-title`}>
            Confirmer la suppression
          </h2>

          <p>
            Supprimer « {recordLabel(pendingDelete)} » ?
          </p>

          <div className="crud-actions">
            <button
          disabled={busy}
              className="crud-button"
              type="button"
              onClick={() => setPendingDelete(null)}
            >
              Annuler
            </button>

            <button
          disabled={busy}
              className="crud-button crud-button--danger"
              type="button"
              onClick={confirmDelete}
            >
              Supprimer
            </button>
          </div>
        </section>
      )}

      <div className="crud-table-panel">
        <div className="crud-toolbar">
          <div className="crud-search-field">
            <label
              className="crud-search-label"
              htmlFor={`${formId}-search`}
            >
              Rechercher
            </label>

            <input
                      disabled={busy}
              className="crud-search"
              id={`${formId}-search`}
              type="search"
              placeholder="Rechercher dans la liste…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <span className="crud-total">
            {filteredRecords.length} / {records.length} élément(s)
          </span>
        </div>

        <div className="crud-table-scroll">
          <table className="crud-table">
            <caption className="crud-sr-only">{title}</caption>

            <thead>
              <tr>
                {fields.map((field) => (
                  <th key={field.key} scope="col">
                    {field.label}
                  </th>
                ))}
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  {fields.map((field) => (
                    <td key={field.key}>
                      {record.values[field.key] || '—'}
                    </td>
                  ))}

                  <td>
                    <div className="crud-row-actions">
                      <button
                        className="crud-button"
                        type="button"
                        aria-label={`Modifier ${recordLabel(record)}`}
                        disabled={busy || !canEdit}
                        onClick={() => openEdit(record)}
                      >
                        Modifier
                      </button>

                      <button
                        className="crud-button crud-button--delete"
                        type="button"
                        disabled={busy || !canDelete}
                        aria-label={`Supprimer ${recordLabel(record)}`}
                        onClick={() => {
                          setMessage('')
                          setPendingDelete(record)
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRecords.length === 0 && (
                <tr>
                  <td
                    className="crud-empty"
                    colSpan={fields.length + 1}
                  >
                    {records.length === 0
                      ? 'Aucun élément. Ajoutez votre premier enregistrement.'
                      : 'Aucun résultat pour cette recherche.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}