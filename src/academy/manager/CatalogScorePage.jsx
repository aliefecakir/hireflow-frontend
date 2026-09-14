// Üniversite / bölüm katalog puanları: listele, puan düzenle, aktiflik, yeni kayıt.
import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Search } from 'lucide-react'
import { getErrorMessage } from '../../shared/api/client'
import { showToast } from '../../shared/toast/ToastProvider'
import { createCatalogItem, listCatalogItems, updateCatalogItem } from '../api/catalog'
import { DEFAULT_PAGE_SIZE, isFlagOn, parseScoreInput, toFlag } from '../api/helpers'
import CatalogItemModal from './CatalogItemModal'
import { LoadingState, Switch, TablePager, inputClass, paginateRows } from './ui'

const TABS = [
  { id: 'universities', label: 'Üniversiteler', singular: 'Üniversite' },
  { id: 'departments', label: 'Bölümler', singular: 'Bölüm' },
]

function foldText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

function sortByName(rows) {
  return [...rows].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr-TR'))
}

function toDraft(row) {
  return { name: row.name || '', score: String(row.score ?? 0), isActv: isFlagOn(row.isActv) }
}

function draftsOf(rows) {
  return Object.fromEntries(rows.map((row) => [row.id, toDraft(row)]))
}

export default function CatalogScorePage() {
  const [kind, setKind] = useState(TABS[0].id)
  const [items, setItems] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const activeTab = TABS.find((tab) => tab.id === kind) || TABS[0]

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const rows = await listCatalogItems(kind)
        if (cancelled) return
        const nextItems = sortByName(Array.isArray(rows) ? rows : [])
        setItems(nextItems)
        setDrafts(draftsOf(nextItems))
      } catch (error) {
        console.error('Katalog yüklenemedi:', error)
        if (cancelled) return
        setItems([])
        setDrafts({})
        showToast.error('Hata Oluştu', getErrorMessage(error) || 'Katalog yüklenirken bir hata oluştu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    setSearch('')
    setPage(1)
    load()
    return () => {
      cancelled = true
    }
  }, [kind])

  const filteredItems = useMemo(() => {
    const query = foldText(search)
    if (!query) return items
    return items.filter((row) => foldText(row.name).includes(query))
  }, [items, search])

  const pagedItems = paginateRows(filteredItems, page, pageSize)

  const patchDraft = (id, patch) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const isDirty = (row) => {
    const draft = drafts[row.id]
    if (!draft) return false
    return draft.name.trim() !== (row.name || '')
      || draft.score !== String(row.score ?? 0)
      || draft.isActv !== isFlagOn(row.isActv)
  }

  const applyRow = (updated) => {
    setItems((prev) => sortByName(prev.map((row) => (row.id === updated.id ? updated : row))))
    setDrafts((prev) => ({ ...prev, [updated.id]: toDraft(updated) }))
  }

  const handleSave = async (row) => {
    const draft = drafts[row.id]
    if (!draft || savingId) return

    const name = draft.name.trim()
    if (!name) {
      showToast.error('Eksik Bilgi', `${activeTab.singular} adı boş olamaz.`)
      return
    }
    const score = parseScoreInput(draft.score)
    if (score === null) {
      showToast.error('Geçersiz Puan', 'Puan 0 veya daha büyük bir tam sayı olmalıdır.')
      return
    }

    setSavingId(row.id)
    try {
      const updated = await updateCatalogItem(kind, row.id, { name, score, isActv: toFlag(draft.isActv) })
      applyRow(updated)
      showToast.success('Başarılı', `${activeTab.singular} güncellendi.`)
    } catch (error) {
      console.error('Katalog kaydı güncellenemedi:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Kayıt güncellenirken bir hata oluştu.')
    } finally {
      setSavingId(null)
    }
  }

  const handleCreate = async ({ name, score }) => {
    const created = await createCatalogItem(kind, { name, score })
    setItems((prev) => sortByName([...prev, created]))
    setDrafts((prev) => ({ ...prev, [created.id]: toDraft(created) }))
    setCreating(false)
    showToast.success('Başarılı', `${activeTab.singular} eklendi.`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Puan Yönetimi</h1>
        <p className="mt-1 text-sm text-slate-600">
          Üniversite ve bölüm puanlarını düzenleyin.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setKind(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab.id === kind
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder={`${activeTab.singular} adına göre ara`}
              className={`pl-9 ${inputClass}`}
              aria-label={`${activeTab.singular} ara`}
            />
          </label>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Yeni {activeTab.singular}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <LoadingState label={`${activeTab.label} yükleniyor...`} />
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-700">Kayıt bulunamadı</p>
            <p className="mt-1 text-sm text-slate-500">
              Henüz {activeTab.label.toLocaleLowerCase('tr-TR')} listesinde kayıt yok.
            </p>
          </div>
        ) : pagedItems.total === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-700">Bu aramaya uygun kayıt yok</p>
            <p className="mt-1 text-sm text-slate-500">Farklı bir değer arayın veya aramayı temizleyin.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Ad</th>
                    <th className="w-32 px-5 py-3 text-left font-semibold text-slate-700">Puan</th>
                    <th className="w-40 px-5 py-3 text-left font-semibold text-slate-700">Durum</th>
                    <th className="w-40 px-5 py-3 text-right font-semibold text-slate-700" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedItems.items.map((row) => {
                    const draft = drafts[row.id] || toDraft(row)
                    const saving = savingId === row.id
                    const dirty = isDirty(row)
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={draft.name}
                            disabled={saving}
                            onChange={(event) => patchDraft(row.id, { name: event.target.value })}
                            className={`disabled:opacity-60 ${inputClass}`}
                            aria-label={`${row.name} adı`}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={draft.score}
                            disabled={saving}
                            onChange={(event) => patchDraft(row.id, { score: event.target.value })}
                            className={`disabled:opacity-60 ${inputClass}`}
                            aria-label={`${row.name} puanı`}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <Switch
                            checked={draft.isActv}
                            disabled={saving}
                            onChange={(next) => patchDraft(row.id, { isActv: next })}
                            label={draft.isActv ? 'Aktif' : 'Pasif'}
                          />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSave(row)}
                            disabled={!dirty || saving}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Save className="h-4 w-4" />
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <TablePager
              page={pagedItems.page}
              size={pageSize}
              total={pagedItems.total}
              onPageChange={setPage}
              onSizeChange={(nextSize) => {
                setPageSize(nextSize)
                setPage(1)
              }}
            />
          </>
        )}
      </div>

      {creating ? (
        <CatalogItemModal
          title={`Yeni ${activeTab.singular}`}
          nameLabel={`${activeTab.singular} Adı`}
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      ) : null}
    </div>
  )
}
