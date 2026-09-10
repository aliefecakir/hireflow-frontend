// Aday ilan listesi: /academy
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, CalendarRange, Clock, GraduationCap } from 'lucide-react'
import { getForms } from '../api/forms'
import {
  canApplyToForm,
  hasFormStarted,
  isFormVisibleToCandidates,
  parseFormDate,
} from '../api/helpers'
import BrandMark from '../../shared/BrandMark'
import { getErrorMessage } from '../../shared/api/client'
import { showToast } from '../../shared/toast/ToastProvider'

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function remainingLabel(form) {
  const now = new Date()
  if (!hasFormStarted(form, now)) {
    return `${formatDate(form.sdate)} tarihinde başlar`
  }
  const end = parseFormDate(form.edate)
  if (!end) return 'Başvuru açık'
  const ms = end.getTime() - now.getTime()
  if (ms <= 0) return 'Başvuru süresi doldu'
  const days = Math.floor(ms / 86_400_000)
  if (days >= 2) return `Başvuru için ${days} gün kaldı`
  if (days === 1) return 'Başvuru için 1 gün kaldı'
  const hours = Math.max(1, Math.floor(ms / 3_600_000))
  return `Başvuru için ${hours} saat kaldı`
}

function LoadingState({ label = 'İlanlar yükleniyor...' }) {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      <p className="mt-4 font-medium text-slate-600">{label}</p>
    </div>
  )
}

export default function Academy() {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadForms = async () => {
      try {
        const data = await getForms()
        if (!cancelled) {
          setForms((Array.isArray(data) ? data : []).filter((form) => isFormVisibleToCandidates(form)))
        }
      } catch (error) {
        console.error('Akademi formları yüklenemedi:', error)
        if (!cancelled) {
          setForms([])
          showToast.error('Hata Oluştu', getErrorMessage(error) || 'Aktif formlar yüklenirken bir hata oluştu.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadForms()
    return () => {
      cancelled = true
    }
  }, [])

  const openCount = useMemo(
    () => forms.filter((form) => canApplyToForm(form)).length,
    [forms],
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Hire<span className="text-blue-600">Flow</span>
            </span>
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Akademi
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-indigo-50 px-6 py-8 sm:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Portala Dön
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Açık Akademi Programları
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Aktif programlara buradan başvurabilirsiniz. Başvuru tarihlerini kontrol edin,
            size uygun ilanı seçin ve formu tamamlayın.
          </p>
          {!loading ? (
            <p className="mt-5 text-sm font-medium text-slate-700">
              {forms.length === 0
                ? 'Şu anda açık program yok.'
                : `${forms.length} Program Listeleniyor${openCount !== forms.length ? ` · ${openCount} Tanesine Şimdi Başvurulabilir` : ''}`}
            </p>
          ) : null}
        </section>

        {loading ? (
          <LoadingState />
        ) : forms.length > 0 ? (
          <div className="mt-8 grid gap-5">
            {forms.map((form) => {
              const open = canApplyToForm(form)
              const description = String(form.descr || '').trim()
              return (
                <article
                  key={form.formId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                  <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-7">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                            open
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {open ? 'Başvuru açık' : 'Yakında başlayacak'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {remainingLabel(form)}
                        </span>
                      </div>
                      <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                        {form.title}
                      </h2>
                      {form.organizationName ? (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {form.organizationName}
                        </p>
                      ) : null}
                      {description ? (
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 line-clamp-3">
                          {description}
                        </p>
                      ) : null}
                      <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        <CalendarRange className="h-4 w-4 text-orange-500" />
                        <span>
                          {formatDate(form.sdate)} – {formatDate(form.edate)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 sm:pt-1">
                      {open ? (
                        <Link
                          to={`/academy/apply/${form.formId}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                        >
                          Hemen Başvur
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span className="inline-flex w-full items-center justify-center rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 sm:w-auto">
                          Başvuru Henüz Başlamadı
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
              <GraduationCap className="h-7 w-7 text-blue-600" />
            </span>
            <h2 className="mt-5 text-xl font-bold text-slate-900">Şu anda açık program yok</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Yeni akademi ilanları yayınlandığında burada görünecek. Daha sonra tekrar bakabilirsiniz.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
