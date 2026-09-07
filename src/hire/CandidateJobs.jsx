import { useState, useEffect } from 'react'
import { useAuth } from '../shared/AuthContext'
import { fetchMyProfile } from './api/profile'
import { fetchActivePosts } from './api/posts'
import { applyToPost } from './api/applications'
import { getErrorMessage } from '../shared/api/client'
import { showToast } from '../shared/toast/ToastProvider'

export default function CandidateJobs() {
  const { user } = useAuth()
  const authUserId = user?.id

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedJobId, setExpandedJobId] = useState(null)
  const [applyingPostId, setApplyingPostId] = useState(null)

  useEffect(() => {
    fetchActiveJobs()
  }, [])

  const fetchActiveJobs = async () => {
    try {
      setLoading(true)
      const data = await fetchActivePosts()
      setJobs(data || [])
    } catch (error) {
      console.error('Error in fetchActiveJobs:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'İlanlar yüklenirken bir hata oluştu.')
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  const toggleDetails = (jobId) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId)
  }

  const handleApply = async (postId) => {
    if (!authUserId || applyingPostId) return

    try {
      setApplyingPostId(postId)

      const profile = await fetchMyProfile()

      if (profile?.isCmpltd !== 1) {
        showToast.warning('Eksik Bilgi', 'Lütfen başvurmadan önce profilinizi %100 tamamlayın.')
        return
      }

      const alreadyApplied = jobs.some((job) => String(job.postId) === String(postId) && job.applied)
      if (alreadyApplied) {
        return
      }

      await applyToPost(postId)

      setJobs((prev) =>
        prev.map((job) =>
          String(job.postId) === String(postId) ? { ...job, applied: true } : job
        )
      )
      showToast.success('Başarılı', 'Başvurunuz alındı')
    } catch (error) {
      console.error('Error applying to job:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Başvuru sırasında bir hata oluştu.')
    } finally {
      setApplyingPostId(null)
    }
  }

  if (loading) {
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
        <h1 className="text-2xl font-bold text-slate-800">İş İlanları</h1>
        <p className="text-sm text-slate-600 mt-1">Aktif iş ilanlarını görüntüleyin ve başvurun</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="h-16 w-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-700 mb-2">Aktif ilan bulunamadı</h3>
            <p className="text-slate-500">Şu anda aktif bir iş ilanı bulunmamaktadır.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Mevcut İlanlar ({jobs.length})</h3>
            {jobs.map((job) => {
              const isExpanded = expandedJobId === job.postId
              const hasApplied = Boolean(job.applied)
              return (
                <div
                  key={job.postId}
                  className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-slate-800 flex-1">
                      {job.title}
                    </h4>
                    <button
                      onClick={() => toggleDetails(job.postId)}
                      className="ml-4 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          </svg>
                          <span>Daralt</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                          <span>Detayları Gör</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className={`text-slate-600 text-sm mb-3 leading-relaxed ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
                    {job.descr}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm">
                    {job.reqTech && (
                      <div className="flex items-center text-slate-600">
                        <svg className="h-4 w-4 mr-1.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        <span className="font-medium text-slate-700">Teknolojiler:</span>
                        <span className="ml-1">{job.reqTech}</span>
                      </div>
                    )}
                    {job.reqDept && (
                      <div className="flex items-center text-slate-600">
                        <svg className="h-4 w-4 mr-1.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="font-medium text-slate-700">Departman:</span>
                        <span className="ml-1">{job.reqDept}</span>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      {hasApplied ? (
                        <button
                          type="button"
                          disabled
                          className="px-6 py-2 bg-slate-300 text-slate-600 font-medium rounded-lg cursor-not-allowed"
                        >
                          Başvuruldu
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApply(job.postId)}
                          disabled={applyingPostId === job.postId}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          {applyingPostId === job.postId ? 'Gönderiliyor...' : 'Başvur'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
