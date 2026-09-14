import { useEffect, useState } from 'react'
import { Clock, X } from 'lucide-react'
import { getApplicationStatusHistory } from '../api/applications'
import { getErrorMessage } from '../../shared/api/client'
import { formatDate, LoadingState, useEscape } from './ui'

export function StatusHistoryButton({ onClick, label = 'Durum geçmişi' }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick?.(event)
      }}
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
    >
      <Clock className="h-4 w-4" />
    </button>
  )
}

export default function StatusHistoryModal({ appId, onClose }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEscape(onClose)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await getApplicationStatusHistory(appId)
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) {
          setRows([])
          setError(getErrorMessage(err) || 'Durum geçmişi yüklenirken bir hata oluştu.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [appId])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Durum Geçmişi</h2>
            <p className="mt-1 text-sm text-slate-500">Bu başvurunun durum değişiklikleri.</p>
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
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <LoadingState label="Geçmiş yükleniyor..." />
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">Bu başvuru için henüz durum değişikliği kaydı yok.</p>
          ) : (
            <ol className="space-y-3">
              {rows.map((row) => (
                <li
                  key={row.academyAppStHstrId}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {row.prevStatusName ? (
                      <>
                        {row.prevStatusName}
                        <span className="mx-2 font-normal text-slate-400">→</span>
                        {row.statusName || '—'}
                      </>
                    ) : (
                      row.statusName || '—'
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(row.changedAt)}</p>
                  {row.changedByName ? (
                    <p className="mt-1 text-xs text-slate-500">{row.changedByName}</p>
                  ) : null}
                  {row.changeReason ? (
                    <p className="mt-2 text-sm text-slate-600">{row.changeReason}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
