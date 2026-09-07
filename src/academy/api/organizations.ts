import { academyRequest } from './request'

export interface OrganizationLookup {
  id: number
  name: string
  descr?: string | null
  isActv?: number | boolean | null
}

export interface Organization {
  id: number
  name: string
  descr?: string | null
  isActv?: number | boolean | null
}

export interface CreateOrganizationPayload {
  name: string
  descr?: string | null
}

export interface UpdateOrganizationPayload {
  isActv: number
}

export function getOrganizations(options: { includeInactive?: boolean } = {}): Promise<OrganizationLookup[]> {
  const query = options.includeInactive ? '?includeInactive=true' : ''
  return academyRequest<OrganizationLookup[]>(`/academy/organizations${query}`)
}

export function createOrganization(data: CreateOrganizationPayload): Promise<Organization> {
  return academyRequest<Organization>('/academy/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateOrganization(
  organizationId: number | string,
  data: UpdateOrganizationPayload,
): Promise<Organization> {
  return academyRequest<Organization>(`/academy/organizations/${organizationId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}
