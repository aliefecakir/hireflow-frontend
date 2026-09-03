import { useState, useEffect } from 'react'
import { createPost, fetchManagedPosts, updatePost, updatePostStatus } from './api/posts'
import { getErrorMessage } from './api/client'
import { showToast } from './toast/ToastProvider'

const POST_STATUSES = [
  { code: 'ACTV', name: 'Aktif' },
  { code: 'PASS', name: 'Pasif' },
  { code: 'DRFT', name: 'Taslak' },
]

const EMPTY_FORM = {
  title: '',
  descr: '',
  reqTech: '',
  reqDept: '',
  statusCode: 'ACTV',
}

function statusBadgeClass(shrtCode) {
  if (shrtCode === 'ACTV') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (shrtCode === 'PASS') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

export default function HRJobs() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [jobs, setJobs] = useState([])
  const [editingJob, setEditingJob] = useState(null)

  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async ({ silent = false } = {}) => {
    if (!silent) {
      setListLoading(true)
    }

    try {
      const data = await fetchManagedPosts()
      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'İlanlar yüklenirken bir hata oluştu.')
    } finally {
      setListLoading(false)
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
    setFormData(EMPTY_FORM)
  }

  const buildPayload = () => ({
    title: formData.title,
    descr: formData.descr,
    reqTech: formData.reqTech,
    reqDept: formData.reqDept,
    statusCode: formData.statusCode || 'ACTV',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingJob) {
        await updatePost(editingJob.postId, buildPayload())

        showToast.success('İlan başarıyla güncellendi', 'Yapılan değişiklikler kaydedildi')
        setEditingJob(null)
      } else {
        await createPost({
          ...buildPayload(),
          statusCode: formData.statusCode || 'ACTV',
        })

        showToast.success('İlan başarıyla oluşturuldu', 'Yapılan değişiklikler kaydedildi')
      }

      resetForm()
      await fetchJobs({ silent: true })

      setTimeout(() => {
        setShowAddForm(false)
        setEditingJob(null)
      }, 2000)

    } catch (err) {
      showToast.error('Hata Oluştu', getErrorMessage(err) || 'İşlem sırasında bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (job) => {
    setEditingJob(job)
    setFormData({
      title: job.title || '',
      descr: job.descr || '',
      reqTech: job.reqTech || '',
      reqDept: job.reqDept || '',
      statusCode: job.status?.shrtCode || 'ACTV',
    })
    setShowAddForm(false)
  }

  const toggleJobStatus = async (job) => {
    const currentCode = job.status?.shrtCode
    const nextCode = currentCode === 'ACTV' ? 'PASS' : 'ACTV'
    setUpdatingStatusId(job.postId)

    try {
      await updatePostStatus(job.postId, nextCode)
      await fetchJobs({ silent: true })
      showToast.success(
        'Başarılı',
        nextCode === 'PASS' ? 'İlan pasife alındı.' : 'İlan aktife alındı.'
      )
    } catch (error) {
      console.error('Durum değiştirme hatası:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'İlan durumu güncellenirken bir hata oluştu.')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const getStatusToggleText = (job) => {
    if (job.status?.shrtCode === 'ACTV') {
      return 'Pasife Al'
    }
    return 'Aktife Al'
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
              <label htmlFor="statusCode" className="block text-sm font-medium text-slate-700 mb-2">
                İlan Durumu
              </label>
              <select
                id="statusCode"
                name="statusCode"
                value={formData.statusCode}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {POST_STATUSES.map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

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
        {listLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            <p className="mt-4 text-slate-600 font-medium">İlanlar yükleniyor...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="h-16 w-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-700 mb-2">İlanlar burada listelenecek</h3>
            <p className="text-slate-500">Henüz hiç ilan eklenmemiş. Yukarıdaki butonu kullanarak yeni ilan ekleyebilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">İlanlar ({jobs.length})</h3>
            {jobs.map((job) => (
              <div key={job.postId}>
                <div
                  className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-semibold text-slate-800">
                          {job.title}
                        </h4>
                        {job.status?.name && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadgeClass(job.status.shrtCode)}`}>
                            {job.status.name}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                        {(job.descr || '').length > 150
                          ? `${job.descr.substring(0, 150)}...`
                          : (job.descr || '')}
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
                    </div>
                    <div className="ml-4 flex flex-col items-end space-y-2">
                      <button
                        onClick={() => handleEdit(job)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => toggleJobStatus(job)}
                        disabled={updatingStatusId === job.postId}
                        className="text-amber-600 hover:text-amber-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingStatusId === job.postId ? 'Güncelleniyor...' : getStatusToggleText(job)}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Edit Form */}
                {editingJob && editingJob.postId === job.postId && (
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
                        <label htmlFor="edit-statusCode" className="block text-sm font-medium text-slate-700 mb-2">
                          İlan Durumu <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="edit-statusCode"
                          name="statusCode"
                          required
                          value={formData.statusCode}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {POST_STATUSES.map((status) => (
                            <option key={status.code} value={status.code}>
                              {status.name}
                            </option>
                          ))}
                        </select>
                      </div>

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
