import { API_BASE_URL, ApiError, parseErrorMessage } from './client'

export const ROLES = {
  CAND: 'CAND',
  HR: 'HR',
  MNGR: 'MNGR',
  ACADEMY_MNGR: 'ACADEMY_MNGR',
} as const

export const ACADEMY_MANAGER_ROLES = [ROLES.ACADEMY_MNGR, ROLES.MNGR] as const
export const ACADEMY_MANAGER_HOME = '/academy/manager/forms'

export const ROLE_HOME_ROUTES: Record<string, string> = {
  CAND: '/candidate/posts',
  HR: '/hr',
  MNGR: ACADEMY_MANAGER_HOME,
  ACADEMY_MNGR: ACADEMY_MANAGER_HOME,
}

export interface UserProfile {
  userId: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  primaryRole: 'HR' | 'CAND' | 'ACADEMY_MNGR' | 'MNGR' | string
}

export function hasAcademyManagerRole(roleOrRoles: unknown): boolean {
  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles]
  return roles.some((role) => role === ROLES.ACADEMY_MNGR || role === ROLES.MNGR)
}

export function resolveHomeRoute(
  primaryRole?: string | null,
  roles?: string[] | null,
): string | null {
  const allRoles = [...new Set([...(roles || []), primaryRole].filter(Boolean))] as string[]
  if (hasAcademyManagerRole(allRoles)) {
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
