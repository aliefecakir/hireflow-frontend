import { useEffect, useMemo, useRef, useState } from 'react'

function normalizeCatalogSearch(value) {
  return String(value ?? '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
}

function filterCatalogOptions(options, query) {
  const needle = normalizeCatalogSearch(query)
  if (needle.length < 2) return []

  const starts = []
  const contains = []
  for (const item of options) {
    const hay = normalizeCatalogSearch(item?.name)
    if (!hay) continue
    if (hay.startsWith(needle)) starts.push(item)
    else if (hay.includes(needle)) contains.push(item)
  }
  return [...starts, ...contains].slice(0, 20)
}

export default function CatalogSearchSelect({
  id,
  options = [],
  value,
  onChange,
  placeholder = 'En az 2 karakter yazın, listeden seçin',
  noResultsLabel = 'Sonuç bulunamadı',
  inputClassName,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)
  const selected = options.find((item) => String(item.id) === String(value)) || null
  const displayValue = selected ? selected.name : query
  const results = useMemo(
    () => (selected ? [] : filterCatalogOptions(options, query)),
    [options, query, selected],
  )

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (selected || normalizeCatalogSearch(query).length < 2) {
      setOpen(false)
      setHighlightedIndex(-1)
      return
    }
    setOpen(true)
    setHighlightedIndex(-1)
  }, [query, selected])

  const clearSelection = () => {
    onChange('')
    setQuery('')
    setOpen(false)
    setHighlightedIndex(-1)
  }

  const handleSelect = (item) => {
    onChange(item.id)
    setQuery(item.name)
    setOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (event) => {
    if (selected) {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        clearSelection()
      } else if (event.key !== 'Tab' && event.key !== 'Escape' && event.key !== 'Shift') {
        event.preventDefault()
      }
      return
    }

    if (!open || results.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (highlightedIndex >= 0) handleSelect(results[highlightedIndex])
      else setOpen(false)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const showEmptyState = open && !selected && normalizeCatalogSearch(query).length >= 2 && results.length === 0

  return (
    <div ref={containerRef} className="relative mt-2">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        value={displayValue}
        readOnly={Boolean(selected)}
        onChange={(event) => {
          if (selected) return
          onChange('')
          setQuery(event.target.value)
        }}
        onKeyDown={handleKeyDown}
        onPaste={(event) => {
          if (selected) event.preventDefault()
        }}
        onFocus={() => {
          if (!selected && normalizeCatalogSearch(query).length >= 2) setOpen(true)
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={`${inputClassName} ${selected ? 'caret-transparent' : ''}`}
      />
      {open && (results.length > 0 || showEmptyState) ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {showEmptyState ? (
            <li className="px-4 py-2.5 text-sm text-slate-500">{noResultsLabel}</li>
          ) : (
            results.map((item, index) => (
              <li key={item.id} role="option" aria-selected={index === highlightedIndex}>
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    index === highlightedIndex ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
