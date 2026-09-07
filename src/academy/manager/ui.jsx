import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { DEFAULT_PAGE_SIZE, KIND_LABELS, PAGE_SIZE_OPTIONS, isFlagOn } from '../api/helpers'

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500'

export function toDateInput(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function renumberAttachments(map) {
  const rows = Object.values(map).sort((a, b) => Number(a.ordNo) - Number(b.ordNo))
  const next = {}
  rows.forEach((item, index) => {
    next[item.questionId] = { ...item, ordNo: index + 1 }
  })
  return next
}

export function prependAttachment(map, questionId, extra = {}) {
  if (map[questionId]) return map
  const next = {}
  for (const [id, item] of Object.entries(map)) {
    next[id] = { ...item, ordNo: Number(item.ordNo) + 1 }
  }
  next[questionId] = { questionId, isReq: 1, ordNo: 1, ...extra }
  return next
}

export function reorderAttachments(map, fromId, toId) {
  const rows = Object.values(map).sort((a, b) => Number(a.ordNo) - Number(b.ordNo))
  const from = rows.findIndex((item) => String(item.questionId) === String(fromId))
  const to = rows.findIndex((item) => String(item.questionId) === String(toId))
  if (from < 0 || to < 0 || from === to) return map
  const nextRows = [...rows]
  const [moved] = nextRows.splice(from, 1)
  nextRows.splice(to, 0, moved)
  const next = {}
  nextRows.forEach((item, index) => {
    next[item.questionId] = { ...item, ordNo: index + 1 }
  })
  return next
}

export function displayName(profile) {
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()
}

export function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function fullName(app) {
  return `${app?.name || ''} ${app?.surname || ''}`.trim() || 'Aday'
}

export function statusBadgeClass(status) {
  const value = String(status || '').toLocaleLowerCase('tr-TR')
  if (/kabul|onay|apprv|accepted|değerlendirildi/.test(value)) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (/red|reject|rjct/.test(value)) return 'border-red-200 bg-red-50 text-red-700'
  if (/mülakat|interview/.test(value)) return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

export function applicationStatusLabel(row) {
  return row?.statusName || row?.statusDescr || '—'
}

export function createEmptyChoice(ordNo, key = Date.now() + ordNo) {
  return { key, choiceText: '', score: 0, isOther: false }
}

export function useEscape(onClose) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
}

export function ConfirmDialog({
  title = 'Onay',
  message,
  confirmLabel = 'Evet',
  cancelLabel = 'Hayır',
  confirmClassName = 'bg-blue-600 text-white hover:bg-blue-700',
  onConfirm,
  onCancel,
}) {
  useEscape(onCancel)

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <p className="mt-2 text-sm text-slate-600">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function paginateRows(rows, page, size) {
  const list = Array.isArray(rows) ? rows : []
  const total = list.length
  const pageSize = Number(size) || DEFAULT_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const start = (currentPage - 1) * pageSize
  return {
    items: list.slice(start, start + pageSize),
    total,
    page: currentPage,
    size: pageSize,
  }
}

export function CompactCategoryFilter({ groups, activeId, onActiveChange }) {
  const active = groups.find((group) => group.id === activeId) || groups[0]
  if (!active) return null

  const applied = groups
    .map((group) => {
      const selected = group.items.find((item) => item.id === group.value)
      if (!selected || selected.id === 'all') return null
      return { group, selected }
    })
    .filter(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="shrink-0 text-sm font-medium text-slate-700">Filtre uygula:</span>
      <select
        value={active.id}
        onChange={(event) => onActiveChange(event.target.value)}
        className="w-40 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Filtre kategorisi"
      >
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.label}
          </option>
        ))}
      </select>
      <select
        value={active.value}
        onChange={(event) => active.onChange(event.target.value)}
        className="w-52 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={active.label}
      >
        {active.items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      {applied.map(({ group, selected }) => (
        <span
          key={group.id}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-medium text-blue-800"
        >
          <span>
            {group.label}: {selected.label}
          </span>
          <button
            type="button"
            onClick={() => group.onChange('all')}
            className="rounded-full p-0.5 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-900"
            aria-label={`${group.label} filtresini kaldır`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  )
}

export function LoadingState({ label = 'Yükleniyor...' }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="mx-auto inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
        <p className="mt-4 font-medium text-slate-600">{label}</p>
      </div>
    </div>
  )
}

export function TablePager({ page, size, total, onPageChange, onSizeChange, disabled = false }) {
  const totalCount = Number(total) || 0
  const pageSize = Number(size) || DEFAULT_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalCount)
  const canPrev = currentPage > 1 && totalCount > 0
  const canNext = currentPage < totalPages && totalCount > 0

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-sm text-slate-600">
        Sayfa başına
        <select
          value={pageSize}
          disabled={disabled}
          onChange={(event) => onSizeChange(Number(event.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-slate-600">
        {totalCount === 0 ? 'Kayıt yok' : `${start}–${end} / ${totalCount} kayıt`}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Önceki sayfa"
          disabled={!canPrev || disabled}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Sonraki sayfa"
          disabled={!canNext || disabled}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 disabled:opacity-50"
    >
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </span>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
    </button>
  )
}

function typeBadgeClass(kind) {
  if (kind === 'single') return 'bg-blue-50 text-blue-700'
  if (kind === 'multi') return 'bg-violet-50 text-violet-700'
  if (kind === 'file') return 'bg-sky-50 text-sky-700'
  if (kind === 'date') return 'bg-teal-50 text-teal-700'
  return 'bg-slate-100 text-slate-700'
}

export function PurposeBadge({ isAssmt }) {
  if (isFlagOn(isAssmt)) {
    return (
      <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
        Mülakat Kriteri
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      Aday Sorusu
    </span>
  )
}

export function TypeBadge({ kind }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${typeBadgeClass(kind)}`}>
      {KIND_LABELS[kind] || KIND_LABELS.single}
    </span>
  )
}

export function ReadOnlyField({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <input
        readOnly
        value={value || '—'}
        className={`mt-3 bg-slate-50 ${inputClass}`}
      />
    </div>
  )
}
