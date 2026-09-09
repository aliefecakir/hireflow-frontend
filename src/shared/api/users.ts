import { apiRequest } from './client'

export interface SystemRole {
  roleId: number
  name?: string | null
  descr?: string | null
  shrtCode: string
  isActv?: number | boolean | null
}

export interface UserRoleRow {
  userId: string
  userRoleId?: string | null
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  roleId?: number | null
  roleName?: string | null
  roleShrtCode?: string | null
  isActv?: number | boolean | null
}

export interface UpdateUserRolePayload {
  roleId?: number | null
  shrtCode?: string | null
}

export function listUserRoles(): Promise<UserRoleRow[]> {
  return apiRequest<UserRoleRow[]>('/users')
}

export function listActiveRoles(): Promise<SystemRole[]> {
  return apiRequest<SystemRole[]>('/roles')
}

export function updateUserRole(
  userId: string,
  payload: UpdateUserRolePayload,
): Promise<UserRoleRow> {
  return apiRequest<UserRoleRow>(`/users/${encodeURIComponent(userId)}/role`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
