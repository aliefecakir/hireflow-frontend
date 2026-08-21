import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

// --- Mock veriler: normalde EXPERIENCE / SKILL / LANG tablolarından çekilir ---
const EXPERIENCE_OPTIONS = [
  { id: 'a1b2c3d4-0000-4000-8000-000000000001', label: '0-1 Yıl' },
  { id: 'a1b2c3d4-0000-4000-8000-000000000002', label: '1-3 Yıl' },
  { id: 'a1b2c3d4-0000-4000-8000-000000000003', label: '3-5 Yıl' },
  { id: 'a1b2c3d4-0000-4000-8000-000000000004', label: '5-10 Yıl' },
  { id: 'a1b2c3d4-0000-4000-8000-000000000005', label: '10+ Yıl' },
  { id: 'a1b2c3d4-0000-4000-8000-000000000006', label: 'Deneyim Yok' },
]

const SKILL_OPTIONS = [
  { id: 'b2c3d4e5-0000-4000-8000-000000000001', label: 'React' },
  { id: 'b2c3d4e5-0000-4000-8000-000000000002', label: 'JavaScript' },
  { id: 'b2c3d4e5-0000-4000-8000-000000000003', label: 'TypeScript' },
  { id: 'b2c3d4e5-0000-4000-8000-000000000004', label: 'Python' },
  { id: 'b2c3d4e5-0000-4000-8000-000000000005', label: 'Java' },
  { id: 'b2c3d4e5-0000-4000-8000-000000000006', label: 'C#' },
  { id: 'b2c3d4e5-0000-4000-8000-000000000007', label: 'SQL' },
  { id: 'b2c3d4e5-0000-4000-8000-000000000008', label: 'Node.js' },
  { id: 'b2c3d4e5-0000-4000-8000-000000000009', label: 'Tailwind CSS' },
  { id: 'b2c3d4e5-0000-4000-8000-000000000010', label: 'Docker' },
  { id: 'b2c3d4e5-0000-4000-8000-000000000011', label: 'AWS' },
  { id: 'b2c3d4e5-0000-4000-8000-000000000012', label: 'Git' },
]

const LANG_OPTIONS = [
  { id: 'c3d4e5f6-0000-4000-8000-000000000001', label: 'Türkçe' },
  { id: 'c3d4e5f6-0000-4000-8000-000000000002', label: 'İngilizce' },
  { id: 'c3d4e5f6-0000-4000-8000-000000000003', label: 'İspanyolca' },
  { id: 'c3d4e5f6-0000-4000-8000-000000000004', label: 'Almanca' },
  { id: 'c3d4e5f6-0000-4000-8000-000000000005', label: 'Fransızca' },
]

const DEPT_SUGGESTIONS = [
  'Yazılım Mühendisliği',
  "Bilgisayar Mühendisliği",
  "Yapay Zeka Mühendisliği",
  "Yönetim Bilişim Sistemleri",
  "Bilgisayar Programcılığı",
  'Veri Analizi',
  'Grafik Tasarım',
  'İnsan Kaynakları',
  'Muhasebe',
  'Satış',
  'Pazarlama',
  'Müşteri Destek',
]

// Hipo Universities API (github.com/hipo/university-domains-list).
// Uyarı: API yalnızca HTTP üzerinden yanıt verir. Uygulama HTTPS üzerinde
// barındırıldığında tarayıcı mixed-content koruması isteği engeller; bu
// durumda veri seti self-host edilip URL güncellenmelidir.
const UNIVERSITY_API_URL = 'http://universities.hipolabs.com/search'

const initialForm = {
  dept: '',
  education: '',
  experienceId: '',
  skillIds: [],
  langIds: [],
}

// Dosya yükleme sınırı ve hedef tanımları (Supabase Storage: candidate-files)
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const UPLOAD_TARGETS = {
  photo: {
    column: 'PRFL_PHT_URL',
    label: 'Profil fotoğrafı',
    buildPath: (userId) => `photos/${userId}_profile`,
  },
  cv: {
    column: 'CV_URL',
    label: 'CV',
    buildPath: (userId) => `cvs/${userId}_cv`,
  },
}

