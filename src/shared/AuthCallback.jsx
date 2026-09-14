// Microsoft OAuth dönüşü: login formunu göstermeden oturumu bekler.
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { resolveHomeRoute } from './api/auth'
import { getErrorMessage, isSessionFresh } from './api/client'
import { useAuth } from './AuthContext'
import BrandMark from './BrandMark'
import { supabase } from './supabaseClient'
import { showToast } from './toast/ToastProvider'

const LOGIN_INTENT_KEY = 'hireflow.loginIntent'
const CALLBACK_TIMEOUT_MS = 20000

function readOauthError() {
  const params = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return (
    params.get('error_description')
    || params.get('error')
    || hashParams.get('error_description')
    || hashParams.get('error')
  )
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const redirectedRef = useRef(false)
  const { session, userRole, userProfile, profileError, loading: authLoading } = useAuth()

  const finish = (path, errorMessage) => {
    if (redirectedRef.current) return
    redirectedRef.current = true
    sessionStorage.removeItem(LOGIN_INTENT_KEY)
    if (errorMessage) {
      showToast.error('Hata Oluştu', errorMessage)
    }
    navigate(path, { replace: true })
  }

  useEffect(() => {
    const oauthError = readOauthError()
    if (oauthError) {
      finish('/', oauthError)
      return undefined
    }

    let cancelled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _currentSession) => {
      // Oturum AuthContext üzerinden yüklenir; hedef rota ikinci effect'te seçilir.
    })

    supabase.auth.getSession().then(({ error }) => {
      if (cancelled || redirectedRef.current) return
      if (error) {
        finish('/', getErrorMessage(error) || 'Oturum bilgisi alınamadı.')
      }
    })

    const timeoutId = window.setTimeout(() => {
      finish('/', 'Giriş zaman aşımına uğradı. Lütfen tekrar deneyin.')
    }, CALLBACK_TIMEOUT_MS)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      window.clearTimeout(timeoutId)
    }
  }, [navigate])

  useEffect(() => {
    if (redirectedRef.current || authLoading) return

    if (profileError) {
      finish('/', profileError)
      return
    }

    if (session && userRole && isSessionFresh(session)) {
      const route = resolveHomeRoute(userRole, userProfile?.roles)
      if (route) {
        finish(route)
        return
      }
      finish('/', 'Hesabınıza tanımlı bir rol bulunamadı. Lütfen yöneticinize başvurun.')
    }
  }, [authLoading, session, userRole, userProfile, profileError, navigate])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <BrandMark className="h-14 w-14" />
      <div className="mt-6 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      <p className="mt-4 text-center font-medium text-slate-600">
        Giriş yapılıyor, lütfen bekleyin...
      </p>
    </div>
  )
}
