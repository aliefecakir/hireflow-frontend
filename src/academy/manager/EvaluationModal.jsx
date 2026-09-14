// Aday detayı ve değerlendirme: puanlar, cevaplar, mülakat, durum.
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import {
  evaluateApplication,
  getAcademyAppStatuses,
  getApplicationDetails,
  saveManualScore,
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
import { fullName, inputClass, LoadingState, ReadOnlyField, statusBadgeClass, useEscape, ConfirmDialog } from './ui'
import StatusHistoryModal, { StatusHistoryButton } from './StatusHistoryModal'

// Mülakat satırını date / open / single / multi çizer.
function isInterviewDateCriterion(criterion, questionTypes = []) {
  if (getQuestionKind(criterion, questionTypes) === 'date') return true
  const noChoices = !Array.isArray(criterion?.choices) || criterion.choices.length === 0
  return noChoices && isDateAnswerValue(criterion?.answerText)
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

// Açık uçlu veya "Diğer" seçildiyse yönetici puanı gerekir.
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

// Satır satır yönetici puanı (Check → saveManualScore).
function ManualScoreField({ maxScore, value, onChange, onSave, saving, saved, readOnly = false }) {
  if (readOnly) {
    const hasValue = value !== '' && value != null
    return (
      <div className={`mt-3 rounded-lg border p-3 ${saved ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
        <p className={`text-xs font-semibold ${saved ? 'text-emerald-700' : 'text-slate-600'}`}>
          Yönetici Puanı (0 - {maxScore})
        </p>
        <p className={`mt-2 text-sm font-semibold ${saved ? 'text-emerald-700' : 'text-slate-500'}`}>
          {hasValue ? value : 'Puan girilmedi'}
        </p>
      </div>
    )
  }

  return (
    <div className={`mt-3 rounded-lg border p-3 ${saved ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}>
      <p className={`text-xs font-semibold ${saved ? 'text-emerald-700' : 'text-blue-800'}`}>
        Yönetici Puanı (0 - {maxScore})
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="0"
          max={maxScore}
          value={value === '' || value == null ? '' : value}
          onChange={(event) => {
            const raw = event.target.value
            if (raw === '') {
              onChange('')
              return
            }
            const parsed = Number(raw)
            if (!Number.isFinite(parsed)) {
              onChange('')
              return
            }
            onChange(Math.max(0, Math.min(parsed, maxScore)))
          }}
          className={`w-32 ${inputClass}`}
          placeholder="Puan girin"
        />
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          title="Bu satırı kaydet"
          aria-label="Bu satırı kaydet"
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            saved
              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
              : 'border border-blue-600 bg-white text-blue-600 hover:bg-blue-50'
          }`}
        >
          <Check className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

function CollapsibleSection({ title, hint, open, onToggle, headerAction, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-100"
          aria-expanded={open}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
              {headerAction ? <span className="inline-block h-7 w-7 shrink-0" aria-hidden /> : null}
            </div>
            {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
          </div>
          <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {headerAction ? (
          <div className="pointer-events-none absolute inset-0 flex items-start px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="invisible whitespace-nowrap text-sm font-semibold">{title}</span>
              <div className="pointer-events-auto">{headerAction}</div>
            </div>
          </div>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-4 border-t border-slate-200 px-5 pb-5 pt-4">
          {children}
        </div>
      ) : null}
    </section>
  )
}

function AutoScoreChip({ score }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
      <span className="text-xs font-medium text-emerald-700">Puan:</span>
      <span className="text-sm font-bold text-emerald-700">{score ?? 0}</span>
    </div>
  )
}

function sortByFormOrder(rows) {
  return [...(rows || [])].sort((a, b) => {
    const aMissing = a?.ordNo == null || a?.ordNo === ''
    const bMissing = b?.ordNo == null || b?.ordNo === ''
    if (aMissing && bMissing) {
      return (Number(a?.questionId) || 0) - (Number(b?.questionId) || 0)
    }
    if (aMissing) return 1
    if (bMissing) return -1
    return Number(a.ordNo) - Number(b.ordNo)
  })
}

function isManualScoreSaved(answer, currentValue, committedScores) {
  const questionId = String(answer?.questionId ?? '')
  if (!questionId || !Object.prototype.hasOwnProperty.call(committedScores, questionId)) {
    return false
  }
  if (currentValue === '' || currentValue == null) return false
  return Number(committedScores[questionId]) === Number(currentValue)
}

// Dirty check: mülakat, manuel puan, durum.
function snapshotEvaluation({ scores, texts, manualScores, stId, statusDescr, details }) {
  const scoresNorm = {}
  const textsNorm = {}
  for (const criterion of details?.interviewCriteria || []) {
    const id = String(criterion.questionId)
    scoresNorm[id] = String(scores[criterion.questionId] ?? '')
    textsNorm[id] = String(texts[criterion.questionId] ?? '').trim()
  }
  const manuals = {}
  for (const answer of filterCandidateQuestions(details?.answers || [])) {
    if (!needsManualScore(answer)) continue
    manuals[String(answer.questionId)] = Object.prototype.hasOwnProperty.call(manualScores, answer.questionId)
      ? manualScores[answer.questionId]
      : null
  }
  return JSON.stringify({
    scores: scoresNorm,
    texts: textsNorm,
    manualScores: manuals,
    stId: String(stId || ''),
    statusDescr: String(statusDescr || '').trim(),
  })
}

export default function EvaluationModal({ appId, onClose, onSaved, statuses: statusesProp = [], readOnly = false }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingQuestionId, setSavingQuestionId] = useState(null)
  const [committedManualScores, setCommittedManualScores] = useState({})
  const [openSections, setOpenSections] = useState({
    personal: false,
    answers: true,
    interview: false,
    status: false,
  })
  const [scores, setScores] = useState({})
  const [texts, setTexts] = useState({})
  const [manualScores, setManualScores] = useState({})
  const [statuses, setStatuses] = useState(Array.isArray(statusesProp) ? statusesProp : [])
  const [questionTypes, setQuestionTypes] = useState([])
  const [stId, setStId] = useState('')
  const [statusDescr, setStatusDescr] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const onCloseRef = useRef(onClose)
  const baselineRef = useRef('')
  const confirmActionRef = useRef(null)
  confirmActionRef.current = confirmAction

  const isDirty = details
    ? snapshotEvaluation({ scores, texts, manualScores, stId, statusDescr, details }) !== baselineRef.current
    : false

  const requestClose = () => {
    if (readOnly) {
      onClose()
      return
    }
    if (confirmAction) return
    if (!isDirty) {
      onClose()
      return
    }
    setConfirmAction('cancel')
  }

  useEscape(() => {
    if (historyOpen) return
    if (confirmActionRef.current) return
    requestClose()
  })

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Detay, durumlar, soru tipleri; mevcut puanları baseline'a yaz.
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
          const nextCommitted = {}
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
            if (answer.manuallyScored !== true) continue
            const savedScore = readAnswerScore(answer)
            if (savedScore == null) continue
            nextManualScores[answer.questionId] = savedScore
            nextCommitted[String(answer.questionId)] = savedScore
          }
          setScores(nextScores)
          setTexts(nextTexts)
          setManualScores(nextManualScores)
          setCommittedManualScores(nextCommitted)
          baselineRef.current = snapshotEvaluation({
            scores: nextScores,
            texts: nextTexts,
            manualScores: nextManualScores,
            stId: data?.stId ? String(data.stId) : '',
            statusDescr: data?.statusDescr || '',
            details: data,
          })
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

  // Mülakat cevapları + bekleyen manuel puanlar + durum.
  const performSave = async () => {
    if (readOnly || saving) return

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
      const questionKey = String(answer.questionId)
      const raw = Object.prototype.hasOwnProperty.call(manualScores, answer.questionId)
        ? manualScores[answer.questionId]
        : ''
      if (raw === '' || raw == null) continue
      const value = Number(raw)
      if (!Number.isFinite(value)) continue
      const hasCommitted = Object.prototype.hasOwnProperty.call(committedManualScores, questionKey)
      const edited = hasCommitted
        ? Number(committedManualScores[questionKey]) !== value
        : true
      if (!hasCommitted && !edited) continue
      manualScoreUpdates.push({
        questionId: answer.questionId,
        score: value,
      })
    }

    setSaving(true)
    try {
      await evaluateApplication(appId, {
        answers: payload,
        manualScores: manualScoreUpdates,
      })
      if (stId) {
        await updateAcademyAppStatus(appId, { stId: Number(stId), statusDescr: statusDescr.trim() })
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

  const handleSave = (event) => {
    event.preventDefault()
    if (readOnly || saving) return
    if (!isDirty) {
      showToast.warning('Dikkat', 'Kaydedilecek bir değişiklik yok.')
      return
    }
    setConfirmAction('save')
  }

  // Tek soruya anlık puan.
  const handleSaveManualScore = async (answer) => {
    if (readOnly || saving || savingQuestionId) return
    const questionId = answer.questionId
    const raw = Object.prototype.hasOwnProperty.call(manualScores, questionId)
      ? manualScores[questionId]
      : ''
    if (raw === '' || raw == null) {
      showToast.warning('Dikkat', 'Kaydetmek için bir puan girin. 0 da geçerli bir puandır.')
      return
    }
    const score = Number(raw)
    const maxScore = getManualScoreMax(answer)
    if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      showToast.warning('Dikkat', `Puan 0 ile ${maxScore} arasında olmalıdır.`)
      return
    }
    const saved = isManualScoreSaved(answer, score, committedManualScores)
    if (saved) {
      showToast.warning('Dikkat', 'Kaydedilecek bir değişiklik yok.')
      return
    }

    setSavingQuestionId(questionId)
    try {
      const result = await saveManualScore(appId, { questionId, score })
      const nextManualScores = { ...manualScores, [questionId]: score }
      const nextCommitted = { ...committedManualScores, [String(questionId)]: score }
      const nextDetails = {
        ...details,
        totalScore: result.totalScore,
        answers: (details?.answers || []).map((item) => (
          String(item.questionId) === String(questionId)
            ? { ...item, score, manuallyScored: true }
            : item
        )),
      }
      setManualScores(nextManualScores)
      setCommittedManualScores(nextCommitted)
      setDetails(nextDetails)
      baselineRef.current = snapshotEvaluation({
        scores,
        texts,
        manualScores: nextManualScores,
        stId,
        statusDescr,
        details: nextDetails,
      })
      showToast.success('Başarılı', 'Puan kaydedildi.')
      onSaved?.()
    } catch (error) {
      console.error('Yönetici puanı kaydedilemedi:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Puan kaydedilirken bir hata oluştu.')
    } finally {
      setSavingQuestionId(null)
    }
  }

  const candidateAnswers = sortByFormOrder(filterCandidateQuestions(details?.answers || []))
  const interviewCriteria = sortByFormOrder(details?.interviewCriteria || [])
  const statusOptions = [...statuses]
  if (details?.stId && !statusOptions.some((item) => String(item.stId) === String(details.stId))) {
    statusOptions.unshift({
      stId: details.stId,
      name: details.statusName || details.statusDescr || 'Mevcut durum',
    })
  }
  const selectedStatus = statusOptions.find((item) => String(item.stId) === String(stId))
  const pendingManualCount = candidateAnswers.filter((answer) => {
    const isOpenEnded = isOpenEndedCandidateAnswer(answer)
    const selectedOtherChoice = getSelectedOtherChoice(answer)
    if (!isOpenEnded && !selectedOtherChoice) return false
    return !Object.prototype.hasOwnProperty.call(committedManualScores, String(answer.questionId))
  }).length

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={() => {
        if (historyOpen) return
        requestClose()
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {readOnly ? 'Aday Detayı' : 'Aday Detayı ve Değerlendirme'}
            </h2>
            {details ? (
              <p className="mt-1 text-sm font-medium text-slate-700">{fullName(details)}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Aday bilgileri getiriliyor...</p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
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
              {/* Uni / bölüm / mülakat / toplam */}
              <section className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
                <h3 className="text-sm font-semibold text-slate-800">📊 Puan Özeti</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-xs text-slate-500">Üniversite Puanı</p>
                    <p className="mt-1 text-lg font-bold text-emerald-600">{details?.uniScore ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-xs text-slate-500">Bölüm Puanı</p>
                    <p className="mt-1 text-lg font-bold text-emerald-600">{details?.depScore ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-xs text-slate-500">Mülakat Puanı</p>
                    <p className="mt-1 text-lg font-bold text-orange-600">{details?.interviewScore ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-xs text-slate-500">Toplam Puan</p>
                    <p className="mt-1 text-lg font-bold text-indigo-600">{details?.totalScore ?? 0}</p>
                  </div>
                </div>
              </section>

              {/* Ad, iletişim, üniversite / bölüm puanı */}
              <CollapsibleSection
                title="Kişisel Bilgiler"
                hint={[details?.universityName, details?.departmentName].filter(Boolean).join(' · ') || 'Ad, iletişim, üniversite ve bölüm'}
                open={openSections.personal}
                onToggle={() => toggleSection('personal')}
              >
                <ReadOnlyField label="Ad" value={details?.name} />
                <ReadOnlyField label="Soyad" value={details?.surname} />
                <ReadOnlyField label="E-posta" value={details?.email} />
                <ReadOnlyField label="Telefon" value={details?.phone} />

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-800">Üniversite</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <input
                      readOnly
                      value={details?.universityName || '—'}
                      className={`flex-1 bg-white ${inputClass}`}
                    />
                    <AutoScoreChip score={details?.uniScore ?? 0} />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-800">Bölüm</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <input
                      readOnly
                      value={details?.departmentName || '—'}
                      className={`flex-1 bg-white ${inputClass}`}
                    />
                    <AutoScoreChip score={details?.depScore ?? 0} />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Aday cevapları; açık uçlu / Diğer için manuel puan */}
              <CollapsibleSection
                title="Form Cevapları"
                hint={
                  candidateAnswers.length === 0
                    ? 'Ek form cevabı yok'
                    : `${candidateAnswers.length} Soru${
                      !readOnly && pendingManualCount > 0 ? ` · ${pendingManualCount} puan bekliyor` : ''
                    }`
                }
                open={openSections.answers}
                onToggle={() => toggleSection('answers')}
              >
                {candidateAnswers.length === 0 ? (
                    <p className="text-sm text-slate-500">Bu adaya ait ek form cevabı bulunamadı.</p>
                  ) : (
                    candidateAnswers.map((answer, index) => {
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
                      const needsManual = isOpenEnded || Boolean(selectedOtherChoice)
                      const currentManualScore = Object.prototype.hasOwnProperty.call(manualScores, answer.questionId)
                        ? manualScores[answer.questionId]
                        : ''
                      const manualSaved = needsManual && isManualScoreSaved(
                        answer,
                        currentManualScore,
                        committedManualScores,
                      )
                      const manualMax = getManualScoreMax(answer)
                      const setManualScore = (value) => {
                        setManualScores((prev) => ({
                          ...prev,
                          [answer.questionId]: value,
                        }))
                      }
                      return (
                        <div key={answer.questionId} className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-slate-800">
                              {index + 1}. {answer.questionText}
                            </p>
                            {!needsManual && !dateValue && !fileUrl ? (
                              <AutoScoreChip score={answer.score ?? 0} />
                            ) : null}
                          </div>

                          {dateValue ? (
                            <input
                              type="date"
                              readOnly
                              value={dateValue}
                              className={`mt-3 bg-white ${inputClass}`}
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
                                className={`mt-3 resize-none bg-white ${inputClass}`}
                              />
                              <ManualScoreField
                                maxScore={manualMax}
                                value={currentManualScore}
                                onChange={setManualScore}
                                onSave={() => handleSaveManualScore(answer)}
                                saving={savingQuestionId === answer.questionId}
                                saved={manualSaved}
                                readOnly={readOnly}
                              />
                            </>
                          ) : (
                            <>
                              <div className="mt-3 flex flex-col gap-2">
                                {choices.map((choice) => {
                                  const choiceId = getChoiceId(choice)
                                  const checked = selectedIds.some((id) => String(id) === String(choiceId))
                                  const isOtherChoice = isFlagOn(choice.isOther)
                                  const showOtherText = checked && isOtherChoice
                                  const selectedClass = isOtherChoice
                                    ? (manualSaved
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : 'border-blue-300 bg-blue-50 text-blue-800')
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'

                                  return (
                                    <label
                                      key={choiceId}
                                      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                                        checked
                                          ? selectedClass
                                          : 'border-slate-200 bg-white text-slate-600'
                                      }`}
                                    >
                                      <input
                                        type={isMulti ? 'checkbox' : 'radio'}
                                        name={`candidate-answer-${answer.questionId}`}
                                        checked={checked}
                                        disabled
                                        readOnly
                                        className={`mt-0.5 h-4 w-4 border-slate-300 disabled:opacity-100 ${
                                          isOtherChoice && !manualSaved ? 'text-blue-600' : 'text-emerald-600'
                                        }`}
                                      />
                                      <span className="min-w-0 flex-1">
                                        <span className="font-medium">
                                          {choice.choiceText}
                                          {checked && !isOtherChoice && choice.score != null ? (
                                            <span className="ml-2 text-xs font-semibold text-emerald-700">
                                              (+{choice.score} Puan)
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
                                  value={currentManualScore}
                                  onChange={setManualScore}
                                  onSave={() => handleSaveManualScore(answer)}
                                  saving={savingQuestionId === answer.questionId}
                                  saved={manualSaved}
                                  readOnly={readOnly}
                                />
                              ) : null}
                            </>
                          )}
                        </div>
                      )
                    })
                  )}
              </CollapsibleSection>

              {/* Yönetici mülakat kriterleri */}
              <CollapsibleSection
                title="Mülakat"
                hint={
                  interviewCriteria.length === 0
                    ? 'Kriter yok'
                    : `${interviewCriteria.length} Kriter`
                }
                open={openSections.interview}
                onToggle={() => toggleSection('interview')}
              >
                {interviewCriteria.length === 0 ? (
                    <p className="text-sm text-slate-500">Bu forma ait mülakat kriteri bulunamadı.</p>
                  ) : (
                    interviewCriteria.map((criterion) => {
                      const choices = [...(criterion.choices || [])].sort(
                        (a, b) => (Number(a.ordNo) || 0) - (Number(b.ordNo) || 0),
                      )
                      const renderKind = getInterviewRenderKind(criterion, questionTypes)
                      const hasAutoChoiceScore = renderKind !== 'date' && renderKind !== 'open'
                        && scores[criterion.questionId] != null && scores[criterion.questionId] !== ''
                      const setText = (value) => setTexts((prev) => ({
                        ...prev,
                        [criterion.questionId]: value,
                      }))

                      return (
                        <div
                          key={criterion.questionId}
                          className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-slate-800">{criterion.questionText}</p>
                            {hasAutoChoiceScore ? (
                              <AutoScoreChip
                                score={choices.find((choice) => String(getChoiceId(choice)) === String(scores[criterion.questionId]))?.score ?? 0}
                              />
                            ) : null}
                          </div>

                          {renderKind === 'date' ? (
                            <input
                              type="date"
                              readOnly={readOnly}
                              disabled={readOnly}
                              value={texts[criterion.questionId] || ''}
                              onChange={(event) => {
                                if (readOnly) return
                                setText(event.target.value)
                              }}
                              className={`mt-3 ${readOnly ? 'bg-slate-50' : ''} ${inputClass}`}
                            />
                          ) : renderKind === 'open' ? (
                            <textarea
                              rows="4"
                              readOnly={readOnly}
                              disabled={readOnly}
                              value={texts[criterion.questionId] || ''}
                              onChange={(event) => {
                                if (readOnly) return
                                setText(event.target.value)
                              }}
                              className={`mt-3 resize-none ${readOnly ? 'bg-slate-50' : ''} ${inputClass}`}
                              placeholder={readOnly ? '' : 'Değerlendirmenizi yazın'}
                            />
                          ) : (
                            <div className="mt-3 flex flex-col gap-2">
                              {choices.map((choice) => {
                                const choiceId = getChoiceId(choice)
                                const selected = String(scores[criterion.questionId]) === String(choiceId)

                                return (
                                  <label
                                    key={choiceId}
                                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                                      readOnly ? '' : 'cursor-pointer transition-colors'
                                    } ${
                                      selected
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : `border-slate-200 bg-white text-slate-700 ${readOnly ? '' : 'hover:border-slate-300'}`
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`criterion-${criterion.questionId}`}
                                      value={choiceId}
                                      checked={selected}
                                      disabled={readOnly}
                                      onChange={() => {
                                        if (readOnly) return
                                        setScores((prev) => ({
                                          ...prev,
                                          [criterion.questionId]: choiceId,
                                        }))
                                      }}
                                      className="mt-0.5 h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-100"
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="font-medium">
                                        {choice.choiceText}
                                        {selected && choice.score != null ? (
                                          <span className="ml-2 text-xs font-semibold text-emerald-700">
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
              </CollapsibleSection>

              {/* Başvuru durumu */}
              <CollapsibleSection
                title={readOnly ? 'Durum' : 'Durum Değiştirme'}
                hint={selectedStatus?.name || undefined}
                open={openSections.status}
                onToggle={() => toggleSection('status')}
                headerAction={(
                  <StatusHistoryButton onClick={() => setHistoryOpen(true)} />
                )}
              >
                {readOnly ? (
                  <>
                    <ReadOnlyField label="Durum" value={selectedStatus?.name} />
                    <ReadOnlyField label="Durum açıklaması" value={statusDescr} />
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </CollapsibleSection>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
              {readOnly ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300"
                >
                  Kapat
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={requestClose}
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
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
    {confirmAction === 'cancel' ? (
      <ConfirmDialog
        title="İptal"
        message="Yapılan değişiklikler iptal edilecektir. Emin misiniz?"
        confirmLabel="Evet"
        cancelLabel="Hayır"
        confirmClassName="bg-red-600 text-white hover:bg-red-700"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null)
          onClose()
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
          performSave()
        }}
      />
    ) : null}
    {historyOpen ? (
      <StatusHistoryModal appId={appId} onClose={() => setHistoryOpen(false)} />
    ) : null}
    </>
  )
}

