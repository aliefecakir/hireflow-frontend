// Soru oluştur / düzenle / sil. Kullanımdaysa metin kilitlenir.
import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { getChoiceId, getQuestionKind, isFlagOn, toFlag } from '../api/helpers'
import { showToast } from '../../shared/toast/ToastProvider'
import { ConfirmDialog, createEmptyChoice, inputClass, useEscape } from './ui'

// Dirty check özeti.
function snapshotQuestion({
  questionText,
  tpId,
  isAssmt,
  maxScore,
  choices,
  includeOther,
  otherMaxScore,
}) {
  return JSON.stringify({
    questionText: String(questionText || '').trim(),
    tpId: String(tpId || ''),
    isAssmt: Boolean(isAssmt),
    maxScore: Number(maxScore) || 0,
    includeOther: Boolean(includeOther),
    otherMaxScore: Number(otherMaxScore) || 0,
    choices: (choices || []).map((choice, index) => ({
      id: choice.id ?? null,
      choiceText: String(choice.choiceText || '').trim(),
      score: Number(choice.score) || 0,
      ordNo: index + 1,
    })),
  })
}

const EMPTY_QUESTION_SNAPSHOT = snapshotQuestion({
  questionText: '',
  tpId: '',
  isAssmt: false,
  maxScore: 10,
  choices: [{ id: null, choiceText: '', score: 0 }, { id: null, choiceText: '', score: 0 }],
  includeOther: false,
  otherMaxScore: 10,
})

