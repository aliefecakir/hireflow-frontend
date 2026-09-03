import { createContext, useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'

const DEFAULT_DURATION = 4000

const DEFAULT_TITLES = {
  success: 'Başarılı',
  warning: 'Dikkat',
  error: 'Hata Oluştu',
}

const TOAST_STYLES = {
  success: {
    badge: 'bg-emerald-50 text-emerald-600',
    bar: 'bg-emerald-500',
    Icon: Check,
  },
  warning: {
    badge: 'bg-amber-50 text-amber-600',
    bar: 'bg-amber-500',
    Icon: Info,
  },
  error: {
    badge: 'bg-rose-50 text-rose-600',
    bar: 'bg-rose-500',
    Icon: AlertTriangle,
  },
}

let pushToast = () => {}

function emit(type, title, message) {
  const hasSecondary = typeof message === 'string' && message.trim() !== ''
  pushToast({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title: hasSecondary ? title : DEFAULT_TITLES[type],
    message: hasSecondary ? message : title,
  })
}

export const showToast = {
  success: (title, message) => emit('success', title, message),
  warning: (title, message) => emit('warning', title, message),
  error: (title, message) => emit('error', title, message),
  info: (title, message) => emit('warning', title, message),
}

const ToastContext = createContext(showToast)

function ToastCard({ toast, onClose }) {
  const { badge, bar, Icon } = TOAST_STYLES[toast.type] || TOAST_STYLES.success

  useEffect(() => {
    const timeoutId = setTimeout(() => onClose(toast.id), DEFAULT_DURATION)
    return () => clearTimeout(timeoutId)
  }, [toast.id, onClose])

  return (
    <div
      role="status"
      className="pointer-events-auto relative w-[min(92vw,380px)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 animate-[toast-in_220ms_ease-out]"
    >
      <div className="flex items-start gap-3 px-4 py-4 pr-11">
        <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${badge}`}>
          <Icon size={20} strokeWidth={2.4} />
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-sm leading-5 text-slate-500">{toast.message}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => onClose(toast.id)}
        className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
      >
        <X size={16} strokeWidth={2.2} />
      </button>
      <div className="absolute bottom-0 left-0 h-1 w-full overflow-hidden bg-slate-100">
        <div className={`h-full w-full ${bar} toast-progress-bar`} />
      </div>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const add = useCallback((toast) => {
    setToasts((prev) => [...prev.slice(-4), toast])
  }, [])

  useEffect(() => {
    pushToast = add
    return () => {
      pushToast = () => {}
    }
  }, [add])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed top-5 right-5 z-[100] flex flex-col items-end gap-3">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
