import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Pencil, Users } from 'lucide-react'
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
  LoadingState,
  paginateRows,
  statusBadgeClass,
  TablePager,
} from './ui'

export default function ApplicationListPage() {
  const { formId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
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

  const pagedApplications = paginateRows(applications, page, pageSize)

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
          {loading ? 'Başvurular yükleniyor...' : `${pagedApplications.total} aday`}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading && applications.length === 0 ? (
          <LoadingState label="Başvurular yükleniyor..." />
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
                        <td className="px-5 py-4 font-medium text-slate-800">{row.name || '—'}</td>
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
                            <button
                              type="button"
                              onClick={() => setEvaluation({ appId: row.academyAppId, readOnly: false })}
                              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                            >
                              <Pencil className="h-4 w-4" />
                              Değerlendir
                            </button>
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
      </div>

      {statusApp ? (
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
          readOnly={evaluation.readOnly}
          statuses={statuses}
          onClose={() => setEvaluation(null)}
          onSaved={() => setRefreshKey((value) => value + 1)}
        />
      ) : null}
    </div>
  )
}