// Çoklu seçim (etiket) alanı: seçenekler tıklanarak eklenip çıkarılır
function TagGroup({ options, selected, onToggle, error }) {
  return (
    <div className={`flex flex-wrap gap-2 rounded-lg border px-3 py-2.5 min-h-[46px] bg-white ${error ? 'border-red-300' : 'border-gray-300'}`}>
      {options.map((option) => {
        const isSelected = selected.includes(option.id)
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {option.label}
            {isSelected && (
              <svg className="ml-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Üniversite arama kutusu: yazıldıkça API'den öneri çeker (debounce'lu),
// seçim yapılmadıysa serbest metin girişine izin verir
function UniversityCombobox({ id, value, onChange, onSelect, error }) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)
  const skipSearchRef = useRef('')

  // Dışına tıklanınca listeyi kapat
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const query = value.trim()

    // Seçilmiş değer veya çok kısa sorgu: arama yapma
    if (query.length < 2 || query === skipSearchRef.current) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setLoading(true)
        setFetchError(false)
        const res = await fetch(`${UNIVERSITY_API_URL}?name=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('University API error')

        const data = await res.json()
        // Türk üniversitelerini listenin başına al
        const sorted = [...(data || [])].sort(
          (a, b) =>
            (a.alpha_two_code === 'TR' ? 0 : 1) - (b.alpha_two_code === 'TR' ? 0 : 1)
        )
        setResults(sorted.slice(0, 20))
        setHighlightedIndex(-1)
        setOpen(true)
        setLoading(false)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching universities:', err)
          setResults([])
          setFetchError(true)
          setOpen(true)
          setLoading(false)
        }
      }
    }, 350)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [value])

  const handleSelect = (university) => {
    skipSearchRef.current = university.name
    onChange(university.name)
    onSelect?.(university.name)
    setOpen(false)
  }

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0) handleSelect(results[highlightedIndex])
      else setOpen(false)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showEmptyState = open && !loading && !fetchError && value.trim().length >= 2 && results.length === 0

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value.trim() !== skipSearchRef.current && value.trim().length >= 2 && setOpen(true)}
        placeholder="örn. Istanbul University"
        autoComplete="off"
        className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
            : 'border-gray-300 focus:ring-blue-100 focus:border-blue-400'
        }`}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {open && (results.length > 0 || fetchError || showEmptyState) && (
        <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-lg py-1">
          {fetchError ? (
            <li className="px-4 py-2.5 text-sm text-amber-600">
              Üniversite listesi alınamadı, okul adını elle girebilirsiniz.
            </li>
          ) : showEmptyState ? (
            <li className="px-4 py-2.5 text-sm text-slate-500">Üniversite bulunamadı</li>
          ) : (
            results.map((university, index) => (
              <li key={`${university.name}-${university.domains?.[0] ?? index}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(university)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-medium text-slate-800 truncate">{university.name}</span>
                  <span className="block text-xs text-slate-500">
                    {[university.country, university.domains?.[0]].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

// Gizli file input'u tetikleyen buton; yükleme sırasında spinner gösterir
function UploadButton({ htmlFor, loading, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
        loading
          ? 'opacity-60 pointer-events-none bg-slate-50 text-slate-500 border-gray-300'
          : 'text-slate-700 bg-white border-gray-300 hover:bg-slate-50 cursor-pointer'
      }`}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Yükleniyor...
        </>
      ) : (
        children
      )}
    </label>
  )
}

// Yükleme sonucu mesajı: hata veya başarı bilgisini gösterir
function UploadStatus({ error, successText }) {
  if (error) {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
        <svg className="h-4 w-4 flex-shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{error}</span>
      </p>
    )
  }
  if (successText) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>{successText}</span>
      </p>
    )
  }
  return null
}

// Yüklü dosyayı siler; yanlışlıkla basılmaması için önce onay ister
function DeleteButton({ disabled, onClick, confirmText }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (window.confirm(confirmText)) onClick()
      }}
      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Sil
    </button>
  )
}

export default function CandidateProfile() {
  const { user } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isCmpltd, setIsCmpltd] = useState(0) // PROFILE.IS_CMPLTD
  const [photoUrl, setPhotoUrl] = useState('')
  const [cvUrl, setCvUrl] = useState('')
  const [uploads, setUploads] = useState({
    photo: { loading: false, error: '', successText: '' },
    cv: { loading: false, error: '', successText: '' },
  })
  // API'den listelenen üniversitelerden yapılmış son seçim; elle yazılan metin
  // bununla eşleşmediği sürece Eğitim alanı tamamlanmış sayılmaz
  const [selectedEducation, setSelectedEducation] = useState('')

  // Kayıtlı profili yükler (tablo henüz boşsa sessizce geçer)
  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('PROFILE')
        .select('*')
        .eq('USER_ID', user.id)
        .maybeSingle()

      if (error || !data) return

      setForm({
        dept: data.DEPT || '',
        education: data.EDUCATION || '',
        experienceId: data.EXPERIENCE_ID || '',
        skillIds: data.SKILL_ID ? [data.SKILL_ID] : [],
        langIds: data.LANG_ID ? [data.LANG_ID] : [],
      })
      setIsCmpltd(data.IS_CMPLTD || 0)
      setPhotoUrl(data.PRFL_PHT_URL || '')
      setCvUrl(data.CV_URL || '')
      // Kaydedilmiş eğitim değeri tamamlanmış sayılır
      setSelectedEducation(data.EDUCATION || '')
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  useEffect(() => {
    if (user) fetchProfile()
  }, [user])

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    if (errors[field]) setErrors({ ...errors, [field]: '' })
  }

  // UniversityCombobox onChange'e string değer geçirir (event değil)
  const handleEducationChange = (value) => {
    setForm((prev) => ({ ...prev, education: value }))
    // Seçilmiş üniversiteden farklı bir metin yazıldıysa seçimi geçersiz kıl
    if (value !== selectedEducation) setSelectedEducation('')
    if (errors.education) setErrors({ ...errors, education: '' })
  }

  // UniversityCombobox'ta listeden üniversite seçildiğinde çağrılır
  const handleEducationSelect = (name) => {
    setSelectedEducation(name)
    if (errors.education) setErrors({ ...errors, education: '' })
  }

  const toggleSelection = (field, id) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((itemId) => itemId !== id)
        : [...prev[field], id],
    }))
    if (errors[field]) setErrors({ ...errors, [field]: '' })
  }

  const setUploadState = (target, patch) =>
    setUploads((prev) => ({ ...prev, [target]: { ...prev[target], ...patch } }))

  // Boyutu doğrular, dosyayı candidate-files bucket'ına yükler (upsert) ve
  // public URL'i PROFILE tablosundaki ilgili kolona yazar
  const handleFileUpload = async (target, file) => {
    if (!file) return

    setUploadState(target, { loading: false, error: '', successText: '' })

    if (file.size > MAX_FILE_SIZE) {
      setUploadState(target, {
        error: `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). En fazla 5 MB yükleyebilirsiniz.`,
      })
      return
    }

    setUploadState(target, { loading: true })

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Oturum bilgisi alınamadı, lütfen tekrar giriş yapın.')

      const { column, label, buildPath } = UPLOAD_TARGETS[target]
      const filePath = buildPath(user.id)

      const { error: uploadError } = await supabase.storage
        .from('candidate-files')
        .upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('candidate-files').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('PROFILE')
        .update({ [column]: publicUrl })
        .eq('USER_ID', user.id)
      if (updateError) throw updateError

      if (target === 'photo') setPhotoUrl(publicUrl)
      else setCvUrl(publicUrl)
      setUploadState(target, { successText: `${label} güncellendi.` })
    } catch (error) {
      console.error(`Error uploading ${target}:`, error)
      setUploadState(target, {
        error: 'Dosya yüklenirken bir hata oluştu. Lütfen tekrar deneyin.',
      })
    } finally {
      setUploadState(target, { loading: false })
    }
  }

  // Yüklenen dosyayı bucket'tan siler ve PROFILE tablosundaki kolonu temizler
  const handleFileDelete = async (target) => {
    setUploadState(target, { loading: true, error: '', successText: '' })

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Oturum bilgisi alınamadı, lütfen tekrar giriş yapın.')

      const { column, label, buildPath } = UPLOAD_TARGETS[target]
      const filePath = buildPath(user.id)

      const { error: removeError } = await supabase.storage
        .from('candidate-files')
        .remove([filePath])
      if (removeError) throw removeError

      const { error: updateError } = await supabase
        .from('PROFILE')
        .update({ [column]: null })
        .eq('USER_ID', user.id)
      if (updateError) throw updateError

      if (target === 'photo') setPhotoUrl('')
      else setCvUrl('')
      setUploadState(target, { successText: `${label} silindi.` })
    } catch (error) {
      console.error(`Error deleting ${target}:`, error)
      setUploadState(target, {
        error: 'Dosya silinirken bir hata oluştu. Lütfen tekrar deneyin.',
      })
    } finally {
      setUploadState(target, { loading: false })
    }
  }

  const handleFileSelect = (target) => (e) => {
    const file = e.target.files?.[0]
    // Aynı dosyayı üst üste seçebilmek için input'u sıfırla
    e.target.value = ''
    if (file) handleFileUpload(target, file)
  }

  const validateForm = () => {
    const newErrors = {}
    if (!form.dept.trim()) newErrors.dept = 'Departman zorunludur'
    if (!form.education.trim()) newErrors.education = 'Eğitim bilgisi zorunludur'
    if (!form.experienceId) newErrors.experienceId = 'Deneyim seviyesi seçilmelidir'
    if (form.skillIds.length === 0) newErrors.skillIds = 'En az bir yetenek seçmelisiniz'
    if (form.langIds.length === 0) newErrors.langIds = 'En az bir dil seçmelisiniz'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Profil tamamlanma durumu: tüm zorunlu alanlar doluysa 1
  // Fotoğraf ve CV yükleme durumu da tamamlanma yüzdesine dahildir;
  // yükleme başarılı olduğunda state güncellenir, yüzde anında yükselir
  // Eğitim alanı yalnızca API listesinden üniversite seçilirse tamamlanmış sayılır
  const requiredChecks = [
    Boolean(form.dept.trim()),
    form.education.trim() !== '' && form.education === selectedEducation,
    Boolean(form.experienceId),
    form.skillIds.length > 0,
    form.langIds.length > 0,
    Boolean(photoUrl),
    Boolean(cvUrl),
  ]
  const completedCount = requiredChecks.filter(Boolean).length
  const progress = Math.round((completedCount / requiredChecks.length) * 100)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveSuccess(false)
    setFormError('')

    if (!validateForm()) return

    await saveProfile({
      USER_ID: user.id,
      DEPT: form.dept.trim(),
      EDUCATION: form.education.trim(),
      EXPERIENCE_ID: form.experienceId,
      IS_CMPLTD: 1,
      UUSER: user.id,
      // SKILL_ID / LANG_ID kolonları tek uuid tutuyor; arayüz çoklu seçim
      // sunduğu için diziler ayrıca gönderilir ve ilişki tablolarına
      // (örn. PROFILE_SKILL, PROFILE_LANG) yazılmalıdır
      SKILL_IDS: form.skillIds,
      LANG_IDS: form.langIds,
    })
  }

  // API gönderim iskeleti — proje standardı Supabase kullanır.
  // REST/axios'a geçilecekse burası örnek:
  //   await axios.post('/api/profile', payload)
  const saveProfile = async (payload) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('PROFILE')
        .upsert(payload, { onConflict: 'USER_ID' })

      if (error) throw error

      // TODO: SKILL_IDS / LANG_IDS ilişki tablolarına yazılmalı

      setIsCmpltd(1)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (error) {
      console.error('Error saving profile:', error)
      setFormError('Profil kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (field) =>
    `w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
      errors[field]
        ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
        : 'border-gray-300 focus:ring-blue-100 focus:border-blue-400'
    }`

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Profil Ayarları</h1>
          <p className="text-sm text-slate-600 mt-1">Profil bilgilerinizi görüntüleyin ve güncelleyin</p>
        </div>
        {isCmpltd === 1 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Profil Tamamlandı
          </span>
        )}
      </div>

      {/* Completion progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Profil Tamamlanma Durumu</span>
          <span className="text-sm font-semibold text-slate-800">{progress}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* File uploads: profile photo & CV */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Profil Fotoğrafı & CV</h2>
          <p className="text-sm text-slate-600 mt-1">
            Dosyalar seçildiği anda yüklenir ve profilinize kaydedilir
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Profile photo */}
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-slate-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="Profil fotoğrafı" className="h-full w-full object-cover" />
              ) : (
                <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-slate-700 mb-1">Profil Fotoğrafı</span>
              <p className="text-xs text-slate-500 mb-2.5">PNG veya JPG, en fazla 5 MB</p>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect('photo')}
              />
              <div className="flex items-center gap-2">
                <UploadButton htmlFor="photo-upload" loading={uploads.photo.loading}>
                  Fotoğraf Seç
                </UploadButton>
                {photoUrl && (
                  <DeleteButton
                    disabled={uploads.photo.loading}
                    onClick={() => handleFileDelete('photo')}
                    confirmText="Profil fotoğrafınızı silmek istediğinizden emin misiniz?"
                  />
                )}
              </div>
              <UploadStatus
                error={uploads.photo.error}
                successText={uploads.photo.successText}
              />
            </div>
          </div>

          {/* CV */}
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="h-9 w-9 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-slate-700 mb-1">CV (PDF)</span>
              <p className="text-xs text-slate-500 mb-2.5">Yalnızca PDF formatı, en fazla 5 MB</p>
              {cvUrl && (
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-xs text-blue-600 hover:text-blue-700 hover:underline truncate mb-2.5"
                >
                  Mevcut CV'yi görüntüle
                </a>
              )}
              <input
                id="cv-upload"
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileSelect('cv')}
              />
              <div className="flex items-center gap-2">
                <UploadButton htmlFor="cv-upload" loading={uploads.cv.loading}>
                  CV Yükle
                </UploadButton>
                {cvUrl && (
                  <DeleteButton
                    disabled={uploads.cv.loading}
                    onClick={() => handleFileDelete('cv')}
                    confirmText="CV'nizi silmek istediğinizden emin misiniz?"
                  />
                )}
              </div>
              <UploadStatus
                error={uploads.cv.error}
                successText={uploads.cv.successText}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Form Card */}
      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
        {saveSuccess && (
          <div className="flex items-center space-x-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Profiliniz başarıyla kaydedildi.</span>
          </div>
        )}
        {formError && (
          <div className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{formError}</span>
          </div>
        )}

        {/* Department & Education */}
        <fieldset className="space-y-5">
          <legend className="text-base font-semibold text-slate-800 mb-3">Departman & Eğitim</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="dept" className="block text-sm font-medium text-slate-700 mb-1.5">
                Departman <span className="text-red-500">*</span>
              </label>
              <input
                id="dept"
                type="text"
                list="dept-suggestions"
                value={form.dept}
                onChange={handleChange('dept')}
                placeholder="örn. Yazılım Mühendisliği"
                className={inputClass('dept')}
              />
              <datalist id="dept-suggestions">
                {DEPT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
              {errors.dept && <p className="mt-1.5 text-xs text-red-600">{errors.dept}</p>}
            </div>
            <div>
              <label htmlFor="education" className="block text-sm font-medium text-slate-700 mb-1.5">
                Eğitim <span className="text-red-500">*</span>
              </label>
              <UniversityCombobox
                id="education"
                value={form.education}
                onChange={handleEducationChange}
                onSelect={handleEducationSelect}
                error={errors.education}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                En az 2 karakter yazın; tamamlanma için listeden bir üniversite seçmelisiniz
              </p>
              {form.education.trim() !== '' && form.education !== selectedEducation && (
                <p className="mt-1 text-xs text-amber-600">
                  Yazdığınız değer henüz listeden seçilmedi; tamamlanma yüzdesine dahil olmaz
                </p>
              )}
              {errors.education && <p className="mt-1 text-xs text-red-600">{errors.education}</p>}
            </div>
          </div>
        </fieldset>

        {/* Experience */}
        <fieldset className="space-y-5">
          <legend className="text-base font-semibold text-slate-800 mb-3">Deneyim</legend>
          <div>
            <label htmlFor="experience" className="block text-sm font-medium text-slate-700 mb-1.5">
              Deneyim Seviyesi <span className="text-red-500">*</span>
            </label>
            <select
              id="experience"
              value={form.experienceId}
              onChange={handleChange('experienceId')}
              className={inputClass('experienceId')}
            >
              <option value="" disabled>Seçiniz</option>
              {EXPERIENCE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            {errors.experienceId && <p className="mt-1.5 text-xs text-red-600">{errors.experienceId}</p>}
          </div>
        </fieldset>

        {/* Skills */}
        <fieldset className="space-y-5">
          <legend className="text-base font-semibold text-slate-800 mb-3">Yetenekler</legend>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Bilinen Yetenekler <span className="text-red-500">*</span>
            </label>
            <TagGroup
              options={SKILL_OPTIONS}
              selected={form.skillIds}
              onToggle={(id) => toggleSelection('skillIds', id)}
              error={errors.skillIds}
            />
            <p className="mt-1.5 text-xs text-slate-500">Eklemek istediğiniz yeteneklere tıklayın</p>
            {errors.skillIds && <p className="mt-1 text-xs text-red-600">{errors.skillIds}</p>}
          </div>
        </fieldset>

        {/* Languages */}
        <fieldset className="space-y-5">
          <legend className="text-base font-semibold text-slate-800 mb-3">Diller</legend>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Bilinen Diller <span className="text-red-500">*</span>
            </label>
            <TagGroup
              options={LANG_OPTIONS}
              selected={form.langIds}
              onToggle={(id) => toggleSelection('langIds', id)}
              error={errors.langIds}
            />
            <p className="mt-1.5 text-xs text-slate-500">Bildiğiniz dillere tıklayın</p>
            {errors.langIds && <p className="mt-1 text-xs text-red-600">{errors.langIds}</p>}
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              setForm(initialForm)
              setErrors({})
            }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-white border border-gray-300 hover:bg-slate-50 transition-colors"
          >
            Temizle
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Kaydediliyor...
              </>
            ) : (
              'Kaydet'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
