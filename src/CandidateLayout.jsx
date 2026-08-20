import { useState, useEffect } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'

export default function CandidateLayout() {
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const menuItems = [
    {
      name: 'İlanlar',
      path: '/candidate',
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
  ]

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data, error } = await supabase
          .from('USER')
          .select('NAME')
          .eq('USER_ID', user.id)
          .single()

        if (data && !error) {
          setUserName(data.NAME)
        }
      }
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
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Left Side - Logo */}
          <Link to="/candidate" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-white font-bold text-sm">HF</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
              HireFlow
            </h1>
          </Link>
          
          {/* Right Side - User Profile Section */}
          <div className="relative">
            <div 
              className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {/* Profile Picture */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-sm">
                  {loading ? '...' : userName.charAt(0).toUpperCase()}
                </span>
              </div>
              
              {/* Welcome Text */}
              <div className="flex flex-col">
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
