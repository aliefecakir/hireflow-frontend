// Yeni üniversite / bölüm kaydı: ad + puan.
import { useState } from 'react'
import { X } from 'lucide-react'
import { getErrorMessage } from '../../shared/api/client'
import { showToast } from '../../shared/toast/ToastProvider'
import { parseScoreInput } from '../api/helpers'
import { inputClass, useEscape } from './ui'

export default function CatalogItemModal({ title, nameLabel, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [score, setScore] = useState('0')
  const [saving, setSaving] = useState(false)

  useEscape(onClose)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      showToast.error('Eksik Bilgi', `${nameLabel} boş olamaz.`)
      return
    }
    const parsedScore = parseScoreInput(score)
    if (parsedScore === null) {
      showToast.error('Geçersiz Puan', 'Puan 0 veya daha büyük bir tam sayı olmalıdır.')
      return
    }

    setSaving(true)
    try {
      await onSubmit({ name: trimmedName, score: parsedScore })
    } catch (error) {
      console.error('Katalog kaydı eklenemedi:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Kayıt eklenirken bir hata oluştu.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">Yeni kayıt aktif olarak eklenir.</p>
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

        <div className="space-y-4 p-6">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{nameLabel}</span>
            <input
              type="text"
              value={name}
              autoFocus
              disabled={saving}
              onChange={(event) => setName(event.target.value)}
              className={`mt-2 disabled:opacity-60 ${inputClass}`}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Puan</span>
            <input
              type="number"
              min="0"
              step="1"
              value={score}
              disabled={saving}
              onChange={(event) => setScore(event.target.value)}
              className={`mt-2 disabled:opacity-60 ${inputClass}`}
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-60"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Ekle'}
          </button>
        </div>
      </form>
    </div>
  )
}
