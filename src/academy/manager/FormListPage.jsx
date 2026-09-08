// Form listesi: ara, başvurulara git, düzenle.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarRange, Pencil, Search } from 'lucide-react'
import { getForms } from '../api/forms'
import { isFormVisibleToCandidates } from '../api/helpers'
import { getErrorMessage } from '../../shared/api/client'
import { showToast } from '../../shared/toast/ToastProvider'
import { formatDate, inputClass, LoadingState } from './ui'

export default function FormListPage() {
  const navigate = useNavigate()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Aktif + pasif tüm formlar.
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await getForms({ includeInactive: true })
        if (!cancelled) {
          setForms(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Akademi formları yüklenemedi:', error)
        if (!cancelled) {
          setForms([])
          showToast.error('Hata Oluştu', getErrorMessage(error) || 'Akademi formları yüklenirken bir hata oluştu.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Başlığa göre TR arama.
  const filteredForms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR')
    if (!query) return forms
    return forms.filter((form) => String(form.title || '').toLocaleLowerCase('tr-TR').includes(query))
  }, [forms, search])

  if (loading) {
    return <LoadingState label="Formlar yükleniyor..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Akademi Formları</h1>
        <p className="mt-1 text-sm text-slate-600">
          Forma tıklayarak başvuruları görüntüleyin.
        </p>
        <label className="relative mt-4 block w-full sm:w-[calc((100%-1.5rem)/2)] xl:w-[calc((100%-3rem)/3)]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Form adına göre ara"
            className={`pl-9 ${inputClass}`}
            aria-label="Form adına göre ara"
          />
        </label>
      </div>

      {forms.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Akademi formu bulunamadı.
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Bu ada uyan form bulunamadı.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredForms.map((form) => {
            const active = isFormVisibleToCandidates(form)
            // Kart tık → başvurular; kalem → düzenle
            return (
              <div
                key={form.formId}
                className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                onClick={() => navigate(`/academy/manager/forms/${form.formId}/applications`, { state: { form } })}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold tracking-tight text-slate-800 group-hover:text-blue-700">
                    {form.title}
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/academy/manager/forms/${form.formId}/edit`)
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 opacity-0 transition-all hover:bg-blue-50 hover:text-blue-700 group-hover:opacity-100"
                      aria-label="Düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                        active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-100 text-slate-600'
                      }`}
                    >
                      {active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
                {form.organizationName ? (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{form.organizationName}</p>
                ) : null}
                <div className="mt-5">
                  <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <CalendarRange className="h-4 w-4 text-orange-500" />
                    {formatDate(form.sdate)} – {formatDate(form.edate)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
