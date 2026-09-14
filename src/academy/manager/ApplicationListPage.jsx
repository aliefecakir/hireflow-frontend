// Form başvuruları: durum, görüntüle, değerlendir.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Pencil, Search, Users, X } from 'lucide-react'
import {
  getAcademyAppStatuses,
  getFormApplications,
  updateAcademyAppStatus,
} from '../api/applications'
import { getFormDetail } from '../api/forms'
import { DEFAULT_PAGE_SIZE } from '../api/helpers'
import { getErrorMessage } from '../../shared/api/client'
import { showToast } from '../../shared/toast/ToastProvider'
import EvaluationModal from './EvaluationModal'
import StatusModal from './StatusModal'
import {
  applicationStatusLabel,
  inputClass,
  LoadingState,
  paginateRows,
  statusBadgeClass,
  TablePager,
} from './ui'
import { usePermissions } from '../../shared/usePermissions'

const EMPTY_FILTERS = {
  fullName: '',
  university: '',
  department: '',
  status: [],
  totalScoreMin: '',
  totalScoreMax: '',
  interviewScoreMin: '',
  interviewScoreMax: '',
}

const FILTER_FIELDS = [
  { id: 'fullName', label: 'Ad-Soyad' },
  { id: 'university', label: 'Üniversite' },
  { id: 'department', label: 'Bölüm' },
  { id: 'status', label: 'Durum' },
  { id: 'totalScore', label: 'Toplam puan' },
  { id: 'interviewScore', label: 'Mülakat puanı' },
]

function foldText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

function applicationFullName(row) {
  return `${row?.name || ''} ${row?.surname || ''}`.trim()
}

function applicationFilterText(row, field) {
  if (field === 'fullName') return applicationFullName(row)
  if (field === 'university') return String(row?.universityName || '').trim()
  if (field === 'department') return String(row?.departmentName || '').trim()
  if (field === 'status') {
    const label = applicationStatusLabel(row)
    return label === '—' ? '' : label
  }
  return ''
}

