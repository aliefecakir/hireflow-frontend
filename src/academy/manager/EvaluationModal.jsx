import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import {
  evaluateApplication,
  getAcademyAppStatuses,
  getApplicationDetails,
  updateAcademyAppStatus,
} from '../api/applications'
import {
  filterCandidateQuestions,
  getChoiceId,
  getQuestionKind,
  isDateAnswerValue,
  isFileAnswerUrl,
  getSelectedChoiceIds,
  isFlagOn,
  normalizeQuestionTypes,
} from '../api/helpers'
import { getQuestionTypes } from '../api/questions'
import { getErrorMessage } from '../../shared/api/client'
import { showToast } from '../../shared/toast/ToastProvider'
import { fullName, inputClass, LoadingState, ReadOnlyField, statusBadgeClass, useEscape } from './ui'

function isInterviewDateCriterion(criterion, questionTypes = []) {
  const kind = getQuestionKind(criterion, questionTypes)
  if (kind === 'date') return true
  const noChoices = !Array.isArray(criterion?.choices) || criterion.choices.length === 0
  if (!noChoices) return false
  return isDateAnswerValue(criterion?.answerText)
    || /tarih|\bdate\b/i.test(String(criterion?.questionText || ''))
    || /tarih|\bdate\b|\bdt\b/i.test(String(criterion?.tpShrtCode || ''))
}

function getInterviewRenderKind(criterion, questionTypes = []) {
  const kind = getQuestionKind(criterion, questionTypes)
  const choiceCount = Array.isArray(criterion?.choices) ? criterion.choices.length : 0
  if (isInterviewDateCriterion(criterion, questionTypes) || kind === 'date') return 'date'
  if (kind === 'open') return 'open'
  if (choiceCount === 0) return 'open'
  if (kind === 'multi') return 'multi'
  return 'single'
}

function isOpenEndedCandidateAnswer(answer) {
  const choices = answer?.choices || []
  return choices.length === 0
    && !isFileAnswerUrl(answer?.answerText)
    && !isDateAnswerValue(answer?.answerText)
}

function getSelectedOtherChoice(answer) {
  const selectedIds = new Set(getSelectedChoiceIds(answer).map(String))
  return (answer?.choices || []).find((choice) => (
    isFlagOn(choice.isOther) && selectedIds.has(String(getChoiceId(choice) ?? ''))
  )) || null
}

function needsManualScore(answer) {
  return isOpenEndedCandidateAnswer(answer) || Boolean(getSelectedOtherChoice(answer))
}

function getManualScoreMax(answer) {
  const otherChoice = getSelectedOtherChoice(answer)
  if (otherChoice) {
    const max = Number(otherChoice.score)
    return Number.isFinite(max) && max >= 0 ? max : 10
  }
  const max = Number(answer?.maxScore)
  return Number.isFinite(max) && max >= 0 ? max : 10
}

