import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { getQuestionKind, toFlag } from '../api/helpers'
import { showToast } from '../../shared/toast/ToastProvider'
import { createEmptyChoice, inputClass, useEscape } from './ui'

export default function QuestionModal({ onClose, onSave, saving, questionTypes }) {
  const [questionText, setQuestionText] = useState('')
  const [tpId, setTpId] = useState('')
  const [isAssmt, setIsAssmt] = useState(false)
  const [maxScore, setMaxScore] = useState(10)
  const [choices, setChoices] = useState([createEmptyChoice(1, 1), createEmptyChoice(2, 2)])
  useEscape(onClose)

  const selectedType = questionTypes.find((item) => String(item.id) === String(tpId))
  const kind = selectedType ? getQuestionKind(selectedType, questionTypes) : null
  const isChoiceType = kind === 'single' || kind === 'multi'
  const isOpenType = kind === 'open'
  const isFileType = kind === 'file'
  const isDateType = kind === 'date'
  const isPlainAnswerType = isFileType || isDateType

  const handleTypeChange = (nextTpId) => {
    setTpId(nextTpId)
    const nextType = questionTypes.find((item) => String(item.id) === String(nextTpId))
    const nextKind = nextType ? getQuestionKind(nextType, questionTypes) : null
    if ((nextKind === 'single' || nextKind === 'multi') && choices.length < 2) {
      setChoices([createEmptyChoice(1, 1), createEmptyChoice(2, 2)])
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
    setChoices((prev) => prev.filter((choice) => choice.key !== key))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (saving) return
    if (!tpId || !kind) {
      showToast.warning('Dikkat', 'Soru tipi seçin.')
      return
    }

    const preparedChoices = isChoiceType
      ? choices
          .map((choice) => ({
            choiceText: String(choice.choiceText || '').trim(),
            score: Number(choice.score) || 0,
            isOther: toFlag(choice.isOther),
          }))
          .filter((choice) => choice.choiceText)
          .map((choice, index) => ({
            ...choice,
            ordNo: index + 1,
          }))
      : []

    if (isChoiceType && preparedChoices.length < 2) {
      showToast.warning('Dikkat', 'Tek seçmeli ve çok seçmeli sorular için en az iki şık girin.')
      return
    }

    const parsedMaxScore = Number(maxScore)
    if (isOpenType && (!Number.isFinite(parsedMaxScore) || parsedMaxScore < 0)) {
      showToast.warning('Dikkat', 'Açık uçlu soru için geçerli bir max puan girin.')
      return
    }

    const scores = preparedChoices.map((choice) => choice.score)
    onSave({
      questionText: questionText.trim(),
      tpId,
      minScore: isChoiceType ? Math.min(0, ...scores) : 0,
      maxScore: isChoiceType ? Math.max(0, ...scores) : (isPlainAnswerType ? 0 : parsedMaxScore),
      isAssmt: toFlag(isFileType ? false : isAssmt),
      choices: preparedChoices,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Yeni Soru Ekle</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tipi seçince şıklar, max puan, tarih veya CV yükleme alanı otomatik açılır.
            </p>
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            <label className="block text-sm font-medium text-slate-700">
              Soru Metni
              <textarea
                required
                rows="3"
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                className={`mt-2 resize-none ${inputClass}`}
                placeholder="Soruyu yazın."
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Soru Tipi
              <select
                required
                value={tpId}
                onChange={(event) => handleTypeChange(event.target.value)}
                className={`mt-2 ${inputClass}`}
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
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    !isAssmt ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="question-purpose"
                    checked={!isAssmt}
                    onChange={() => setIsAssmt(false)}
                    className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <span className="block font-semibold">Aday Sorusu</span>
                    <span className="mt-0.5 block text-xs opacity-80">Başvuru formunda adaya sorulur</span>
                  </span>
                </label>
                <label
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    isFileType
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
                    disabled={isFileType}
                    onChange={() => setIsAssmt(true)}
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
                      Şık metni, puanı ve varsa “Diğer” işaretini girin.
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

                <div className="mt-4 hidden grid-cols-[1fr_7rem_auto_auto] gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
                  <span>Şık Metni</span>
                  <span>Puan</span>
                  <span>Diğer</span>
                  <span className="sr-only">Sil</span>
                </div>

                <div className="mt-2 space-y-3">
                  {choices.map((choice, index) => (
                    <div
                      key={choice.key}
                      className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_7rem_auto_auto]"
                    >
                      <input
                        type="text"
                        value={choice.choiceText}
                        onChange={(event) => updateChoice(choice.key, 'choiceText', event.target.value)}
                        className={inputClass}
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
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={choice.isOther}
                          onChange={(event) => updateChoice(choice.key, 'isOther', event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Diğer (isOther)
                      </label>
                      <button
                        type="button"
                        onClick={() => removeChoice(choice.key)}
                        disabled={choices.length <= 2}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Şıkkı sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
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
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Kaydediliyor...' : 'Soruyu Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
