import { useState, useEffect, useRef } from 'react'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { supabase } from './supabaseClient'
import SkillsModal from './SkillsModal'
import LanguagesModal from './LanguagesModal'
import { PROFILE_PHOTO_CHANGED_EVENT } from './CandidateLayout'
import departmentCatalog from './resources/departments.json'

const notifyHeaderPhotoChange = (nextUrl) => {
  window.dispatchEvent(new CustomEvent(PROFILE_PHOTO_CHANGED_EVENT, {
    detail: { photoUrl: nextUrl || '', revision: Date.now() },
  }))
}

const displayAssetUrl = (url, revision) => {
  if (!url) return ''
  return `${url.split('?')[0]}?v=${revision}`
}

const DESCR_MAX = 1000
const CORP_NAME_MAX = 150
const POSITION_MAX = 150

const emptyExperienceForm = {
  corpName: '',
  position: '',
  descr: '',
  stllWrkg: false,
  sdate: '',
  edate: '',
}

const MMYYYY_PATTERN = /^(0[1-9]|1[0-2])\/\d{4}$/

function toDisplayMonthYear(value) {
  if (!value) return ''
  const raw = String(value).trim()
  const iso = raw.match(/^(\d{4})-(\d{1,2})$/)
  if (iso) {
    return `${iso[2].padStart(2, '0')}/${iso[1]}`
  }
  const slash = raw.match(/^(\d{1,2})\/(\d{4})$/)
  if (slash) {
    return `${slash[1].padStart(2, '0')}/${slash[2]}`
  }
  return raw
}

function formatMonthYearTyping(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function toStoredMonthYear(value) {
  const display = toDisplayMonthYear(formatMonthYearTyping(value))
  return MMYYYY_PATTERN.test(display) ? display : display
}

function formatExperienceInterval(sdate, edate, stillWorking) {
  if (Number(stillWorking) === 1) {
    return `${toDisplayMonthYear(sdate) || '—'} - Devam Ediyor`
  }
  if (edate) return `${toDisplayMonthYear(sdate) || '—'} - ${toDisplayMonthYear(edate)}`
  return toDisplayMonthYear(sdate) || '—'
}

const getAuthUserId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Oturum bilgisi alınamadı, lütfen tekrar giriş yapın.')
  return user.id
}

// Dil Ekle'nin solundaki hızlı ekleme dilleri LANG.NAME ile eşleştirilir.
const POPULAR_LANG_NAMES = [
  'Türkçe',
  'İngilizce',
  'Almanca',
  'Fransızca',
  'İspanyolca',
]

const toLang = (row) => ({ id: row.LANG_ID, name: row.NAME })

const DEPARTMENT_OPTIONS = (departmentCatalog || [])
  .map((row) => (row?.DEPARTMENT || '').trim())
  .filter(Boolean)

const normalizeSearch = (value) => (value || '').trim().toLocaleLowerCase('tr-TR')

// Hipo Universities API (github.com/hipo/university-domains-list).
// Uyarı: API yalnızca HTTP üzerinden yanıt verir. Uygulama HTTPS üzerinde
// barındırıldığında tarayıcı mixed-content koruması isteği engeller; bu
// durumda veri seti self-host edilip URL güncellenmelidir.
const UNIVERSITY_API_URL = 'http://universities.hipolabs.com/search'

const initialForm = {
  dept: '',
  education: '',
}

// Dosya yükleme sınırı ve hedef tanımları (Supabase Storage: candidate-files)
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const CV_MIME_TYPES = ['application/pdf']

const UPLOAD_TARGETS = {
  photo: {
    column: 'PRFL_PHT_URL',
    label: 'Profil fotoğrafı',
    folder: 'photos',
    legacyPath: (userId) => `photos/${userId}_profile`,
    allowedTypes: PHOTO_MIME_TYPES,
    invalidMessage: 'Lütfen yalnızca geçerli bir görsel formatı (PNG, JPG, WEBP) ve maksimum 5MB boyutunda dosya yükleyin.',
  },
  cv: {
    column: 'CV_URL',
    label: 'CV',
    folder: 'cvs',
    legacyPath: (userId) => `cvs/${userId}_cv`,
    allowedTypes: CV_MIME_TYPES,
    invalidMessage: 'Lütfen yalnızca PDF formatında ve maksimum 5MB boyutunda bir CV yükleyin.',
  },
}

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

const STORAGE_PUBLIC_MARKER = '/object/public/candidate-files/'

function fileExtension(file) {
  return MIME_EXTENSIONS[(file.type || '').toLowerCase()] || ''
}

function buildUniqueFilePath(folder, userId, file) {
  const ext = fileExtension(file)
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return ext ? `${folder}/${userId}/${unique}.${ext}` : `${folder}/${userId}/${unique}`
}

function storagePathFromPublicUrl(url) {
  if (!url) return null
  try {
    const parsed = new URL(url, window.location.origin)
    const idx = parsed.pathname.indexOf(STORAGE_PUBLIC_MARKER)
    if (idx === -1) return null
    return decodeURIComponent(parsed.pathname.slice(idx + STORAGE_PUBLIC_MARKER.length))
  } catch {
    return null
  }
}

