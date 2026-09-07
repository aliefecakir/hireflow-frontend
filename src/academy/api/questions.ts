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

export function getQuestions(): Promise<Question[]> {
  return academyRequest<Question[]>('/academy/questions')
}

export function getQuestionTypes(): Promise<QuestionType[]> {
  return academyRequest<QuestionType[]>('/academy/questions/types', { optionalAuth: true })
}

export function createQuestion(data: CreateQuestionPayload): Promise<Question> {
  return academyRequest<Question>('/academy/questions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
