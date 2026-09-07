import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { fetchCurrentUserProfile } from './api/auth'
import { getErrorMessage, getFreshSession, setAccessToken } from './api/client'
import { supabase } from './supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [loading, setLoading] = useState(true)
  const profileLoadedRef = useRef(false)

  const clearAuthState = () => {
    profileLoadedRef.current = false
    setAccessToken(null)
    setSession(null)
    setUser(null)
    setUserProfile(null)
    setUserRole(null)
    setProfileError(null)
  }

  const loadUserProfile = async (accessToken) => {
    if (!accessToken) {
      return
    }

    setProfileError(null)

    try {
      const profile = await fetchCurrentUserProfile(accessToken)
      setUserProfile(profile)
      setUserRole(profile?.primaryRole || null)
      setProfileError(null)
      profileLoadedRef.current = true
    } catch (error) {
      console.error('Profil isteği başarısız:', error)
      setProfileError(getErrorMessage(error))
      profileLoadedRef.current = false

      if (error?.status === 401) {
        setTimeout(() => {
          supabase.auth.signOut({ scope: 'local' })
        }, 0)
        clearAuthState()
      }
    }
  }

  useEffect(() => {
    let isMounted = true

    const syncSession = async (event, currentSession) => {
      if (!isMounted) return

      if (event === 'SIGNED_OUT') {
        profileLoadedRef.current = false
        setAccessToken(null)
        setSession(null)
        setUser(null)
        setUserProfile(null)
        setUserRole(null)
        setLoading(false)
        return
      }

      if (!currentSession?.access_token) {
        if (event !== 'TOKEN_REFRESHED') {
          setLoading(false)
        }
        return
      }

      setAccessToken(currentSession.access_token)
      setSession(currentSession)
      setUser(currentSession.user ?? null)

      if (event === 'TOKEN_REFRESHED') {
        return
      }

      const shouldReloadProfile =
        event === 'INITIAL_SESSION' ||
        event === 'USER_UPDATED' ||
        event === 'SIGNED_IN'

      if (shouldReloadProfile) {
        await loadUserProfile(currentSession.access_token)
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    const initializeAuth = async () => {
      try {
        const currentSession = await getFreshSession({ clearInvalid: true })
        if (!isMounted) return

        if (!currentSession) {
          clearAuthState()
          setLoading(false)
          return
        }

        await syncSession('INITIAL_SESSION', currentSession)
      } catch (error) {
        console.error('Error getting session:', error)
        if (isMounted) {
          clearAuthState()
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (event === 'INITIAL_SESSION') return
        syncSession(event, currentSession)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      clearAuthState()
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const value = {
    user,
    session,
    userProfile,
    userRole,
    profileError,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
