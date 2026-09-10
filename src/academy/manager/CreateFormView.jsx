// Form ekranı: meta alanlar + havuzdan soru bağlama.
import { useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical, List, Plus } from 'lucide-react'
import {
  DEFAULT_PAGE_SIZE,
  getQuestionId,
  getQuestionKind,
  isFlagOn,
  isFormExpired,
  KIND_LABELS,
  toFlag,
  toFormDateTimeInput,
} from '../api/helpers'
import { CompactCategoryFilter, ConfirmDialog, inputClass, paginateRows, appendAttachment, PurposeBadge, renumberAttachments, reorderAttachments, Switch, TablePager, TypeBadge } from './ui'
import OrganizationModal from './OrganizationModal'
import OrganizationDetailsModal from './OrganizationDetailsModal'
import QuestionModal from './QuestionModal'
import { showToast } from '../../shared/toast/ToastProvider'
import { UNSAVED_CHANGES_MESSAGE, useRegisterUnsavedChanges } from './UnsavedChangesContext'

const EMPTY_FORM = {
  title: '',
  descr: '',
  organizationId: '',
  sdate: '',
  edate: '',
}

// Dirty check için form + bağlı soru özeti.
function snapshotForm(formData, attachments, isActv) {
  return JSON.stringify({
    title: String(formData.title || '').trim(),
    descr: String(formData.descr || '').trim(),
    organizationId: String(formData.organizationId || ''),
    sdate: formData.sdate || '',
    edate: formData.edate || '',
    isActv: isActv ? 1 : 0,
    questions: Object.values(attachments)
      .sort((a, b) => Number(a.ordNo) - Number(b.ordNo))
      .map((item) => ({
        questionId: Number(item.questionId),
        ordNo: Number(item.ordNo),
        isReq: toFlag(item.isReq),
      })),
  })
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
  const [typeFilter, setTypeFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('purpose')
  const [questionPage, setQuestionPage] = useState(1)
  const [questionPageSize, setQuestionPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showOrgDetails, setShowOrgDetails] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [dragQuestionId, setDragQuestionId] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const baselineRef = useRef(snapshotForm(EMPTY_FORM, {}, true))
  const selectedOrganizationId = formData.organizationId || ''
  const isEditing = Boolean(editingForm?.formId)
  const isDirty = snapshotForm(formData, attachments, isActv) !== baselineRef.current
  useRegisterUnsavedChanges(isDirty)

  useEffect(() => {
    if (!isDirty) return undefined
    const onBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  // Edit: formu ve attachments'ı doldur; süresi geçmişse pasif.
  useEffect(() => {
    if (!editingForm) {
      setFormData(EMPTY_FORM)
      setAttachments({})
      setIsActv(true)
      baselineRef.current = snapshotForm(EMPTY_FORM, {}, true)
      return
    }

    const nextForm = {
      title: editingForm.title || '',
      descr: editingForm.descr || '',
      organizationId: editingForm.organizationId || '',
      sdate: toFormDateTimeInput(editingForm.sdate),
      edate: toFormDateTimeInput(editingForm.edate),
    }
    const nextActvRaw = editingForm.isActv == null ? true : isFlagOn(editingForm.isActv)
    const nextActv = isFormExpired({ edate: editingForm.edate || nextForm.edate }) ? false : nextActvRaw
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
    const nextAttachments = renumberAttachments(next)
    setFormData(nextForm)
    setIsActv(nextActv)
    setAttachments(nextAttachments)
    baselineRef.current = snapshotForm(nextForm, nextAttachments, nextActv)
  }, [editingForm])

  const endDatePassed = isFormExpired({
    edate: formData.edate || null,
  })

  useEffect(() => {
    if (endDatePassed && isActv) {
      setIsActv(false)
    }
  }, [endDatePassed, isActv])

  useEffect(() => {
    if (!formData.organizationId) return
    const stillActive = organizations.some((org) => String(org.id) === String(formData.organizationId))
    if (!stillActive) {
      setFormData((prev) => ({ ...prev, organizationId: '' }))
    }
  }, [organizations, formData.organizationId])

  // Amaç/tip filtresi; bağlı sorular üstte, ordNo sırası.
  const filteredQuestions = useMemo(() => {
    let rows = [...(questions || [])]
    if (purposeFilter === 'candidate') rows = rows.filter((question) => !isFlagOn(question.isAssmt))
    if (purposeFilter === 'interview') rows = rows.filter((question) => isFlagOn(question.isAssmt))
    if (typeFilter !== 'all') {
      rows = rows.filter((question) => getQuestionKind(question, questionTypes) === typeFilter)
    }
    return rows.sort((a, b) => {
      const aId = getQuestionId(a)
      const bId = getQuestionId(b)
      const aAttached = attachments[aId]
      const bAttached = attachments[bId]
      if (aAttached && bAttached) return Number(aAttached.ordNo) - Number(bAttached.ordNo)
      if (aAttached) return -1
      if (bAttached) return 1
      const aAssmt = isFlagOn(a.isAssmt) ? 1 : 0
      const bAssmt = isFlagOn(b.isAssmt) ? 1 : 0
      if (aAssmt !== bAssmt) return aAssmt - bAssmt
      return (Number(aId) || 0) - (Number(bId) || 0)
    })
  }, [purposeFilter, typeFilter, questions, questionTypes, attachments])

  const pagedQuestions = paginateRows(filteredQuestions, questionPage, questionPageSize)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'organizationId' ? (value === '' ? '' : Number(value)) : value,
    }))
  }

  // Forma bağla (sona ekle) / çıkar / sürükle-sırala.
  const attachQuestion = (questionId) => {
    setAttachments((prev) => appendAttachment(prev, questionId))
    setQuestionPage(1)
  }

  const toggleQuestion = (questionId) => {
    setAttachments((prev) => {
      if (prev[questionId]) {
        const next = { ...prev }
        delete next[questionId]
        return renumberAttachments(next)
      }
      return appendAttachment(prev, questionId)
    })
    setQuestionPage(1)
  }

  const moveAttachedQuestion = (fromId, toId) => {
    setAttachments((prev) => reorderAttachments(prev, fromId, toId))
  }

  const buildSavePayload = () => ({
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

  const handleCancel = () => {
    if (!isDirty) {
      onCancel?.()
      return
    }
    setConfirmAction('cancel')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!isDirty) {
      showToast.warning('Dikkat', 'Kaydedilecek bir değişiklik yok.')
      return
    }
    setConfirmAction('save')
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
        {/* Başlık, açıklama, org, tarihler, aktif */}
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
                  onClick={() => setShowOrgModal(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4" />
                  Yeni Organizasyon
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOrgDetails(true)
                    onOpenOrganizationDetails?.()
                  }}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                >
                  <List className="h-4 w-4" />
                  Organizasyon Detayı
                </button>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Başlangıç Tarihi ve Saati
              <input
                type="datetime-local"
                name="sdate"
                required
                value={formData.sdate}
                onChange={handleChange}
                max={formData.edate || undefined}
                className={`mt-2 ${inputClass}`}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Bitiş Tarihi ve Saati
              <input
                type="datetime-local"
                name="edate"
                required
                value={formData.edate}
                onChange={handleChange}
                min={formData.sdate || undefined}
                className={`mt-2 ${inputClass}`}
              />
            </label>

            <div className="sm:col-span-2">
              <Switch
                checked={isActv}
                onChange={setIsActv}
                disabled={endDatePassed}
                label={isActv ? 'Form Aktif' : 'Form Pasif'}
              />
              {endDatePassed ? (
                <p className="mt-2 text-xs text-slate-500">
                  Bitiş tarihi ve saati geçen formlar otomatik olarak pasife alınır ve aday listesinde görünmez.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Havuz: seç, zorunlu, sıra; sürükle-bırak */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Forma Eklenecek Sorular</h2>
              <p className="mt-1 text-sm text-slate-500">
                Aday soruları başvuru formunda, mülakat kriterleri yalnızca değerlendirme ekranında görünür. Eklenen sorular listenin üstünde durur; sürükleyerek sırasını değiştirebilirsiniz.
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

          <div className="mt-4">
            <CompactCategoryFilter
              activeId={activeFilter}
              onActiveChange={setActiveFilter}
              groups={[
                {
                  id: 'purpose',
                  label: 'Amaç',
                  items: [
                    { id: 'all', label: 'Tümü' },
                    { id: 'candidate', label: 'Aday Soruları' },
                    { id: 'interview', label: 'Mülakat Kriterleri' },
                  ],
                  value: purposeFilter,
                  onChange: (id) => {
                    setPurposeFilter(id)
                    setQuestionPage(1)
                  },
                },
                {
                  id: 'type',
                  label: 'Soru tipi',
                  items: [
                    { id: 'all', label: 'Tümü' },
                    ...Object.entries(KIND_LABELS).map(([id, label]) => ({ id, label })),
                  ],
                  value: typeFilter,
                  onChange: (id) => {
                    setTypeFilter(id)
                    setQuestionPage(1)
                  },
                },
              ]}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="w-8 px-2 py-3" aria-label="Sırala" />
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
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-500">
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
                    const isDragging = String(dragQuestionId) === String(questionId)
                    return (
                      <tr
                        key={questionId}
                        onDragOver={(event) => {
                          if (!attached || !dragQuestionId) return
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(event) => {
                          event.preventDefault()
                          if (!attached || !dragQuestionId) return
                          moveAttachedQuestion(dragQuestionId, questionId)
                          setDragQuestionId(null)
                        }}
                        className={`${attached ? 'bg-blue-50/70' : 'hover:bg-slate-50'} ${
                          isDragging ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-2 py-3 text-slate-400">
                          {attached ? (
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                setDragQuestionId(questionId)
                                event.dataTransfer.effectAllowed = 'move'
                                event.dataTransfer.setData('text/plain', String(questionId))
                              }}
                              onDragEnd={() => setDragQuestionId(null)}
                              className="cursor-grab rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 active:cursor-grabbing"
                              aria-label="Sırayı değiştir"
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="inline-block w-5" />
                          )}
                        </td>
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
                              if (attached) {
                                setAttachments((prev) => ({
                                  ...prev,
                                  [questionId]: {
                                    ...prev[questionId],
                                    isReq: toFlag(value),
                                  },
                                }))
                                return
                              }
                              setAttachments((prev) => appendAttachment(prev, questionId, { isReq: toFlag(value) }))
                              setQuestionPage(1)
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
          <button
            type="button"
            onClick={handleCancel}
            disabled={savingForm}
            className="rounded-lg bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={savingForm}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingForm ? 'Kaydediliyor...' : isEditing ? 'Değişiklikleri Kaydet' : 'Formu Kaydet'}
          </button>
        </div>
      </form>

      {/* Org oluştur / org aktif-pasif / yeni soru / kaydet-iptal onayı */}
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

      {confirmAction === 'cancel' ? (
        <ConfirmDialog
          title="İptal"
          message={UNSAVED_CHANGES_MESSAGE}
          confirmLabel="Evet"
          cancelLabel="Hayır"
          confirmClassName="bg-red-600 text-white hover:bg-red-700"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            setConfirmAction(null)
            onCancel?.()
          }}
        />
      ) : null}

      {confirmAction === 'save' ? (
        <ConfirmDialog
          title="Kaydet"
          message="Yapılan değişiklikleri kaydetmek istediğinizden emin misiniz?"
          confirmLabel="Evet"
          cancelLabel="Hayır"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            setConfirmAction(null)
            onSave(buildSavePayload())
          }}
        />
      ) : null}
    </div>
  )
}

