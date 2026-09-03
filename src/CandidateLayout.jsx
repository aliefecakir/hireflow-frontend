import { useState, useEffect } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { fetchMyProfile } from './api/profile'
import { useAuth } from './AuthContext'

export const PROFILE_PHOTO_CHANGED_EVENT = 'profile-photo-changed'

export default function CandidateLayout() {
  const [userName, setUserName] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoRevision, setPhotoRevision] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const menuItems = [
    {
      name: 'İlanlar',
      path: '/candidate/posts',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Başvurularım',
      path: '/candidate/applications',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Profil Ayarları',
      path: '/candidate/profile',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    const handlePhotoChange = (event) => {
      setPhotoUrl(event.detail?.photoUrl || '')
      setPhotoRevision(event.detail?.revision || Date.now())
    }
    window.addEventListener(PROFILE_PHOTO_CHANGED_EVENT, handlePhotoChange)
    return () => window.removeEventListener(PROFILE_PHOTO_CHANGED_EVENT, handlePhotoChange)
  }, [])

  const fetchUserData = async () => {
    try {
      const detail = await fetchMyProfile()
      setUserName(detail.name || '')
      setPhotoUrl(detail.prflPhtUrl || '')
      setPhotoRevision(Date.now())
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Header - Full Width */}
      <header className="w-full bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
        <div className="h-12 px-6 flex items-center justify-between">
          {/* Left Side - Logo */}
          <Link to="/candidate/posts" className="flex items-center space-x-2 group">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-md flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-white font-bold text-xs">HF</span>
            </div>
            <h1 className="text-base font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
              HireFlow
            </h1>
          </Link>
          
          {/* Right Side - User Profile Section */}
          <div className="relative">
            <div 
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {/* Profile Picture */}
              <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                {photoUrl ? (
                  <img
                    key={`${photoUrl}-${photoRevision}`}
                    src={photoUrl ? `${photoUrl.split('?')[0]}?v=${photoRevision}` : ''}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-xs">
                    {loading ? '...' : userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Welcome Text */}
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium text-slate-800">
                  {loading ? 'Yükleniyor...' : `Hoşgeldin ${userName}`}
                </span>
              </div>

              {/* Dropdown Arrow Icon */}
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Çıkış Yap</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container - Below Header */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Navigation Only */}
        <Sidebar menuItems={menuItems} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
