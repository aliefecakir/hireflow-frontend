import { useMemo, useState } from 'react'
import { Edit2, Plus } from 'lucide-react'
import { DEFAULT_PAGE_SIZE, getChoiceId, getQuestionId, getQuestionKind, isFlagOn, KIND_LABELS } from '../api/helpers'
import { CompactCategoryFilter, paginateRows, PurposeBadge, TablePager, TypeBadge } from './ui'
import QuestionModal from './QuestionModal'
import { deleteQuestion, getQuestionUsage, updateQuestion } from '../api/questions'
import { getErrorMessage } from '../../shared/api/client'
import { showToast } from '../../shared/toast/ToastProvider'

const PURPOSE_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'candidate', label: 'Aday Soruları' },
  { id: 'interview', label: 'Mülakat Kriterleri' },
]

const TYPE_FILTERS = [
  { id: 'all', label: 'Tümü' },
  ...Object.entries(KIND_LABELS).map(([id, label]) => ({ id, label })),
]

const USAGE_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'unused', label: 'Kullanılmayan' },
]

export default function QuestionPoolView({ questions, questionTypes, onAddQuestion, onRefresh, savingQuestion }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [purposeFilter, setPurposeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [usageFilter, setUsageFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('purpose')
  const [showModal, setShowModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [questionUsage, setQuestionUsage] = useState(null)
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [updatingQuestion, setUpdatingQuestion] = useState(false)
  const [deletingQuestion, setDeletingQuestion] = useState(false)

  const filteredQuestions = useMemo(() => {
    return (questions || []).filter((question) => {
      if (purposeFilter === 'candidate' && isFlagOn(question.isAssmt)) return false
      if (purposeFilter === 'interview' && !isFlagOn(question.isAssmt)) return false
      if (typeFilter !== 'all' && getQuestionKind(question, questionTypes) !== typeFilter) return false
      if (usageFilter === 'unused' && Number(question.formCount) > 0) return false
      return true
    })
  }, [questions, questionTypes, purposeFilter, typeFilter, usageFilter])

  const pagedQuestions = paginateRows(filteredQuestions, page, pageSize)

  const setFilter = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const handleEditQuestion = async (question) => {
    setLoadingUsage(true)
    try {
      const usage = await getQuestionUsage(getQuestionId(question))
      setQuestionUsage(usage)
      setEditingQuestion(question)
      setShowModal(true)
    } catch (error) {
      console.error('Kullanım bilgisi yüklenemedi:', error)
      showToast.error('Hata', getErrorMessage(error) || 'Kullanım bilgisi yüklenirken hata oluştu.')
    } finally {
      setLoadingUsage(false)
    }
  }

  const handleUpdateQuestion = async (payload) => {
    if (!editingQuestion) return
    
    setUpdatingQuestion(true)
    try {
      await updateQuestion(getQuestionId(editingQuestion), payload)
      showToast.success('Başarılı', 'Soru güncellendi.')
      setShowModal(false)
      setEditingQuestion(null)
      setQuestionUsage(null)
      onRefresh?.()
    } catch (error) {
      console.error('Soru güncellenemedi:', error)
      showToast.error('Hata', getErrorMessage(error) || 'Soru güncellenirken hata oluştu.')
    } finally {
      setUpdatingQuestion(false)
    }
  }

  const handleDeleteQuestion = async () => {
    if (!editingQuestion) return
    
    setDeletingQuestion(true)
    try {
      await deleteQuestion(getQuestionId(editingQuestion))
      showToast.success('Başarılı', 'Soru silindi.')
      setShowModal(false)
      setEditingQuestion(null)
      setQuestionUsage(null)
      onRefresh?.()
    } catch (error) {
      console.error('Soru silinemedi:', error)
      showToast.error('Hata', getErrorMessage(error) || 'Soru silinirken hata oluştu.')
    } finally {
      setDeletingQuestion(false)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingQuestion(null)
    setQuestionUsage(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Soru Havuzu</h1>
          <p className="mt-1 text-sm text-slate-600">
            Aday soruları ve mülakat kriterleri aynı havuzda tutulur.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Soru Ekle
        </button>
      </div>

      <CompactCategoryFilter
        activeId={activeFilter}
        onActiveChange={setActiveFilter}
        groups={[
          {
            id: 'purpose',
            label: 'Amaç',
            items: PURPOSE_FILTERS,
            value: purposeFilter,
            onChange: setFilter(setPurposeFilter),
          },
          {
            id: 'type',
            label: 'Soru tipi',
            items: TYPE_FILTERS,
            value: typeFilter,
            onChange: setFilter(setTypeFilter),
          },
          {
            id: 'usage',
            label: 'Kullanım',
            items: USAGE_FILTERS,
            value: usageFilter,
            onChange: setFilter(setUsageFilter),
          },
        ]}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-4">
          {pagedQuestions.total === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              {(questions || []).length === 0
                ? 'Soru havuzu boş.'
                : 'Bu filtreye uygun soru yok.'}
            </div>
          ) : (
            pagedQuestions.items.map((question) => {
              const kind = getQuestionKind(question, questionTypes)
              return (
                <div key={getQuestionId(question)} className="relative rounded-xl border border-slate-200 bg-white p-5">
                  <button
                    type="button"
                    onClick={() => handleEditQuestion(question)}
                    disabled={loadingUsage}
                    className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:cursor-wait disabled:opacity-50"
                    aria-label="Düzenle"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  
                  <div className="flex flex-wrap items-center gap-2 pr-12">
                    <TypeBadge kind={kind} />
                    <PurposeBadge isAssmt={question.isAssmt} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-800">{question.questionText}</p>
                  {(question.choices || []).length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {[...question.choices]
                        .sort((a, b) => a.ordNo - b.ordNo)
                        .map((choice) => (
                          <li key={getChoiceId(choice)} className="flex items-center justify-between text-sm text-slate-600">
                            <span>
                              {choice.ordNo}. {choice.choiceText}
                              {isFlagOn(choice.isOther) ? ' (Diğer)' : ''}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              {isFlagOn(choice.isOther) ? `max ${choice.score} puan` : `${choice.score} puan`}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )
            })
          )}
        </div>
        <TablePager
          page={pagedQuestions.page}
          size={pageSize}
          total={pagedQuestions.total}
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setPageSize(nextSize)
            setPage(1)
          }}
        />
      </div>

      {showModal && (
        <QuestionModal
          saving={editingQuestion ? updatingQuestion : savingQuestion}
          deleting={deletingQuestion}
          questionTypes={questionTypes}
          question={editingQuestion}
          usage={questionUsage}
          onClose={handleCloseModal}
          onSave={async (payload) => {
            if (editingQuestion) {
              await handleUpdateQuestion(payload)
            } else {
              const question = await onAddQuestion(payload)
              if (question) {
                setShowModal(false)
              }
            }
          }}
          onDelete={editingQuestion ? handleDeleteQuestion : undefined}
        />
      )}
    </div>
  )
}

