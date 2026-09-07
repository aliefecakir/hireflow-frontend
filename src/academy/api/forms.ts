import { academyRequest } from './request'
import type { QuestionChoice } from './helpers'

export interface AcademyForm {
  formId: number
  title: string
  descr?: string | null
  organizationId?: number | null
  organizationName?: string | null
  isActv?: number | boolean | null
  sdate: string
  edate: string
}

export interface FormQuestion {
  questionId: number
  questionText: string
  tpId: number
  minScore?: number | null
  maxScore?: number | null
  ordNo?: number | null
  isReq?: number | null
  isAssmt?: number | boolean | null
  tpShrtCode?: string | null
  tpName?: string | null
  choices: QuestionChoice[]
}

export interface AcademyFormDetail extends AcademyForm {
  questions?: FormQuestion[]
}

export interface CreateFormPayload {
  organizationId: number
  title: string
  descr?: string | null
  sdate: string
  edate: string
  isActv?: number
  questions?: Array<{
    questionId: number
    ordNo?: number
    isReq?: number
  }>
}

export interface AcademyApplyPayload {
  name: string
  surname: string
  email: string
  phone: string
  universityId: number
  departmentId: number
  gradDate?: string | null
  uniScore?: number | null
  depScore?: number | null
  totalScore?: number | null
  answers?: Array<{
    questionId: number
    questionChoiceId?: number | null
    answerText?: string | null
  }>
}

export interface AcademyApplyResult {
  academyAppId: number
  formId: number
  statusDescr?: string | null
}

export function getForms(options: { includeInactive?: boolean } = {}): Promise<AcademyForm[]> {
  const query = options.includeInactive ? '?includeInactive=true' : ''
  return academyRequest<AcademyForm[]>(`/academy/forms${query}`, { optionalAuth: true })
}

export function getFormDetail(formId: number | string): Promise<AcademyFormDetail> {
  return academyRequest<AcademyFormDetail>(`/academy/forms/${formId}`)
}

export function getFormQuestions(formId: number | string): Promise<FormQuestion[]> {
  return academyRequest<FormQuestion[]>(`/academy/forms/${formId}/questions`, { optionalAuth: true })
}

export function createForm(data: CreateFormPayload): Promise<AcademyForm> {
  return academyRequest<AcademyForm>('/academy/forms', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateForm(formId: number | string, data: CreateFormPayload): Promise<AcademyForm> {
  return academyRequest<AcademyForm>(`/academy/forms/${formId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function applyToForm(formId: number | string, data: AcademyApplyPayload): Promise<AcademyApplyResult> {
  return academyRequest<AcademyApplyResult>(`/academy/forms/${formId}/apply`, {
    method: 'POST',
    optionalAuth: true,
    body: JSON.stringify(data),
  })
}