// Üniversite arama kutusu: yazıldıkça API'den öneri çeker (debounce'lu),
// seçim yapılmadıysa serbest metin girişine izin verir
function UniversityCombobox({ id, value, onChange, onSelect, error, isSelected }) {
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
    const selectedValue = isSelected || (value !== '' && value === skipSearchRef.current)
    if ((e.key === 'Backspace' || e.key === 'Delete') && selectedValue) {
      e.preventDefault()
      skipSearchRef.current = ''
      onChange('')
      setOpen(false)
      setResults([])
      setHighlightedIndex(-1)
      return
    }

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

function DepartmentCombobox({ id, value, onChange, onSelect, error, isSelected }) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)

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
    if (isSelected || query.length < 2) {
      setResults([])
      setOpen(false)
      setHighlightedIndex(-1)
      return
    }

    const needle = normalizeSearch(query)
    const matches = DEPARTMENT_OPTIONS
      .filter((name) => normalizeSearch(name).includes(needle))
      .slice(0, 20)
    setResults(matches)
    setHighlightedIndex(-1)
    setOpen(true)
  }, [value, isSelected])

  const clearValue = () => {
    onChange('')
    onSelect?.('')
    setOpen(false)
    setResults([])
    setHighlightedIndex(-1)
  }

  const handleSelect = (name) => {
    onChange(name)
    onSelect?.(name)
    setOpen(false)
    setResults([])
  }

  const handleKeyDown = (e) => {
    if (isSelected) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        clearValue()
      } else if (e.key !== 'Tab' && e.key !== 'Escape' && e.key !== 'Shift') {
        e.preventDefault()
      }
      return
    }

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

  const showEmptyState = open && !isSelected && value.trim().length >= 2 && results.length === 0

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        readOnly={isSelected}
        onChange={(e) => {
          if (isSelected) return
          onChange(e.target.value)
        }}
        onKeyDown={handleKeyDown}
        onPaste={(e) => {
          if (isSelected) e.preventDefault()
        }}
        onFocus={() => {
          if (!isSelected && value.trim().length >= 2) setOpen(true)
        }}
        placeholder="en az 2 karakter yazın, listeden seçin"
        autoComplete="off"
        className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
            : 'border-gray-300 focus:ring-blue-100 focus:border-blue-400'
        } ${isSelected ? 'caret-transparent' : ''}`}
      />
      {open && (results.length > 0 || showEmptyState) && (
        <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-lg py-1">
          {showEmptyState ? (
            <li className="px-4 py-2.5 text-sm text-slate-500">Departman bulunamadı</li>
          ) : (
            results.map((name, index) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => handleSelect(name)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-medium text-slate-800 truncate">{name}</span>
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

function ExperienceModal({
  open,
  isEditing,
  form,
  errors,
  saving,
  formError,
  onChange,
  onToggleStillWorking,
  onClose,
  onSubmit,
}) {
  if (!open) return null

  const fieldClass = (field) =>
    `w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
      errors[field]
        ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
        : 'border-gray-300 focus:ring-blue-100 focus:border-blue-400'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEditing ? 'Deneyimi Düzenle' : 'Deneyim Ekle'}
          </h2>
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

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-5 space-y-4" noValidate>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="exp-corp" className="block text-sm font-medium text-slate-700 mb-1.5">
              Kurum / Şirket <span className="text-red-500">*</span>
            </label>
            <input
              id="exp-corp"
              type="text"
              maxLength={CORP_NAME_MAX}
              value={form.corpName}
              onChange={(e) => onChange('corpName', e.target.value)}
              placeholder="örn. Acme Yazılım"
              className={fieldClass('corpName')}
            />
            {errors.corpName && <p className="mt-1.5 text-xs text-red-600">{errors.corpName}</p>}
          </div>

          <div>
            <label htmlFor="exp-position" className="block text-sm font-medium text-slate-700 mb-1.5">
              Pozisyon <span className="text-red-500">*</span>
            </label>
            <input
              id="exp-position"
              type="text"
              maxLength={POSITION_MAX}
              value={form.position}
              onChange={(e) => onChange('position', e.target.value)}
              placeholder="örn. Yazılım Mühendisi"
              className={fieldClass('position')}
            />
            {errors.position && <p className="mt-1.5 text-xs text-red-600">{errors.position}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="exp-sdate" className="block text-sm font-medium text-slate-700 mb-1.5">
                Başlangıç <span className="text-red-500">*</span>
              </label>
              <input
                id="exp-sdate"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="07/2023"
                maxLength={7}
                value={form.sdate}
                onChange={(e) => onChange('sdate', formatMonthYearTyping(e.target.value))}
                onBlur={() => onChange('sdate', toStoredMonthYear(form.sdate))}
                className={fieldClass('sdate')}
              />
              <p className="mt-1 text-xs text-slate-500">AA/YYYY, örn. 07/2023</p>
              {errors.sdate && <p className="mt-1.5 text-xs text-red-600">{errors.sdate}</p>}
            </div>
            <div>
              <label htmlFor="exp-edate" className="block text-sm font-medium text-slate-700 mb-1.5">
                Bitiş {!form.stllWrkg && <span className="text-red-500">*</span>}
              </label>
              <input
                id="exp-edate"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="07/2023"
                maxLength={7}
                disabled={form.stllWrkg}
                value={form.stllWrkg ? '' : form.edate}
                onChange={(e) => onChange('edate', formatMonthYearTyping(e.target.value))}
                onBlur={() => {
                  if (!form.stllWrkg) onChange('edate', toStoredMonthYear(form.edate))
                }}
                className={`${fieldClass('edate')} ${form.stllWrkg ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
              />
              <p className="mt-1 text-xs text-slate-500">AA/YYYY, örn. 09/2024</p>
              {errors.edate && <p className="mt-1.5 text-xs text-red-600">{errors.edate}</p>}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.stllWrkg}
              onChange={(e) => onToggleStillWorking(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Hâlâ bu işte çalışıyorum
          </label>

          <div>
            <label htmlFor="exp-descr" className="block text-sm font-medium text-slate-700 mb-1.5">
              Açıklama
            </label>
            <div className="relative">
              <textarea
                id="exp-descr"
                rows={4}
                maxLength={DESCR_MAX}
                value={form.descr}
                onChange={(e) => onChange('descr', e.target.value)}
                placeholder="Görevlerinizi kısaca açıklayın (isteğe bağlı)"
                className={`${fieldClass('descr')} resize-none pb-8`}
              />
              <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs tabular-nums text-slate-400">
                {form.descr.length}/{DESCR_MAX}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-white border border-gray-300 hover:bg-slate-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CandidateProfile() {
  const [form, setForm] = useState(initialForm)
  const [experiences, setExperiences] = useState([])
  const [expModalOpen, setExpModalOpen] = useState(false)
  const [expForm, setExpForm] = useState(emptyExperienceForm)
  const [expErrors, setExpErrors] = useState({})
  const [expSaving, setExpSaving] = useState(false)
  const [expFormError, setExpFormError] = useState('')
  const [editingExperienceId, setEditingExperienceId] = useState(null)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isCmpltd, setIsCmpltd] = useState(0) // PROFILE.IS_CMPLTD
  const [skills, setSkills] = useState([])
  const [languages, setLanguages] = useState([])
  const [popularLanguages, setPopularLanguages] = useState([])
  const [profileId, setProfileId] = useState(null) // PROFILE.PROFILE_ID
  const [skillModalOpen, setSkillModalOpen] = useState(false)
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [cvUrl, setCvUrl] = useState('')
  const [phone, setPhone] = useState('')
  const [photoRevision, setPhotoRevision] = useState(Date.now())
  const [uploads, setUploads] = useState({
    photo: { loading: false, error: '', successText: '' },
    cv: { loading: false, error: '', successText: '' },
  })
  // API'den listelenen üniversitelerden yapılmış son seçim; elle yazılan metin
  // bununla eşleşmediği sürece Eğitim alanı tamamlanmış sayılmaz
  const [selectedEducation, setSelectedEducation] = useState('')
  const [selectedDept, setSelectedDept] = useState('')

  const fetchPopularLanguages = async () => {
    try {
      const { data, error } = await supabase
        .from('LANG')
        .select('LANG_ID, NAME')
        .in('NAME', POPULAR_LANG_NAMES)

      if (error) throw error
      const byName = new Map((data || []).map((row) => [row.NAME, toLang(row)]))
      setPopularLanguages(
        POPULAR_LANG_NAMES.map((name) => byName.get(name)).filter(Boolean)
      )
    } catch (error) {
      console.error('Error fetching popular languages:', error)
      setPopularLanguages([])
    }
  }

  // PRFL_ID ile ilişki tablosundan ID'leri alır, detay tablosundan kayıtları çeker
  const fetchLinkedRecords = async (
    currentProfileId,
    relTable,
    relIdColumn,
    detailTable,
    detailIdColumn,
    detailSelect,
    mapRow
  ) => {
    const { data: relations, error: relError } = await supabase
      .from(relTable)
      .select(relIdColumn)
      .eq('PRFL_ID', currentProfileId)
    if (relError) throw relError

    if (!relations || relations.length === 0) return []

    const ids = relations.map((rel) => rel[relIdColumn]).filter(Boolean)
    if (ids.length === 0) return []

    const { data: rows, error: detailError } = await supabase
      .from(detailTable)
      .select(detailSelect)
      .in(detailIdColumn, ids)
    if (detailError) throw detailError

    return (rows || []).map(mapRow)
  }

  // Mount: USER_ID -> PROFILE_ID, ardından PRFL_ID ile ilişkili kayıtlar
  useEffect(() => {
    let cancelled = false

    const loadProfileData = async () => {
      setIsLoadingData(true)
      setFormError('')

      try {
        const authUserId = await getAuthUserId()

        const { data: profile, error: profileError } = await supabase
          .from('PROFILE')
          .select('PROFILE_ID, DEPT, EDUCATION, PHONE, PRFL_PHT_URL, CV_URL, IS_CMPLTD')
          .eq('USER_ID', authUserId)
          .maybeSingle()
        if (profileError) throw profileError

        if (cancelled) return

        await fetchPopularLanguages()

        if (!profile) {
          setProfileId(null)
          setForm(initialForm)
          setPhotoUrl('')
          setCvUrl('')
          setPhone('')
          setIsCmpltd(0)
          setSelectedEducation('')
          setSelectedDept('')
          setExperiences([])
          setSkills([])
          setLanguages([])
          return
        }

        const currentProfileId = profile.PROFILE_ID
        setProfileId(currentProfileId)
        const matchedDept = DEPARTMENT_OPTIONS.find(
          (name) => normalizeSearch(name) === normalizeSearch(profile.DEPT)
        )
        setForm({
          dept: matchedDept || profile.DEPT || '',
          education: profile.EDUCATION || '',
        })
        setPhotoUrl(profile.PRFL_PHT_URL || '')
        setCvUrl(profile.CV_URL || '')
        setPhone(profile.PHONE || '')
        setPhotoRevision(Date.now())
        setIsCmpltd(profile.IS_CMPLTD || 0)
        setSelectedEducation(profile.EDUCATION || '')
        setSelectedDept(matchedDept || '')

        const { data: experienceRows, error: experienceError } = await supabase
          .from('EXPERIENCE')
          .select('EXPERIENCE_ID, CORP_NAME, POSITION, DESCR, STLL_WRKG, SDATE, EDATE, CDATE')
          .eq('PROFILE_ID', currentProfileId)
          .order('CDATE', { ascending: false })
        if (experienceError) throw experienceError
        if (cancelled) return
        setExperiences(experienceRows || [])

        const loadedSkills = await fetchLinkedRecords(
          currentProfileId,
          'PRFL_SKILL_REL',
          'SKILL_ID',
          'SKILL',
          'SKILL_ID',
          'SKILL_ID, NAME',
          (row) => ({ id: row.SKILL_ID, name: row.NAME })
        )
        if (cancelled) return
        setSkills(loadedSkills)

        const loadedLanguages = await fetchLinkedRecords(
          currentProfileId,
          'PRFL_LANG_REL',
          'LANG_ID',
          'LANG',
          'LANG_ID',
          'LANG_ID, NAME',
          toLang
        )
        if (cancelled) return
        setLanguages(loadedLanguages)
      } catch (error) {
        if (cancelled) return
        console.error('Error loading profile data:', error)
        setFormError('Profil bilgileri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.')
      } finally {
        if (!cancelled) setIsLoadingData(false)
      }
    }

    loadProfileData()
    return () => {
      cancelled = true
    }
  }, [])

  const handleExperienceFormChange = (field, value) => {
    setExpForm((prev) => ({ ...prev, [field]: value }))
    if (expErrors[field]) setExpErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleToggleStillWorking = (checked) => {
    setExpForm((prev) => ({
      ...prev,
      stllWrkg: checked,
      edate: checked ? '' : prev.edate,
    }))
    if (expErrors.edate) setExpErrors((prev) => ({ ...prev, edate: '' }))
  }

  const openExperienceModal = (experience = null) => {
    if (experience) {
      setEditingExperienceId(experience.EXPERIENCE_ID)
      setExpForm({
        corpName: experience.CORP_NAME || '',
        position: experience.POSITION || '',
        descr: experience.DESCR || '',
        stllWrkg: Number(experience.STLL_WRKG) === 1,
        sdate: toDisplayMonthYear(experience.SDATE || ''),
        edate: Number(experience.STLL_WRKG) === 1 ? '' : toDisplayMonthYear(experience.EDATE || ''),
      })
    } else {
      setEditingExperienceId(null)
      setExpForm(emptyExperienceForm)
    }
    setExpErrors({})
    setExpFormError('')
    setExpModalOpen(true)
  }

  const closeExperienceModal = () => {
    if (expSaving) return
    setExpModalOpen(false)
    setEditingExperienceId(null)
    setExpForm(emptyExperienceForm)
    setExpErrors({})
    setExpFormError('')
  }

  const fetchExperiences = async (currentProfileId) => {
    const { data, error } = await supabase
      .from('EXPERIENCE')
      .select('EXPERIENCE_ID, CORP_NAME, POSITION, DESCR, STLL_WRKG, SDATE, EDATE, CDATE')
      .eq('PROFILE_ID', currentProfileId)
      .order('CDATE', { ascending: false })
    if (error) throw error
    setExperiences(data || [])
    return data || []
  }

  const ensureProfileId = async () => {
    if (profileId) return profileId

    const authUserId = await getAuthUserId()
    const { data: existing, error: existingError } = await supabase
      .from('PROFILE')
      .select('PROFILE_ID')
      .eq('USER_ID', authUserId)
      .maybeSingle()
    if (existingError) throw existingError
    if (existing?.PROFILE_ID) {
      setProfileId(existing.PROFILE_ID)
      return existing.PROFILE_ID
    }

    const { data: created, error: createError } = await supabase
      .from('PROFILE')
      .insert({
        USER_ID: authUserId,
        DEPT: form.dept.trim() || null,
        EDUCATION: form.education.trim() || null,
        PHONE: phone || null,
        PRFL_PHT_URL: photoUrl || null,
        CV_URL: cvUrl || null,
        IS_CMPLTD: 0,
        CUSER: authUserId,
      })
      .select('PROFILE_ID')
      .maybeSingle()
    if (createError) throw createError
    if (!created?.PROFILE_ID) throw new Error('Profil kaydı oluşturulamadı.')
    setProfileId(created.PROFILE_ID)
    return created.PROFILE_ID
  }

  const validateExperienceForm = () => {
    const nextErrors = {}
    const sdate = toStoredMonthYear(expForm.sdate)
    const edate = toStoredMonthYear(expForm.edate)
    if (!expForm.corpName.trim()) nextErrors.corpName = 'Kurum adı zorunludur'
    if (!expForm.position.trim()) nextErrors.position = 'Pozisyon zorunludur'
    if (!sdate) nextErrors.sdate = 'Başlangıç tarihi zorunludur'
    else if (!MMYYYY_PATTERN.test(sdate)) nextErrors.sdate = 'Tarih AA/YYYY formatında olmalıdır (örn. 07/2023)'
    if (!expForm.stllWrkg) {
      if (!edate) nextErrors.edate = 'Bitiş tarihi zorunludur'
      else if (!MMYYYY_PATTERN.test(edate)) nextErrors.edate = 'Tarih AA/YYYY formatında olmalıdır (örn. 09/2024)'
    }
    setExpErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleAddExperience = async (event) => {
    event.preventDefault()
    setExpFormError('')
    if (!validateExperienceForm()) return

    try {
      setExpSaving(true)
      const authUserId = await getAuthUserId()
      const currentProfileId = await ensureProfileId()

      const payload = {
        PROFILE_ID: currentProfileId,
        CORP_NAME: expForm.corpName.trim(),
        POSITION: expForm.position.trim(),
        DESCR: expForm.descr.trim() || null,
        STLL_WRKG: expForm.stllWrkg ? 1 : 0,
        SDATE: toStoredMonthYear(expForm.sdate),
        EDATE: expForm.stllWrkg ? null : toStoredMonthYear(expForm.edate),
        CUSER: authUserId,
      }

      if (editingExperienceId) {
        const { error } = await supabase
          .from('EXPERIENCE')
          .update({
            CORP_NAME: payload.CORP_NAME,
            POSITION: payload.POSITION,
            DESCR: payload.DESCR,
            STLL_WRKG: payload.STLL_WRKG,
            SDATE: payload.SDATE,
            EDATE: payload.EDATE,
          })
          .eq('EXPERIENCE_ID', editingExperienceId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('EXPERIENCE').insert(payload)
        if (error) throw error
      }

      await fetchExperiences(currentProfileId)
      if (errors.experienceId) setErrors((prev) => ({ ...prev, experienceId: '' }))
      setExpModalOpen(false)
      setEditingExperienceId(null)
      setExpForm(emptyExperienceForm)
      setExpErrors({})
    } catch (error) {
      console.error('Error adding experience:', error)
      const errorText = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
      const isDuplicatePhone = error?.code === '23505' && errorText.includes('phone')
      setExpFormError(
        isDuplicatePhone
          ? 'Bu numara zaten kayıtlı. Deneyim eklemek için önce profil telefonunu değiştirin.'
          : (error.message || 'Deneyim eklenirken bir hata oluştu.')
      )
    } finally {
      setExpSaving(false)
    }
  }

  const handleDeleteExperience = async (experienceId) => {
    if (!window.confirm('Bu deneyimi silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('EXPERIENCE')
        .delete()
        .eq('EXPERIENCE_ID', experienceId)
      if (error) throw error
      setExperiences((prev) => prev.filter((item) => item.EXPERIENCE_ID !== experienceId))
    } catch (error) {
      console.error('Error deleting experience:', error)
      setFormError(error.message || 'Deneyim silinirken bir hata oluştu.')
    }
  }

  const handleDeptChange = (value) => {
    setForm((prev) => ({ ...prev, dept: value }))
    if (value !== selectedDept) setSelectedDept('')
    if (errors.dept) setErrors({ ...errors, dept: '' })
  }

  const handleDeptSelect = (name) => {
    setSelectedDept(name || '')
    if (errors.dept) setErrors({ ...errors, dept: '' })
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

  const addLanguage = (lang) => {
    if (!lang) return
    setLanguages((prev) => (prev.some((item) => item.id === lang.id) ? prev : [...prev, lang]))
    if (errors.langIds) setErrors({ ...errors, langIds: '' })
  }

  const removeLanguage = (langId) => {
    setLanguages((prev) => prev.filter((lang) => lang.id !== langId))
  }

  const setUploadState = (target, patch) =>
    setUploads((prev) => ({ ...prev, [target]: { ...prev[target], ...patch } }))

  // Tip ve boyutu doğrular, dosyayı candidate-files bucket'ına yükler (upsert) ve
  // public URL'i PROFILE tablosundaki ilgili kolona yazar
  const handleFileUpload = async (target, file) => {
    if (!file) return

    setUploadState(target, { loading: false, error: '', successText: '' })

    const { allowedTypes, invalidMessage } = UPLOAD_TARGETS[target]
    const mimeType = (file.type || '').toLowerCase()
    const isAllowedType = allowedTypes.includes(mimeType) ||
      (target === 'photo' && mimeType === 'image/jpg')
    const isAllowedSize = file.size <= MAX_FILE_SIZE

    if (!isAllowedType || !isAllowedSize) {
      setUploadState(target, { error: invalidMessage })
      return
    }

    setUploadState(target, { loading: true })

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Oturum bilgisi alınamadı, lütfen tekrar giriş yapın.')

      const { column, label, folder, legacyPath } = UPLOAD_TARGETS[target]
      const previousUrl = target === 'photo' ? photoUrl : cvUrl
      const filePath = buildUniqueFilePath(folder, user.id, file)

      const { error: uploadError } = await supabase.storage
        .from('candidate-files')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
          cacheControl: '3600',
        })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('candidate-files').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('PROFILE')
        .update({ [column]: publicUrl })
        .eq('USER_ID', user.id)
      if (updateError) throw updateError

      const stalePaths = [storagePathFromPublicUrl(previousUrl), legacyPath(user.id)]
        .filter((path) => path && path !== filePath)
      if (stalePaths.length > 0) {
        await supabase.storage.from('candidate-files').remove(stalePaths)
      }

      if (target === 'photo') {
        setPhotoUrl(publicUrl)
        setPhotoRevision(Date.now())
        notifyHeaderPhotoChange(publicUrl)
      } else {
        setCvUrl(publicUrl)
      }
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

      const { column, label, legacyPath } = UPLOAD_TARGETS[target]
      const currentUrl = target === 'photo' ? photoUrl : cvUrl
      const pathsToRemove = [storagePathFromPublicUrl(currentUrl), legacyPath(user.id)]
        .filter(Boolean)

      if (pathsToRemove.length > 0) {
        const { error: removeError } = await supabase.storage
          .from('candidate-files')
          .remove(pathsToRemove)
        if (removeError) throw removeError
      }

      const { error: updateError } = await supabase
        .from('PROFILE')
        .update({ [column]: null })
        .eq('USER_ID', user.id)
      if (updateError) throw updateError

      if (target === 'photo') {
        setPhotoUrl('')
        notifyHeaderPhotoChange('')
      } else {
        setCvUrl('')
      }
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
    if (!form.dept.trim() || form.dept !== selectedDept) {
      newErrors.dept = 'Listeden bir departman seçmelisiniz'
    }
    if (!form.education.trim()) newErrors.education = 'Eğitim bilgisi zorunludur'
    if (!phone) {
      newErrors.phone = 'Telefon numarası zorunludur'
    } else if (!isValidPhoneNumber(phone)) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz'
    }
    if (experiences.length === 0) newErrors.experienceId = 'En az bir deneyim eklemelisiniz'
    if (skills.length === 0) newErrors.skillIds = 'En az bir yetenek seçmelisiniz'
    if (languages.length === 0) newErrors.langIds = 'En az bir dil seçmelisiniz'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Profil tamamlanma durumu: tüm zorunlu alanlar doluysa 1
  // Fotoğraf ve CV yükleme durumu da tamamlanma yüzdesine dahildir;
  // yükleme başarılı olduğunda state güncellenir, yüzde anında yükselir
  // Eğitim alanı yalnızca API listesinden üniversite seçilirse tamamlanmış sayılır
  const hasValidPhone = Boolean(phone) && isValidPhoneNumber(phone)
  const requiredChecks = [
    form.dept.trim() !== '' && form.dept === selectedDept,
    form.education.trim() !== '' && form.education === selectedEducation,
    hasValidPhone,
    experiences.length > 0,
    skills.length > 0,
    languages.length > 0,
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
    await handleSave()
  }

  // Kaydet: PROFILE güncellenir; ilişkiler PRFL_ID ile silinip yeniden yazılır
  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    setFormError('')

    try {
      const authUserId = await getAuthUserId()

      const is100Percent = Boolean(
        form.dept.trim() &&
        form.dept === selectedDept &&
        form.education.trim() &&
        form.education === selectedEducation &&
        hasValidPhone &&
        photoUrl &&
        cvUrl &&
        experiences.length > 0 &&
        skills.length > 0 &&
        languages.length > 0
      )
      const isCmpltdValue = is100Percent ? 1 : 0

      const { data: profileRow, error: profileIdError } = await supabase
        .from('PROFILE')
        .select('PROFILE_ID')
        .eq('USER_ID', authUserId)
        .maybeSingle()
      if (profileIdError) throw profileIdError

      let currentProfileId = profileRow?.PROFILE_ID || null

      if (!currentProfileId) {
        const { data: createdProfile, error: createProfileError } = await supabase
          .from('PROFILE')
          .insert({
            USER_ID: authUserId,
            DEPT: form.dept.trim(),
            EDUCATION: form.education.trim(),
            PHONE: phone || null,
            PRFL_PHT_URL: photoUrl || null,
            CV_URL: cvUrl || null,
            IS_CMPLTD: isCmpltdValue,
            CUSER: authUserId,
          })
          .select('PROFILE_ID')
          .maybeSingle()
        if (createProfileError) throw createProfileError
        currentProfileId = createdProfile?.PROFILE_ID
        if (!currentProfileId) throw new Error('Profil kaydı oluşturulamadı.')
      } else {
        const { error: profileError } = await supabase
          .from('PROFILE')
          .update({
            DEPT: form.dept.trim(),
            EDUCATION: form.education.trim(),
            PHONE: phone || null,
            PRFL_PHT_URL: photoUrl || null,
            CV_URL: cvUrl || null,
            IS_CMPLTD: isCmpltdValue,
          })
          .eq('USER_ID', authUserId)
        if (profileError) throw profileError
      }

      setProfileId(currentProfileId)

      const { error: deleteSkillRelError } = await supabase
        .from('PRFL_SKILL_REL')
        .delete()
        .eq('PRFL_ID', currentProfileId)
      if (deleteSkillRelError) throw deleteSkillRelError

      const { error: deleteLangRelError } = await supabase
        .from('PRFL_LANG_REL')
        .delete()
        .eq('PRFL_ID', currentProfileId)
      if (deleteLangRelError) throw deleteLangRelError

      if (skills.length > 0) {
        const { error: insertSkillRelError } = await supabase
          .from('PRFL_SKILL_REL')
          .insert(
            skills.map((skill) => ({
              PRFL_ID: currentProfileId,
              SKILL_ID: skill.id,
              CUSER: authUserId,
            }))
          )
        if (insertSkillRelError) throw insertSkillRelError
      }

      if (languages.length > 0) {
        const { error: insertLangRelError } = await supabase
          .from('PRFL_LANG_REL')
          .insert(
            languages.map((lang) => ({
              PRFL_ID: currentProfileId,
              LANG_ID: lang.id,
              CUSER: authUserId,
            }))
          )
        if (insertLangRelError) throw insertLangRelError
      }

      setIsCmpltd(isCmpltdValue)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (error) {
      console.error('Error saving profile:', error)
      const errorText = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
      const isDuplicatePhone = error?.code === '23505' && errorText.includes('phone')

      if (isDuplicatePhone) {
        setErrors((prev) => ({ ...prev, phone: 'Bu numara zaten kayıtlı' }))
        setFormError('Bu numara zaten kayıtlı')
      } else {
        setFormError(error.message || 'Profil kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const inputClass = (field) =>
    `w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
      errors[field]
        ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
        : 'border-gray-300 focus:ring-blue-100 focus:border-blue-400'
    }`

  if (isLoadingData) {
    return (
      <div className="max-w-3xl flex items-center justify-center py-24">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
          <p className="mt-4 text-slate-600 font-medium">Profil yükleniyor...</p>
        </div>
      </div>
    )
  }

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
                <img
                  key={`${photoUrl}-${photoRevision}`}
                  src={displayAssetUrl(photoUrl, photoRevision)}
                  alt="Profil fotoğrafı"
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-slate-700 mb-1">Profil Fotoğrafı</span>
              <p className="text-xs text-slate-500 mb-2.5">PNG, JPG veya WEBP, en fazla 5 MB</p>
              <input
                id="photo-upload"
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
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
                accept=".pdf, application/pdf"
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
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
              Telefon <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              id="phone"
              international
              defaultCountry="TR"
              countryCallingCodeEditable={false}
              value={phone || undefined}
              onChange={(value) => {
                setPhone(value || '')
                if (errors.phone) setErrors({ ...errors, phone: '' })
              }}
              numberInputProps={{
                inputMode: 'tel',
                autoComplete: 'tel',
                className: 'PhoneInputInput',
              }}
              className={`PhoneInput ${errors.phone ? 'PhoneInput--error' : ''}`}
              placeholder="5XX XXX XX XX"
            />
          
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="dept" className="block text-sm font-medium text-slate-700 mb-1.5">
                Departman <span className="text-red-500">*</span>
              </label>
              <DepartmentCombobox
                id="dept"
                value={form.dept}
                onChange={handleDeptChange}
                onSelect={handleDeptSelect}
                isSelected={form.dept !== '' && form.dept === selectedDept}
                error={errors.dept}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                En az 2 karakter yazın; tamamlanma için listeden bir departman seçmelisiniz
              </p>
              {form.dept.trim() !== '' && form.dept !== selectedDept && (
                <p className="mt-1 text-xs text-amber-600">
                  Yazdığınız değer henüz listeden seçilmedi; tamamlanma yüzdesine dahil olmaz
                </p>
              )}
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
                isSelected={form.education !== '' && form.education === selectedEducation}
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
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-800">Deneyim</h3>
            <button
              type="button"
              onClick={() => openExperienceModal()}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Ekle
            </button>
          </div>
          {errors.experienceId && (
            <p className="text-xs text-red-600">{errors.experienceId}</p>
          )}
          {experiences.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz deneyim eklenmedi.</p>
          ) : (
            <div className="space-y-3">
              {experiences.map((experience) => (
                <div
                  key={experience.EXPERIENCE_ID}
                  className="rounded-lg border border-gray-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {experience.POSITION} at {experience.CORP_NAME}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatExperienceInterval(
                          experience.SDATE,
                          experience.EDATE,
                          experience.STLL_WRKG
                        )}
                      </p>
                    </div>
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => openExperienceModal(experience)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        aria-label="Deneyimi düzenle"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExperience(experience.EXPERIENCE_ID)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Deneyimi sil"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {experience.DESCR && (
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
                      {experience.DESCR}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skills */}
        <fieldset className="space-y-5">
          <legend className="text-base font-semibold text-slate-800 mb-3">Yetenekler</legend>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Bilinen Yetenekler <span className="text-red-500">*</span>
            </label>
            <div className={`flex flex-wrap gap-2 rounded-lg border px-3 py-2.5 min-h-[46px] bg-white ${errors.skillIds ? 'border-red-300' : 'border-gray-300'}`}>
              {skills.map((skill) => (
                <span
                  key={skill.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white"
                >
                  {skill.name}
                </span>
              ))}
              <button
                type="button"
                onClick={() => setSkillModalOpen(true)}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-blue-600 border border-dashed border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Yetenek Ekle
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              'Yetenek Ekle' ile açılan pencereden arama yaparak veya önerilerden seçim yapın
            </p>
            {errors.skillIds && <p className="mt-1 text-xs text-red-600">{errors.skillIds}</p>}
          </div>
        </fieldset>

        {/* Languages */}
        <fieldset className="space-y-5">
          <legend className="text-base font-semibold text-slate-800 mb-3">Bilinen Diller</legend>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Bilinen Diller <span className="text-red-500">*</span>
            </label>
            <div className={`flex flex-wrap gap-2 rounded-lg border px-3 py-2.5 min-h-[46px] bg-white ${errors.langIds ? 'border-red-300' : 'border-gray-300'}`}>
              {languages.map((lang) => (
                <span
                  key={lang.id}
                  className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-sm font-medium bg-blue-600 text-white"
                >
                  {lang.name}
                  <button
                    type="button"
                    onClick={() => removeLanguage(lang.id)}
                    aria-label={`${lang.name} dilini kaldır`}
                    className="rounded-full p-0.5 hover:bg-blue-700 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              {popularLanguages
                .filter((lang) => !languages.some((selected) => selected.id === lang.id))
                .map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => addLanguage(lang)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 border border-gray-300 text-slate-700 text-sm font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-white transition-colors"
                  >
                    {lang.name}
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setLangModalOpen(true)}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-blue-600 border border-dashed border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Dil Ekle
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Önerilen dillere + ile ekleyin; listede olmayanlar için 'Dil Ekle' ile arama yapın
            </p>
            {errors.langIds && <p className="mt-1 text-xs text-red-600">{errors.langIds}</p>}
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-200">
          {saveSuccess && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Profiliniz başarıyla kaydedildi.</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setForm(initialForm)
              setPhone('')
              setLanguages([])
              setSelectedDept('')
              setSelectedEducation('')
              setErrors({})
            }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-white border border-gray-300 hover:bg-slate-50 transition-colors"
          >
            Temizle
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? (
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

      <ExperienceModal
        open={expModalOpen}
        isEditing={Boolean(editingExperienceId)}
        form={expForm}
        errors={expErrors}
        saving={expSaving}
        formError={expFormError}
        onChange={handleExperienceFormChange}
        onToggleStillWorking={handleToggleStillWorking}
        onClose={closeExperienceModal}
        onSubmit={handleAddExperience}
      />

      {/* Yetenek seçim modalı: seçim yalnızca yerel taslağa yazılır */}
      <SkillsModal
        open={skillModalOpen}
        onClose={() => setSkillModalOpen(false)}
        selected={skills}
        onSaved={(savedSkills) => {
          setSkills(savedSkills)
          if (errors.skillIds) setErrors({ ...errors, skillIds: '' })
        }}
      />

      <LanguagesModal
        open={langModalOpen}
        onClose={() => setLangModalOpen(false)}
        selected={languages}
        onSaved={(savedLanguages) => {
          setLanguages(savedLanguages)
          if (errors.langIds) setErrors({ ...errors, langIds: '' })
        }}
      />
    </div>
  )
}
