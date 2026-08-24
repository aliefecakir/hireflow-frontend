import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'DISPATCHED', label: 'İşleme Alınmamış' },
  { value: 'PROCESS', label: 'İşleme Alınmış' },
  { value: 'APPRV', label: 'Onaylandı' },
  { value: 'RJCTD', label: 'Reddedildi' },
]

const STATUS_ACTIONS = [
  {
    shortCode: 'PROCESS',
    label: 'İşlemde',
    className: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    disabledClassName: 'bg-indigo-100 text-indigo-700 cursor-default',
  },
  {
    shortCode: 'APPRV',
    label: 'Onayla',
    className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    disabledClassName: 'bg-emerald-100 text-emerald-700 cursor-default',
  },
  {
    shortCode: 'RJCTD',
    label: 'Reddet',
    className: 'bg-red-600 hover:bg-red-700 text-white',
    disabledClassName: 'bg-red-100 text-red-700 cursor-default',
  },
]

function unwrapRelation(value) {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function formatDate(cdate) {
  if (!cdate) return '—'
  return new Date(cdate).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getFullName(user) {
  if (!user) return 'İsimsiz aday'
  return [user.NAME, user.SURNAME].filter(Boolean).join(' ').trim() || 'İsimsiz aday'
}

function getInitials(user) {
  const name = user?.NAME?.charAt(0) || ''
  const surname = user?.SURNAME?.charAt(0) || ''
  return `${name}${surname}`.toUpperCase() || '?'
}

function getStatusBadgeClass(shortCode) {
  switch ((shortCode || '').toUpperCase()) {
    case 'APPRV':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'RJCTD':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'PROCESS':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'WAIT':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200'
  }
}

function StatusBadge({ status }) {
  const row = unwrapRelation(status)
  if (!row?.NAME) {
    return <span className="text-sm text-slate-400">Durum yok</span>
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(row.SHRT_CODE)}`}
    >
      {row.NAME}
    </span>
  )
}

function CandidateProfileModal({ selectedApp, onClose, onUpdateStatus, updatingStatus }) {
  const [profile, setProfile] = useState(null)
  const [experiences, setExperiences] = useState([])
  const [skills, setSkills] = useState([])
  const [languages, setLanguages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const candidate = unwrapRelation(selectedApp?.USER)
  const currentStatus = unwrapRelation(selectedApp?.GNL_ST)
  const currentShortCode = (currentStatus?.SHRT_CODE || '').toUpperCase()

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!selectedApp?.CNDT_ID) return undefined

    let cancelled = false

    const fetchCandidateProfile = async () => {
      try {
        setIsLoading(true)
        setError('')
        setProfile(null)
        setExperiences([])
        setSkills([])
        setLanguages([])

        const { data: profileRow, error: profileError } = await supabase
          .from('PROFILE')
          .select('PROFILE_ID, DEPT, EDUCATION, PHONE, PRFL_PHT_URL, CV_URL')
          .eq('USER_ID', selectedApp.CNDT_ID)
          .maybeSingle()

        if (profileError) throw profileError
        if (cancelled) return

        if (!profileRow?.PROFILE_ID) {
          setProfile(null)
          return
        }

        setProfile(profileRow)

        const [experienceRes, skillRes, languageRes] = await Promise.all([
          supabase
            .from('EXPERIENCE')
            .select('EXPERIENCE_ID, CORP_NAME, POSITION, DESCR, STLL_WRKG, SDATE, EDATE')
            .eq('PROFILE_ID', profileRow.PROFILE_ID)
            .order('CDATE', { ascending: false }),
          supabase
            .from('PRFL_SKILL_REL')
            .select('SKILL_ID, SKILL:SKILL_ID (NAME)')
            .eq('PRFL_ID', profileRow.PROFILE_ID),
          supabase
            .from('PRFL_LANG_REL')
            .select('LANG_ID, LANG:LANG_ID (NAME)')
            .eq('PRFL_ID', profileRow.PROFILE_ID),
        ])

        if (experienceRes.error) throw experienceRes.error
        if (skillRes.error) throw skillRes.error
        if (languageRes.error) throw languageRes.error
        if (cancelled) return

        setExperiences(experienceRes.data || [])
        setSkills(
          (skillRes.data || [])
            .map((row) => unwrapRelation(row.SKILL))
            .filter(Boolean)
        )
        setLanguages(
          (languageRes.data || [])
            .map((row) => unwrapRelation(row.LANG))
            .filter(Boolean)
        )
      } catch (err) {
        if (cancelled) return
        console.error('Error fetching candidate profile:', err)
        setError(err.message || 'Aday profili yüklenirken bir hata oluştu.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchCandidateProfile()
    return () => {
      cancelled = true
    }
  }, [selectedApp?.CNDT_ID])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
              {profile?.PRFL_PHT_URL ? (
                <img
                  src={profile.PRFL_PHT_URL}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-lg">
                  {isLoading ? '...' : getInitials(candidate)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-800 truncate">
                {getFullName(candidate)}
              </h2>
              {(candidate?.EMAIL || profile?.PHONE) && (
                <p className="text-sm text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  {candidate?.EMAIL && (
                    <a href={`mailto:${candidate.EMAIL}`} className="truncate hover:text-blue-700">
                      {candidate.EMAIL}
                    </a>
                  )}
                  {profile?.PHONE && (
                    <a href={`tel:${profile.PHONE}`} className="whitespace-nowrap hover:text-blue-700">
                      {profile.PHONE}
                    </a>
                  )}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                {(profile?.EDUCATION || (!isLoading && profile)) && (
                  <span>
                    <span className="font-medium text-slate-700">Eğitim:</span>{' '}
                    {profile?.EDUCATION || 'Belirtilmemiş'}
                  </span>
                )}
                {(profile?.DEPT || (!isLoading && profile)) && (
                  <span>
                    <span className="font-medium text-slate-700">Departman:</span>{' '}
                    {profile?.DEPT || 'Belirtilmemiş'}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <StatusBadge status={currentStatus} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Kapat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
                <p className="mt-3 text-slate-600 font-medium">Profil yükleniyor...</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-lg px-4 py-3 text-sm font-medium bg-red-50 text-red-800 border border-red-200">
              {error}
            </div>
          ) : !profile ? (
            <div className="text-center py-10">
              <p className="text-slate-600 font-medium">Bu adayın profil bilgisi bulunamadı.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                {profile.CV_URL ? (
                  <a
                    href={profile.CV_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    CV Görüntüle
                  </a>
                ) : (
                  <span className="text-sm text-slate-500">Yüklenmiş bir CV bulunmuyor.</span>
                )}
              </div>

              <section>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Deneyimler</h3>
                {experiences.length === 0 ? (
                  <p className="text-sm text-slate-500">Deneyim bilgisi eklenmemiş.</p>
                ) : (
                  <div className="space-y-3">
                    {experiences.map((experience) => (
                      <div key={experience.EXPERIENCE_ID} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {experience.POSITION} at {experience.CORP_NAME}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {Number(experience.STLL_WRKG) === 1
                            ? `${experience.SDATE || '—'} - Devam Ediyor`
                            : experience.EDATE
                              ? `${experience.SDATE || '—'} - ${experience.EDATE}`
                              : (experience.SDATE || '—')}
                        </p>
                        {experience.DESCR && (
                          <p className="text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                            {experience.DESCR}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Yetenekler</h3>
                {skills.length === 0 ? (
                  <p className="text-sm text-slate-500">Yetenek bilgisi eklenmemiş.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={`${skill.NAME}-${index}`}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                      >
                        {skill.NAME}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Diller</h3>
                {languages.length === 0 ? (
                  <p className="text-sm text-slate-500">Dil bilgisi eklenmemiş.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {languages.map((language, index) => (
                      <span
                        key={`${language.NAME}-${index}`}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"
                      >
                        {language.NAME}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <p className="text-xs font-medium text-slate-500 mb-3">Başvuru durumunu güncelle</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_ACTIONS.map((action) => {
              const isCurrent = currentShortCode === action.shortCode
              const isUpdating = updatingStatus === action.shortCode
              return (
                <button
                  key={action.shortCode}
                  type="button"
                  disabled={isCurrent || Boolean(updatingStatus)}
                  onClick={() => onUpdateStatus(selectedApp.APP_ID, action.shortCode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-80 ${
                    isCurrent ? action.disabledClassName : action.className
                  }`}
                >
                  {isUpdating ? 'Güncelleniyor...' : isCurrent ? `${action.label} (mevcut)` : action.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HRApplications() {
  const [applications, setApplications] = useState([])
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    if (!message.text) return undefined
    const timer = setTimeout(() => setMessage({ type: '', text: '' }), 4000)
    return () => clearTimeout(timer)
  }, [message])

  const fetchApplications = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('APP')
        .select('APP_ID, CDATE, CNDT_ID, POST:POST_ID(TITLE), USER:CNDT_ID(NAME, SURNAME, EMAIL), GNL_ST:ST_ID(NAME, SHRT_CODE)')
        .order('CDATE', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (err) {
      console.error('Error fetching applications:', err)
      setMessage({
        type: 'error',
        text: err.message || 'Başvurular yüklenirken bir hata oluştu.',
      })
      setApplications([])
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (appId, shortCode) => {
    try {
      setUpdatingStatus(shortCode)

      const { data: statusRow, error: statusError } = await supabase
        .from('GNL_ST')
        .select('GNL_ST_ID, NAME, SHRT_CODE')
        .eq('ENT_CODE_NAME', 'APP')
        .eq('SHRT_CODE', shortCode)
        .single()

      if (statusError) throw statusError

      const { error: updateError } = await supabase
        .from('APP')
        .update({ ST_ID: statusRow.GNL_ST_ID })
        .eq('APP_ID', appId)

      if (updateError) throw updateError

      const nextStatus = {
        NAME: statusRow.NAME,
        SHRT_CODE: statusRow.SHRT_CODE,
      }

      setApplications((prev) =>
        prev.map((app) => (app.APP_ID === appId ? { ...app, GNL_ST: nextStatus } : app))
      )
      setSelectedApp((prev) => (prev && prev.APP_ID === appId ? { ...prev, GNL_ST: nextStatus } : prev))
      setMessage({ type: 'success', text: 'Başvuru durumu güncellendi.' })
    } catch (err) {
      console.error('Error updating application status:', err)
      setMessage({
        type: 'error',
        text: err.message || 'Durum güncellenirken bir hata oluştu.',
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const filteredApplications = applications.filter((app) => {
    if (activeFilter === 'ALL') return true
    return unwrapRelation(app.GNL_ST)?.SHRT_CODE === activeFilter
  })

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
        <h1 className="text-2xl font-bold text-slate-800">Başvurular</h1>
        <p className="text-sm text-slate-600 mt-1">Tüm iş başvurularını görüntüleyin ve yönetin</p>
      </div>

      {message.text && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => {
          const isActive = activeFilter === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveFilter(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="text-center py-12 px-6">
            <svg className="h-16 w-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              {applications.length === 0
                ? 'Henüz hiç başvuru bulunmuyor'
                : 'Bu filtreye uygun başvuru bulunamadı.'}
            </h3>
            <p className="text-slate-500">
              {applications.length === 0
                ? 'Adaylar ilanlara başvurduğunda kayıtlar burada listelenecektir.'
                : 'Farklı bir durum filtresi seçerek tekrar deneyin.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left font-semibold text-slate-700 px-5 py-3">Aday</th>
                  <th className="text-left font-semibold text-slate-700 px-5 py-3">Başvurulan İlan</th>
                  <th className="text-left font-semibold text-slate-700 px-5 py-3">Tarih</th>
                  <th className="text-left font-semibold text-slate-700 px-5 py-3">Durum</th>
                  <th className="text-right font-semibold text-slate-700 px-5 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((application) => {
                  const user = unwrapRelation(application.USER)
                  const post = unwrapRelation(application.POST)

                  return (
                    <tr key={application.APP_ID} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">{getFullName(user)}</div>
                        {user?.EMAIL && (
                          <div className="text-xs text-slate-500 mt-0.5">{user.EMAIL}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {post?.TITLE || 'İlan başlığı yok'}
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        {formatDate(application.CDATE)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={application.GNL_ST} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedApp(application)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                          İncele
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedApp && (
        <CandidateProfileModal
          selectedApp={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdateStatus={updateStatus}
          updatingStatus={updatingStatus}
        />
      )}
    </div>
  )
}