function readAnswerScore(answer) {
  const raw = answer?.score
  if (raw == null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function ManualScoreField({ maxScore, value, onChange }) {
  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <label className="block text-xs font-semibold text-blue-800">
        Yönetici Puanı (0 - {maxScore})
        <input
          type="number"
          min="0"
          max={maxScore}
          value={value}
          onChange={(event) => {
            const next = Math.max(0, Math.min(Number(event.target.value) || 0, maxScore))
            onChange(next)
          }}
          className={`mt-2 w-32 ${inputClass}`}
          placeholder="0"
        />
      </label>
    </div>
  )
}

export default function EvaluationModal({ appId, onClose, onSaved, statuses: statusesProp = [] }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scores, setScores] = useState({})
  const [texts, setTexts] = useState({})
  const [manualScores, setManualScores] = useState({}) // Açık uçlu ve “Diğer” cevapları için manuel puanlar
  const [statuses, setStatuses] = useState(Array.isArray(statusesProp) ? statusesProp : [])
  const [questionTypes, setQuestionTypes] = useState([])
  const [stId, setStId] = useState('')
  const [statusDescr, setStatusDescr] = useState('')
  const onCloseRef = useRef(onClose)
  useEscape(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [data, statusRows, typeRows] = await Promise.all([
          getApplicationDetails(appId),
          statusesProp.length
            ? Promise.resolve(statusesProp)
            : getAcademyAppStatuses().catch(() => []),
          getQuestionTypes().then(normalizeQuestionTypes).catch(() => []),
        ])
        if (!cancelled) {
          setDetails(data)
          setStatuses(Array.isArray(statusRows) ? statusRows : [])
          setQuestionTypes(Array.isArray(typeRows) ? typeRows : [])
          setStId(data?.stId ? String(data.stId) : '')
          setStatusDescr(data?.statusDescr || '')
          const nextScores = {}
          const nextTexts = {}
          const nextManualScores = {}
          for (const criterion of data?.interviewCriteria || []) {
            if (criterion.selectedChoiceId != null) {
              nextScores[criterion.questionId] = criterion.selectedChoiceId
            }
            if (criterion.answerText) {
              const renderKind = getInterviewRenderKind(criterion, typeRows)
              nextTexts[criterion.questionId] = renderKind === 'date'
                ? String(criterion.answerText).slice(0, 10)
                : String(criterion.answerText)
            }
          }
          for (const answer of filterCandidateQuestions(data?.answers || [])) {
            if (!needsManualScore(answer)) continue
            const savedScore = readAnswerScore(answer)
            if (savedScore != null) {
              nextManualScores[answer.questionId] = savedScore
            }
          }
          setScores(nextScores)
          setTexts(nextTexts)
          setManualScores(nextManualScores)
        }
      } catch (error) {
        console.error('Başvuru detayı yüklenemedi:', error)
        showToast.error('Hata Oluştu', getErrorMessage(error) || 'Aday bilgileri yüklenirken bir hata oluştu.')
        onCloseRef.current()
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [appId])

  const handleSave = async (event) => {
    event.preventDefault()
    if (saving) return

    const criteria = [...(details?.interviewCriteria || [])]
    const payload = []

    for (const criterion of criteria) {
      const renderKind = getInterviewRenderKind(criterion, questionTypes)
      if (renderKind === 'date' || renderKind === 'open') {
        const answerText = String(texts[criterion.questionId] || '').trim()
        if (answerText) {
          payload.push({ questionId: criterion.questionId, answerText })
        }
        continue
      }

      const questionChoiceId = scores[criterion.questionId]
      if (questionChoiceId) {
        payload.push({
          questionId: criterion.questionId,
          questionChoiceId: Number(questionChoiceId),
        })
      }
    }

    const candidateAnswers = filterCandidateQuestions(details?.answers || [])
    const manualScoreUpdates = []
    for (const answer of candidateAnswers) {
      if (!needsManualScore(answer)) continue
      manualScoreUpdates.push({
        questionId: answer.questionId,
        score: Number(manualScores[answer.questionId] ?? 0),
      })
    }

    setSaving(true)
    try {
      await evaluateApplication(appId, {
        answers: payload,
        manualScores: manualScoreUpdates,
      })
      if (stId) {
        await updateAcademyAppStatus(appId, { stId, statusDescr: statusDescr.trim() })
      }
      showToast.success('Başarılı', 'Değerlendirme kaydedildi.')
      onSaved?.()
      onClose()
    } catch (error) {
      console.error('Değerlendirme kaydedilemedi:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Değerlendirme kaydedilirken bir hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  const candidateAnswers = filterCandidateQuestions(details?.answers || [])
  const interviewCriteria = [...(details?.interviewCriteria || [])].sort(
    (a, b) => (Number(a.ordNo) || 0) - (Number(b.ordNo) || 0),
  )
  const statusOptions = [...statuses]
  if (details?.stId && !statusOptions.some((item) => String(item.stId) === String(details.stId))) {
    statusOptions.unshift({
      stId: details.stId,
      name: details.statusName || details.statusDescr || 'Mevcut durum',
    })
  }
  const selectedStatus = statusOptions.find((item) => String(item.stId) === String(stId))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Aday Detayı ve Değerlendirme</h2>
            {details ? (
              <p className="mt-1 text-sm font-medium text-slate-700">{fullName(details)}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Aday bilgileri getiriliyor...</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : (
          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Puan Özeti */}
              <section className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
                <h3 className="text-sm font-semibold text-slate-800">📊 Puan Özeti</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-xs text-slate-500">Üniversite</p>
                    <p className="mt-1 text-lg font-bold text-blue-600">{details?.uniScore ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-xs text-slate-500">Bölüm</p>
                    <p className="mt-1 text-lg font-bold text-emerald-600">{details?.depScore ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-xs text-slate-500">Toplam Puan</p>
                    <p className="mt-1 text-lg font-bold text-indigo-600">{details?.totalScore ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-xs text-slate-500">Mülakat</p>
                    <p className="mt-1 text-lg font-bold text-orange-600">{details?.interviewScore ?? 0}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-800">Bölüm 1 · Adayın Form Cevapları</h3>
                <div className="mt-4 space-y-4">
                  <ReadOnlyField label="Ad" value={details?.name} />
                  <ReadOnlyField label="Soyad" value={details?.surname} />
                  <ReadOnlyField label="E-posta" value={details?.email} />
                  <ReadOnlyField label="Telefon" value={details?.phone} />
                  
                  {/* Üniversite Puanı */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-800">Üniversite</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <input
                        readOnly
                        value={details?.universityName || '—'}
                        className={`flex-1 bg-slate-50 ${inputClass}`}
                      />
                      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                        <span className="text-xs font-medium text-blue-700">Puan:</span>
                        <span className="text-sm font-bold text-blue-700">{details?.uniScore ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bölüm Puanı */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-800">Bölüm</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <input
                        readOnly
                        value={details?.departmentName || '—'}
                        className={`flex-1 bg-slate-50 ${inputClass}`}
                      />
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                        <span className="text-xs font-medium text-emerald-700">Puan:</span>
                        <span className="text-sm font-bold text-emerald-700">{details?.depScore ?? 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  {candidateAnswers.length === 0 ? (
                    <p className="text-sm text-slate-500">Bu adaya ait ek form cevabı bulunamadı.</p>
                  ) : (
                    candidateAnswers.map((answer) => {
                      const seenChoiceIds = new Set()
                      const choices = [...(answer.choices || [])]
                        .filter((choice) => {
                          const choiceId = String(getChoiceId(choice) ?? '')
                          if (!choiceId || seenChoiceIds.has(choiceId)) return false
                          seenChoiceIds.add(choiceId)
                          return true
                        })
                        .sort((a, b) => (Number(a.ordNo) || 0) - (Number(b.ordNo) || 0))
                      const selectedIds = getSelectedChoiceIds(answer)
                      const kind = getQuestionKind(answer, questionTypes)
                      const isMulti = kind === 'multi' || selectedIds.length > 1
                      const fileUrl = kind === 'file' || isFileAnswerUrl(answer.answerText)
                        ? String(answer.answerText || '').trim()
                        : ''
                      const dateValue = kind === 'date' || isDateAnswerValue(answer.answerText)
                        ? String(answer.answerText || '').trim()
                        : ''
                      const isOpenEnded = isOpenEndedCandidateAnswer(answer)
                      const selectedOtherChoice = getSelectedOtherChoice(answer)
                      const manualMax = getManualScoreMax(answer)
                      const setManualScore = (value) => {
                        setManualScores((prev) => ({
                          ...prev,
                          [answer.questionId]: value,
                        }))
                      }

                      return (
                        <div key={answer.questionId} className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-medium text-slate-800">{answer.questionText}</p>

                          {dateValue ? (
                            <input
                              type="date"
                              readOnly
                              value={dateValue}
                              className={`mt-3 bg-slate-50 ${inputClass}`}
                            />
                          ) : fileUrl ? (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                            >
                              CV’yi aç
                            </a>
                          ) : isOpenEnded ? (
                            <>
                              <textarea
                                readOnly
                                rows="4"
                                value={answer.answerText || ''}
                                className={`mt-3 resize-none bg-slate-50 ${inputClass}`}
                              />
                              <ManualScoreField
                                maxScore={manualMax}
                                value={manualScores[answer.questionId] ?? 0}
                                onChange={setManualScore}
                              />
                            </>
                          ) : (
                            <>
                              <div className="mt-3 flex flex-col gap-2">
                                {choices.map((choice) => {
                                  const choiceId = getChoiceId(choice)
                                  const checked = selectedIds.includes(String(choiceId))
                                  const isOtherChoice = isFlagOn(choice.isOther)
                                  const showOtherText = checked && isOtherChoice

                                  return (
                                    <label
                                      key={choiceId}
                                      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                                        checked
                                          ? 'border-blue-300 bg-blue-50 text-blue-800'
                                          : 'border-slate-200 bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      <input
                                        type={isMulti ? 'checkbox' : 'radio'}
                                        name={`candidate-answer-${answer.questionId}`}
                                        checked={checked}
                                        disabled
                                        readOnly
                                        className="mt-0.5 h-4 w-4 border-slate-300 text-blue-600 disabled:opacity-100"
                                      />
                                      <span className="min-w-0 flex-1">
                                        <span className="font-medium">
                                          {choice.choiceText}
                                          {choice.score != null ? (
                                            <span className="ml-2 text-xs font-semibold text-blue-600">
                                              {isOtherChoice ? `(Max ${choice.score} Puan)` : `(+${choice.score} Puan)`}
                                            </span>
                                          ) : null}
                                        </span>
                                        {showOtherText ? (
                                          <span className="mt-2 block rounded-lg bg-white px-3 py-2 text-slate-600">
                                            {answer.answerText || '—'}
                                          </span>
                                        ) : null}
                                      </span>
                                    </label>
                                  )
                                })}
                              </div>
                              {selectedOtherChoice ? (
                                <ManualScoreField
                                  maxScore={manualMax}
                                  value={manualScores[answer.questionId] ?? 0}
                                  onChange={setManualScore}
                                />
                              ) : null}
                            </>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-800">Bölüm 2 · Yönetici Değerlendirmesi</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Alanlar zorunlu değil. Doldurulan kriterler kaydedilir, boş bırakılanlar boş kalır.
                </p>
                <div className="mt-4 space-y-4">
                  {interviewCriteria.length === 0 ? (
                    <p className="text-sm text-slate-500">Bu forma ait mülakat kriteri bulunamadı.</p>
                  ) : (
                    interviewCriteria.map((criterion) => {
                      const choices = [...(criterion.choices || [])].sort(
                        (a, b) => (Number(a.ordNo) || 0) - (Number(b.ordNo) || 0),
                      )
                      const renderKind = getInterviewRenderKind(criterion, questionTypes)
                      const setText = (value) => setTexts((prev) => ({
                        ...prev,
                        [criterion.questionId]: value,
                      }))

                      return (
                        <div key={criterion.questionId} className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-medium text-slate-800">{criterion.questionText}</p>

                          {renderKind === 'date' ? (
                            <input
                              type="date"
                              value={texts[criterion.questionId] || ''}
                              onChange={(event) => setText(event.target.value)}
                              className={`mt-3 ${inputClass}`}
                            />
                          ) : renderKind === 'open' ? (
                            <textarea
                              rows="4"
                              value={texts[criterion.questionId] || ''}
                              onChange={(event) => setText(event.target.value)}
                              className={`mt-3 resize-none ${inputClass}`}
                              placeholder="Değerlendirmenizi yazın"
                            />
                          ) : (
                            <div className="mt-3 flex flex-col gap-2">
                              {choices.map((choice) => {
                                const choiceId = getChoiceId(choice)
                                const selected = String(scores[criterion.questionId]) === String(choiceId)

                                return (
                                  <label
                                    key={choiceId}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                                      selected
                                        ? 'border-orange-400 bg-orange-50 text-orange-800'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-200 hover:bg-orange-50/60'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`criterion-${criterion.questionId}`}
                                      value={choiceId}
                                      checked={selected}
                                      onChange={() => setScores((prev) => ({
                                        ...prev,
                                        [criterion.questionId]: choiceId,
                                      }))}
                                      className="mt-0.5 h-4 w-4 border-slate-300 text-orange-500 focus:ring-orange-500"
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="font-medium">
                                        {choice.choiceText}
                                        {choice.score != null ? (
                                          <span className="ml-2 text-xs font-semibold text-orange-600">
                                            (+{choice.score} Puan)
                                          </span>
                                        ) : null}
                                      </span>
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-800">Bölüm 3 · Başvuru Durumu</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Durum zorunlu değil. Seçilirse kaydedilir; açıklama boş bırakılabilir.
                </p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <label className="block text-sm font-medium text-slate-800">
                      Durum
                      <select
                        value={stId}
                        onChange={(event) => setStId(event.target.value)}
                        className={`mt-3 ${inputClass}`}
                      >
                        <option value="">Seçiniz</option>
                        {statusOptions.map((item) => (
                          <option key={item.stId} value={item.stId}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedStatus?.name ? (
                      <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(selectedStatus.name)}`}>
                        {selectedStatus.name}
                      </span>
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <label className="block text-sm font-medium text-slate-800">
                      Durum açıklaması
                      <textarea
                        rows="3"
                        value={statusDescr}
                        onChange={(event) => setStatusDescr(event.target.value)}
                        className={`mt-3 resize-none ${inputClass}`}
                        placeholder="Açıklama yazın"
                      />
                    </label>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

