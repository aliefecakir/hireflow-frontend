import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, GraduationCap, Upload } from 'lucide-react'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import {
  applyToForm,
  getFormQuestions,
  getForms,
} from '../api/forms'
import {
  canApplyToForm,
  filterCandidateQuestions,
  getChoiceId,
  getQuestionKind,
  hasFormStarted,
  isFlagOn,
  isFormVisibleToCandidates,
  normalizeQuestionTypes,
} from '../api/helpers'
import { getQuestionTypes } from '../api/questions'
import { getErrorMessage } from '../../shared/api/client'
import departmentCatalog from '../../resources/departments.json'
import { supabase } from '../../shared/supabaseClient'
import { showToast } from '../../shared/toast/ToastProvider'

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500'

const ACADEMY_CV_BUCKET = 'academy-files'
const MAX_CV_BYTES = 5 * 1024 * 1024

async function uploadAcademyCv(formId, file) {
  if (!file) {
    throw new Error('Lütfen bir CV dosyası seçin.')
  }
  const isPdf = (file.type || '').toLowerCase() === 'application/pdf'
    || String(file.name || '').toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    throw new Error('Lütfen PDF formatında bir CV yükleyin.')
  }
  if (file.size > MAX_CV_BYTES) {
    throw new Error('CV en fazla 5 MB olabilir.')
  }

  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const path = `academy/${formId}/${unique}.pdf`
  const { error } = await supabase.storage.from(ACADEMY_CV_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'application/pdf',
  })
  if (error) {
    throw new Error(error.message || 'CV yüklenirken bir hata oluştu.')
  }

  const { data } = supabase.storage.from(ACADEMY_CV_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) {
    throw new Error('CV adresi alınamadı.')
  }
  return { url: data.publicUrl, name: file.name }
}

function toTitleCaseTr(value) {
  return String(value ?? '')
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part
      return part
        .split('-')
        .map((word) => {
          if (!word) return word
          const lower = word.toLocaleLowerCase('tr-TR')
          return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1)
        })
        .join('-')
    })
    .join('')
    .trim()
}

function isTurkishPhone(value) {
  return Boolean(value) && isValidPhoneNumber(value, 'TR')
}

const EMPTY_PROFILE = {
  name: '',
  surname: '',
  email: '',
  phone: '',
  universityId: '',
  departmentId: '',
}

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function LoadingState({ label = 'Yükleniyor...' }) {
  return (
    <div className="text-center">
      <div className="mx-auto inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      <p className="mt-4 font-medium text-slate-600">{label}</p>
    </div>
  )
}

function pickField(row, keys) {
  if (!row) return undefined
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key]
  }
  return undefined
}

function normalizeLookup(row, idKeys, nameKeys) {
  const id = pickField(row, idKeys)
  const name = pickField(row, nameKeys)
  if (id == null || !name) return null
  return { id: Number(id), name: String(name) }
}

async function fetchLookup(table, idKeys, nameKeys) {
  const { data, error } = await supabase.from(table).select('*')
  if (error || !Array.isArray(data)) return []
  return data.map((row) => normalizeLookup(row, idKeys, nameKeys)).filter(Boolean)
}

function sortQuestions(questions) {
  return [...questions].sort((a, b) => (Number(a.ordNo) || 0) - (Number(b.ordNo) || 0))
}

function sortChoices(choices) {
  return [...(choices || [])].sort((a, b) => (Number(a.ordNo) || 0) - (Number(b.ordNo) || 0))
}

