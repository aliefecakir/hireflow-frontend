import { academyRequest } from './request'

export interface CatalogLookup {
  id: number
  name: string
}

// Yönetici katalogu: puan ve aktiflik dahil.
export interface CatalogItem {
  id: number
  name: string
  score: number
  isActv: number | boolean
}

export interface CreateCatalogItemPayload {
  name: string
  score: number
}

export interface UpdateCatalogItemPayload {
  name: string
  score: number
  isActv: number
}

export type CatalogKind = 'universities' | 'departments'

export function getUniversities(): Promise<CatalogLookup[]> {
  return academyRequest<CatalogLookup[]>('/academy/universities', { optionalAuth: true })
}

export function getDepartments(): Promise<CatalogLookup[]> {
  return academyRequest<CatalogLookup[]>('/academy/departments', { optionalAuth: true })
}

export function listCatalogItems(kind: CatalogKind): Promise<CatalogItem[]> {
  return academyRequest<CatalogItem[]>(`/academy/catalog/${kind}?includeInactive=true`)
}

export function createCatalogItem(
  kind: CatalogKind,
  payload: CreateCatalogItemPayload,
): Promise<CatalogItem> {
  return academyRequest<CatalogItem>(`/academy/catalog/${kind}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCatalogItem(
  kind: CatalogKind,
  id: number,
  payload: UpdateCatalogItemPayload,
): Promise<CatalogItem> {
  return academyRequest<CatalogItem>(`/academy/catalog/${kind}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
