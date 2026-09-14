// Academy ortak kurallar: soru tipi, bayrak, form görünürlüğü.
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
export const DEFAULT_PAGE_SIZE = 10

export type QuestionKind = 'single' | 'multi' | 'open' | 'numeric' | 'file' | 'date'

export const KIND_LABELS: Record<QuestionKind, string> = {
  single: 'Çoktan Seçmeli(Tek Cevaplı)',
  multi: 'Çoktan Seçmeli(Çok Cevaplı)',
  open: 'Açık Uçlu',
  numeric: 'Sayı Girişi',
  file: 'CV',
  date: 'Tarih',
}

const KIND_BY_SHRT_CODE: Record<string, QuestionKind> = {
  SINGLE_CHOICE: 'single',
  MULTIPLE_CHOICE: 'multi',
  MULTIPLE_CHOIC: 'multi',
  OPEN_ENDED: 'open',
  NUMERIC: 'numeric',
  FILE: 'file',
  DATE: 'date',
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

// Backend 1/0 veya true/false bayrakları.
export function isFlagOn(value: unknown): boolean {
  return value === true || value === 1 || value === '1'
}

export function toFlag(value: unknown): number {
  return isFlagOn(value) ? 1 : 0
}

// Puan girişi: boş, negatif veya ondalıklı değerler geçersiz.
export function parseScoreInput(value: unknown): number | null {
  const text = String(value ?? '').trim()
  if (!text) return null
  const parsed = Number(text)
  if (!Number.isInteger(parsed) || parsed < 0) return null
  return parsed
}

// API alan adı farklarını tek id'ye indirger.
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
  kind?: QuestionKind | string | null
  name?: string | null
  tpName?: string | null
  questionText?: string | null
  entCodeName?: string | null
  choices?: unknown[] | null
}

function isQuestionKind(value: unknown): value is QuestionKind {
  return value === 'single'
    || value === 'multi'
    || value === 'open'
    || value === 'numeric'
    || value === 'file'
    || value === 'date'
}

// Harf ve özel karakterleri atar; yalnızca 0-9 kalır.
export function sanitizeDigitInput(value: unknown): string {
  return String(value ?? '').replace(/\D+/g, '')
}

export function isDigitOnly(value: unknown): boolean {
  return /^\d+$/.test(String(value ?? '').trim())
}

export function isManualMaxScoreKind(kind: QuestionKind | null | undefined): boolean {
  return kind === 'open' || kind === 'numeric'
}

export function isFreeTextAnswerKind(kind: QuestionKind | null | undefined): boolean {
  return kind === 'open' || kind === 'numeric' || kind === 'file' || kind === 'date'
}

function kindFromCode(value: unknown): QuestionKind | null {
  const code = String(value ?? '').trim().toUpperCase()
  if (!code) return null
  return KIND_BY_SHRT_CODE[code] ?? null
}

function kindFromMeta(source: KindSource | CatalogQuestionType | null | undefined): QuestionKind | null {
  if (!source) return null
  if (isQuestionKind(source.kind)) return source.kind
  return kindFromCode(source.shrtCode)
    || ('tpShrtCode' in source ? kindFromCode(source.tpShrtCode) : null)
}

// Cevap metninin tarih veya CV URL'i olup olmadığı.
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

// Mülakat kriteri (isAssmt) olmayan aday soruları.
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

// /questions/types cevabına kind ekler.
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
      const kind = kindFromMeta({
        id,
        name,
        shrtCode,
        tpShrtCode: shrtCode || null,
        kind: isQuestionKind(item.kind) ? item.kind : null,
      }) || 'single'
      return { id, name, shrtCode, entCodeName, kind }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  return result as CatalogQuestionType[]
}

function applyChoiceFallback(question: KindSource, kind: QuestionKind): QuestionKind {
  if (
    (kind === 'single' || kind === 'multi')
    && Array.isArray(question.choices)
    && question.choices.length === 0
  ) {
    return 'open'
  }
  return kind
}

// Katalog + SHRT_CODE ile soru türünü çözer; görünen ad / soru metni kullanılmaz.
export function getQuestionKind(
  question: KindSource | null | undefined,
  catalog: Array<Pick<CatalogQuestionType, 'id' | 'kind' | 'name' | 'shrtCode' | 'entCodeName'>> = [],
): QuestionKind {
  if (!question) return 'single'

  const isQuestionRow = question.questionText != null && String(question.questionText) !== ''
  const tpId = question.tpId != null && String(question.tpId) !== ''
    ? question.tpId
    : (isQuestionRow ? undefined : question.id)

  const fromCodes = kindFromMeta(question)
  if (fromCodes) return applyChoiceFallback(question, fromCodes)

  if (catalog.length > 0 && tpId != null && String(tpId) !== '') {
    const match = catalog.find((item) => String(item.id) === String(tpId))
    const catalogKind = match?.kind && isQuestionKind(match.kind)
      ? match.kind
      : kindFromMeta(match)
    if (catalogKind) return applyChoiceFallback(question, catalogKind)
  }

  if (Array.isArray(question.choices)) {
    return question.choices.length === 0 ? 'open' : 'single'
  }

  return 'single'
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

// datetime-local: YYYY-MM-DDTHH:mm (API/ISO değerinden, saat dilimi kaydırmadan).
export function toFormDateTimeInput(value: unknown): string {
  if (!value) return ''
  const text = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return text.slice(0, 16)
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return `${text.slice(0, 10)}T00:00`
  const parsed = parseFormDate(text)
  if (!parsed) return ''
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`
}

// API'ye YYYY-MM-DDTHH:mm:ss.
export function toFormDateTimeApi(value: unknown): string {
  if (!value) return ''
  const text = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(text)) return text.slice(0, 19)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return `${text}:00`
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00`
  const input = toFormDateTimeInput(text)
  return input ? `${input}:00` : ''
}

// Form tarihleri: süresi doldu mu, başladı mı, adaya açık mı.
export function parseFormDate(value: unknown): Date | null {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value.map(Number)
    const parsed = new Date(year, month - 1, day, hour, minute, second)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const text = String(value).trim()
  if (!text) return null

  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(text)) {
    const parsed = new Date(text)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const naive = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?/,
  )
  if (naive) {
    const parsed = new Date(
      Number(naive[1]),
      Number(naive[2]) - 1,
      Number(naive[3]),
      Number(naive[4] || 0),
      Number(naive[5] || 0),
      Number(naive[6] || 0),
    )
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(text)
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
  if (!start) return false
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
