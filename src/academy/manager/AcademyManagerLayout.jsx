import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CircleHelp, ClipboardList, FilePlus } from 'lucide-react'
import BrandMark from '../../shared/BrandMark'
import { useAuth } from '../../shared/AuthContext'
import { displayName } from './ui'

const MENU_ITEMS = [
  { id: 'forms', label: 'Formlar', hint: 'Ana Sayfa', icon: ClipboardList, to: '/academy/manager/forms' },
  { id: 'create', label: 'Form Oluştur', icon: FilePlus, to: '/academy/manager/create' },
  { id: 'pool', label: 'Soru Havuzu', icon: CircleHelp, to: '/academy/manager/pool' },
]

function isMenuActive(itemId, pathname) {
  const createActive = pathname.endsWith('/create') || /\/forms\/[^/]+\/edit$/.test(pathname)
  const poolActive = pathname.endsWith('/pool')
  if (itemId === 'create') return createActive
  if (itemId === 'pool') return poolActive
  return !createActive && !poolActive
}

export default function AcademyManagerLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { userProfile, signOut } = useAuth()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const userName = displayName(userProfile)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <header className="w-full flex-shrink-0 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex h-12 items-center justify-between px-6">
          <Link to="/" className="group flex items-center space-x-2">
            <BrandMark className="h-8 w-8" />
            <h1 className="text-base font-bold text-slate-800 transition-colors group-hover:text-blue-700">
              HireFlow
            </h1>
          </Link>
          <div className="relative">
            <div
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-slate-50"
              onClick={() => setShowProfileMenu((open) => !open)}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
                <span className="text-xs font-semibold text-white">
                  {(userName.charAt(0) || 'A').toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-slate-500">Akademi Yöneticisi</span>
                <span className="text-sm font-medium text-slate-800">
                  {userName || 'Akademi Yöneticisi'}
                </span>
              </div>
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {showProfileMenu ? (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Çıkış Yap</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
          <nav className="p-4">
            <ul className="space-y-1">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = isMenuActive(item.id, pathname)
                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.to}
                      className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>
                        {item.label}
                        {item.hint ? (
                          <span className="ml-1 text-xs font-normal text-slate-400">({item.hint})</span>
                        ) : null}
                      </span>
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
