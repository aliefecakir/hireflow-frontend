// Hakkında: uygulama sürümü, oturum sahibi ve destek adresi.
import { X } from 'lucide-react'
import BrandMark from '../../shared/BrandMark'
import { APP_VERSION } from '../../shared/AppVersion'
import { useAuth } from '../../shared/AuthContext'
import { displayName, useEscape } from './ui'

const SUPPORT_EMAIL = 'destek@hireflow.com'

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-medium text-slate-800">
        {value || '—'}
      </span>
    </div>
  )
}

export default function AboutModal({ onClose }) {
  const { userProfile } = useAuth()
  useEscape(onClose)

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">HireFlow</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                {APP_VERSION}
              </span>
            </div>
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

        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm leading-relaxed text-slate-700">
              HireFlow, şirketler ile yetenekleri buluşturan yeni nesil bir işe alım platformudur.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Kariyer ilanlarını ve akademi programlarını tek noktada toplayarak başvuru süreçlerini
              hızlı ve şeffaf hale getirir.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Oturum Bilgisi
            </p>
            <div className="mt-2 divide-y divide-slate-100">
              <InfoRow label="Kullanıcı" value={displayName(userProfile)} />
              <InfoRow label="E-posta" value={userProfile?.email} />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-6">
          <p className="text-sm text-slate-600">
            Sorun bildirmek veya destek almak için:{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-blue-700 hover:text-blue-800 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
