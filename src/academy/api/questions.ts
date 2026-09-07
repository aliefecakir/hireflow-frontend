import { academyRequest } from './request'
import type { QuestionChoice, QuestionType } from './helpers'

export type { QuestionChoice, QuestionType }

export interface Question {
  id: number
  questionText: string
  tpId: string
  minScore: number
  maxScore: number
  isAssmt?: number | null
  tpShrtCode?: string | null
  name?: string | null
  choices: QuestionChoice[]
  formCount?: number | null
}

export interface CreateQuestionPayload {
  questionText: string
  tpId: string
  minScore: number
  maxScore: number
  isAssmt?: number
  choices?: Array<{
    choiceText: string
    score?: number
    ordNo: number
    isOther?: number
  }>
}

export interface UpdateQuestionPayload {
  questionText?: string
  tpId?: string
  minScore?: number
  maxScore?: number
  isAssmt?: number
  choices?: Array<{
    id?: number
    choiceText: string
    score?: number
    ordNo: number
    isOther?: number
  }>
}

export interface QuestionUsage {
  isUsed: boolean
  canDelete: boolean
  canEditContent: boolean
  formCount: number
  answerCount: number
  formTitles?: string[]
}

export function getQuestions(): Promise<Question[]> {
  return academyRequest<Question[]>('/academy/questions')
}

export function getQuestionTypes(): Promise<QuestionType[]> {
  return academyRequest<QuestionType[]>('/academy/questions/types', { optionalAuth: true })
}

export function getQuestionUsage(questionId: number): Promise<QuestionUsage> {
  return academyRequest<QuestionUsage>(`/academy/questions/${questionId}/usage`)
}

export function createQuestion(data: CreateQuestionPayload): Promise<Question> {
  return academyRequest<Question>('/academy/questions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateQuestion(questionId: number, data: UpdateQuestionPayload): Promise<Question> {
  return academyRequest<Question>(`/academy/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteQuestion(questionId: number): Promise<void> {
  return academyRequest<void>(`/academy/questions/${questionId}`, {
    method: 'DELETE',
  })
}
