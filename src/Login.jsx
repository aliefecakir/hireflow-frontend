import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import { getErrorMessage, isSessionFresh, setAccessToken } from './api/client'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'
import { showToast } from './toast/ToastProvider'

const ROLE_ROUTES = {
  CAND: '/candidate/posts',
  HR: '/hr',
  MNGR: '/manager',
}

const LOGIN_INTENT_KEY = 'hireflow.loginIntent'

function markLoginIntent() {
  sessionStorage.setItem(LOGIN_INTENT_KEY, '1')
}

function consumeLoginIntent() {
  const value = sessionStorage.getItem(LOGIN_INTENT_KEY) === '1'
  sessionStorage.removeItem(LOGIN_INTENT_KEY)
  return value
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const redirectingRef = useRef(false)
  const userAttemptedLoginRef = useRef(false)
  const { session, userRole, profileError, loading: authLoading } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const oauthError =
      params.get('error_description') ||
      params.get('error') ||
      hashParams.get('error_description') ||
      hashParams.get('error')

    if (oauthError) {
      userAttemptedLoginRef.current = true
      showToast.error('Hata Oluştu', oauthError)
    }

    if (consumeLoginIntent()) {
      userAttemptedLoginRef.current = true
    }
  }, [])

  useEffect(() => {
    if (authLoading || redirectingRef.current) return
    if (session && userRole && isSessionFresh(session)) {
      const route = ROLE_ROUTES[userRole]
      if (route) {
        redirectingRef.current = true
        sessionStorage.removeItem(LOGIN_INTENT_KEY)
        navigate(route, { replace: true })
      }
    }
  }, [authLoading, session, userRole, navigate])

  useEffect(() => {
    if (userAttemptedLoginRef.current && profileError) {
      showToast.error('Hata Oluştu', profileError)
      setLoading(false)
    }
  }, [profileError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    userAttemptedLoginRef.current = true
    markLoginIntent()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (!data.session?.access_token) {
        throw new Error('Oturum oluşturulamadı. Lütfen tekrar deneyin.')
      }

      setAccessToken(data.session.access_token)
      // Profil tek yerden çekilsin: AuthContext SIGNED_IN. Çift /users/me 500'e yol açıyordu.
    } catch (err) {
      console.error('Giriş isteği başarısız:', err)
      showToast.error('Hata Oluştu', getErrorMessage(err) || 'Invalid email or password.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white border border-slate-100 shadow-xl rounded-xl p-10 md:p-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 w-fit mb-6 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={18} />
          <Home size={18} />
          Portala Dön
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-950 mb-1 tracking-tight">HireFlow</h1>
          <h2 className="text-lg font-slate-900 mb-1">Welcome back</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-slate-600">
                Password
              </label>
              <a href="#" className="text-xs text-blue-700 hover:underline font-medium">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200"
                placeholder="••••••••"
              />
              <button
                type="button"
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                onTouchStart={() => setShowPassword(true)}
                onTouchEnd={() => setShowPassword(false)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-700 hover:bg-blue-800 hover:shadow-lg text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-all duration-200 shadow-sm cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-blue-700 hover:underline"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
