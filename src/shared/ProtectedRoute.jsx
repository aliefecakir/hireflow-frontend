import { Navigate } from 'react-router-dom'
import { ACADEMY_MANAGER_HOME, collectRoles, hasAllowedRole, resolveHomeRoute } from './api/auth'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, userRole, userProfile, loading } = useAuth()
  const ownedRoles = collectRoles(userRole, userProfile?.roles)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
          <p className="mt-4 text-slate-600 font-medium">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (ownedRoles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-6">
          <div className="text-red-600 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Rol Bulunamadı</h2>
          <p className="text-slate-600">Hesabınıza tanımlı bir rol bulunamadı. Lütfen yöneticinize başvurun.</p>
        </div>
      </div>
    )
  }

  if (!hasAllowedRole(userRole, userProfile?.roles, allowedRoles)) {
    const redirectTo = resolveHomeRoute(userRole, userProfile?.roles) || '/login'
    return <Navigate to={redirectTo} replace />
  }

  return children
}

export function RoleGuard({ allowedRoles, children, redirectTo = ACADEMY_MANAGER_HOME }) {
  const { userRole, userProfile } = useAuth()

  if (!hasAllowedRole(userRole, userProfile?.roles, allowedRoles)) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}
