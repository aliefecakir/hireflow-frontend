import { supabase } from '../supabaseClient'

export const API_ORIGIN = 'http://localhost:8080'
export const API_BASE_URL = `${API_ORIGIN}/api/v1`
export const ACADEMY_API_BASE_URL = `${API_ORIGIN}/api`

const TOKEN_SKEW_SECONDS = 30

let currentAccessToken: string | null = null

type AuthSession = {
  access_token?: string
  refresh_token?: string
  expires_at?: number
  user?: unknown
} | null

export class ApiError extends Error {
  status: number
  response?: { data?: { message?: string }; status?: number }

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.response = { data: { message }, status }
  }
}

export function setAccessToken(token: string | null) {
  currentAccessToken = token
}

export function getStoredAccessToken() {
  return currentAccessToken
}

function readJwtExp(accessToken: string): number | null {
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const parsed = JSON.parse(atob(normalized))
    return typeof parsed.exp === 'number' ? parsed.exp : null
  } catch {
    return null
  }
}

export function isSessionFresh(session: AuthSession, skewSeconds = TOKEN_SKEW_SECONDS): boolean {
  if (!session?.access_token) return false
  const expiresAt = session.expires_at ?? readJwtExp(session.access_token)
  if (typeof expiresAt !== 'number') return true
  return expiresAt > Math.floor(Date.now() / 1000) + skewSeconds
}

export function getErrorMessage(err: unknown): string {
  const anyErr = err as {
    response?: { data?: { message?: string } }
    message?: string
  } | null
  const msg = anyErr?.response?.data?.message || anyErr?.message || ''
  const trimmed = String(msg).trim()
  if (!trimmed || trimmed === 'Profil alınamadı:' || trimmed === 'Profil alınamadı') {
    return 'Profil bilgisi alınamadı. Lütfen tekrar deneyin.'
  }
  if (/internal server error/i.test(trimmed)) {
    return 'Sunucu hatası oluştu. Lütfen birkaç saniye sonra tekrar deneyin.'
  }
  return trimmed
}

export async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    return body.message || body.error || body.detail || ''
  } catch {
    return ''
  }
}

export async function getFreshSession(options: { clearInvalid?: boolean } = {}): Promise<AuthSession> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    setAccessToken(null)
    return null
  }

  if (isSessionFresh(session)) {
    setAccessToken(session.access_token)
    return session
  }

  const { data, error } = await supabase.auth.refreshSession()
  if (!error && data.session && isSessionFresh(data.session)) {
    setAccessToken(data.session.access_token)
    return data.session
  }

  setAccessToken(null)
  if (options.clearInvalid) {
    await supabase.auth.signOut({ scope: 'local' })
  }
  return null
}

export async function getAccessToken(): Promise<string | null> {
  if (currentAccessToken) {
    const expiresAt = readJwtExp(currentAccessToken)
    if (!expiresAt || expiresAt > Math.floor(Date.now() / 1000) + TOKEN_SKEW_SECONDS) {
      return currentAccessToken
    }
  }

  const session = await getFreshSession()
  return session?.access_token ?? null
}

type ApiRequestOptions = RequestInit & { baseUrl?: string; optionalAuth?: boolean }

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { baseUrl = API_BASE_URL, optionalAuth = false, ...fetchOptions } = options
  const token = await getAccessToken()
  if (!token && !optionalAuth) {
    throw new ApiError('Oturum bilgisi alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.', 401)
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...fetchOptions,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
    },
  })

  if (!response.ok) {
    const detail = await parseErrorMessage(response)
    throw new ApiError(detail || `İstek başarısız (HTTP ${response.status})`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
