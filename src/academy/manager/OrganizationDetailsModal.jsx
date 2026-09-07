import { X } from 'lucide-react'
import { isFlagOn } from '../api/helpers'
import { LoadingState, Switch, useEscape } from './ui'

export default function OrganizationDetailsModal({ organizations, loading, savingId, onClose, onToggle }) {
  useEscape(onClose)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Organizasyon Detayı</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pasif organizasyonlar form seçim listesinde görünmez.
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

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <LoadingState label="Organizasyonlar yükleniyor..." />
          ) : organizations.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz organizasyon yok.</p>
          ) : (
            <ul className="space-y-3">
              {organizations.map((org) => {
                const active = isFlagOn(org.isActv)
                const busy = String(savingId) === String(org.id)
                return (
                  <li
                    key={org.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{org.name}</p>
                      {org.descr ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">{org.descr}</p>
                      ) : (
                        <p className="mt-0.5 text-xs text-slate-500">{active ? 'Aktif' : 'Pasif'}</p>
                      )}
                    </div>
                    <Switch
                      checked={active}
                      disabled={busy}
                      onChange={(next) => onToggle(org, next)}
                      label={active ? 'Aktif' : 'Pasif'}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
