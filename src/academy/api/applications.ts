import { academyRequest } from './request'
import type { QuestionChoice } from './helpers'

export interface FormApplication {
  academyAppId: number
  name: string
  surname: string
  universityName?: string | null
  departmentName?: string | null
  gradDate?: string | null
  totalScore?: number | null
  interviewScore?: number | null
  stId?: string | null
  statusName?: string | null
  statusShrtCode?: string | null
  statusDescr?: string | null
}

export interface AcademyAppStatus {
  stId: string
  name: string
  descr?: string | null
  shrtCode?: string | null
}

export interface UpdateAcademyAppStatusPayload {
  stId: string
  statusDescr?: string | null
}

export interface CandidateAnswerChoice {
  questionChoiceId: number
  choiceText: string
  score?: number | null
  ordNo?: number | null
  isOther?: number | boolean | null
}

export interface CandidateAnswer {
  questionId: number
  questionText?: string | null
  selectedChoiceId?: number | null
  selectedChoiceIds?: number[] | null
  answerText?: string | null
  tpId?: string | null
  minScore?: number | null
  maxScore?: number | null
  score?: number | null
  isAssmt?: number | boolean | null
  choices?: CandidateAnswerChoice[]
}

export interface InterviewCriterionChoice {
  questionChoiceId: number
  choiceText: string
  score?: number | null
  ordNo?: number | null
}

export interface InterviewCriterion {
  questionId: number
  questionText: string
  minScore?: number | null
  maxScore?: number | null
  ordNo?: number | null
  tpId?: string | null
  tpShrtCode?: string | null
  answerText?: string | null
  selectedChoiceId?: number | null
  isAssmt?: number | boolean | null
  choices: InterviewCriterionChoice[]
}

export interface ApplicationDetails {
  academyAppId: number
  name: string
  surname: string
  email: string
  phone?: string | null
  universityName?: string | null
  departmentName?: string | null
  uniScore?: number | null
  depScore?: number | null
  totalScore?: number | null
  interviewScore?: number | null
  stId?: string | null
  statusName?: string | null
  statusDescr?: string | null
  answers: CandidateAnswer[]
  interviewCriteria: InterviewCriterion[]
}

export interface EvaluateApplicationPayload {
  answers: Array<{
    questionId: number
    questionChoiceId?: number | null
    answerText?: string | null
  }>
  manualScores?: Array<{
    questionId: number
    score: number
  }>
}

export interface EvaluateApplicationResult {
  academyAppId: number
  interviewScore?: number | null
  statusDescr?: string | null
}

export function getFormApplications(formId: number | string): Promise<FormApplication[]> {
  return academyRequest<FormApplication[]>(`/academy/forms/${formId}/applications`)
}

export function getAcademyAppStatuses(): Promise<AcademyAppStatus[]> {
  return academyRequest<AcademyAppStatus[]>('/academy/applications/statuses')
}

export function updateAcademyAppStatus(
  appId: number | string,
  data: UpdateAcademyAppStatusPayload,
): Promise<FormApplication> {
  return academyRequest<FormApplication>(`/academy/applications/${appId}/status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function getApplicationDetails(appId: number | string): Promise<ApplicationDetails> {
  return academyRequest<ApplicationDetails>(`/academy/applications/${appId}/details`)
}

export function evaluateApplication(
  appId: number | string,
  data: EvaluateApplicationPayload,
): Promise<EvaluateApplicationResult> {
  return academyRequest<EvaluateApplicationResult>(`/academy/applications/${appId}/evaluate`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export type { QuestionChoice }
