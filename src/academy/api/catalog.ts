import { academyRequest } from './request'

export interface CatalogLookup {
  id: number
  name: string
}

export function getUniversities(): Promise<CatalogLookup[]> {
  return academyRequest<CatalogLookup[]>('/academy/universities', { optionalAuth: true })
}

export function getDepartments(): Promise<CatalogLookup[]> {
  return academyRequest<CatalogLookup[]>('/academy/departments', { optionalAuth: true })
}
