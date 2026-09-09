// Form oluştur/düzenle: veri yükler, CreateFormView'e bırakır.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createForm, getFormDetail, updateForm } from '../api/forms'
import { getQuestionId, normalizeQuestionTypes, toFlag, toFormDateTimeApi } from '../api/helpers'
import { createOrganization, getOrganizations, updateOrganization } from '../api/organizations'
import { createQuestion, getQuestions, getQuestionTypes } from '../api/questions'
import { getErrorMessage } from '../../shared/api/client'
import { showToast } from '../../shared/toast/ToastProvider'
import CreateFormView from './CreateFormView'
import { LoadingState } from './ui'

export default function CreateFormPage() {
  const { formId } = useParams()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [questionTypes, setQuestionTypes] = useState([])
  const [editingForm, setEditingForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingForm, setSavingForm] = useState(false)
  const [savingOrganization, setSavingOrganization] = useState(false)
  const [savingOrganizationId, setSavingOrganizationId] = useState(null)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [organizationCatalog, setOrganizationCatalog] = useState([])
  const [loadingOrganizations, setLoadingOrganizations] = useState(false)

  // Havuz, org, tipler; formId varsa detay.
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const [questionRows, organizationRows, typeRows, detail] = await Promise.all([
          getQuestions(),
          getOrganizations(),
          getQuestionTypes().then(normalizeQuestionTypes).catch(() => []),
          formId ? getFormDetail(formId) : Promise.resolve(null),
        ])
        if (cancelled) return
        setQuestions(Array.isArray(questionRows) ? questionRows : [])
        setOrganizations(Array.isArray(organizationRows) ? organizationRows : [])
        setQuestionTypes(Array.isArray(typeRows) ? typeRows : [])
        setEditingForm(detail)
      } catch (error) {
        console.error('Form ekranı yüklenemedi:', error)
        if (!cancelled) {
          showToast.error('Hata Oluştu', getErrorMessage(error) || 'Form bilgileri yüklenirken bir hata oluştu.')
          if (formId) navigate('/academy/manager/forms', { replace: true })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [formId, navigate])

  // Create veya update; seçilen tarih ve saat gönderilir.
  const handleSaveForm = async (payload) => {
    setSavingForm(true)
    try {
      const body = {
        organizationId: Number(payload.organizationId),
        title: payload.title,
        descr: payload.descr || null,
        sdate: toFormDateTimeApi(payload.sdate),
        edate: toFormDateTimeApi(payload.edate),
        isActv: toFlag(payload.isActv),
        questions: payload.questions,
      }
      if (payload.formId) {
        await updateForm(payload.formId, body)
        showToast.success('Başarılı', 'Form güncellendi.')
      } else {
        await createForm(body)
        showToast.success('Başarılı', 'Form kaydedildi.')
      }
      navigate('/academy/manager/forms')
    } catch (error) {
      console.error('Form kaydedilemedi:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Form kaydedilirken bir hata oluştu.')
    } finally {
      setSavingForm(false)
    }
  }

  // Modal'dan yeni soru → havuza ekle.
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

  const refreshActiveOrganizations = async () => {
    const organizationRows = await getOrganizations()
    setOrganizations(Array.isArray(organizationRows) ? organizationRows : [])
    return organizationRows
  }

  // Detay modalı: aktif + pasif org listesi.
  const handleOpenOrganizationDetails = async () => {
    setLoadingOrganizations(true)
    try {
      const rows = await getOrganizations({ includeInactive: true })
      setOrganizationCatalog(Array.isArray(rows) ? rows : [])
    } catch (error) {
      console.error('Organizasyonlar yüklenemedi:', error)
      setOrganizationCatalog([])
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Organizasyonlar yüklenirken bir hata oluştu.')
    } finally {
      setLoadingOrganizations(false)
    }
  }

  const handleToggleOrganization = async (org, nextActive) => {
    if (!org?.id || savingOrganizationId) return
    setSavingOrganizationId(org.id)
    try {
      const updated = await updateOrganization(org.id, { isActv: toFlag(nextActive) })
      setOrganizationCatalog((prev) =>
        prev.map((row) => (String(row.id) === String(updated.id) ? { ...row, ...updated } : row)),
      )
      await refreshActiveOrganizations()
      showToast.success('Başarılı', nextActive ? 'Organizasyon aktifleştirildi.' : 'Organizasyon pasifleştirildi.')
    } catch (error) {
      console.error('Organizasyon güncellenemedi:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Organizasyon güncellenirken bir hata oluştu.')
    } finally {
      setSavingOrganizationId(null)
    }
  }

  const handleAddOrganization = async (payload) => {
    setSavingOrganization(true)
    try {
      const created = await createOrganization(payload)
      showToast.success('Başarılı', 'Organizasyon kaydedildi.')
      await refreshActiveOrganizations()
      setOrganizationCatalog((prev) => {
        if (!created?.id) return prev
        if (prev.some((row) => String(row.id) === String(created.id))) return prev
        return [...prev, created]
      })
      return created
    } catch (error) {
      console.error('Organizasyon kaydedilemedi:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Organizasyon kaydedilirken bir hata oluştu.')
      return null
    } finally {
      setSavingOrganization(false)
    }
  }

  if (loading) {
    return <LoadingState label="Form bilgileri yükleniyor..." />
  }

  return (
    <CreateFormView
      key={editingForm?.formId || 'create'}
      questions={questions}
      organizations={organizations}
      organizationCatalog={organizationCatalog}
      loadingOrganizations={loadingOrganizations}
      questionTypes={questionTypes}
      editingForm={editingForm}
      onSave={handleSaveForm}
      onCancel={() => navigate('/academy/manager/forms')}
      onAddQuestion={handleAddQuestion}
      onAddOrganization={handleAddOrganization}
      onOpenOrganizationDetails={handleOpenOrganizationDetails}
      onToggleOrganization={handleToggleOrganization}
      savingForm={savingForm}
      savingOrganization={savingOrganization}
      savingOrganizationId={savingOrganizationId}
      savingQuestion={savingQuestion}
    />
  )
}
