import { API_BASE_URL, ApiError, parseErrorMessage } from './client'

export const ROLES = {
  CAND: 'CAND',
  HR: 'HR',
  MNGR: 'MNGR',
  ACADEMY_MNGR: 'ACADEMY_MNGR',
  ADMIN: 'ADMIN',
  ACADEMY_VISITOR: 'ACADEMY_VISITOR',
  EVAL_MNGR: 'EVAL_MNGR',
} as const

export const ACADEMY_ACCESS_ROLES = [ROLES.ACADEMY_MNGR, ROLES.ADMIN, ROLES.ACADEMY_VISITOR, ROLES.EVAL_MNGR] as const
export const ACADEMY_WRITE_ROLES = [ROLES.ACADEMY_MNGR, ROLES.ADMIN] as const
export const ACADEMY_EVALUATE_ROLES = [ROLES.ACADEMY_MNGR, ROLES.ADMIN, ROLES.EVAL_MNGR] as const
export const ACADEMY_ADMIN_ROLES = [ROLES.ADMIN] as const
export const ACADEMY_MANAGER_ROLES = ACADEMY_ACCESS_ROLES
export const ACADEMY_MANAGER_HOME = '/academy/manager/forms'
export const ACADEMY_ADMIN_HOME = '/academy/manager/admin'

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.CAND]: 'Aday',
  [ROLES.HR]: 'İnsan Kaynakları',
  [ROLES.MNGR]: 'Yönetici',
  [ROLES.ACADEMY_MNGR]: 'Akademi Yöneticisi',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.ACADEMY_VISITOR]: 'Akademi Ziyaretçisi',
  [ROLES.EVAL_MNGR]: 'Değerlendirme Sorumlusu',
}

export const ROLE_HOME_ROUTES: Record<string, string> = {
  CAND: '/candidate/posts',
  HR: '/hr',
  ACADEMY_MNGR: ACADEMY_MANAGER_HOME,
  ADMIN: ACADEMY_MANAGER_HOME,
  ACADEMY_VISITOR: ACADEMY_MANAGER_HOME,
  EVAL_MNGR: ACADEMY_MANAGER_HOME,
}

export interface UserProfile {
  userId: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  primaryRole: 'HR' | 'CAND' | 'ACADEMY_MNGR' | 'MNGR' | 'ADMIN' | 'ACADEMY_VISITOR' | 'EVAL_MNGR' | string
}

export function collectRoles(
  primaryRole?: string | null,
  roles?: string[] | null,
): string[] {
  return [...new Set([...(roles || []), primaryRole].filter(Boolean))] as string[]
}

export function hasAnyRole(roleOrRoles: unknown, allowed: readonly string[]): boolean {
  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles]
  return roles.some((role) => allowed.includes(String(role || '')))
}

export function hasAllowedRole(
  primaryRole?: string | null,
  roles?: string[] | null,
  allowedRoles?: readonly string[] | null,
): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true
  return hasAnyRole(collectRoles(primaryRole, roles), allowedRoles)
}

export function hasAcademyAccess(roleOrRoles: unknown): boolean {
  return hasAnyRole(roleOrRoles, ACADEMY_ACCESS_ROLES)
}

export function canManageAcademy(roleOrRoles: unknown): boolean {
  return hasAnyRole(roleOrRoles, ACADEMY_WRITE_ROLES)
}

export function canEvaluateAcademy(roleOrRoles: unknown): boolean {
  return hasAnyRole(roleOrRoles, ACADEMY_EVALUATE_ROLES)
}

export function hasAdminRole(roleOrRoles: unknown): boolean {
  return hasAnyRole(roleOrRoles, ACADEMY_ADMIN_ROLES)
}

export function hasAcademyManagerRole(roleOrRoles: unknown): boolean {
  return hasAcademyAccess(roleOrRoles)
}

export function roleLabel(role?: string | null): string {
  if (!role) return ''
  return ROLE_LABELS[role] || role
}

export function resolveHomeRoute(
  primaryRole?: string | null,
  roles?: string[] | null,
): string | null {
  const allRoles = collectRoles(primaryRole, roles)
  if (hasAcademyAccess(allRoles)) {
    return ACADEMY_MANAGER_HOME
  }
  if (allRoles.includes(ROLES.HR)) {
    return ROLE_HOME_ROUTES.HR
  }
  if (allRoles.includes(ROLES.CAND)) {
    return ROLE_HOME_ROUTES.CAND
  }
  return primaryRole ? ROLE_HOME_ROUTES[primaryRole] || null : null
}

export async function fetchCurrentUserProfile(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const serverMessage = await parseErrorMessage(response)
    throw new ApiError(
      serverMessage || `Profil bilgisi alınamadı (HTTP ${response.status})`,
      response.status,
    )
  }

  return response.json()
}
