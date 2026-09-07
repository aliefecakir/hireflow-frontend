import { useState } from 'react'
import { Plus } from 'lucide-react'
import { DEFAULT_PAGE_SIZE, getChoiceId, getQuestionId, getQuestionKind, isFlagOn } from '../api/helpers'
import { paginateRows, PurposeBadge, TablePager, TypeBadge } from './ui'
import QuestionModal from './QuestionModal'

export default function QuestionPoolView({ questions, questionTypes, onAddQuestion, savingQuestion }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [showModal, setShowModal] = useState(false)
  const pagedQuestions = paginateRows(questions, page, pageSize)

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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-4">
          {pagedQuestions.total === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Soru havuzu boş.
            </div>
          ) : (
            pagedQuestions.items.map((question) => {
              const kind = getQuestionKind(question, questionTypes)
              return (
                <div key={getQuestionId(question)} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge kind={kind} />
                    <PurposeBadge isAssmt={question.isAssmt} />
                    <span className="text-xs text-slate-400">
                      Puan aralığı: {question.minScore}–{question.maxScore}
                    </span>
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
                              {choice.score} puan
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
          saving={savingQuestion}
          questionTypes={questionTypes}
          onClose={() => setShowModal(false)}
          onSave={async (payload) => {
            const question = await onAddQuestion(payload)
            if (question) {
              setShowModal(false)
            }
          }}
        />
      )}
    </div>
  )
}