export default function AcademyApply() {
  const { formId } = useParams()
  const navigate = useNavigate()

  const [formTitle, setFormTitle] = useState('')
  const [currentForm, setCurrentForm] = useState(null)
  const [applyState, setApplyState] = useState('open')
  const [questions, setQuestions] = useState([])
  const [questionTypes, setQuestionTypes] = useState([])
  const [universities, setUniversities] = useState([])
  const [departments, setDepartments] = useState([])
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  const fallbackDepartments = useMemo(
    () =>
      (departmentCatalog || [])
        .map((row) => ({ id: Number(row.ID), name: row.DEPARTMENT }))
        .filter((row) => row.id && row.name),
    [],
  )

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [formQuestions, forms, universityRows, departmentRows, typeRows] = await Promise.all([
          getFormQuestions(formId).catch(() => null),
          getForms().catch(() => []),
          fetchLookup('UNIVERSITY', ['UNIVERSITY_ID', 'universityId', 'id'], ['NAME', 'name']).catch(() => []),
          fetchLookup('DEPARTMENT', ['DEPARTMENT_ID', 'departmentId', 'id'], ['NAME', 'name']).catch(() => []),
          getQuestionTypes().then(normalizeQuestionTypes).catch(() => []),
        ])

        if (cancelled) return

        const matchedForm = (forms || []).find((form) => String(form.formId) === String(formId))
        setCurrentForm(matchedForm || null)
        setFormTitle(matchedForm?.title || 'Akademi Başvurusu')

        if (!matchedForm || !isFormVisibleToCandidates(matchedForm)) {
          setApplyState('closed')
          setQuestions([])
          return
        }

        if (!hasFormStarted(matchedForm)) {
          setApplyState('upcoming')
          setQuestions([])
          return
        }

        setApplyState('open')
        setQuestions(sortQuestions(filterCandidateQuestions(Array.isArray(formQuestions) ? formQuestions : [])))
        setQuestionTypes(Array.isArray(typeRows) ? typeRows : [])
        setUniversities(universityRows)
        setDepartments(departmentRows.length > 0 ? departmentRows : fallbackDepartments)
      } catch (error) {
        console.error('Başvuru formu yüklenemedi:', error)
        if (!cancelled) {
          setQuestions([])
          setApplyState('closed')
          showToast.error('Hata Oluştu', getErrorMessage(error) || 'Form soruları yüklenirken bir hata oluştu.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [fallbackDepartments, formId])

  const updateProfile = (event) => {
    const { name, value } = event.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const formatNameField = (event) => {
    const { name, value } = event.target
    setProfile((prev) => ({ ...prev, [name]: toTitleCaseTr(value) }))
  }

  const setSingleChoice = (questionId, choiceId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        choiceId,
        choiceIds: [choiceId],
      },
    }))
  }

  const toggleMultiChoice = (questionId, choiceId) => {
    setAnswers((prev) => {
      const current = prev[questionId]?.choiceIds || []
      const exists = current.includes(choiceId)
      const choiceIds = exists ? current.filter((id) => id !== choiceId) : [...current, choiceId]
      return {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          choiceIds,
          choiceId: choiceIds[0],
        },
      }
    })
  }

  const setAnswerField = (questionId, field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      },
    }))
  }

  const buildAnswers = () => {
    const payload = []

    for (const question of questions) {
      const kind = getQuestionKind(question, questionTypes)
      const questionId = question.questionId
      const current = answers[questionId] || {}
      const required = isFlagOn(question.isReq)

      if (kind === 'open' || kind === 'file' || kind === 'date') {
        const answerText = String(current.text || '').trim()
        if (!answerText) {
          if (required) {
            throw new Error(
              kind === 'file'
                ? 'Lütfen zorunlu CV sorusuna dosya yükleyin.'
                : kind === 'date'
                  ? 'Lütfen zorunlu tarih sorusunu doldurun.'
                  : 'Lütfen zorunlu açık uçlu soruları yanıtlayın.',
            )
          }
          continue
        }
        payload.push({ questionId, answerText })
        continue
      }

      const selectedIds = kind === 'multi'
        ? (current.choiceIds || [])
        : (current.choiceId != null ? [current.choiceId] : [])

      if (selectedIds.length === 0) {
        if (required) {
          throw new Error('Lütfen zorunlu soruları yanıtlayın.')
        }
        continue
      }

      for (const choiceId of selectedIds) {
        const choice = (question.choices || []).find((item) => String(getChoiceId(item)) === String(choiceId))
        const item = {
          questionId,
          questionChoiceId: Number(choiceId),
        }

        if (isFlagOn(choice?.isOther)) {
          const answerText = String(current.otherText || '').trim()
          if (!answerText) {
            throw new Error('“Diğer” seçeneği için lütfen açıklama yazın.')
          }
          item.answerText = answerText
        }

        payload.push(item)
      }
    }

    return payload
  }

  const handleCvSelect = async (questionId, file) => {
    if (!file) return
    setAnswerField(questionId, 'fileName', file.name)
    setAnswerField(questionId, 'uploading', true)
    setAnswerField(questionId, 'text', '')
    try {
      const uploaded = await uploadAcademyCv(formId, file)
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          text: uploaded.url,
          fileName: uploaded.name,
          uploading: false,
        },
      }))
    } catch (error) {
      console.error('CV yüklenemedi:', error)
      setAnswerField(questionId, 'uploading', false)
      showToast.error('Hata Oluştu', getErrorMessage(error) || error.message || 'CV yüklenirken bir hata oluştu.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    if (!canApplyToForm(currentForm)) {
      showToast.warning(
        'Dikkat',
        hasFormStarted(currentForm) ? 'Başvuru süresi sona erdi.' : 'Başvuru süreci henüz başlamadı.',
      )
      return
    }
    if (questions.some((question) => answers[question.questionId]?.uploading)) {
      showToast.warning('Dikkat', 'CV yüklemesi bitene kadar bekleyin.')
      return
    }

    const name = toTitleCaseTr(profile.name)
    const surname = toTitleCaseTr(profile.surname)
    if (!name || !surname) {
      showToast.warning('Dikkat', 'Ad ve soyad zorunludur.')
      return
    }
    if (!isTurkishPhone(profile.phone)) {
      setPhoneError('Türkiye telefon numarası formatına uygun bir numara girin.')
      showToast.warning('Dikkat', 'Geçerli bir Türkiye telefon numarası girin.')
      return
    }

    setProfile((prev) => ({ ...prev, name, surname }))
    setSubmitting(true)
    try {
      const answerPayload = buildAnswers()
      await applyToForm(formId, {
        name,
        surname,
        email: profile.email.trim(),
        phone: profile.phone,
        universityId: Number(profile.universityId),
        departmentId: Number(profile.departmentId),
        gradDate: null,
        answers: answerPayload,
      })

      showToast.success('Başarılı', 'Başvurunuz alındı.')
      navigate('/academy')
    } catch (error) {
      console.error('Akademi başvurusu gönderilemedi:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || error.message || 'Başvuru gönderilirken bir hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/academy"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            İlanlara Dön
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Akademi Başvurusu
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {loading ? (
          <div className="py-24">
            <LoadingState />
          </div>
        ) : applyState !== 'open' ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-md sm:p-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
              <GraduationCap className="h-7 w-7 text-blue-600" />
            </span>
            <h1 className="mt-6 text-2xl font-bold text-slate-900">{formTitle}</h1>
            {applyState === 'upcoming' ? (
              <p className="mt-2 text-sm text-slate-500">
                Başvurular {formatDate(currentForm?.sdate)} tarihinde başlayacak.
                Bu tarihten önce forma başvurulamaz.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Bu ilan adaylara açık değil veya başvuru süresi sona erdi.
              </p>
            )}
            {currentForm?.sdate || currentForm?.edate ? (
              <p className="mt-3 text-sm font-medium text-slate-600">
                {formatDate(currentForm?.sdate)} – {formatDate(currentForm?.edate)}
              </p>
            ) : null}
            <Link
              to="/academy"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              İlanlara Dön
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-md sm:p-8">
              <h1 className="text-2xl font-bold text-slate-900">{formTitle}</h1>
              <p className="mt-2 text-sm text-slate-500">
                Kişisel bilgilerinizi doldurun. Bu formda yalnızca aday soruları görünür.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Ad
                  <input
                    name="name"
                    required
                    value={profile.name}
                    onChange={updateProfile}
                    onBlur={formatNameField}
                    className={`mt-2 ${inputClass}`}
                    autoComplete="given-name"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Soyad
                  <input
                    name="surname"
                    required
                    value={profile.surname}
                    onChange={updateProfile}
                    onBlur={formatNameField}
                    className={`mt-2 ${inputClass}`}
                    autoComplete="family-name"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  E-posta
                  <input type="email" name="email" required value={profile.email} onChange={updateProfile} className={`mt-2 ${inputClass}`} />
                </label>
                <div className="block text-sm font-medium text-slate-700">
                  Telefon
                  <div className="mt-2">
                    <PhoneInput
                      international
                      defaultCountry="TR"
                      countries={['TR']}
                      countryCallingCodeEditable={false}
                      addInternationalOption={false}
                      value={profile.phone || undefined}
                      onChange={(value) => {
                        setProfile((prev) => ({ ...prev, phone: value || '' }))
                        if (phoneError) setPhoneError('')
                      }}
                      numberInputProps={{
                        required: true,
                        inputMode: 'tel',
                        autoComplete: 'tel',
                        className: 'PhoneInputInput',
                      }}
                      className={`PhoneInput ${phoneError ? 'PhoneInput--error' : ''}`}
                      placeholder="5XX XXX XX XX"
                    />
                  </div>
                  {phoneError ? <p className="mt-1 text-xs text-red-600">{phoneError}</p> : null}
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Üniversite
                  {universities.length > 0 ? (
                    <select name="universityId" required value={profile.universityId} onChange={updateProfile} className={`mt-2 ${inputClass}`}>
                      <option value="">Seçiniz</option>
                      {universities.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      name="universityId"
                      required
                      min="1"
                      value={profile.universityId}
                      onChange={updateProfile}
                      className={`mt-2 ${inputClass}`}
                      placeholder="Üniversite numarası"
                    />
                  )}
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Bölüm
                  <select name="departmentId" required value={profile.departmentId} onChange={updateProfile} className={`mt-2 ${inputClass}`}>
                    <option value="">Seçiniz</option>
                    {departments.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-md">
                  Bu forma ait soru bulunamadı.
                </div>
              ) : (
                questions.map((question, index) => {
                  const kind = getQuestionKind(question, questionTypes)
                  const current = answers[question.questionId] || {}
                  const choices = sortChoices(question.choices)
                  const selectedIds = kind === 'multi'
                    ? (current.choiceIds || [])
                    : (current.choiceId != null ? [current.choiceId] : [])

                  return (
                    <section key={question.questionId} className="rounded-2xl bg-white p-6 shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-sm font-semibold text-slate-800">
                          {index + 1}. {question.questionText}
                          {isFlagOn(question.isReq) ? <span className="ml-1 text-red-500">*</span> : null}
                        </h2>
                      </div>

                      {kind === 'date' ? (
                        <input
                          type="date"
                          required={isFlagOn(question.isReq)}
                          value={current.text || ''}
                          onChange={(event) => setAnswerField(question.questionId, 'text', event.target.value)}
                          className={`mt-4 ${inputClass}`}
                        />
                      ) : kind === 'file' ? (
                        <div className="mt-4">
                          <label className="flex cursor-pointer flex-col items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 transition hover:border-blue-300 hover:bg-blue-50/50">
                            <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                              <Upload className="h-4 w-4 text-blue-600" />
                              PDF CV yükle (en fazla 5 MB)
                            </span>
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              required={isFlagOn(question.isReq) && !current.text}
                              onChange={(event) => handleCvSelect(question.questionId, event.target.files?.[0])}
                              className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                            />
                          </label>
                          {current.uploading ? (
                            <p className="mt-2 text-xs text-slate-500">CV yükleniyor...</p>
                          ) : current.fileName && current.text ? (
                            <p className="mt-2 text-xs font-medium text-emerald-700">{current.fileName} yüklendi.</p>
                          ) : null}
                        </div>
                      ) : kind === 'open' ? (
                        <textarea
                          required={isFlagOn(question.isReq)}
                          rows="4"
                          value={current.text || ''}
                          onChange={(event) => setAnswerField(question.questionId, 'text', event.target.value)}
                          className={`mt-4 resize-none ${inputClass}`}
                          placeholder="Cevabınızı yazın"
                        />
                      ) : (
                        <div className="mt-4 space-y-2">
                          {choices.map((choice) => {
                            const choiceId = getChoiceId(choice)
                            const checked = selectedIds.some((id) => String(id) === String(choiceId))
                            const showOtherInput = checked && isFlagOn(choice.isOther)
                            return (
                              <div key={choiceId}>
                                <label
                                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                                    checked ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <input
                                    type={kind === 'multi' ? 'checkbox' : 'radio'}
                                    name={`question-${question.questionId}`}
                                    checked={checked}
                                    onChange={() => {
                                      if (kind === 'multi') {
                                        toggleMultiChoice(question.questionId, choiceId)
                                      } else {
                                        setSingleChoice(question.questionId, choiceId)
                                      }
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>{choice.choiceText}</span>
                                </label>
                                {showOtherInput ? (
                                  <input
                                    type="text"
                                    required
                                    value={current.otherText || ''}
                                    onChange={(event) => setAnswerField(question.questionId, 'otherText', event.target.value)}
                                    className={`mt-2 ${inputClass}`}
                                    placeholder="Lütfen belirtiniz"
                                  />
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  )
                })
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || questions.some((question) => answers[question.questionId]?.uploading)}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
