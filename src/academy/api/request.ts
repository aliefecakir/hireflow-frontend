// Academy backend çağrıları (ACADEMY_API_BASE_URL).
import { ACADEMY_API_BASE_URL, apiRequest } from '../../shared/api/client'

export function academyRequest<T>(path: string, options: RequestInit & { optionalAuth?: boolean } = {}): Promise<T> {
  return apiRequest<T>(path, { ...options, baseUrl: ACADEMY_API_BASE_URL })
}
