import {
  ACADEMY_ACCESS_ROLES,
  ACADEMY_ADMIN_ROLES,
  ACADEMY_WRITE_ROLES,
  collectRoles,
  hasAnyRole,
  roleLabel,
} from './api/auth'
import { useAuth } from './AuthContext'

export function usePermissions() {
  const { userRole, userProfile } = useAuth()
  const roles = collectRoles(userRole, userProfile?.roles)
  const canAccessAcademy = hasAnyRole(roles, ACADEMY_ACCESS_ROLES)
  const canWriteAcademy = hasAnyRole(roles, ACADEMY_WRITE_ROLES)
  const canAccessAdmin = hasAnyRole(roles, ACADEMY_ADMIN_ROLES)

  return {
    roles,
    canAccessAcademy,
    canWriteAcademy,
    canAccessAdmin,
    isAcademyVisitor: canAccessAcademy && !canWriteAcademy,
    roleLabel: roleLabel(userRole) || roleLabel(roles[0]),
  }
}
