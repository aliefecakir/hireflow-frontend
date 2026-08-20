import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function CandidateJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedJobId, setExpandedJobId] = useState(null)

  useEffect(() => {
    fetchActiveJobs()
  }, [])

  const fetchActiveJobs = async () => {
    try {
      setLoading(true)

      // First, fetch the active status UUID
      const { data: statusData, error: statusError } = await supabase
        .from('GNL_ST')
        .select('GNL_ST_ID')
        .eq('ENT_CODE_NAME', 'POST')
        .ilike('NAME', '%aktif%')
        .single()

      if (statusError) {
        console.error('Error fetching active status:', statusError)
        setLoading(false)
        return
      }

      if (!statusData) {
        console.error('Active status not found')
        setLoading(false)
        return
      }

      // Fetch only active jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('POST')
        .select('*')
        .eq('ST_ID', statusData.GNL_ST_ID)
        .order('CDATE', { ascending: false })

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError)
        setLoading(false)
        return
      }

      setJobs(jobsData || [])
    } catch (error) {
      console.error('Error in fetchActiveJobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDetails = (jobId) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId)
  }

  const handleApply = () => {
    console.log('Başvur clicked')
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">İş İlanları</h1>
        <p className="text-sm text-slate-600 mt-1">Aktif iş ilanlarını görüntüleyin ve başvurun</p>
      </div>

      {/* Job List */}
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
              const isExpanded = expandedJobId === job.POST_ID
              return (
                <div 
                  key={job.POST_ID} 
                  className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-200"
                >
                  {/* Header: Title and Toggle Button */}
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-slate-800 flex-1">
                      {job.TITLE}
                    </h4>
                    <button 
                      onClick={() => toggleDetails(job.POST_ID)}
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

                  {/* Description: Conditionally truncated */}
                  <p className={`text-slate-600 text-sm mb-3 leading-relaxed ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
                    {job.DESCR}
                  </p>

                  {/* Technologies and Department */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {job.REQ_TECH && (
                      <div className="flex items-center text-slate-600">
                        <svg className="h-4 w-4 mr-1.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        <span className="font-medium text-slate-700">Teknolojiler:</span>
                        <span className="ml-1">{job.REQ_TECH}</span>
                      </div>
                    )}
                    {job.REQ_DEPT && (
                      <div className="flex items-center text-slate-600">
                        <svg className="h-4 w-4 mr-1.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="font-medium text-slate-700">Departman:</span>
                        <span className="ml-1">{job.REQ_DEPT}</span>
                      </div>
                    )}
                  </div>

                  {/* Expanded Section: Apply Button Only */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <button
                        onClick={handleApply}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        Başvur
                      </button>
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
