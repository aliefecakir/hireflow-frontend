import { useEffect, useState } from 'react'
import { getQuestionId, normalizeQuestionTypes } from '../api/helpers'
import { createQuestion, getQuestions, getQuestionTypes } from '../api/questions'
import { getErrorMessage } from '../../shared/api/client'
import { showToast } from '../../shared/toast/ToastProvider'
import QuestionPoolView from './QuestionPoolView'
import { LoadingState } from './ui'

export default function QuestionPoolPage() {
  const [questions, setQuestions] = useState([])
  const [questionTypes, setQuestionTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingQuestion, setSavingQuestion] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [questionRows, typeRows] = await Promise.all([
          getQuestions(),
          getQuestionTypes().then(normalizeQuestionTypes).catch(() => []),
        ])
        if (cancelled) return
        setQuestions(Array.isArray(questionRows) ? questionRows : [])
        setQuestionTypes(Array.isArray(typeRows) ? typeRows : [])
      } catch (error) {
        console.error('Soru havuzu yüklenemedi:', error)
        if (!cancelled) {
          setQuestions([])
          showToast.error('Hata Oluştu', getErrorMessage(error) || 'Soru havuzu yüklenirken bir hata oluştu.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleAddQuestion = async (payload) => {
    setSavingQuestion(true)
    try {
      const created = await createQuestion(payload)
      showToast.success('Başarılı', 'Soru kaydedildi.')
      const questionId = getQuestionId(created)
      if (questionId) {
        setQuestions((prev) => {
          if (prev.some((row) => String(getQuestionId(row)) === String(questionId))) return prev
          return [...prev, created]
        })
      }
      return created
    } catch (error) {
      console.error('Soru kaydedilemedi:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Soru kaydedilirken bir hata oluştu.')
      return null
    } finally {
      setSavingQuestion(false)
    }
  }

  if (loading) {
    return <LoadingState label="Soru havuzu yükleniyor..." />
  }

  return (
    <QuestionPoolView
      questions={questions}
      questionTypes={questionTypes}
      onAddQuestion={handleAddQuestion}
      savingQuestion={savingQuestion}
    />
  )
}