function parseBound(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

function readScore(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function matchesScoreRange(score, minRaw, maxRaw) {
  const min = parseBound(minRaw)
  const max = parseBound(maxRaw)
  if (min == null && max == null) return true
  const n = readScore(score)
  const from = min == null ? Number.NEGATIVE_INFINITY : min
  const to = max == null ? Number.POSITIVE_INFINITY : max
  const low = Math.min(from, to)
  const high = Math.max(from, to)
  return n >= low && n <= high
}

function isFiltersActive(filters) {
  return Object.values(filters).some((value) => {
    if (Array.isArray(value)) return value.length > 0
    return String(value ?? '').trim() !== ''
  })
}

function formatScoreRange(minRaw, maxRaw) {
  const min = String(minRaw ?? '').trim()
  const max = String(maxRaw ?? '').trim()
  if (!min && !max) return ''
  if (min && max) return `${min} – ${max}`
  if (min) return `${min}+`
  return `≤ ${max}`
}

function getActiveFilterChips(filters) {
  const chips = []
  for (const field of FILTER_FIELDS) {
    if (field.id === 'totalScore') {
      const value = formatScoreRange(filters.totalScoreMin, filters.totalScoreMax)
      if (value) chips.push({ id: field.id, key: field.id, label: field.label, value })
      continue
    }
    if (field.id === 'interviewScore') {
      const value = formatScoreRange(filters.interviewScoreMin, filters.interviewScoreMax)
      if (value) chips.push({ id: field.id, key: field.id, label: field.label, value })
      continue
    }
    if (field.id === 'status') {
      for (const value of filters.status || []) {
        const label = String(value || '').trim()
        if (label) chips.push({ id: field.id, key: `status:${label}`, label: field.label, value: label })
      }
      continue
    }
    const value = String(filters[field.id] ?? '').trim()
    if (value) chips.push({ id: field.id, key: field.id, label: field.label, value })
  }
  return chips
}

function clearFilterGroup(filters, id, value) {
  if (id === 'totalScore') return { ...filters, totalScoreMin: '', totalScoreMax: '' }
  if (id === 'interviewScore') return { ...filters, interviewScoreMin: '', interviewScoreMax: '' }
  if (id === 'status') {
    if (!value) return { ...filters, status: [] }
    const folded = foldText(value)
    return {
      ...filters,
      status: (filters.status || []).filter((item) => foldText(item) !== folded),
    }
  }
  return { ...filters, [id]: '' }
}

function StatusFilterSelect({ options, selected, onChange, open, onToggle }) {
  const selectedLabels = Array.isArray(selected) ? selected : []
  const summary = selectedLabels.length === 0
    ? 'Durum seçin'
    : selectedLabels.length === 1
      ? selectedLabels[0]
      : `${selectedLabels.length} durum seçildi`

  const toggle = (label) => {
    const folded = foldText(label)
    const exists = selectedLabels.some((item) => foldText(item) === folded)
    onChange(exists
      ? selectedLabels.filter((item) => foldText(item) !== folded)
      : [...selectedLabels, label])
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`${inputClass} text-left ${selectedLabels.length === 0 ? 'text-slate-400' : ''}`}
      >
        {summary}
      </button>
      {open ? (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
          aria-multiselectable="true"
          aria-label="Durum seçin"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">Durum bulunamadı</li>
          ) : (
            options.map((label) => {
              const checked = selectedLabels.some((item) => foldText(item) === foldText(label))
              return (
                <li key={label} role="option" aria-selected={checked}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(label)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{label}</span>
                  </label>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}

export default function ApplicationListPage() {
  const { formId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { canEvaluateAcademy } = usePermissions()
  const [form, setForm] = useState(location.state?.form || null)
  const [applications, setApplications] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusApp, setStatusApp] = useState(null)
  const [savingStatus, setSavingStatus] = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterField, setFilterField] = useState('fullName')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const filterWrapRef = useRef(null)

  // Başvurular, durumlar, form başlığı.
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const [data, statusRows, formRow] = await Promise.all([
          getFormApplications(formId),
          getAcademyAppStatuses().catch(() => []),
          location.state?.form?.title
            ? Promise.resolve(location.state.form)
            : getFormDetail(formId),
        ])
        if (!cancelled) {
          setApplications(Array.isArray(data) ? data : [])
          setStatuses(Array.isArray(statusRows) ? statusRows : [])
          setForm(formRow)
        }
      } catch (error) {
        console.error('Form başvuruları yüklenemedi:', error)
        if (!cancelled) {
          setApplications([])
          showToast.error('Hata Oluştu', getErrorMessage(error) || 'Başvurular yüklenirken bir hata oluştu.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [formId, refreshKey, location.state?.form])

  // StatusModal kaydı → satırı yerinde güncelle.
  const handleSaveStatus = async ({ stId, statusDescr }) => {
    if (!statusApp || savingStatus) return

    setSavingStatus(true)
    try {
      const updated = await updateAcademyAppStatus(statusApp.academyAppId, { stId, statusDescr })
      setApplications((prev) =>
        prev.map((row) => (row.academyAppId === updated.academyAppId ? { ...row, ...updated } : row)),
      )
      setStatusApp(null)
      showToast.success('Başarılı', 'Başvuru durumu güncellendi.')
    } catch (error) {
      console.error('Başvuru durumu güncellenemedi:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Durum güncellenirken bir hata oluştu.')
    } finally {
      setSavingStatus(false)
    }
  }

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!filterWrapRef.current?.contains(event.target)) setSuggestOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const updateFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setPage(1)
  }

  const handleFilterFieldChange = (nextField) => {
    setFilterField(nextField)
    setSuggestOpen(false)
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setSuggestOpen(false)
    setPage(1)
  }

  const clearFilter = (id, value) => {
    setFilters((prev) => clearFilterGroup(prev, id, value))
    setSuggestOpen(false)
    setPage(1)
  }

  const filteredApplications = useMemo(() => {
    const nameQuery = foldText(filters.fullName)
    const universityQuery = foldText(filters.university)
    const departmentQuery = foldText(filters.department)
    const statusSet = new Set((filters.status || []).map(foldText).filter(Boolean))

    return applications.filter((row) => {
      if (nameQuery && !foldText(applicationFilterText(row, 'fullName')).includes(nameQuery)) return false
      if (universityQuery && !foldText(applicationFilterText(row, 'university')).includes(universityQuery)) return false
      if (departmentQuery && !foldText(applicationFilterText(row, 'department')).includes(departmentQuery)) return false
      if (statusSet.size > 0 && !statusSet.has(foldText(applicationFilterText(row, 'status')))) return false
      if (!matchesScoreRange(row.totalScore, filters.totalScoreMin, filters.totalScoreMax)) return false
      if (!matchesScoreRange(row.interviewScore, filters.interviewScoreMin, filters.interviewScoreMax)) return false
      return true
    })
  }, [applications, filters])

  const filterSuggestions = useMemo(() => {
    if (filterField === 'status' || filterField === 'totalScore' || filterField === 'interviewScore') return []
    const query = foldText(filters[filterField])
    if (!query) return []
    const seen = new Set()
    const values = []
    for (const row of applications) {
      const label = applicationFilterText(row, filterField)
      const folded = foldText(label)
      if (!folded || seen.has(folded) || !folded.includes(query)) continue
      seen.add(folded)
      values.push(label)
    }
    return values.sort((a, b) => a.localeCompare(b, 'tr'))
  }, [applications, filterField, filters])

  const statusOptions = useMemo(() => {
    const seen = new Set()
    const values = []
    const add = (label) => {
      const folded = foldText(label)
      if (!folded || seen.has(folded)) return
      seen.add(folded)
      values.push(label)
    }
    for (const status of statuses) add(status?.name)
    for (const row of applications) add(applicationFilterText(row, 'status'))
    return values.sort((a, b) => a.localeCompare(b, 'tr'))
  }, [applications, statuses])

  const pagedApplications = paginateRows(filteredApplications, page, pageSize)
  const filtersActive = isFiltersActive(filters)
  const activeFilter = FILTER_FIELDS.find((item) => item.id === filterField) || FILTER_FIELDS[0]
  const activeChips = getActiveFilterChips(filters)
  const filterPlaceholder = `${activeFilter.label} Ara`

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate('/academy/manager/forms')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Geri Dön
        </button>
        <h1 className="mt-3 text-2xl font-bold text-slate-800">{form?.title || 'Form'} Başvuruları</h1>
        <p className="mt-1 text-sm text-slate-600">
          {loading
            ? 'Başvurular Yükleniyor...'
            : filtersActive && pagedApplications.total !== applications.length
              ? `${pagedApplications.total} / ${applications.length} Aday`
              : `${applications.length} Aday`}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading && applications.length === 0 ? (
          <LoadingState label="Başvurular Yükleniyor..." />
        ) : applications.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="h-6 w-6 text-slate-400" />
            </span>
            <p className="mt-4 text-sm font-medium text-slate-700">Bu forma henüz başvuru yapılmadı</p>
            <p className="mt-1 text-sm text-slate-500">Adaylar başvurduğunda kayıtlar burada listelenir.</p>
          </div>
        ) : (
          <>
            <div ref={filterWrapRef} className="border-b border-slate-200 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={filterField}
                  onChange={(event) => handleFilterFieldChange(event.target.value)}
                  className="w-full shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-44"
                  aria-label="Filtre alanı"
                >
                  {FILTER_FIELDS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <div className="relative min-w-0 w-full sm:max-w-md">
                  {filterField === 'status' ? (
                    <StatusFilterSelect
                      options={statusOptions}
                      selected={filters.status}
                      onChange={(next) => updateFilter('status', next)}
                      open={suggestOpen}
                      onToggle={() => setSuggestOpen((open) => !open)}
                    />
                  ) : filterField === 'totalScore' || filterField === 'interviewScore' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        placeholder="Min"
                        value={filterField === 'totalScore' ? filters.totalScoreMin : filters.interviewScoreMin}
                        onChange={(event) => updateFilter(
                          filterField === 'totalScore' ? 'totalScoreMin' : 'interviewScoreMin',
                          event.target.value,
                        )}
                        className={inputClass}
                        aria-label={`${activeFilter.label} en az`}
                      />
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        placeholder="Max"
                        value={filterField === 'totalScore' ? filters.totalScoreMax : filters.interviewScoreMax}
                        onChange={(event) => updateFilter(
                          filterField === 'totalScore' ? 'totalScoreMax' : 'interviewScoreMax',
                          event.target.value,
                        )}
                        className={inputClass}
                        aria-label={`${activeFilter.label} en çok`}
                      />
                    </div>
                  ) : (
                    <>
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={filters[filterField]}
                        onChange={(event) => {
                          updateFilter(filterField, event.target.value)
                          setSuggestOpen(Boolean(foldText(event.target.value)))
                        }}
                        onFocus={() => {
                          if (foldText(filters[filterField])) setSuggestOpen(true)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') setSuggestOpen(false)
                        }}
                        placeholder={filterPlaceholder}
                        className={`pl-9 ${inputClass}`}
                        aria-label={filterPlaceholder}
                        autoComplete="off"
                      />
                      {suggestOpen && filterSuggestions.length > 0 ? (
                        <ul
                          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                          role="listbox"
                          aria-label={`${activeFilter.label} önerileri`}
                        >
                          {filterSuggestions.map((label) => (
                            <li key={label}>
                              <button
                                type="button"
                                role="option"
                                className="flex w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  updateFilter(filterField, label)
                                  setSuggestOpen(false)
                                }}
                              >
                                {label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
              {filtersActive ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {activeChips.map((chip) => (
                    <span
                      key={chip.key}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        chip.id === filterField
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleFilterFieldChange(chip.id)}
                        className="max-w-[16rem] truncate"
                      >
                        {chip.label}: {chip.value}
                      </button>
                      <button
                        type="button"
                        aria-label={`${chip.label} filtresini kaldır`}
                        className="rounded-full p-0.5 hover:bg-white/80"
                        onClick={() => clearFilter(chip.id, chip.id === 'status' ? chip.value : undefined)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {activeChips.length > 1 ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-medium text-slate-500 transition hover:text-slate-700"
                    >
                      Tümünü temizle
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {pagedApplications.total === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-700">Bu filtreye uygun aday yok</p>
                <p className="mt-1 text-sm text-slate-500">Filtreleri değiştirin veya temizleyin.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left font-semibold text-slate-700">ID</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-700">Ad</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-700">Soyad</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-700">Üniversite</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-700">Bölüm</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-700">Toplam Puan</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-700">Mülakat Puanı</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-700">Durum</th>
                        <th className="px-5 py-3 text-right font-semibold text-slate-700" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedApplications.items.map((row) => {
                        const statusLabel = applicationStatusLabel(row)
                        return (
                          <tr key={row.academyAppId} className="hover:bg-slate-50">
                            <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">{row.academyAppId}</td>
                            <td className="px-5 py-4 text-slate-700">{row.name || '—'}</td>
                            <td className="px-5 py-4 text-slate-700">{row.surname || '—'}</td>
                            <td className="px-5 py-4 text-slate-700">{row.universityName || '—'}</td>
                            <td className="px-5 py-4 text-slate-700">{row.departmentName || '—'}</td>
                            <td className="px-5 py-4">
                              <span className="inline-flex min-w-[2.5rem] justify-center rounded-lg bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700">
                                {row.totalScore ?? 0}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex min-w-[2.5rem] justify-center rounded-lg bg-orange-50 px-2 py-1 text-sm font-semibold text-orange-700">
                                {row.interviewScore ?? 0}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {canEvaluateAcademy ? (
                                <button
                                  type="button"
                                  onClick={() => setStatusApp(row)}
                                  title="Durumu düzenle"
                                >
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium transition hover:brightness-95 ${statusBadgeClass(statusLabel)}`}
                                  >
                                    {statusLabel}
                                  </span>
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex cursor-default rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(statusLabel)}`}
                                >
                                  {statusLabel}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="inline-flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEvaluation({ appId: row.academyAppId, readOnly: true })}
                                  className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300"
                                >
                                  <Eye className="h-4 w-4" />
                                  Görüntüle
                                </button>
                                {canEvaluateAcademy ? (
                                  <button
                                    type="button"
                                    onClick={() => setEvaluation({ appId: row.academyAppId, readOnly: false })}
                                    className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Değerlendir
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <TablePager
                  page={pagedApplications.page}
                  size={pageSize}
                  total={pagedApplications.total}
                  onPageChange={setPage}
                  onSizeChange={(nextSize) => {
                    setPageSize(nextSize)
                    setPage(1)
                  }}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Durum güncelle / görüntüle veya değerlendir */}
      {statusApp && canEvaluateAcademy ? (
        <StatusModal
          application={statusApp}
          statuses={statuses}
          saving={savingStatus}
          onClose={() => {
            if (!savingStatus) setStatusApp(null)
          }}
          onSave={handleSaveStatus}
        />
      ) : null}

      {evaluation ? (
        <EvaluationModal
          key={`${evaluation.appId}-${evaluation.readOnly ? 'view' : 'edit'}`}
          appId={evaluation.appId}
          readOnly={evaluation.readOnly || !canEvaluateAcademy}
          statuses={statuses}
          onClose={() => setEvaluation(null)}
          onSaved={() => setRefreshKey((value) => value + 1)}
        />
      ) : null}
    </div>
  )
}