export default function QuestionModal({ 
  onClose, 
  onSave, 
  onDelete,
  saving, 
  deleting,
  questionTypes, 
  question = null, // Düzenleme modu için
  usage = null // Kullanım bilgisi
}) {
  const isEditMode = Boolean(question)
  // Kullanımda: metin/tip kilit; yeni şık ve puan serbest.
  const canEditContent = !usage || usage.canEditContent
  const canDelete = !usage || usage.canDelete
  const hasExistingOther = Boolean(question?.choices?.find((c) => isFlagOn(c.isOther)))
  const canToggleOther = canEditContent || !hasExistingOther
  const formTitles = (usage?.formTitles || []).filter(Boolean)
  const formTooltip = formTitles.join('\n')
  
  const [questionText, setQuestionText] = useState('')
  const [tpId, setTpId] = useState('')
  const [isAssmt, setIsAssmt] = useState(false)
  const [maxScore, setMaxScore] = useState(10)
  const [choices, setChoices] = useState([createEmptyChoice(1, 1), createEmptyChoice(2, 2)])
  const [includeOther, setIncludeOther] = useState(false)
  const [otherMaxScore, setOtherMaxScore] = useState(10)
  const [confirmAction, setConfirmAction] = useState(null)
  const baselineRef = useRef(EMPTY_QUESTION_SNAPSHOT)
  const pendingPayloadRef = useRef(null)
  const confirmActionRef = useRef(null)
  confirmActionRef.current = confirmAction

  const isDirty = snapshotQuestion({
    questionText,
    tpId,
    isAssmt,
    maxScore,
    choices,
    includeOther,
    otherMaxScore,
  }) !== baselineRef.current

  const requestClose = () => {
    if (confirmAction) return
    if (!isDirty) {
      onClose()
      return
    }
    setConfirmAction('cancel')
  }

  useEscape(() => {
    if (confirmActionRef.current) return
    requestClose()
  })

  // Düzenleme modunda mevcut değerleri yükle
  useEffect(() => {
    if (question) {
      const nextText = question.questionText || ''
      const nextTpId = String(question.tpId || '')
      const nextIsAssmt = isFlagOn(question.isAssmt)
      const nextMaxScore = question.maxScore || 10
      let nextChoices = [createEmptyChoice(1, 1), createEmptyChoice(2, 2)]
      let nextIncludeOther = false
      let nextOtherMax = 10

      if (question.choices && question.choices.length > 0) {
        const otherChoice = question.choices.find((c) => isFlagOn(c.isOther))
        const regularChoices = question.choices.filter((c) => !isFlagOn(c.isOther))

        if (regularChoices.length > 0) {
          nextChoices = regularChoices.map((c, idx) => ({
            key: getChoiceId(c) || idx + 1,
            id: getChoiceId(c),
            choiceText: c.choiceText || '',
            score: c.score ?? 0,
            ordNo: c.ordNo ?? idx + 1,
          }))
        }

        if (otherChoice) {
          nextIncludeOther = true
          nextOtherMax = otherChoice.score ?? 10
        }
      }

      setQuestionText(nextText)
      setTpId(nextTpId)
      setIsAssmt(nextIsAssmt)
      setMaxScore(nextMaxScore)
      setChoices(nextChoices)
      setIncludeOther(nextIncludeOther)
      setOtherMaxScore(nextOtherMax)
      baselineRef.current = snapshotQuestion({
        questionText: nextText,
        tpId: nextTpId,
        isAssmt: nextIsAssmt,
        maxScore: nextMaxScore,
        choices: nextChoices,
        includeOther: nextIncludeOther,
        otherMaxScore: nextOtherMax,
      })
      return
    }

    baselineRef.current = EMPTY_QUESTION_SNAPSHOT
  }, [question])

  const selectedType = questionTypes.find((item) => String(item.id) === String(tpId))
  const kind = selectedType ? getQuestionKind(selectedType, questionTypes) : null
  const isChoiceType = kind === 'single' || kind === 'multi'
  const isOpenType = kind === 'open'
  const isFileType = kind === 'file'
  const isDateType = kind === 'date'
  const isPlainAnswerType = isFileType || isDateType

  const handleTypeChange = (nextTpId) => {
    if (!canEditContent) return
    setTpId(nextTpId)
    const nextType = questionTypes.find((item) => String(item.id) === String(nextTpId))
    const nextKind = nextType ? getQuestionKind(nextType, questionTypes) : null
    if ((nextKind === 'single' || nextKind === 'multi') && choices.length < 2) {
      setChoices([createEmptyChoice(1, 1), createEmptyChoice(2, 2)])
    }
    if (nextKind !== 'single' && nextKind !== 'multi') {
      setIncludeOther(false)
      setOtherMaxScore(10)
    }
  }

  const addChoice = () => {
    setChoices((prev) => [...prev, createEmptyChoice(prev.length + 1)])
  }

  const updateChoice = (key, field, value) => {
    setChoices((prev) =>
      prev.map((choice) => (choice.key === key ? { ...choice, [field]: value } : choice))
    )
  }

  const removeChoice = (key) => {
    const target = choices.find((choice) => choice.key === key)
    if (!canEditContent && target?.id) return
    setChoices((prev) => prev.filter((choice) => choice.key !== key))
  }

  // Şıklar, Diğer, min/max puan → API body.
  const buildPayload = () => {
    if (!tpId || !kind) {
      showToast.warning('Dikkat', 'Soru tipi seçin.')
      return null
    }

    const preparedChoices = isChoiceType
      ? choices
          .map((choice) => ({
            id: choice.id, // Edit modunda mevcut şık id'si
            choiceText: String(choice.choiceText || '').trim(),
            score: Number(choice.score) || 0,
            isOther: 0,
          }))
          .filter((choice) => choice.choiceText)
          .map((choice, index) => ({
            ...choice,
            ordNo: index + 1,
          }))
      : []

    if (isChoiceType && includeOther && !isAssmt) {
      const parsedOtherMax = Number(otherMaxScore)
      if (!Number.isFinite(parsedOtherMax) || parsedOtherMax < 0) {
        showToast.warning('Dikkat', 'Diğer şıkkı için geçerli bir max puan girin.')
        return null
      }

      // Edit modunda mevcut "Diğer" şıkkının id'sini kullan
      const existingOther = question?.choices?.find((c) => isFlagOn(c.isOther))

      preparedChoices.push({
        id: existingOther ? getChoiceId(existingOther) : undefined,
        choiceText: 'Diğer',
        score: parsedOtherMax,
        isOther: 1,
        ordNo: preparedChoices.length + 1,
      })
    }

    if (isChoiceType && preparedChoices.filter((choice) => !choice.isOther).length < 2) {
      showToast.warning('Dikkat', 'Tek seçmeli ve çok seçmeli sorular için en az iki şık girin.')
      return null
    }

    const parsedMaxScore = Number(maxScore)
    if (isOpenType && (!Number.isFinite(parsedMaxScore) || parsedMaxScore < 0)) {
      showToast.warning('Dikkat', 'Açık uçlu soru için geçerli bir max puan girin.')
      return null
    }

    const scores = preparedChoices.map((choice) => choice.score)
    return {
      questionText: canEditContent ? questionText.trim() : undefined,
      tpId: canEditContent ? Number(tpId) : undefined,
      minScore: isChoiceType ? Math.min(0, ...scores) : 0,
      maxScore: isChoiceType ? Math.max(0, ...scores) : (isPlainAnswerType ? 0 : parsedMaxScore),
      isAssmt: canEditContent ? toFlag(isFileType ? false : isAssmt) : undefined,
      choices: preparedChoices,
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (saving) return
    const payload = buildPayload()
    if (!payload) return
    if (!isDirty) {
      showToast.warning('Dikkat', 'Kaydedilecek bir değişiklik yok.')
      return
    }
    pendingPayloadRef.current = payload
    setConfirmAction('save')
  }

  const handleDelete = () => {
    if (!canDelete || !onDelete) return
    if (window.confirm('Bu soruyu silmek istediğinizden emin misiniz?')) {
      onDelete()
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={requestClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEditMode ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEditMode
                ? (canEditContent
                  ? 'Soru hiçbir formda ve cevapta kullanılmıyor, tüm alanları değiştirebilirsiniz.'
                  : 'Soru kullanımda. Yeni şık ekleyebilir ve puanları değiştirebilirsiniz.')
                : 'Soru başlığı oluşturun, soru tipini seçin ve şıkları ekleyin.'
              }
            </p>
            {isEditMode && usage && (usage.formCount > 0 || usage.answerCount > 0) ? (
              <div className="mt-2 space-y-1 text-xs text-amber-700">
                {usage.formCount > 0 ? (
                  <p className="group relative inline-block cursor-help">
                    <span className="underline decoration-dotted underline-offset-2">
                      {usage.formCount} formda kullanılıyor
                    </span>
                    {formTitles.length > 0 ? (
                      <ul
                        role="tooltip"
                        className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 hidden min-w-[14rem] max-w-sm list-none rounded-lg bg-slate-800 px-3 py-2.5 text-left shadow-lg group-hover:block"
                      >
                        {formTitles.map((title, index) => (
                          <li
                            key={`${title}-${index}`}
                            className="flex gap-2 whitespace-nowrap py-0.5 text-xs font-medium leading-5 text-white"
                          >
                            <span className="shrink-0 text-slate-400">{index + 1}.</span>
                            <span>{title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <span className="sr-only">{formTooltip}</span>
                  </p>
                ) : null}
                {usage.answerCount > 0 ? (
                  <p>{usage.answerCount} cevapta kullanılıyor</p>
                ) : null}
              </div>
            ) : null}
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* Metin, tip, amaç, şıklar / max puan / CV-tarih notu */}
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            <label className="block text-sm font-medium text-slate-700">
              Soru Metni
              <textarea
                required
                rows="3"
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                disabled={!canEditContent}
                className={`mt-2 resize-none ${inputClass} ${!canEditContent ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                placeholder="Soruyu yazın."
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Soru Tipi
              <select
                required
                value={tpId}
                onChange={(event) => handleTypeChange(event.target.value)}
                disabled={!canEditContent}
                className={`mt-2 ${inputClass} ${!canEditContent ? 'bg-slate-50 cursor-not-allowed' : ''}`}
              >
                <option value="">Seçiniz</option>
                {questionTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            {questionTypes.length === 0 ? (
              <p className="text-sm text-amber-700">Soru tipleri yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.</p>
            ) : null}

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Soru Amacı</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    !canEditContent ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                  } ${
                    !isAssmt ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="question-purpose"
                    checked={!isAssmt}
                    onChange={() => !canEditContent || setIsAssmt(false)}
                    disabled={!canEditContent}
                    className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <span className="block font-semibold">Aday Sorusu</span>
                    <span className="mt-0.5 block text-xs opacity-80">Başvuru formunda adaya sorulur</span>
                  </span>
                </label>
                <label
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    isFileType || !canEditContent
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                      : isAssmt
                        ? 'cursor-pointer border-orange-300 bg-orange-50 text-orange-800'
                        : 'cursor-pointer border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="question-purpose"
                    checked={isAssmt && !isFileType}
                    disabled={isFileType || !canEditContent}
                    onChange={() => {
                      if (canEditContent) {
                        setIsAssmt(true)
                        setIncludeOther(false)
                      }
                    }}
                    className="mt-0.5 h-4 w-4 text-orange-500 focus:ring-orange-500"
                  />
                  <span>
                    <span className="block font-semibold">Mülakat Kriteri</span>
                    <span className="mt-0.5 block text-xs opacity-80">
                      {isFileType ? 'CV tipi yalnızca aday sorusu olabilir' : 'Yalnızca değerlendirme ekranında görünür'}
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            {isChoiceType ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Şıklar</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {canEditContent
                        ? 'Şık metnini ve puanını girin.'
                        : 'Yeni şık ekleyebilir ve puanları değiştirebilirsiniz. Mevcut şık metinleri değiştirilemez.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addChoice}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700"
                    aria-label="Şık ekle"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 hidden grid-cols-[1fr_7rem_auto] items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
                  <span className="text-left">Şık Metni</span>
                  <span className="text-left">Puan</span>
                  <span className="inline-flex p-2">
                    <span className="sr-only">Sil</span>
                    <span className="h-4 w-4" aria-hidden="true" />                  </span>
                </div>

                <div className="mt-2 space-y-3">
                  {choices.map((choice, index) => {
                    const isExistingChoice = Boolean(choice.id)
                    const choiceTextLocked = !canEditContent && isExistingChoice
                    const choiceRemoveLocked = (!canEditContent && isExistingChoice) || choices.length <= 2
                    return (
                    <div
                      key={choice.key}
                      className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_7rem_auto]"
                    >
                      <input
                        type="text"
                        value={choice.choiceText}
                        onChange={(event) => updateChoice(choice.key, 'choiceText', event.target.value)}
                        disabled={choiceTextLocked}
                        className={`${inputClass} ${choiceTextLocked ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                        placeholder={`${index + 1}. şık metni`}
                      />
                      <input
                        type="number"
                        value={choice.score}
                        onChange={(event) => updateChoice(choice.key, 'score', event.target.value)}
                        className={inputClass}
                        placeholder="Puan"
                        aria-label="Bu şıkkın puanı"
                      />
                      <button
                        type="button"
                        onClick={() => removeChoice(choice.key)}
                        disabled={choiceRemoveLocked}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Şıkkı sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    )
                  })}
                </div>

                {!isAssmt ? (
                  <>
                    <label className={`mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 ${canToggleOther ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                      <input
                        type="checkbox"
                        checked={includeOther}
                        disabled={!canToggleOther}
                        onChange={(event) => setIncludeOther(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>
                        <span className="block font-medium">Diğer şıkkı bulunsun mu?</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          İşaretlenirse soruya “Diğer” şıkkı eklenir. Aday seçince açıklama yazar; puanı değerlendirmede siz verirsiniz.
                        </span>
                      </span>
                    </label>

                    {includeOther ? (
                      <label className="mt-3 block text-sm font-medium text-slate-700">
                        Diğer şıkkı max puanını belirleyin.
                        <input
                          type="number"
                          required
                          min="0"
                          value={otherMaxScore}
                          onChange={(event) => setOtherMaxScore(event.target.value)}
                          className={`mt-2 ${inputClass}`}
                          placeholder="Örn: 10"
                        />
                      </label>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {isOpenType ? (
              <label className="block text-sm font-medium text-slate-700">
                Max Puan
                <input
                  type="number"
                  required
                  min="0"
                  value={maxScore}
                  onChange={(event) => setMaxScore(event.target.value)}
                  className={`mt-2 ${inputClass}`}
                  placeholder="Örn: 10"
                />
              </label>
            ) : null}

            {isFileType ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Başvuru formunda PDF yükleme kutusu görünür. Dosya adresi cevap olarak saklanır.
              </div>
            ) : null}

            {isDateType ? (
              <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                Başvuru formunda form tarihleriyle aynı tarih seçici görünür. Seçilen gün cevap olarak saklanır.
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
            <div>
              {isEditMode && canDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? 'Siliniyor...' : 'Soruyu Sil'}
                </button>
              ) : null}
            </div>
            <div className="flex gap-3">
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
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Kaydediliyor...' : isEditMode ? 'Değişiklikleri Kaydet' : 'Soruyu Kaydet'}
              </button>
            </div>
          </div>
        </form>
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
        onCancel={() => {
          pendingPayloadRef.current = null
          setConfirmAction(null)
        }}
        onConfirm={() => {
          setConfirmAction(null)
          const payload = pendingPayloadRef.current
          pendingPayloadRef.current = null
          if (payload) onSave(payload)
        }}
      />
    ) : null}
    </>
  )
}

