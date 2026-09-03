import { apiRequest } from './client'

export interface ExperienceDto {
  experienceId: string
  corpName: string | null
  position: string | null
  descr: string | null
  stllWrkg: number | null
  sdate: string | null
  edate: string | null
}

export interface SkillDto {
  skillId: string
  name: string
  shrtCode: string | null
}

export interface LangDto {
  langId: string
  name: string
  shrtCode: string | null
}

export interface ProfileDetail {
  userId: string
  name: string
  surname: string
  email: string
  profileId: string
  phone: string | null
  dept: string | null
  education: string | null
  prflPhtUrl: string | null
  cvUrl: string | null
  isCmpltd: number
  completionPercentage: number
  experiences: ExperienceDto[]
  skills: SkillDto[]
  languages: LangDto[]
}

export interface ExperienceUpdatePayload {
  experienceId?: string | null
  corpName: string
  position: string
  descr?: string | null
  stllWrkg: number
  sdate?: string | null
  edate?: string | null
}

export interface ProfileUpdatePayload {
  phone?: string | null
  dept?: string | null
  education?: string | null
  prflPhtUrl?: string | null
  cvUrl?: string | null
  experiences: ExperienceUpdatePayload[]
  skillIds: string[]
  langIds: string[]
}

export function fetchMyProfile(): Promise<ProfileDetail> {
  return apiRequest<ProfileDetail>('/profiles/me')
}

export function updateMyProfile(payload: ProfileUpdatePayload): Promise<ProfileDetail> {
  return apiRequest<ProfileDetail>('/profiles/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function fetchProfileByUserId(userId: string): Promise<ProfileDetail> {
  return apiRequest<ProfileDetail>(`/profiles/user/${userId}`)
}

export function fetchSkills(options: { q?: string; limit?: number } = {}): Promise<SkillDto[]> {
  const params = new URLSearchParams()
  if (options.q) params.set('q', options.q)
  if (options.limit) params.set('limit', String(options.limit))
  const query = params.toString()
  return apiRequest<SkillDto[]>(`/profiles/skills${query ? `?${query}` : ''}`)
}

export function fetchLanguages(): Promise<LangDto[]> {
  return apiRequest<LangDto[]>('/profiles/languages')
}
