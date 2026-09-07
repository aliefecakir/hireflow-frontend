export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
export const DEFAULT_PAGE_SIZE = 10

export type QuestionKind = 'single' | 'multi' | 'open' | 'file' | 'date'

export const KIND_LABELS: Record<QuestionKind, string> = {
  single: 'Tek Seçmeli',
  multi: 'Çok Seçmeli',
  open: 'Açık Uçlu',
  file: 'CV',
  date: 'Tarih',
}

export interface QuestionChoice {
  id?: number
  questionChoiceId?: number
  choiceText: string
  score?: number | null
  ordNo: number
  isOther?: number | boolean | null
}

export interface QuestionType {
  id: number
  name: string
  shrtCode?: string | null
  entCodeName?: string | null
  kind?: QuestionKind
}

export type CatalogQuestionType = QuestionType & { kind: QuestionKind }

export function isFlagOn(value: unknown): boolean {
  return value === true || value === 1 || value === '1'
}

export function toFlag(value: unknown): number {
  return isFlagOn(value) ? 1 : 0
}

export function getQuestionId(question: { id?: number; questionId?: number } | null | undefined): number | undefined {
  return question?.questionId ?? question?.id
}

export function getChoiceId(choice: { id?: number; questionChoiceId?: number } | null | undefined): number | undefined {
  if (!choice) return undefined
  return choice.questionChoiceId != null ? choice.questionChoiceId : choice.id
}

type KindSource = {
  id?: string | number | null
  tpId?: string | number | null
  tpShrtCode?: string | null
  shrtCode?: string | null
  name?: string | null
  tpName?: string | null
  questionText?: string | null
  entCodeName?: string | null
  choices?: unknown[] | null
}

