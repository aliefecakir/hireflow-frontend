import { API_BASE_URL, ApiError, parseErrorMessage } from './client'

export interface UserProfile {
  userId: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  primaryRole: 'HR' | 'CAND' | string
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
