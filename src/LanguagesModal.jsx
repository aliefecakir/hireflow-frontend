import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'

const SEARCH_MIN_LENGTH = 2
const SEARCH_RESULT_LIMIT = 10

const toLang = (row) => ({ id: row.LANG_ID, name: row.NAME })

// i/İ/ı/I ve diğer Türkçe karakterleri katlayarak "ital" ile "İtalyanca"
// eşleşmesini sağlar. PostgreSQL ILIKE bu harfleri aynı saymaz.
const foldTurkish = (text) =>
  (text || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')

const SpinnerIcon = ({ className = 'h-4 w-4 text-blue-600' }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

// Dil seçim modalı: arama LANG.NAME üzerinden yapılır.
// Kaydet veritabanına yazmaz; seçimi profil taslağına aktarır.
export default function LanguagesModal({ open, onClose, selected, onSaved }) {
  if (!open) return null

  return (
    <LanguagesModalContent
      onClose={onClose}
      selected={selected}
      onSaved={onSaved}
    />
  )
}

function LanguagesModalContent({ onClose, selected, onSaved }) {
  const [draft, setDraft] = useState(selected)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState([])
  const [catalog, setCatalog] = useState([])
  const [catalogReady, setCatalogReady] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const inputRef = useRef(null)
  const searchBoxRef = useRef(null)

  const selectedIds = new Set(draft.map((lang) => lang.id))
  const visibleResults = results.filter((lang) => !selectedIds.has(lang.id))

  useEffect(() => {
    let cancelled = false

    supabase
      .from('LANG')
      .select('LANG_ID, NAME')
      .order('NAME')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) throw error
        setCatalog((data || []).map(toLang))
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Error fetching languages:', error)
        setSearchFailed(true)
      })
      .finally(() => {
        if (!cancelled) setCatalogReady(true)
      })

    inputRef.current?.focus()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < SEARCH_MIN_LENGTH) return

    const foldedQuery = foldTurkish(trimmed)
    const matched = catalog
      .filter((lang) => foldTurkish(lang.name).includes(foldedQuery))
      .slice(0, SEARCH_RESULT_LIMIT)

    setResults(matched)
    setHighlightedIndex(matched.length > 0 ? 0 : -1)
    setDropdownOpen(true)
  }, [query, catalog])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return
      if (dropdownOpen) setDropdownOpen(false)
      else onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dropdownOpen, onClose])

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  const addLang = (lang) => {
    setDraft((prev) => (prev.some((item) => item.id === lang.id) ? prev : [...prev, lang]))
    setQuery('')
    setResults([])
    setDropdownOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const removeLang = (langId) => {
    setDraft((prev) => prev.filter((lang) => lang.id !== langId))
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
      e.preventDefault()
      const lang = visibleResults[highlightedIndex]
      if (lang) addLang(lang)
    }
  }

  const handleSave = () => {
    onSaved?.(draft)
    onClose()
  }

  const searching = !catalogReady && !searchFailed && query.trim().length >= SEARCH_MIN_LENGTH
  const showHelperText = focused && query.trim().length < SEARCH_MIN_LENGTH
  const showDropdown =
    dropdownOpen && (searching || searchFailed || query.trim().length >= SEARCH_MIN_LENGTH)
  const showEmptyResults =
    showDropdown && !searching && !searchFailed && visibleResults.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="languages-modal-title">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 id="languages-modal-title" className="text-lg font-semibold text-slate-800">Bilinen Dillerim</h2>
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

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Seçilen Diller</span>
              <span className="text-xs text-slate-500">{draft.length} dil</span>
            </div>
            {draft.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {draft.map((lang) => (
                  <span
                    key={lang.id}
                    className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-blue-600 text-white text-sm font-medium"
                  >
                    {lang.name}
                    <button
                      type="button"
                      onClick={() => removeLang(lang.id)}
                      aria-label={`${lang.name} dilini kaldır`}
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
                Henüz dil seçilmedi. Arama yaparak ekleyebilirsiniz.
              </p>
            )}
          </section>

          <section>
            <label htmlFor="lang-search" className="block text-sm font-medium text-slate-700 mb-1.5">
              Dil Ara
            </label>
            <div ref={searchBoxRef} className="relative">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  ref={inputRef}
                  id="lang-search"
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="örn. İtalyanca, Rusça, Japonca"
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
                      Diller aranırken bir hata oluştu. Lütfen tekrar deneyin.
                    </li>
                  ) : searching ? (
                    <li className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-500">
                      <SpinnerIcon className="h-3.5 w-3.5" />
                      Diller aranıyor...
                    </li>
                  ) : showEmptyResults ? (
                    <li className="px-4 py-2.5 text-sm text-slate-500">Dil bulunamadı</li>
                  ) : (
                    visibleResults.map((lang, index) => (
                      <li key={lang.id}>
                        <button
                          type="button"
                          onClick={() => addLang(lang)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`w-full text-left px-4 py-2 text-sm text-slate-800 transition-colors ${
                            index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          {lang.name}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Diller yalnızca listeden seçilebilir; serbest metin eklenemez.
            </p>
          </section>
        </div>

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
