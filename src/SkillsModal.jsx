import { useEffect, useRef, useState } from 'react'
import { fetchSkills } from './api/profile'

// Arama eşiği ve liste boyutları
const SEARCH_MIN_LENGTH = 2
const SEARCH_DEBOUNCE_MS = 350
const SEARCH_RESULT_LIMIT = 10
const POPULAR_SKILL_NAMES = [
  'Java',
  'Python',
  'JavaScript',
  'TypeScript',
  'React',
  'Angular',
  'Spring Boot',
  'Node.js',
  'C#',
  'SQL',
  'PostgreSQL',
  'Docker',
  'Kubernetes',
  'Git',
  'AWS',
]

// SKILL satırını bileşen içinde kullanılan şekle çevirir
const SpinnerIcon = ({ className = 'h-4 w-4 text-blue-600' }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

// Yetenek seçim modalı (Kariyer.net benzeri): seçili yetenekler, autocomplete
// arama ve popüler yetenekler bölümlerinden oluşur. Yetenekler yalnızca SKILL
// tablosundan seçilebilir. Kaydet veritabanına yazmaz; seçimi profile
// taslağına aktarır. İçerik her açılışta yeniden mount edilir, böylece taslak
// seçim her seferinde mevcut durumdan temiz başlar
export default function SkillsModal({ open, onClose, selected, onSaved }) {
  if (!open) return null

  return (
    <SkillsModalContent
      onClose={onClose}
      selected={selected}
      onSaved={onSaved}
    />
  )
}

function SkillsModalContent({ onClose, selected, onSaved }) {
  const [draft, setDraft] = useState(selected) // Kaydedene kadar bekleyen seçim
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState([])
  // Mount anında öneriler indirilmeye başlandığı için başlangıç değeri true
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)

  const inputRef = useRef(null)
  const searchBoxRef = useRef(null)

  // Zaten seçili yetenekler arama sonuçlarında ve önerilerde görünmez
  const selectedIds = new Set(draft.map((skill) => skill.id))
  const visibleResults = results.filter((skill) => !selectedIds.has(skill.id))
  const visibleSuggestions = suggestions.filter((skill) => !selectedIds.has(skill.id))

  // Mount olduğunda popüler yetenekleri getir; unload edilirse state
  // güncellemeleri iptal edilir
  useEffect(() => {
    let cancelled = false

    fetchSkills({ limit: 500 })
      .then((data) => {
        if (cancelled) return
        const byName = new Map((data || []).map((row) => [row.name, { id: row.skillId, name: row.name }]))
        setSuggestions(
          POPULAR_SKILL_NAMES.map((name) => byName.get(name)).filter(Boolean)
        )
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Error fetching suggested skills:', error)
        setSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false)
      })

    inputRef.current?.focus()
    return () => {
      cancelled = true
    }
  }, [])

  // Debounce'lu yetenek arama: en az 2 karakter gerekir, sonuçlar yalnızca
  // aktif (IS_ACTV = 1) kayıtlardan gelir. 2 karakterin altındaki temizleme
  // onChange handler'ında yapılır
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < SEARCH_MIN_LENGTH) return

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setSearching(true)
        setSearchFailed(false)
        const data = await fetchSkills({ q: trimmed, limit: SEARCH_RESULT_LIMIT })
        setResults((data || []).map((row) => ({ id: row.skillId, name: row.name })))
        setHighlightedIndex(0)
        setDropdownOpen(true)
      } catch (error) {
        if (error?.name === 'AbortError') return
        console.error('Error searching skills:', error)
        setResults([])
        setSearchFailed(true)
        setDropdownOpen(true)
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  // Dışına tıklanınca dropdown'u kapat
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Escape: dropdown açıksa onu kapatır, değilse modalı kapatır
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return
      if (dropdownOpen) setDropdownOpen(false)
      else onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dropdownOpen, onClose])

  // Modal açıkken arka planı kaydırmayı kilitle
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  const addSkill = (skill) => {
    setDraft((prev) => (prev.some((s) => s.id === skill.id) ? prev : [...prev, skill]))
    setQuery('')
    setResults([])
    setDropdownOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const removeSkill = (skillId) => {
    setDraft((prev) => prev.filter((s) => s.id !== skillId))
  }

  const handleQueryChange = (e) => {
    const value = e.target.value
    setQuery(value)
    if (value.trim().length < SEARCH_MIN_LENGTH) {
      setResults([])
      setDropdownOpen(false)
      setSearchFailed(false)
      setHighlightedIndex(-1)
    }
  }

  const handleSearchKeyDown = (e) => {
    if (!dropdownOpen || visibleResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % visibleResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev - 1 + visibleResults.length) % visibleResults.length)
    } else if (e.key === 'Enter') {
      // Katı seçim: Enter yalnızca vurgulanmış liste öğesini ekler,
      // serbest metin eklenmez
      e.preventDefault()
      const skill = visibleResults[highlightedIndex]
      if (skill) addSkill(skill)
    }
  }

  // Seçimi yalnızca profil taslağına aktarır; veritabanı kaydı profil
  // formundaki Kaydet ile birlikte ileride yapılacak
  const handleSave = () => {
    onSaved?.(draft)
    onClose()
  }

  const showHelperText = focused && query.trim().length < SEARCH_MIN_LENGTH
  const showDropdown =
    dropdownOpen && (searching || searchFailed || query.trim().length >= SEARCH_MIN_LENGTH)
  const showEmptyResults =
    showDropdown && !searching && !searchFailed && visibleResults.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="skills-modal-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 id="skills-modal-title" className="text-lg font-semibold text-slate-800">Yeteneklerim</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Seçili yetenekler */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Seçilen Yetenekler</span>
              <span className="text-xs text-slate-500">{draft.length} yetenek</span>
            </div>
            {draft.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {draft.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-blue-600 text-white text-sm font-medium"
                  >
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill.id)}
                      aria-label={`${skill.name} yeteneğini kaldır`}
                      className="rounded-full p-0.5 hover:bg-blue-700 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-gray-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                Henüz yetenek seçilmedi. Arayarak veya önerilerden ekleyebilirsiniz.
              </p>
            )}
          </section>

          {/* Yetenek arama */}
          <section>
            <label htmlFor="skill-search" className="block text-sm font-medium text-slate-700 mb-1.5">
              Yetenek Ara
            </label>
            <div ref={searchBoxRef} className="relative">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  ref={inputRef}
                  id="skill-search"
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="örn. React, SQL, Figma"
                  autoComplete="off"
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <SpinnerIcon />
                  </div>
                )}
              </div>
              {showHelperText && (
                <p className="mt-1.5 text-xs text-slate-500">En az 2 karakter girmelisiniz.</p>
              )}

              {showDropdown && (
                <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-lg py-1">
                  {searchFailed ? (
                    <li className="px-4 py-2.5 text-sm text-amber-600">
                      Yetenekler aranırken bir hata oluştu. Lütfen tekrar deneyin.
                    </li>
                  ) : searching ? (
                    <li className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-500">
                      <SpinnerIcon className="h-3.5 w-3.5" />
                      Yetenekler aranıyor...
                    </li>
                  ) : showEmptyResults ? (
                    <li className="px-4 py-2.5 text-sm text-slate-500">Yetenek bulunamadı</li>
                  ) : (
                    visibleResults.map((skill, index) => (
                      <li key={skill.id}>
                        <button
                          type="button"
                          onClick={() => addSkill(skill)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`w-full text-left px-4 py-2 text-sm text-slate-800 transition-colors ${
                            index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          {skill.name}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Yetenekler yalnızca listeden seçilebilir; serbest metin eklenemez.
            </p>
          </section>

          {/* Popüler / önerilen yetenekler */}
          <section>
            <span className="block text-sm font-medium text-slate-700 mb-2">Popüler Yetenekler</span>
            {loadingSuggestions ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <SpinnerIcon className="h-3.5 w-3.5" />
                Öneriler yükleniyor...
              </div>
            ) : visibleSuggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {visibleSuggestions.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => addSkill(skill)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 border border-gray-300 text-slate-700 text-sm font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-white transition-colors"
                  >
                    {skill.name}
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Önerilen tüm yetenekler zaten seçili.</p>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-white border border-gray-300 hover:bg-slate-50 transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}
