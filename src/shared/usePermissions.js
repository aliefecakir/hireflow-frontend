import {
  ACADEMY_ACCESS_ROLES,
  ACADEMY_ADMIN_ROLES,
  ACADEMY_EVALUATE_ROLES,
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
  const canEvaluateAcademy = hasAnyRole(roles, ACADEMY_EVALUATE_ROLES)
  const canAccessAdmin = hasAnyRole(roles, ACADEMY_ADMIN_ROLES)

  return {
    roles,
    canAccessAcademy,
    canWriteAcademy,
    canEvaluateAcademy,
    canAccessAdmin,
    isAcademyVisitor: canAccessAcademy && !canWriteAcademy && !canEvaluateAcademy,
    roleLabel: roleLabel(userRole) || roleLabel(roles[0]),
  }
}
