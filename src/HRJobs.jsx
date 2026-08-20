import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function HRJobs() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [statuses, setStatuses] = useState([])
  const [jobs, setJobs] = useState([])
  const [editingJob, setEditingJob] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    descr: '',
    reqTech: '',
    reqDept: '',
    stId: '',
  })

  useEffect(() => {
    fetchStatuses()
    fetchJobs()
  }, [])

  const fetchStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('GNL_ST')
        .select('GNL_ST_ID, NAME')
        .eq('ENT_CODE_NAME', 'POST')

      if (error) {
        console.error('Error fetching statuses:', error)
        return
      }

      setStatuses(data || [])
      
      if (data && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          stId: data[0].GNL_ST_ID
        }))
      }
    } catch (error) {
      console.error('Error fetching statuses:', error)
    }
  }

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('POST')
        .select('*')
        .order('CDATE', { ascending: false })

      if (error) {
        console.error('Error fetching jobs:', error)
        return
      }

      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      title: '',
      descr: '',
      reqTech: '',
      reqDept: '',
      stId: statuses.length > 0 ? statuses[0].GNL_ST_ID : '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (editingJob) {
        // Update existing job
        const updatedData = {
          TITLE: formData.title,
          DESCR: formData.descr,
          REQ_TECH: formData.reqTech || null,
          REQ_DEPT: formData.reqDept || null,
          ST_ID: formData.stId || null,
        }

        const { error: updateError } = await supabase
          .from('POST')
          .update(updatedData)
          .eq('POST_ID', editingJob.POST_ID)

        if (updateError) {
          throw updateError
        }

        setMessage({ 
          type: 'success', 
          text: 'İlan başarıyla güncellendi!' 
        })
        setEditingJob(null)
      } else {
        // Create new job
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          throw new Error('Kullanıcı bilgisi alınamadı')
        }

        const postData = {
          TITLE: formData.title,
          DESCR: formData.descr,
          REQ_TECH: formData.reqTech || null,
          REQ_DEPT: formData.reqDept || null,
          ST_ID: formData.stId || null,
          CUSER: user.id,
        }

        const { error: insertError } = await supabase
          .from('POST')
          .insert([postData])

        if (insertError) {
          throw insertError
        }

        setMessage({ 
          type: 'success', 
          text: 'İlan başarıyla oluşturuldu!' 
        })
      }
      
      resetForm()
      fetchJobs()
      
      setTimeout(() => {
        setShowAddForm(false)
        setEditingJob(null)
        setMessage({ type: '', text: '' })
      }, 2000)

    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.message || 'İşlem sırasında bir hata oluştu.' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (job) => {
    setEditingJob(job)
    setFormData({
      title: job.TITLE,
      descr: job.DESCR,
      reqTech: job.REQ_TECH || '',
      reqDept: job.REQ_DEPT || '',
      stId: job.ST_ID || (statuses.length > 0 ? statuses[0].GNL_ST_ID : ''),
    })
    setShowAddForm(false)
    setMessage({ type: '', text: '' })
  }

  const toggleJobStatus = async (postId, currentStId) => {
    try {
      const currentStatus = statuses.find(s => s.GNL_ST_ID === currentStId)
      
      let targetStatus
      if (currentStatus && currentStatus.NAME.toLowerCase().includes('aktif')) {
        targetStatus = statuses.find(s => s.NAME.toLowerCase().includes('pasif'))
      } else {
        targetStatus = statuses.find(s => s.NAME.toLowerCase().includes('aktif'))
      }

      if (!targetStatus) {
        console.error('Hedef durum bulunamadı')
        return
      }

      const { error } = await supabase
        .from('POST')
        .update({ ST_ID: targetStatus.GNL_ST_ID })
        .eq('POST_ID', postId)

      if (error) {
        throw error
      }

      fetchJobs()
    } catch (error) {
      console.error('Durum değiştirme hatası:', error)
    }
  }

  const getStatusToggleText = (stId) => {
    const status = statuses.find(s => s.GNL_ST_ID === stId)
    if (!status) return 'Durum Değiştir'
    
    if (status.NAME.toLowerCase().includes('aktif')) {
      return 'Pasife Al'
    } else {
      return 'Aktif Et'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Job Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">İlan Yönetimi</h1>
          <p className="text-sm text-slate-600 mt-1">İş ilanlarınızı oluşturun ve yönetin</p>
        </div>
        <button 
          onClick={() => {
            if (showAddForm) {
              setShowAddForm(false)
              resetForm()
            } else {
              setShowAddForm(true)
              setEditingJob(null)
              resetForm()
            }
          }}
          disabled={editingJob !== null}
          className={`flex items-center space-x-2 px-4 py-2 font-medium rounded-lg shadow-sm transition-all duration-200 ${
            editingJob !== null
              ? 'bg-blue-400 text-white opacity-50 cursor-not-allowed pointer-events-none'
              : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{showAddForm ? 'Formu Kapat' : 'İlan Ekle'}</span>
        </button>
      </div>

      {/* Add Job Form */}
      {showAddForm && !editingJob && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Yeni İlan Oluştur</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Job Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
                İlan Başlığı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Senior Yazılım Geliştirici"
              />
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="descr" className="block text-sm font-medium text-slate-700 mb-2">
                İlan Açıklaması <span className="text-red-500">*</span>
              </label>
              <textarea
                id="descr"
                name="descr"
                required
                value={formData.descr}
                onChange={handleInputChange}
                rows="5"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="İş tanımı, sorumluluklar ve gereksinimler..."
              />
            </div>

            {/* Required Technologies */}
            <div>
              <label htmlFor="reqTech" className="block text-sm font-medium text-slate-700 mb-2">
                Gerekli Teknolojiler
              </label>
              <input
                type="text"
                id="reqTech"
                name="reqTech"
                value={formData.reqTech}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: React, Node.js, PostgreSQL"
              />
            </div>

            {/* Department */}
            <div>
              <label htmlFor="reqDept" className="block text-sm font-medium text-slate-700 mb-2">
                Departman
              </label>
              <input
                type="text"
                id="reqDept"
                name="reqDept"
                value={formData.reqDept}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Yazılım Geliştirme"
              />
            </div>

            {/* Job Status */}
            <div>
              <label htmlFor="stId" className="block text-sm font-medium text-slate-700 mb-2">
                İlan Durumu
              </label>
              <select
                id="stId"
                name="stId"
                value={formData.stId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Durum Seçiniz</option>
                {statuses.map((status) => (
                  <option key={status.GNL_ST_ID} value={status.GNL_ST_ID}>
                    {status.NAME}
                  </option>
                ))}
              </select>
            </div>

            {/* Message Display */}
            {message.text && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Kaydediliyor...' : 'İlanı Kaydet'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  resetForm()
                  setMessage({ type: '', text: '' })
                }}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Job List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="h-16 w-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-700 mb-2">İlanlar burada listelenecek</h3>
            <p className="text-slate-500">Henüz hiç ilan eklenmemiş. Yukarıdaki butonu kullanarak yeni ilan ekleyebilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Aktif İlanlar ({jobs.length})</h3>
            {jobs.map((job) => (
              <div key={job.POST_ID}>
                <div 
                  className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-800 mb-2">
                        {job.TITLE}
                      </h4>
                      <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                        {job.DESCR.length > 150 
                          ? `${job.DESCR.substring(0, 150)}...` 
                          : job.DESCR}
                      </p>
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
                    </div>
                    <div className="ml-4 flex flex-col items-end space-y-2">
                      <button 
                        onClick={() => handleEdit(job)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Düzenle
                      </button>
                      <button 
                        onClick={() => toggleJobStatus(job.POST_ID, job.ST_ID)}
                        className="text-amber-600 hover:text-amber-700 font-medium text-sm"
                      >
                        {getStatusToggleText(job.ST_ID)}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Edit Form */}
                {editingJob && editingJob.POST_ID === job.POST_ID && (
                  <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-6 mt-4">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6">İlan Düzenle</h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Job Title */}
                      <div>
                        <label htmlFor="edit-title" className="block text-sm font-medium text-slate-700 mb-2">
                          İlan Başlığı <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="edit-title"
                          name="title"
                          required
                          value={formData.title}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Örn: Senior Yazılım Geliştirici"
                        />
                      </div>

                      {/* Job Description */}
                      <div>
                        <label htmlFor="edit-descr" className="block text-sm font-medium text-slate-700 mb-2">
                          İlan Açıklaması <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="edit-descr"
                          name="descr"
                          required
                          value={formData.descr}
                          onChange={handleInputChange}
                          rows="5"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="İş tanımı, sorumluluklar ve gereksinimler..."
                        />
                      </div>

                      {/* Required Technologies */}
                      <div>
                        <label htmlFor="edit-reqTech" className="block text-sm font-medium text-slate-700 mb-2">
                          Gerekli Teknolojiler
                        </label>
                        <input
                          type="text"
                          id="edit-reqTech"
                          name="reqTech"
                          value={formData.reqTech}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Örn: React, Node.js, PostgreSQL"
                        />
                      </div>

                      {/* Department */}
                      <div>
                        <label htmlFor="edit-reqDept" className="block text-sm font-medium text-slate-700 mb-2">
                          Departman
                        </label>
                        <input
                          type="text"
                          id="edit-reqDept"
                          name="reqDept"
                          value={formData.reqDept}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Örn: Yazılım Geliştirme"
                        />
                      </div>

                      {/* Job Status */}
                      <div>
                        <label htmlFor="edit-stId" className="block text-sm font-medium text-slate-700 mb-2">
                          İlan Durumu <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="edit-stId"
                          name="stId"
                          required
                          value={formData.stId}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {statuses.map((status) => (
                            <option key={status.GNL_ST_ID} value={status.GNL_ST_ID}>
                              {status.NAME}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Message */}
                      {message.text && (
                        <div className={`p-3 rounded-lg text-sm ${
                          message.type === 'success' 
                            ? 'bg-green-50 text-green-800 border border-green-200' 
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {message.text}
                        </div>
                      )}

                      {/* Form Actions */}
                      <div className="flex items-center space-x-3 pt-4">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingJob(null)
                            resetForm()
                            setMessage({ type: '', text: '' })
                          }}
                          className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
