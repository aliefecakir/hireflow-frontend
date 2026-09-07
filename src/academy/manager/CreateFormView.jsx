import { useEffect, useMemo, useState } from 'react'
import { List, Plus } from 'lucide-react'
import {
  DEFAULT_PAGE_SIZE,
  getQuestionId,
  getQuestionKind,
  isFlagOn,
  toFlag,
} from '../api/helpers'
import { inputClass, paginateRows, PurposeBadge, renumberAttachments, Switch, TablePager, toDateInput, TypeBadge } from './ui'
import OrganizationModal from './OrganizationModal'
import OrganizationDetailsModal from './OrganizationDetailsModal'
import QuestionModal from './QuestionModal'

const EMPTY_FORM = {
  title: '',
  descr: '',
  organizationId: '',
  sdate: '',
  edate: '',
}

export default function CreateFormView({
  questions,
  organizations,
  questionTypes,
  editingForm,
  onSave,
  onCancel,
  onAddQuestion,
  onAddOrganization,
  onOpenOrganizationDetails,
  onToggleOrganization,
  savingForm,
  savingOrganization,
  savingOrganizationId,
  savingQuestion,
  organizationCatalog = [],
  loadingOrganizations = false,
}) {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [attachments, setAttachments] = useState({})
  const [isActv, setIsActv] = useState(true)
  const [purposeFilter, setPurposeFilter] = useState('all')
  const [questionPage, setQuestionPage] = useState(1)
  const [questionPageSize, setQuestionPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showOrgDetails, setShowOrgDetails] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const selectedOrganizationId = formData.organizationId || organizations[0]?.id || ''
  const isEditing = Boolean(editingForm?.formId)

  useEffect(() => {
    if (!editingForm) {
      setFormData(EMPTY_FORM)
      setAttachments({})
      setIsActv(true)
      return
    }

    setFormData({
      title: editingForm.title || '',
      descr: editingForm.descr || '',
      organizationId: editingForm.organizationId || '',
      sdate: toDateInput(editingForm.sdate),
      edate: toDateInput(editingForm.edate),
    })
    setIsActv(editingForm.isActv == null ? true : isFlagOn(editingForm.isActv))
    const next = {}
    for (const question of editingForm.questions || []) {
      const questionId = getQuestionId(question)
      if (!questionId) continue
      next[questionId] = {
        questionId,
        isReq: question.isReq ?? 1,
        ordNo: Number(question.ordNo) || Object.keys(next).length + 1,
      }
    }
    setAttachments(renumberAttachments(next))
  }, [editingForm])

  useEffect(() => {
    if (!formData.organizationId) return
    const stillActive = organizations.some((org) => String(org.id) === String(formData.organizationId))
    if (!stillActive) {
      setFormData((prev) => ({ ...prev, organizationId: '' }))
    }
  }, [organizations, formData.organizationId])

  const filteredQuestions = useMemo(() => {
    const rows = [...(questions || [])].sort((a, b) => {
      const aAssmt = isFlagOn(a.isAssmt) ? 1 : 0
      const bAssmt = isFlagOn(b.isAssmt) ? 1 : 0
      if (aAssmt !== bAssmt) return aAssmt - bAssmt
      return (Number(getQuestionId(a)) || 0) - (Number(getQuestionId(b)) || 0)
    })
    if (purposeFilter === 'candidate') return rows.filter((question) => !isFlagOn(question.isAssmt))
    if (purposeFilter === 'interview') return rows.filter((question) => isFlagOn(question.isAssmt))
    return rows
  }, [purposeFilter, questions])

  const pagedQuestions = paginateRows(filteredQuestions, questionPage, questionPageSize)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'organizationId' ? Number(value) : value,
    }))
  }

  const attachQuestion = (questionId) => {
    setAttachments((prev) => {
      if (prev[questionId]) return prev
      return {
        ...prev,
        [questionId]: {
          questionId,
          isReq: 1,
          ordNo: Object.keys(prev).length + 1,
        },
      }
    })
  }

  const toggleQuestion = (questionId) => {
    setAttachments((prev) => {
      if (prev[questionId]) {
        const next = { ...prev }
        delete next[questionId]
        return renumberAttachments(next)
      }
      return {
        ...prev,
        [questionId]: {
          questionId,
          isReq: 1,
          ordNo: Object.keys(prev).length + 1,
        },
      }
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave({
      ...formData,
      formId: editingForm?.formId,
      organizationId: Number(selectedOrganizationId),
      isActv: toFlag(isActv),
      questions: Object.values(attachments)
        .sort((a, b) => Number(a.ordNo) - Number(b.ordNo))
        .map((item, index) => ({
          questionId: item.questionId,
          ordNo: index + 1,
          isReq: toFlag(item.isReq),
        })),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{isEditing ? 'Formu Düzenle' : 'Form Oluştur'}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Havuzdaki aday sorularını ve mülakat kriterlerini aynı listeden forma bağlayın.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Başlık
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className={`mt-2 ${inputClass}`}
                placeholder="Örn: 2026 Güz Dönemi Mobil Geliştirme Kampı"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Açıklama
              <textarea
                name="descr"
                rows="4"
                value={formData.descr}
                onChange={handleChange}
                className={`mt-2 resize-none ${inputClass}`}
                placeholder="Programın kapsamını ve hedef kitlesini yazın."
              />
            </label>

            <div className="sm:col-span-2">
              <span className="block text-sm font-medium text-slate-700">Organizasyon</span>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  name="organizationId"
                  required
                  value={selectedOrganizationId}
                  onChange={handleChange}
                  className={`min-w-0 flex-1 ${inputClass}`}
                >
                  <option value="">Seçiniz</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setShowOrgDetails(true)
                    onOpenOrganizationDetails?.()
                  }}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                >
                  <List className="h-4 w-4" />
                  Organizasyon detayı
                </button>
                <button
                  type="button"
                  onClick={() => setShowOrgModal(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4" />
                  Yeni Organizasyon
                </button>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Başlangıç Tarihi
              <input
                type="date"
                name="sdate"
                required
                value={formData.sdate}
                onChange={handleChange}
                className={`mt-2 ${inputClass}`}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Bitiş Tarihi
              <input
                type="date"
                name="edate"
                required
                value={formData.edate}
                onChange={handleChange}
                className={`mt-2 ${inputClass}`}
              />
            </label>

            <div className="sm:col-span-2">
              <Switch
                checked={isActv}
                onChange={setIsActv}
                label={isActv ? 'Form aktif' : 'Form pasif'}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Forma Eklenecek Sorular</h2>
              <p className="mt-1 text-sm text-slate-500">
                Aday soruları başvuru formunda, mülakat kriterleri yalnızca değerlendirme ekranında görünür.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowQuestionModal(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Yeni Soru Oluştur
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'candidate', label: 'Aday Soruları' },
              { id: 'interview', label: 'Mülakat Kriterleri' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPurposeFilter(item.id)
                  setQuestionPage(1)
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  purposeFilter === item.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Seç</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Soru</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Tip</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Amaç</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Zorunlu mu?</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Sıra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedQuestions.total === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-slate-500">
                      {(questions || []).length === 0
                        ? 'Soru havuzu boş. Yeni soru oluşturabilirsiniz.'
                        : 'Bu filtreye uygun soru yok.'}
                    </td>
                  </tr>
                ) : (
                  pagedQuestions.items.map((question) => {
                    const questionId = getQuestionId(question)
                    const attached = attachments[questionId]
                    const kind = getQuestionKind(question, questionTypes)
                    return (
                      <tr
                        key={questionId}
                        className={attached ? 'bg-blue-50/70' : 'hover:bg-slate-50'}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={Boolean(attached)}
                            onChange={() => toggleQuestion(questionId)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-700">{question.questionText}</td>
                        <td className="px-4 py-3">
                          <TypeBadge kind={kind} />
                        </td>
                        <td className="px-4 py-3">
                          <PurposeBadge isAssmt={question.isAssmt} />
                        </td>
                        <td className="px-4 py-3">
                          <Switch
                            checked={isFlagOn(attached?.isReq)}
                            onChange={(value) => {
                              setAttachments((prev) => {
                                const current = prev[questionId] || {
                                  questionId,
                                  ordNo: Object.keys(prev).length + 1,
                                }
                                return {
                                  ...prev,
                                  [questionId]: {
                                    ...current,
                                    isReq: toFlag(value),
                                  },
                                }
                              })
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex min-w-[2rem] justify-center rounded-lg px-2 py-1 text-sm font-semibold ${
                            attached ? 'bg-slate-100 text-slate-700' : 'text-slate-400'
                          }`}
                          >
                            {attached ? attached.ordNo : '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            <TablePager
              page={pagedQuestions.page}
              size={questionPageSize}
              total={pagedQuestions.total}
              onPageChange={setQuestionPage}
              onSizeChange={(nextSize) => {
                setQuestionPageSize(nextSize)
                setQuestionPage(1)
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          {isEditing ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={savingForm}
              className="rounded-lg bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              İptal
            </button>
          ) : null}
          <button
            type="submit"
            disabled={savingForm}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingForm ? 'Kaydediliyor...' : isEditing ? 'Değişiklikleri Kaydet' : 'Formu Kaydet'}
          </button>
        </div>
      </form>

      {showOrgModal && (
        <OrganizationModal
          saving={savingOrganization}
          onClose={() => setShowOrgModal(false)}
          onSave={async (payload) => {
            const organization = await onAddOrganization(payload)
            if (organization?.id) {
              setFormData((prev) => ({ ...prev, organizationId: organization.id }))
              setShowOrgModal(false)
            }
          }}
        />
      )}

      {showOrgDetails ? (
        <OrganizationDetailsModal
          organizations={organizationCatalog}
          loading={loadingOrganizations}
          savingId={savingOrganizationId}
          onClose={() => setShowOrgDetails(false)}
          onToggle={onToggleOrganization}
        />
      ) : null}

      {showQuestionModal && (
        <QuestionModal
          saving={savingQuestion}
          questionTypes={questionTypes}
          onClose={() => setShowQuestionModal(false)}
          onSave={async (payload) => {
            const question = await onAddQuestion(payload)
            const questionId = getQuestionId(question)
            if (questionId) {
              attachQuestion(questionId)
              setShowQuestionModal(false)
            }
          }}
        />
      )}
    </div>
  )
}

