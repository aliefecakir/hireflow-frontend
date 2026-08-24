import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const STEPS = [
  { id: 1, label: 'Başvuru Alındı' },
  { id: 2, label: 'Değerlendirme' },
  { id: 3, label: 'Sonuç' },
]

function getTimelineState(shortCode) {
  const code = (shortCode || '').toUpperCase()

  if (code === 'APPRV') {
    return { reachedStep: 3, outcome: 'approved' }
  }
  if (code === 'RJCTD') {
    return { reachedStep: 3, outcome: 'rejected' }
  }
  if (code === 'WAIT' || code === 'PROCESS') {
    return { reachedStep: 2, outcome: null }
  }
  return { reachedStep: 1, outcome: null }
}

function formatApplicationDate(cdate) {
  if (!cdate) return ''
  return new Date(cdate).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function unwrapRelation(value) {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

const STATUS_VISUALS = {
  DISPATCHED: {
    title: 'Başvuru Alındı',
    caption: 'Başvurunuz sisteme ulaştı ve kayda alındı.',
    panel: 'from-sky-50 to-blue-100 border-blue-200',
    accent: 'text-blue-700',
  },
  WAIT: {
    title: 'Sırada Bekliyor',
    caption: 'Başvurunuz değerlendirme sırasını bekliyor.',
    panel: 'from-amber-50 to-orange-100 border-amber-200',
    accent: 'text-amber-800',
  },
  PROCESS: {
    title: 'Değerlendiriliyor',
    caption: 'Başvurunuz inceleme ve değerlendirme sürecinde.',
    panel: 'from-indigo-50 to-violet-100 border-indigo-200',
    accent: 'text-indigo-800',
  },
  APPRV: {
    title: 'Onaylandı',
    caption: 'Tebrikler! Başvurunuz olumlu sonuçlandı.',
    panel: 'from-emerald-50 to-green-100 border-emerald-200',
    accent: 'text-emerald-800',
  },
  RJCTD: {
    title: 'Sonuçlanmadı',
    caption: 'Başvurunuz bu ilan için olumlu sonuçlanmadı.',
    panel: 'from-rose-50 to-red-100 border-rose-200',
    accent: 'text-red-800',
  },
}

function VisualDispatched() {
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" className="fill-blue-100" />
      <rect x="18" y="42" width="44" height="18" rx="4" className="fill-blue-500" />
      <path d="M18 46.5 L40 58 L62 46.5" className="stroke-blue-200" strokeWidth="2.5" fill="none" />
      <rect x="28" y="14" width="24" height="32" rx="3" className="fill-white stroke-blue-600" strokeWidth="2" />
      <path d="M33 24h14M33 30h14M33 36h8" className="stroke-blue-400" strokeWidth="2" strokeLinecap="round" />
      <path d="M52 22l8-6 2 8" className="stroke-sky-500" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function VisualWait() {
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" className="fill-amber-100" />
      <path d="M28 18h24v8c0 8-7 12-12 16-5-4-12-8-12-16V18z" className="fill-amber-400" />
      <path d="M28 62h24v-8c0-8-7-12-12-16-5 4-12 8-12 16v8z" className="fill-amber-500" />
      <rect x="26" y="16" width="28" height="5" rx="2" className="fill-amber-700" />
      <rect x="26" y="59" width="28" height="5" rx="2" className="fill-amber-700" />
      <circle cx="40" cy="28" r="3" className="fill-white" />
      <path d="M34 48c2 3 10 3 12 0" className="stroke-amber-100" strokeWidth="2" fill="none" />
    </svg>
  )
}

function VisualProcess() {
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" className="fill-indigo-100" />
      <rect x="16" y="18" width="30" height="40" rx="3" className="fill-white stroke-indigo-500" strokeWidth="2" />
      <path d="M22 28h18M22 34h18M22 40h12" className="stroke-indigo-300" strokeWidth="2" strokeLinecap="round" />
      <circle cx="52" cy="48" r="12" className="fill-indigo-500/20 stroke-indigo-600" strokeWidth="3" />
      <path d="M60 57l8 8" className="stroke-indigo-700" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

function VisualApproved() {
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" className="fill-emerald-100" />
      <path d="M28 30h24v6c0 10-6 16-12 22-6-6-12-12-12-22v-6z" className="fill-emerald-500" />
      <rect x="26" y="26" width="28" height="7" rx="3" className="fill-emerald-700" />
      <circle cx="40" cy="22" r="5" className="fill-amber-400" />
      <path d="M16 24l6 3M64 24l-6 3M18 48h-6M68 48h-6" className="stroke-emerald-400" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="40" cy="62" rx="10" ry="3" className="fill-emerald-300" />
    </svg>
  )
}

function VisualRejected() {
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" className="fill-rose-100" />
      <rect x="22" y="16" width="28" height="38" rx="3" className="fill-white stroke-rose-400" strokeWidth="2" />
      <path d="M28 26h16M28 32h16M28 38h10" className="stroke-rose-200" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="50" r="14" className="fill-red-500" />
      <path d="M44 44l12 12M56 44L44 56" className="stroke-white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function VisualResultPending() {
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full" aria-hidden="true">
      <circle cx="40" cy="40" r="36" className="fill-gray-100" />
      <rect x="24" y="16" width="32" height="42" rx="4" className="fill-white stroke-gray-300" strokeWidth="2" />
      <circle cx="40" cy="36" r="8" className="stroke-gray-400" strokeWidth="2.5" fill="none" />
      <path d="M40 32v5l3 3" className="stroke-gray-400" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="50" r="1.8" className="fill-gray-400" />
    </svg>
  )
}

function getStatusVisual(shortCode) {
  const code = (shortCode || 'DISPATCHED').toUpperCase()
  return STATUS_VISUALS[code] || STATUS_VISUALS.DISPATCHED
}

function StatusIllustration({ shortCode, className = 'w-20 h-20' }) {
  const code = (shortCode || 'DISPATCHED').toUpperCase()
  const visuals = {
    DISPATCHED: <VisualDispatched />,
    WAIT: <VisualWait />,
    PROCESS: <VisualProcess />,
    APPRV: <VisualApproved />,
    RJCTD: <VisualRejected />,
  }

  return <div className={className}>{visuals[code] || <VisualDispatched />}</div>
}

function StepIllustration({ stepId, shortCode }) {
  const code = (shortCode || 'DISPATCHED').toUpperCase()
  const { reachedStep, outcome } = getTimelineState(code)

  if (stepId === 1) return <VisualDispatched />
  if (stepId === 2) {
    if (code === 'WAIT' && reachedStep === 2) return <VisualWait />
    return <VisualProcess />
  }
  if (outcome === 'approved') return <VisualApproved />
  if (outcome === 'rejected') return <VisualRejected />
  return <VisualResultPending />
}

function StatusSpotlight({ shortCode, statusName, statusDescr }) {
  const code = (shortCode || 'DISPATCHED').toUpperCase()
  const visual = getStatusVisual(code)

  return (
    <div className={`flex items-center gap-4 rounded-xl border bg-gradient-to-r p-4 ${visual.panel}`}>
      <StatusIllustration shortCode={code} className="w-16 h-16 sm:w-20 sm:h-20 shrink-0" />
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${visual.accent}`}>
          {statusName || visual.title}
        </p>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
          {statusDescr || visual.caption}
        </p>
      </div>
    </div>
  )
}

function StatusTimeline({ shortCode }) {
  const code = (shortCode || 'DISPATCHED').toUpperCase()
  const { reachedStep, outcome } = getTimelineState(code)

  const getFrameClass = (stepId) => {
    const isCurrent = stepId === reachedStep
    if (stepId > reachedStep) return 'bg-gray-100 border-gray-200 opacity-50'
    if (stepId === 3 && outcome === 'approved') {
      return `bg-emerald-50 border-emerald-300 ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`
    }
    if (stepId === 3 && outcome === 'rejected') {
      return `bg-rose-50 border-rose-300 ${isCurrent ? 'ring-4 ring-rose-100' : ''}`
    }
    if (code === 'WAIT' && stepId === 2) {
      return `bg-amber-50 border-amber-300 ${isCurrent ? 'ring-4 ring-amber-100' : ''}`
    }
    if (code === 'PROCESS' && stepId === 2) {
      return `bg-indigo-50 border-indigo-300 ${isCurrent ? 'ring-4 ring-indigo-100' : ''}`
    }
    return `bg-blue-50 border-blue-300 ${isCurrent ? 'ring-4 ring-blue-100' : ''}`
  }

  const getLineClass = (fromStep) => {
    if (reachedStep <= fromStep) return 'bg-gray-200'
    if (outcome === 'approved') return 'bg-green-500'
    if (outcome === 'rejected') return 'bg-red-500'
    return 'bg-blue-500'
  }

  const getLabelClass = (stepId) => {
    if (stepId > reachedStep) return 'text-gray-400'
    if (stepId === 3 && outcome === 'approved') return 'text-green-700'
    if (stepId === 3 && outcome === 'rejected') return 'text-red-700'
    if (code === 'WAIT' && stepId === 2) return 'text-amber-700'
    if (code === 'PROCESS' && stepId === 2) return 'text-indigo-700'
    return 'text-blue-700'
  }

  const getStepLabel = (step) => {
    if (step.id === 2 && code === 'WAIT') return 'Sırada'
    if (step.id === 2 && code === 'PROCESS') return 'İncelemede'
    if (step.id === 3 && outcome === 'approved') return 'Onaylandı'
    if (step.id === 3 && outcome === 'rejected') return 'Olumsuz'
    return step.label
  }

  return (
    <div className="w-full pt-1">
      <div className="flex items-start">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center w-24 sm:w-28">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center p-1.5 ${getFrameClass(step.id)}`}
              >
                <StepIllustration stepId={step.id} shortCode={code} />
              </div>
              <span className={`mt-2 text-center text-xs font-semibold leading-tight ${getLabelClass(step.id)}`}>
                {getStepLabel(step)}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`h-1.5 flex-1 rounded-full mt-7 sm:mt-8 ${getLineClass(step.id)}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CandidateApplications() {
  const { user } = useAuth()
  const authUserId = user?.id

  const [applications, setApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authUserId) return
    fetchApplications(authUserId)
  }, [authUserId])

  const fetchApplications = async (userId) => {
    try {
      setIsLoading(true)
      setError('')

      const { data, error: fetchError } = await supabase
        .from('APP')
        .select('APP_ID, CDATE, POST:POST_ID (TITLE, DESCR, REQ_DEPT, REQ_TECH), GNL_ST:ST_ID (NAME, SHRT_CODE, DESCR)')
        .eq('CNDT_ID', userId)
        .order('CDATE', { ascending: false })

      if (fetchError) throw fetchError

      setApplications(data || [])
    } catch (err) {
      console.error('Error fetching applications:', err)
      setError(err.message || 'Başvurular yüklenirken bir hata oluştu.')
      setApplications([])
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
          <p className="mt-4 text-slate-600 font-medium">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Başvurularım</h1>
        <p className="text-sm text-slate-600 mt-1">Yaptığınız iş başvurularını ve durumlarını görüntüleyin</p>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm font-medium bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center py-12">
            <svg className="h-16 w-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-700 mb-2">Henüz bir başvurunuz bulunmamaktadır</h3>
            <p className="text-slate-500">Aktif ilanlara başvurduğunuzda süreç burada görünecektir.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => {
            const post = unwrapRelation(application.POST)
            const status = unwrapRelation(application.GNL_ST)

            return (
              <div
                key={application.APP_ID}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {post?.TITLE || 'İlan başlığı yok'}
                    </h3>
                    {post?.DESCR && (
                      <p className="text-slate-600 text-sm mt-2 leading-relaxed whitespace-pre-wrap">
                        {post.DESCR}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                      {post?.REQ_DEPT && (
                        <div className="flex items-center">
                          <svg className="h-4 w-4 mr-1.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="font-medium text-slate-700">Departman:</span>
                          <span className="ml-1">{post.REQ_DEPT}</span>
                        </div>
                      )}
                      {post?.REQ_TECH && (
                        <div className="flex items-center">
                          <svg className="h-4 w-4 mr-1.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          <span className="font-medium text-slate-700">Teknolojiler:</span>
                          <span className="ml-1">{post.REQ_TECH}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                    <span className="text-sm text-slate-500">
                      {formatApplicationDate(application.CDATE)}
                    </span>
                    {status?.NAME && (
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          status.SHRT_CODE === 'APPRV'
                            ? 'bg-green-50 text-green-700'
                            : status.SHRT_CODE === 'RJCTD'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {status.NAME}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <StatusSpotlight
                    shortCode={status?.SHRT_CODE}
                    statusName={status?.NAME}
                    statusDescr={status?.DESCR}
                  />
                  <StatusTimeline shortCode={status?.SHRT_CODE} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
