import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, Calendar, GraduationCap } from 'lucide-react'
import { getForms } from '../api/forms'
import { isFlagOn } from '../api/helpers'
import { getErrorMessage } from '../../shared/api/client'
import { showToast } from '../../shared/toast/ToastProvider'

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function LoadingState({ label = 'Yükleniyor...' }) {
  return (
    <div className="text-center">
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
          setForms((Array.isArray(data) ? data : []).filter((form) => form.isActv == null || isFlagOn(form.isActv)))
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Portala Dön
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Akademi
          </span>
        </div>
      </header>

      <main className="flex items-center justify-center px-4 py-24">
        {loading ? (
          <LoadingState />
        ) : forms.length > 0 ? (
          <div className="mx-auto grid w-full max-w-4xl gap-6">
            {forms.map((form) => (
              <article
                key={form.formId}
                className="overflow-hidden rounded-2xl bg-white shadow-md"
              >
                <div className="h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {form.title}
                  </h2>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {form.organizationName ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
                        <Building2 className="h-3.5 w-3.5" />
                        {form.organizationName}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(form.sdate)} – {formatDate(form.edate)}
                    </span>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Link
                      to={`/academy/apply/${form.formId}`}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Hemen Başvur
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
              <GraduationCap className="h-7 w-7 text-blue-600" />
            </span>
            <h1 className="mt-6 text-2xl font-bold text-slate-900">
              Akademi İlanları
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Akademi program ilanları yakında burada listelenecek.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