function fold(value: unknown): string {
  return String(value ?? '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function isDateAnswerValue(value: unknown): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim())
}

export function isFileAnswerUrl(value: unknown): boolean {
  const text = String(value || '').trim()
  if (!text) return false
  try {
    const url = new URL(text)
    return /\.pdf($|\?)/i.test(url.pathname)
      || url.pathname.includes('/academy-files/')
      || url.pathname.includes('/academy/')
  } catch {
    return false
  }
}

function kindFromText(value: unknown): QuestionKind | null {
  const text = fold(value)
  if (!text) return null
  if (
    /\b(file|cv|pdf)\b/.test(text)
    || text.includes('dosya')
  ) {
    return 'file'
  }
  if (
    /\b(date|dt)\b/.test(text)
    || text.includes('tarih')
  ) {
    return 'date'
  }
  if (
    /\b(mult|multi|multiple|ms|chk|css|checkbox)\b/.test(text)
    || text.includes('coktan')
    || text.includes('coklu')
    || text.includes('birden fazla')
    || (text.includes('cok') && (text.includes('sec') || text.includes('secenek') || text.includes('sik')))
  ) {
    return 'multi'
  }
  if (
    /\b(open|text|oe|au|txt)\b/.test(text)
    || text.includes('acik ucl')
    || text.includes('serbest')
    || text.includes('uclu')
  ) {
    return 'open'
  }
  if (
    /\b(sngl|single|radio|sc|tss)\b/.test(text)
    || text.includes('tek sec')
  ) {
    return 'single'
  }
  return null
}

function kindFromMeta(source: KindSource | CatalogQuestionType | null | undefined): QuestionKind | null {
  if (!source) return null
  return kindFromText(source.shrtCode)
    || ('tpShrtCode' in source ? kindFromText(source.tpShrtCode) : null)
    || kindFromText(source.name)
    || ('tpName' in source ? kindFromText(source.tpName) : null)
    || ('entCodeName' in source ? kindFromText(source.entCodeName) : null)
}

export function isCandidateQuestion(question: { isAssmt?: unknown } | null | undefined): boolean {
  return !isFlagOn(question?.isAssmt)
}

export function filterCandidateQuestions<T extends { isAssmt?: unknown }>(questions: T[] | null | undefined): T[] {
  return (Array.isArray(questions) ? questions : []).filter(isCandidateQuestion)
}

export function getSelectedChoiceIds(answer: {
  selectedChoiceId?: number | null
  selectedChoiceIds?: Array<number | string> | null
} | null | undefined): string[] {
  if (!answer) return []
  if (Array.isArray(answer.selectedChoiceIds) && answer.selectedChoiceIds.length > 0) {
    return answer.selectedChoiceIds.map((id) => String(id))
  }
  if (answer.selectedChoiceId != null) {
    return [String(answer.selectedChoiceId)]
  }
  return []
}

export function normalizeQuestionTypes(rows: unknown): CatalogQuestionType[] {
  const result = (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const item = (row || {}) as Record<string, unknown>
      const parsedId = Number(item.id ?? item.gnlTpId)
      if (!Number.isFinite(parsedId)) return null
      const id = parsedId
      const name = String(item.name ?? item.shrtCode ?? id)
      const shrtCode = item.shrtCode != null ? String(item.shrtCode) : null
      const entCodeName = item.entCodeName != null ? String(item.entCodeName) : null
      const kind = kindFromMeta({ id, name, shrtCode, tpShrtCode: shrtCode || null, entCodeName }) || 'single'
      return { id, name, shrtCode, entCodeName, kind }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  return result as CatalogQuestionType[]
}

function kindFromChoicelessFallback(question: KindSource): QuestionKind | null {
  const choiceCount = Array.isArray(question.choices) ? question.choices.length : null
  if (choiceCount !== 0) return null
  return kindFromText(question.questionText) || kindFromText(question.name)
}

export function getQuestionKind(
  question: KindSource | null | undefined,
  catalog: Array<Pick<CatalogQuestionType, 'id' | 'kind' | 'name' | 'shrtCode' | 'entCodeName'>> = [],
): QuestionKind {
  if (!question) return 'single'

  const choicelessKind = kindFromChoicelessFallback(question)
  const isQuestionRow = question.questionText != null && String(question.questionText) !== ''
  const tpId = question.tpId != null && String(question.tpId) !== ''
    ? question.tpId
    : (isQuestionRow ? undefined : question.id)

  if (catalog.length > 0 && tpId != null && String(tpId) !== '') {
    const match = catalog.find((item) => String(item.id) === String(tpId))
    const catalogKind = match?.kind || kindFromMeta(match)
    if (catalogKind) {
      if (
        (catalogKind === 'single' || catalogKind === 'multi' || catalogKind === 'open')
        && (choicelessKind === 'date' || choicelessKind === 'file')
      ) {
        return choicelessKind
      }
      if (
        (catalogKind === 'single' || catalogKind === 'multi')
        && Array.isArray(question.choices)
        && question.choices.length === 0
      ) {
        return choicelessKind || 'open'
      }
      return catalogKind
    }
  }

  const fromMeta = kindFromMeta(question)
  if (fromMeta) return fromMeta
  if (choicelessKind) return choicelessKind

  if (Array.isArray(question.choices)) {
    return question.choices.length === 0 ? 'open' : 'single'
  }

  return 'single'
}

export function parseFormDate(value: unknown): Date | null {
  if (!value) return null
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function isFormExpired(
  form: { edate?: unknown } | null | undefined,
  now = new Date(),
): boolean {
  const end = parseFormDate(form?.edate)
  return Boolean(end && now.getTime() > end.getTime())
}

export function hasFormStarted(
  form: { sdate?: unknown } | null | undefined,
  now = new Date(),
): boolean {
  const start = parseFormDate(form?.sdate)
  if (!start) return true
  return now.getTime() >= start.getTime()
}

export function isFormVisibleToCandidates(
  form: { isActv?: unknown; edate?: unknown } | null | undefined,
  now = new Date(),
): boolean {
  if (!form) return false
  if (form.isActv != null && !isFlagOn(form.isActv)) return false
  return !isFormExpired(form, now)
}

export function canApplyToForm(
  form: { isActv?: unknown; sdate?: unknown; edate?: unknown } | null | undefined,
  now = new Date(),
): boolean {
  return isFormVisibleToCandidates(form, now) && hasFormStarted(form, now)
}
