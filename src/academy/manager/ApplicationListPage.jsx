// Form başvuruları: durum, görüntüle, değerlendir.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Pencil, Search, Users } from 'lucide-react'
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

const FILTER_FIELDS = [
  { id: 'fullName', label: 'Ad-Soyad' },
  { id: 'university', label: 'Üniversite' },
  { id: 'department', label: 'Bölüm' },
  { id: 'status', label: 'Durum' },
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

export default function ApplicationListPage() {
  const { formId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { canWriteAcademy } = usePermissions()
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
  const [filterField, setFilterField] = useState('fullName')
  const [filterQuery, setFilterQuery] = useState('')
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

  const filteredApplications = useMemo(() => {
    const query = foldText(filterQuery)
    if (!query) return applications
    return applications.filter((row) => {
      const value = foldText(applicationFilterText(row, filterField))
      if (filterField === 'status') return value === query
      return value.includes(query)
    })
  }, [applications, filterField, filterQuery])

  const filterSuggestions = useMemo(() => {
    if (filterField === 'status') return []
    const query = foldText(filterQuery)
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
  }, [applications, filterField, filterQuery])

  const statusOptions = useMemo(() => {
    const seen = new Set()
    const values = []
    for (const row of applications) {
      const label = applicationFilterText(row, 'status')
      const folded = foldText(label)
      if (!folded || seen.has(folded)) continue
      seen.add(folded)
      values.push(label)
    }
    return values.sort((a, b) => a.localeCompare(b, 'tr'))
  }, [applications])

  const pagedApplications = paginateRows(filteredApplications, page, pageSize)
  const activeFilter = FILTER_FIELDS.find((item) => item.id === filterField) || FILTER_FIELDS[0]
  const filterPlaceholder = `${activeFilter.label} Ara`

  const handleFilterFieldChange = (nextField) => {
    setFilterField(nextField)
    setFilterQuery('')
    setPage(1)
    setSuggestOpen(false)
  }

  const handleFilterQueryChange = (nextQuery) => {
    setFilterQuery(nextQuery)
    setPage(1)
    setSuggestOpen(Boolean(foldText(nextQuery)))
  }

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
            : foldText(filterQuery) && pagedApplications.total !== applications.length
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
            <div ref={filterWrapRef} className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center">
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
                  <select
                    value={filterQuery}
                    onChange={(event) => {
                      setFilterQuery(event.target.value)
                      setPage(1)
                    }}
                    className={inputClass}
                    aria-label="Durum seçin"
                  >
                    <option value="">Durum seçin</option>
                    {statusOptions.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={filterQuery}
                      onChange={(event) => handleFilterQueryChange(event.target.value)}
                      onFocus={() => {
                        if (foldText(filterQuery)) setSuggestOpen(true)
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
                                handleFilterQueryChange(label)
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
            {pagedApplications.total === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-700">Bu filtreye uygun aday yok</p>
                <p className="mt-1 text-sm text-slate-500">Farklı bir değer arayın veya filtreyi temizleyin.</p>
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
                              {canWriteAcademy ? (
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
                                {canWriteAcademy ? (
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
      {statusApp && canWriteAcademy ? (
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
          readOnly={evaluation.readOnly || !canWriteAcademy}
          statuses={statuses}
          onClose={() => setEvaluation(null)}
          onSaved={() => setRefreshKey((value) => value + 1)}
        />
      ) : null}
    </div>
  )
}
