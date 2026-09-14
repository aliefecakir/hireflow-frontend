// Listeden hızlı durum + açıklama güncelleme.
import { useState } from 'react'
import { X } from 'lucide-react'
import { fullName, inputClass, useEscape } from './ui'
import StatusHistoryModal, { StatusHistoryButton } from './StatusHistoryModal'

export default function StatusModal({ application, statuses, saving, onClose, onSave }) {
  const [stId, setStId] = useState(application?.stId ? String(application.stId) : '')
  const [statusDescr, setStatusDescr] = useState(application?.statusDescr || '')
  const [historyOpen, setHistoryOpen] = useState(false)
  useEscape(() => {
    if (historyOpen) return
    onClose()
  })

  // Katalogda yoksa mevcut durumu options'a ekle.
  const options = [...statuses]
  if (application?.stId && !options.some((item) => String(item.stId) === String(application.stId))) {
    options.unshift({
      stId: application.stId,
      name: application.statusName || application.statusDescr || 'Mevcut durum',
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!stId || saving) return
    onSave({ stId: Number(stId), statusDescr: statusDescr.trim() })
  }

  return (
    <>
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={() => {
        if (!historyOpen) onClose()
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Durum Güncelle</h2>
            <p className="mt-1 text-sm text-slate-500">
              {fullName(application)} için durum ve açıklama girin.
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

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Durum</span>
                {application?.academyAppId ? (
                  <StatusHistoryButton onClick={() => setHistoryOpen(true)} />
                ) : null}
              </div>
              <select
                required
                value={stId}
                onChange={(event) => setStId(event.target.value)}
                className={`mt-2 ${inputClass}`}
              >
                <option value="">Seçiniz</option>
                {options.map((item) => (
                  <option key={item.stId} value={item.stId}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Durum açıklaması
              <textarea
                rows="3"
                value={statusDescr}
                onChange={(event) => setStatusDescr(event.target.value)}
                className={`mt-2 resize-none ${inputClass}`}
                placeholder="Açıklama yazın"
              />
            </label>
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
              disabled={saving || !stId}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
    {historyOpen && application?.academyAppId ? (
      <StatusHistoryModal
        appId={application.academyAppId}
        onClose={() => setHistoryOpen(false)}
      />
    ) : null}
    </>
  )
}
