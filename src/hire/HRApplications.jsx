import { useState, useEffect } from 'react'
import { fetchManagedApplications, updateApplicationStatus } from './api/applications'
import { fetchProfileByUserId } from './api/profile'
import { getErrorMessage } from '../shared/api/client'
import { showToast } from '../shared/toast/ToastProvider'

const FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'WAIT', label: 'Beklemede' },
  { value: 'REVIEW', label: 'İncelemede' },
  { value: 'APPR', label: 'Kabul' },
  { value: 'REJ', label: 'Red' },
]

const STATUS_ACTIONS = [
  {
    shortCode: 'REVIEW',
    label: 'İncelemede',
    className: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    disabledClassName: 'bg-indigo-100 text-indigo-700 cursor-default',
  },
  {
    shortCode: 'APPR',
    label: 'Kabul',
    className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    disabledClassName: 'bg-emerald-100 text-emerald-700 cursor-default',
  },
  {
    shortCode: 'REJ',
    label: 'Red',
    className: 'bg-red-600 hover:bg-red-700 text-white',
    disabledClassName: 'bg-red-100 text-red-700 cursor-default',
  },
]

function normalizeStatusCode(shortCode) {
  const code = (shortCode || '').toUpperCase()
  if (code === 'DISPATCHED') return 'WAIT'
  if (code === 'PROCESS') return 'REVIEW'
  if (code === 'APPRV') return 'APPR'
  if (code === 'RJCTD') return 'REJ'
  return code
}

function formatDate(cdate) {
  if (!cdate) return '—'
  return new Date(cdate).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getFullName(application) {
  if (!application) return 'İsimsiz aday'
  return [application.candidateName, application.candidateSurname].filter(Boolean).join(' ').trim() || 'İsimsiz aday'
}

function getInitials(application) {
  const name = application?.candidateName?.charAt(0) || ''
  const surname = application?.candidateSurname?.charAt(0) || ''
  return `${name}${surname}`.toUpperCase() || '?'
}

function getStatusBadgeClass(shortCode) {
  switch (normalizeStatusCode(shortCode)) {
    case 'APPR':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'REJ':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'REVIEW':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'WAIT':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200'
  }
}

function StatusBadge({ status }) {
  if (!status?.name) {
    return <span className="text-sm text-slate-400">Durum yok</span>
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(status.shrtCode)}`}
    >
      {status.name}
    </span>
  )
}

function CandidateProfileModal({ selectedApp, onClose, onUpdateStatus, updatingStatus }) {
  const [profile, setProfile] = useState(null)
  const [experiences, setExperiences] = useState([])
  const [skills, setSkills] = useState([])
  const [languages, setLanguages] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const candidateEmail = selectedApp?.candidateEmail
  const currentStatus = selectedApp?.status
  const currentShortCode = normalizeStatusCode(currentStatus?.shrtCode)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!selectedApp?.cndtId) return undefined

    let cancelled = false

    const fetchCandidateProfile = async () => {
      try {
        setIsLoading(true)
        setProfile(null)
        setExperiences([])
        setSkills([])
        setLanguages([])

        const detail = await fetchProfileByUserId(selectedApp.cndtId)
        if (cancelled) return

        if (!detail?.profileId) {
          setProfile(null)
          return
        }

        setProfile({
          PROFILE_ID: detail.profileId,
          DEPT: detail.dept,
          EDUCATION: detail.education,
          PHONE: detail.phone,
          PRFL_PHT_URL: detail.prflPhtUrl,
          CV_URL: detail.cvUrl,
        })
        setExperiences(
          (detail.experiences || []).map((experience) => ({
            EXPERIENCE_ID: experience.experienceId,
            CORP_NAME: experience.corpName,
            POSITION: experience.position,
            DESCR: experience.descr,
            STLL_WRKG: experience.stllWrkg,
            SDATE: experience.sdate,
            EDATE: experience.edate,
          }))
        )
        setSkills((detail.skills || []).map((skill) => ({ NAME: skill.name })))
        setLanguages((detail.languages || []).map((lang) => ({ NAME: lang.name })))
      } catch (err) {
        if (cancelled) return
        console.error('Error fetching candidate profile:', err)
        showToast.error('Hata Oluştu', getErrorMessage(err) || 'Aday profili yüklenirken bir hata oluştu.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchCandidateProfile()
    return () => {
      cancelled = true
    }
  }, [selectedApp?.cndtId])

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
                  {isLoading ? '...' : getInitials(selectedApp)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-800 truncate">
                {getFullName(selectedApp)}
              </h2>
              {(candidateEmail || profile?.PHONE) && (
                <p className="text-sm text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  {candidateEmail && (
                    <a href={`mailto:${candidateEmail}`} className="truncate hover:text-blue-700">
                      {candidateEmail}
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
                  onClick={() => onUpdateStatus(selectedApp.appId, action.shortCode)}
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

function JobDetailsModal({ selectedJob, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!selectedJob) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-800">
              {selectedJob.postTitle || 'İlan Başlığı'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              İlan Detayları
            </p>
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
          <section>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Açıklama</h3>
            {selectedJob.postDescr ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedJob.postDescr}
              </p>
            ) : (
              <p className="text-sm text-slate-500">Açıklama eklenmemiş.</p>
            )}
          </section>

          {(selectedJob.postReqTech || selectedJob.postReqDept) && (
            <section>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Gereksinimler</h3>
              <div className="space-y-3">
                {selectedJob.postReqTech && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Teknik Gereksinimler</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {selectedJob.postReqTech}
                    </p>
                  </div>
                )}
                {selectedJob.postReqDept && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Departman</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {selectedJob.postReqDept}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <p className="text-xs text-slate-500">
            İlan ID: <span className="font-mono">{selectedJob.postId}</span>
          </p>
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
  const [selectedJob, setSelectedJob] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setIsLoading(true)

      const data = await fetchManagedApplications()
      setApplications(data || [])
    } catch (err) {
      console.error('Error fetching applications:', err)
      showToast.error('Hata Oluştu', getErrorMessage(err) || 'Başvurular yüklenirken bir hata oluştu.')
      setApplications([])
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (appId, shortCode) => {
    try {
      setUpdatingStatus(shortCode)

      const updated = await updateApplicationStatus(appId, shortCode)

      setApplications((prev) =>
        prev.map((app) => (app.appId === appId ? updated : app))
      )
      setSelectedApp((prev) => (prev && prev.appId === appId ? updated : prev))
      showToast.success('Başarılı', 'Başvuru durumu güncellendi.')
    } catch (err) {
      console.error('Error updating application status:', err)
      showToast.error('Hata Oluştu', getErrorMessage(err) || 'Durum güncellenirken bir hata oluştu.')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const filteredApplications = applications.filter((app) => {
    if (activeFilter === 'ALL') return true
    return normalizeStatusCode(app.status?.shrtCode) === activeFilter
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
                  return (
                    <tr key={application.appId} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedApp(application)}
                          className="text-left font-medium text-blue-700 hover:text-blue-800 hover:underline"
                        >
                          {getFullName(application)}
                        </button>
                        {application.candidateEmail && (
                          <div className="text-xs text-slate-500 mt-0.5">{application.candidateEmail}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedJob(application)}
                          className="text-left font-medium text-blue-700 hover:text-blue-800 hover:underline"
                        >
                          {application.postTitle || 'İlan başlığı yok'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        {formatDate(application.appliedDate)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={application.status} />
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

      {selectedJob && (
        <JobDetailsModal
          selectedJob={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  )
}
