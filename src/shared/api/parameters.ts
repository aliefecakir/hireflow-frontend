import { ACADEMY_API_BASE_URL, ApiError, apiRequest } from './client'

export const CAREER_PORTAL_SHORT_CODE = 'CAREER_PORTAL_ON_OFF'

export interface GeneralParameter {
  gnlParmId?: number
  name?: string | null
  shrtCode: string
  val: number
  isActv: number | boolean | null
}

function isFlagOn(value: unknown): boolean {
  return value === true || value === 1 || value === '1'
}

export function getParameterByShortCode(shortCode: string): Promise<GeneralParameter> {
  return apiRequest<GeneralParameter>(`/parameters/${encodeURIComponent(shortCode)}`, {
    baseUrl: ACADEMY_API_BASE_URL,
    optionalAuth: true,
  })
}

export async function findParameterByShortCode(shortCode: string): Promise<GeneralParameter | null> {
  try {
    return await getParameterByShortCode(shortCode)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    throw error
  }
}

/** IS_ACTV=0 ise parametre yok sayılır. Aktifken VAL=1 kariyeri açar, VAL=0 kapatır. */
export function isCareerPortalEnabled(parameter: GeneralParameter | null | undefined): boolean {
  if (!parameter) return true
  if (!isFlagOn(parameter.isActv)) return true
  return isFlagOn(parameter.val)
}
