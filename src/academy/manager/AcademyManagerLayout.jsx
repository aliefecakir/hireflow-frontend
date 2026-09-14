// Yönetici kabuğu: header, menü, Outlet.
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Award, CircleHelp, ClipboardList, FilePlus, Info, Shield } from 'lucide-react'
import AboutModal from './AboutModal'
import BrandMark from '../../shared/BrandMark'
import { useAuth } from '../../shared/AuthContext'
import { usePermissions } from '../../shared/usePermissions'
import { ACADEMY_ADMIN_ROLES, ACADEMY_WRITE_ROLES, hasAnyRole } from '../../shared/api/auth'
import { ConfirmDialog, displayName } from './ui'
import {
  UNSAVED_CHANGES_MESSAGE,
  UnsavedChangesProvider,
  useUnsavedChanges,
} from './UnsavedChangesContext'

const MENU_ITEMS = [
  { id: 'forms', label: 'Formlar', hint: 'Ana Sayfa', icon: ClipboardList, to: '/academy/manager/forms' },
  { id: 'create', label: 'Form Oluştur', icon: FilePlus, to: '/academy/manager/create', roles: ACADEMY_WRITE_ROLES },
  { id: 'pool', label: 'Soru Havuzu', icon: CircleHelp, to: '/academy/manager/pool', roles: ACADEMY_WRITE_ROLES },
  { id: 'catalog', label: 'Puan Yönetimi', icon: Award, to: '/academy/manager/catalog', roles: ACADEMY_WRITE_ROLES },
  { id: 'admin', label: 'Admin Paneli', icon: Shield, to: '/academy/manager/admin', roles: ACADEMY_ADMIN_ROLES, pin: 'bottom' },
]

// create/edit aynı menü; pool ayrı; catalog ayrı; admin ayrı; geri kalan forms.
function isMenuActive(itemId, pathname) {
  const createActive = pathname.endsWith('/create') || /\/forms\/[^/]+\/edit$/.test(pathname)
  const poolActive = pathname.endsWith('/pool')
  const catalogActive = pathname.endsWith('/catalog')
  const adminActive = pathname.endsWith('/admin')
  if (itemId === 'create') return createActive
  if (itemId === 'pool') return poolActive
  if (itemId === 'catalog') return catalogActive
  if (itemId === 'admin') return adminActive
  return !createActive && !poolActive && !catalogActive && !adminActive
}

function sameLocation(pathname, search, href) {
  try {
    const url = new URL(href, window.location.origin)
    return url.pathname === pathname && url.search === search
  } catch {
    return false
  }
}

function MenuLink({ item, pathname }) {
  const Icon = item.icon
  const isActive = isMenuActive(item.id, pathname)
  return (
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
  )
}

function AcademyManagerShell() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const { userProfile, jobTitle, photoUrl, signOut } = useAuth()
  const { roles, roleLabel } = usePermissions()
  const { isDirty, setDirty } = useUnsavedChanges()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [confirmKind, setConfirmKind] = useState(null)
  const [pendingHref, setPendingHref] = useState(null)
  const userName = displayName(userProfile)
  const visibleItems = MENU_ITEMS.filter((item) => !item.roles || hasAnyRole(roles, item.roles))
  const primaryItems = visibleItems.filter((item) => item.pin !== 'bottom')
  const bottomItems = visibleItems.filter((item) => item.pin === 'bottom')
  const headerRole = jobTitle || roleLabel || 'Akademi'

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const requestSignOut = () => {
    setShowProfileMenu(false)
    setPendingHref(null)
    setConfirmKind('logout')
  }

  const handleLinkClickCapture = (event) => {
    if (!isDirty) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.target.closest('a[href]')
    if (!anchor || anchor.getAttribute('target') === '_blank') return
    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#')) return
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return
    if (sameLocation(pathname, search, href)) return
    event.preventDefault()
    event.stopPropagation()
    setShowProfileMenu(false)
    setPendingHref(href)
    setConfirmKind('leave')
  }

  const closeConfirm = () => {
    setConfirmKind(null)
    setPendingHref(null)
  }

  const confirmLeave = () => {
    const href = pendingHref
    closeConfirm()
    setDirty(false)
    if (href) navigate(href)
  }

  const confirmLogout = async () => {
    closeConfirm()
    setDirty(false)
    await handleSignOut()
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100" onClickCapture={handleLinkClickCapture}>
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
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-white">
                    {(userName.charAt(0) || 'A').toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-slate-500">{headerRole}</span>
                <span className="text-sm font-medium text-slate-800">
                  {userName || headerRole}
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
                  onClick={requestSignOut}
                  className="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Çıkış Yap</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false)
                    setShowAbout(true)
                  }}
                  className="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Info className="h-4 w-4" />
                  <span>Hakkında</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-60 flex-shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">
          <nav className="flex flex-1 flex-col p-4 pb-10">
            <ul className="space-y-1">
              {primaryItems.map((item) => (
                <li key={item.id}>
                  <MenuLink item={item} pathname={pathname} />
                </li>
              ))}
            </ul>
            {bottomItems.length > 0 ? (
              <ul className="mt-auto space-y-1 border-t border-slate-200 pt-3">
                {bottomItems.map((item) => (
                  <li key={item.id}>
                    <MenuLink item={item} pathname={pathname} />
                  </li>
                ))}
              </ul>
            ) : null}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* Alt sayfa: forms, create, pool, applications */}
          <Outlet />
        </main>
      </div>

      {showAbout ? <AboutModal onClose={() => setShowAbout(false)} /> : null}

      {confirmKind === 'leave' ? (
        <ConfirmDialog
          title="Dikkat"
          message={UNSAVED_CHANGES_MESSAGE}
          confirmLabel="Evet"
          cancelLabel="Hayır"
          confirmClassName="bg-red-600 text-white hover:bg-red-700"
          onCancel={closeConfirm}
          onConfirm={confirmLeave}
        />
      ) : null}

      {confirmKind === 'logout' ? (
        <ConfirmDialog
          title="Çıkış Yap"
          message={isDirty ? UNSAVED_CHANGES_MESSAGE : 'Hesaptan çıkmak istediğinize emin misiniz?'}
          confirmLabel="Evet"
          cancelLabel="Hayır"
          confirmClassName="bg-red-600 text-white hover:bg-red-700"
          onCancel={closeConfirm}
          onConfirm={confirmLogout}
        />
      ) : null}
    </div>
  )
}

export default function AcademyManagerLayout() {
  return (
    <UnsavedChangesProvider>
      <AcademyManagerShell />
    </UnsavedChangesProvider>
  )
}
