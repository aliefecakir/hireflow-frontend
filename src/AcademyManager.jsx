import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarRange,
  CircleHelp,
  ClipboardList,
  FilePlus,
  GraduationCap,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react'

const MENU_ITEMS = [
  { id: 'forms', label: 'Formlar', hint: 'Ana Sayfa', icon: ClipboardList },
  { id: 'create', label: 'Form Oluştur', icon: FilePlus },
  { id: 'pool', label: 'Soru Havuzu', icon: CircleHelp },
]

const QUESTION_TYPES = {
  1: 'Tek Seçmeli',
  2: 'Çok Seçmeli',
  3: 'Açık Uçlu',
}

const INITIAL_ORGANIZATIONS = [
  { organization_id: 1, name: 'HireFlow Akademi' },
  { organization_id: 2, name: 'Yazılım Geliştirme Birimi' },
  { organization_id: 3, name: 'Veri ve Analitik Birimi' },
]

const UNIVERSITIES = [
  { university_id: 1, name: 'Boğaziçi Üniversitesi' },
  { university_id: 2, name: 'ODTÜ' },
  { university_id: 3, name: 'İTÜ' },
  { university_id: 4, name: 'Hacettepe Üniversitesi' },
  { university_id: 5, name: 'Bilkent Üniversitesi' },
  { university_id: 6, name: 'Koç Üniversitesi' },
]

const DEPARTMENTS = [
  { department_id: 1, name: 'Bilgisayar Mühendisliği' },
  { department_id: 2, name: 'Yazılım Mühendisliği' },
  { department_id: 3, name: 'Elektrik-Elektronik Mühendisliği' },
  { department_id: 4, name: 'Endüstri Mühendisliği' },
  { department_id: 5, name: 'Yönetim Bilişim Sistemleri' },
]

const INITIAL_FORMS = [
  {
    form_id: 1,
    organization_id: 1,
    title: '2026 Yaz Dönemi Backend Bootcamp',
    descr: 'Java, Spring Boot ve PostgreSQL odaklı yoğun yaz kampı.',
    is_actv: true,
    sdate: '2026-06-01',
    edate: '2026-08-31',
  },
  {
    form_id: 2,
    organization_id: 3,
    title: 'Data Science Yetenek Kampı',
    descr: 'Python, makine öğrenmesi ve veri analizi programı.',
    is_actv: true,
    sdate: '2026-03-15',
    edate: '2026-06-15',
  },
  {
    form_id: 3,
    organization_id: 2,
    title: '2026 Frontend Geliştirme Akademisi',
    descr: 'React ve TypeScript ile modern arayüz geliştirme.',
    is_actv: true,
    sdate: '2026-09-01',
    edate: '2026-11-30',
  },
  {
    form_id: 4,
    organization_id: 1,
    title: '2025 Kış Dönemi Yazılım Kampı',
    descr: 'Tamamlanmış full-stack kış dönemi programı.',
    is_actv: false,
    sdate: '2025-12-01',
    edate: '2026-02-28',
  },
]

const INITIAL_QUESTIONS = [
  {
    question_id: 1,
    question_text: 'Haftalık kaç saat ayırabilirsiniz?',
    tp_id: 1,
    min_score: 0,
    max_score: 10,
    choices: [
      { question_choice_id: 11, question_id: 1, choice_text: '5 saatten az', score: 2, ord_no: 1 },
      { question_choice_id: 12, question_id: 1, choice_text: '5–10 saat', score: 6, ord_no: 2 },
      { question_choice_id: 13, question_id: 1, choice_text: '10–20 saat', score: 8, ord_no: 3 },
      { question_choice_id: 14, question_id: 1, choice_text: '20 saatten fazla', score: 10, ord_no: 4 },
    ],
  },
  {
    question_id: 2,
    question_text: 'Hangi teknolojilerde deneyiminiz var?',
    tp_id: 2,
    min_score: 0,
    max_score: 12,
    choices: [
      { question_choice_id: 21, question_id: 2, choice_text: 'Java', score: 4, ord_no: 1 },
      { question_choice_id: 22, question_id: 2, choice_text: 'Spring Boot', score: 4, ord_no: 2 },
      { question_choice_id: 23, question_id: 2, choice_text: 'PostgreSQL', score: 3, ord_no: 3 },
      { question_choice_id: 24, question_id: 2, choice_text: 'React', score: 3, ord_no: 4 },
    ],
  },
  {
    question_id: 3,
    question_text: 'Neden bu akademi programına katılmak istiyorsunuz?',
    tp_id: 3,
    min_score: 0,
    max_score: 10,
    choices: [],
  },
]

const INITIAL_APPS = [
  {
    academy_app_id: 101,
    form_id: 1,
    name: 'Elif',
    surname: 'Yılmaz',
    email: 'elif.yilmaz@example.com',
    phone: '+90 532 111 22 01',
    university_id: 1,
    department_id: 1,
    total_score: 87,
    status_descr: 'Değerlendirme Bekliyor',
  },
  {
    academy_app_id: 102,
    form_id: 1,
    name: 'Mert',
    surname: 'Kaya',
    email: 'mert.kaya@example.com',
    phone: '+90 532 111 22 02',
    university_id: 2,
    department_id: 2,
    total_score: 92,
    status_descr: 'Mülakat Aşamasında',
  },
  {
    academy_app_id: 103,
    form_id: 1,
    name: 'Zeynep',
    surname: 'Arslan',
    email: 'zeynep.arslan@example.com',
    phone: '+90 532 111 22 03',
    university_id: 3,
    department_id: 1,
    total_score: 78,
    status_descr: 'Değerlendirme Bekliyor',
  },
  {
    academy_app_id: 104,
    form_id: 1,
    name: 'Can',
    surname: 'Demir',
    email: 'can.demir@example.com',
    phone: '+90 532 111 22 04',
    university_id: 4,
    department_id: 3,
    total_score: 84,
    status_descr: 'Kabul Edildi',
  },
  {
    academy_app_id: 105,
    form_id: 1,
    name: 'Ayşe',
    surname: 'Koç',
    email: 'ayse.koc@example.com',
    phone: '+90 532 111 22 05',
    university_id: 5,
    department_id: 2,
    total_score: 91,
    status_descr: 'Mülakat Aşamasında',
  },
  {
    academy_app_id: 201,
    form_id: 2,
    name: 'Emre',
    surname: 'Şahin',
    email: 'emre.sahin@example.com',
    phone: '+90 533 200 00 01',
    university_id: 6,
    department_id: 1,
    total_score: 88,
    status_descr: 'Değerlendirme Bekliyor',
  },
  {
    academy_app_id: 202,
    form_id: 2,
    name: 'Selin',
    surname: 'Aydın',
    email: 'selin.aydin@example.com',
    phone: '+90 533 200 00 02',
    university_id: 5,
    department_id: 5,
    total_score: 95,
    status_descr: 'Kabul Edildi',
  },
  {
    academy_app_id: 301,
    form_id: 3,
    name: 'Ceren',
    surname: 'Aksoy',
    email: 'ceren.aksoy@example.com',
    phone: '+90 534 300 00 01',
    university_id: 1,
    department_id: 2,
    total_score: 90,
    status_descr: 'Mülakat Aşamasında',
  },
  {
    academy_app_id: 401,
    form_id: 4,
    name: 'Ahmet',
    surname: 'Güneş',
    email: 'ahmet.gunes@example.com',
    phone: '+90 535 400 00 01',
    university_id: 4,
    department_id: 4,
    total_score: 82,
    status_descr: 'Reddedildi',
  },
]

const INITIAL_ANSWERS = [
  { question_answer_id: 1, academy_app_id: 101, question_id: 1, question_choice_id: 13, answer_text: null, score: 8 },
  { question_answer_id: 2, academy_app_id: 101, question_id: 2, question_choice_id: 21, answer_text: null, score: 4 },
  { question_answer_id: 3, academy_app_id: 101, question_id: 2, question_choice_id: 22, answer_text: null, score: 4 },
  { question_answer_id: 4, academy_app_id: 101, question_id: 3, question_choice_id: null, answer_text: 'Backend tarafında derinleşmek ve gerçek ürün ekiplerinde çalışmak istiyorum.', score: 8 },
  { question_answer_id: 5, academy_app_id: 102, question_id: 1, question_choice_id: 14, answer_text: null, score: 10 },
  { question_answer_id: 6, academy_app_id: 102, question_id: 2, question_choice_id: 21, answer_text: null, score: 4 },
  { question_answer_id: 7, academy_app_id: 102, question_id: 2, question_choice_id: 23, answer_text: null, score: 3 },
  { question_answer_id: 8, academy_app_id: 102, question_id: 3, question_choice_id: null, answer_text: 'Akademinin proje odaklı müfredatı kariyer hedefime doğrudan uyuyor.', score: 9 },
  { question_answer_id: 9, academy_app_id: 103, question_id: 1, question_choice_id: 12, answer_text: null, score: 6 },
  { question_answer_id: 10, academy_app_id: 103, question_id: 2, question_choice_id: 24, answer_text: null, score: 3 },
  { question_answer_id: 11, academy_app_id: 103, question_id: 3, question_choice_id: null, answer_text: 'Yeni bir alana geçiş yapmak ve güçlü bir temel oluşturmak istiyorum.', score: 7 },
  { question_answer_id: 12, academy_app_id: 104, question_id: 1, question_choice_id: 13, answer_text: null, score: 8 },
  { question_answer_id: 13, academy_app_id: 104, question_id: 2, question_choice_id: 21, answer_text: null, score: 4 },
  { question_answer_id: 14, academy_app_id: 104, question_id: 2, question_choice_id: 23, answer_text: null, score: 3 },
  { question_answer_id: 15, academy_app_id: 104, question_id: 3, question_choice_id: null, answer_text: 'Üretim ortamında ölçeklenebilir servisler geliştirmek istiyorum.', score: 8 },
  { question_answer_id: 16, academy_app_id: 105, question_id: 1, question_choice_id: 14, answer_text: null, score: 10 },
  { question_answer_id: 17, academy_app_id: 105, question_id: 2, question_choice_id: 22, answer_text: null, score: 4 },
  { question_answer_id: 18, academy_app_id: 105, question_id: 3, question_choice_id: null, answer_text: 'Akademi sonrası ekibe kalıcı olarak katkı vermeyi hedefliyorum.', score: 9 },
  { question_answer_id: 19, academy_app_id: 201, question_id: 1, question_choice_id: 13, answer_text: null, score: 8 },
  { question_answer_id: 20, academy_app_id: 201, question_id: 2, question_choice_id: 23, answer_text: null, score: 3 },
  { question_answer_id: 21, academy_app_id: 201, question_id: 3, question_choice_id: null, answer_text: 'Veri odaklı ürün kararları verebilmek için bu kampa başvuruyorum.', score: 8 },
  { question_answer_id: 22, academy_app_id: 202, question_id: 1, question_choice_id: 14, answer_text: null, score: 10 },
  { question_answer_id: 23, academy_app_id: 202, question_id: 2, question_choice_id: 21, answer_text: null, score: 4 },
  { question_answer_id: 24, academy_app_id: 202, question_id: 2, question_choice_id: 24, answer_text: null, score: 3 },
  { question_answer_id: 25, academy_app_id: 202, question_id: 3, question_choice_id: null, answer_text: 'Modelleme ve iş zekası konularında derinleşmek istiyorum.', score: 9 },
  { question_answer_id: 26, academy_app_id: 301, question_id: 1, question_choice_id: 13, answer_text: null, score: 8 },
  { question_answer_id: 27, academy_app_id: 301, question_id: 2, question_choice_id: 24, answer_text: null, score: 3 },
  { question_answer_id: 28, academy_app_id: 301, question_id: 3, question_choice_id: null, answer_text: 'Kullanıcı deneyimini kodla birleştiren bir frontend kariyeri istiyorum.', score: 8 },
  { question_answer_id: 29, academy_app_id: 401, question_id: 1, question_choice_id: 12, answer_text: null, score: 6 },
  { question_answer_id: 30, academy_app_id: 401, question_id: 2, question_choice_id: 21, answer_text: null, score: 4 },
  { question_answer_id: 31, academy_app_id: 401, question_id: 3, question_choice_id: null, answer_text: 'Kış kampında temel bilgimi pekiştirmek istemiştim.', score: 6 },
]

const INTERVIEW_CRITERIA = [
  { id: 'communication', label: 'İletişim' },
  { id: 'responsibility', label: 'Sorumluluk' },
  { id: 'problemSolving', label: 'Problem Çözme' },
  { id: 'teamwork', label: 'Takım Çalışması' },
  { id: 'learning', label: 'Öğrenme İsteği' },
]

const EMPTY_FORM = {
  title: '',
  descr: '',
  organization_id: 1,
  sdate: '',
  edate: '',
  is_actv: true,
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500'

function lookupName(list, id, key, nameKey = 'name') {
  return list.find((item) => item[key] === id)?.[nameKey] || '—'
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(`${value}T00:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function fullName(app) {
  return `${app.name} ${app.surname}`.trim()
}

function statusBadgeClass(status) {
  if (status === 'Kabul Edildi') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'Reddedildi') return 'border-red-200 bg-red-50 text-red-700'
  if (status === 'Mülakat Aşamasında') return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function typeBadgeClass(tpId) {
  if (tpId === 1) return 'bg-blue-50 text-blue-700'
  if (tpId === 2) return 'bg-violet-50 text-violet-700'
  return 'bg-slate-100 text-slate-700'
}

function useEscape(onClose) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
}

function ActiveBadge({ isActive }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        isActive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}
    >
      {isActive ? 'Aktif' : 'Pasif'}
    </span>
  )
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3"
    >
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </span>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
    </button>
  )
}

function FormCards({ forms, applications, onSelect }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Aktif Akademi Formları</h1>
        <p className="mt-1 text-sm text-slate-600">
          Bir forma tıklayarak başvuruları görüntüleyin ve değerlendirin.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {forms.map((form) => {
          const count = applications.filter((app) => app.form_id === form.form_id).length
          return (
            <button
              key={form.form_id}
              type="button"
              onClick={() => onSelect(form)}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold tracking-tight text-slate-800 group-hover:text-blue-700">
                  {form.title}
                </h2>
                <ActiveBadge isActive={form.is_actv} />
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">{form.descr}</p>
              <div className="mt-5 flex flex-col gap-2.5">
                <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold text-slate-800">{count}</span> Başvuru
                </span>
                <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <CalendarRange className="h-4 w-4 text-orange-500" />
                  {formatDate(form.sdate)} – {formatDate(form.edate)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ApplicationList({ form, applications, onBack, onEvaluate }) {
  const rows = applications.filter((app) => app.form_id === form.form_id)

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Geri Dön
        </button>
        <h1 className="mt-3 text-2xl font-bold text-slate-800">{form.title} Başvuruları</h1>
        <p className="mt-1 text-sm text-slate-600">{rows.length} aday listeleniyor</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-slate-700">ID</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-700">Ad Soyad</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-700">Üniversite</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-700">Bölüm</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-700">Toplam Puan</th>
                <th className="px-5 py-3 text-left font-semibold text-slate-700">Durum</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-700">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.academy_app_id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{row.academy_app_id}</td>
                  <td className="px-5 py-4 font-medium text-slate-800">{fullName(row)}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {lookupName(UNIVERSITIES, row.university_id, 'university_id')}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {lookupName(DEPARTMENTS, row.department_id, 'department_id')}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex min-w-[2.5rem] justify-center rounded-lg bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700">
                      {row.total_score}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(row.status_descr)}`}
                    >
                      {row.status_descr}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onEvaluate(row)}
                      className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                    >
                      Değerlendir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function EvaluationModal({ candidate, questions, answers, onClose }) {
  const [scores, setScores] = useState({})
  useEscape(onClose)

  const candidateAnswers = answers.filter((item) => item.academy_app_id === candidate.academy_app_id)

  const groupedAnswers = useMemo(() => {
    return questions
      .map((question) => {
        const rows = candidateAnswers.filter((item) => item.question_id === question.question_id)
        if (rows.length === 0) return null

        const selectedChoices = rows
          .map((row) => question.choices.find((choice) => choice.question_choice_id === row.question_choice_id))
          .filter(Boolean)
          .sort((a, b) => a.ord_no - b.ord_no)

        const openText = rows.find((row) => row.answer_text)?.answer_text
        const total = rows.reduce((sum, row) => sum + (Number(row.score) || 0), 0)

        return { question, selectedChoices, openText, total }
      })
      .filter(Boolean)
  }, [candidateAnswers, questions])

  const handleSave = (event) => {
    event.preventDefault()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Aday Detayı ve Değerlendirme</h2>
            <p className="mt-1 text-sm font-medium text-slate-700">{fullName(candidate)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {candidate.email} · {lookupName(UNIVERSITIES, candidate.university_id, 'university_id')} ·{' '}
              {lookupName(DEPARTMENTS, candidate.department_id, 'department_id')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-800">Bölüm 1 · Adayın Form Cevapları</h3>
              <p className="mt-1 text-xs text-slate-500">QUESTION_ANSWER kayıtları salt okunur gösterilir.</p>
              <div className="mt-4 space-y-4">
                {groupedAnswers.length === 0 ? (
                  <p className="text-sm text-slate-500">Bu adaya ait form cevabı bulunamadı.</p>
                ) : (
                  groupedAnswers.map(({ question, selectedChoices, openText, total }) => (
                    <div key={question.question_id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-slate-800">{question.question_text}</p>
                        <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                          {total} puan
                        </span>
                      </div>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${typeBadgeClass(question.tp_id)}`}>
                        {QUESTION_TYPES[question.tp_id]}
                      </span>
                      {question.tp_id === 3 ? (
                        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                          {openText || 'Cevap girilmemiş.'}
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-1.5">
                          {selectedChoices.map((choice) => (
                            <li key={choice.question_choice_id} className="text-sm text-slate-600">
                              <span className="font-medium text-slate-800">{choice.choice_text}</span>
                              <span className="ml-2 text-xs text-slate-400">({choice.score} puan)</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-800">Bölüm 2 · Yönetici Değerlendirmesi</h3>
              <p className="mt-1 text-xs text-slate-500">Mülakat kriterlerini 1–5 arası puanlayın.</p>
              <div className="mt-4 space-y-5">
                {INTERVIEW_CRITERIA.map((criterion) => (
                  <fieldset key={criterion.id}>
                    <legend className="mb-2 text-sm font-medium text-slate-700">{criterion.label}</legend>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((value) => {
                        const selected = scores[criterion.id] === value
                        return (
                          <label
                            key={value}
                            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                              selected
                                ? 'border-orange-500 bg-orange-500 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-orange-200 hover:bg-orange-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={criterion.id}
                              value={value}
                              checked={selected}
                              onChange={() => setScores((prev) => ({ ...prev, [criterion.id]: value }))}
                              className="sr-only"
                            />
                            {value}
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            </section>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300"
            >
              İptal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function OrganizationModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  useEscape(onClose)

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Yeni Organizasyon</h2>
            <p className="mt-1 text-sm text-slate-500">Organizasyon adı kaydedilince listede seçili hale gelir.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label className="block text-sm font-medium text-slate-700">
              Organizasyon Adı
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={`mt-2 ${inputClass}`}
                placeholder="Örn: Mobil Geliştirme Birimi"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300"
            >
              İptal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CreateFormView({ questions, organizations, onSave, onAddQuestion, onAddOrganization }) {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [attachments, setAttachments] = useState({})
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'organization_id' ? Number(value) : value,
    }))
  }

  const attachQuestion = (questionId) => {
    setAttachments((prev) => {
      if (prev[questionId]) return prev
      return {
        ...prev,
        [questionId]: {
          question_id: questionId,
          is_required: true,
          ord_no: Object.keys(prev).length + 1,
        },
      }
    })
  }

  const toggleQuestion = (questionId) => {
    setAttachments((prev) => {
      if (prev[questionId]) {
        const next = { ...prev }
        delete next[questionId]
        return next
      }
      return {
        ...prev,
        [questionId]: {
          question_id: questionId,
          is_required: true,
          ord_no: Object.keys(prev).length + 1,
        },
      }
    })
  }

  const updateAttachment = (questionId, field, value) => {
    setAttachments((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      },
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave({
      ...formData,
      form_questions: Object.values(attachments).sort((a, b) => Number(a.ord_no) - Number(b.ord_no)),
    })
    setFormData(EMPTY_FORM)
    setAttachments({})
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Form Oluştur</h1>
        <p className="mt-1 text-sm text-slate-600">
          FORM tablosuna uygun başlık, açıklama, organizasyon, tarih ve aktiflik bilgilerini girin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Başlık (TITLE)
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className={`mt-2 ${inputClass}`}
                placeholder="Örn: 2026 Güz Dönemi Mobil Geliştirme Kampı"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Açıklama (DESCR)
              <textarea
                name="descr"
                required
                rows="4"
                value={formData.descr}
                onChange={handleChange}
                className={`mt-2 resize-none ${inputClass}`}
                placeholder="Programın kapsamını ve hedef kitlesini yazın."
              />
            </label>

            <div className="sm:col-span-2">
              <span className="block text-sm font-medium text-slate-700">Organizasyon</span>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  name="organization_id"
                  value={formData.organization_id}
                  onChange={handleChange}
                  className={`min-w-0 flex-1 ${inputClass}`}
                >
                  {organizations.map((org) => (
                    <option key={org.organization_id} value={org.organization_id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowOrgModal(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4" />
                  Yeni Organizasyon
                </button>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Başlangıç Tarihi (SDATE)
              <input
                type="date"
                name="sdate"
                required
                value={formData.sdate}
                onChange={handleChange}
                className={`mt-2 ${inputClass}`}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Bitiş Tarihi (EDATE)
              <input
                type="date"
                name="edate"
                required
                value={formData.edate}
                onChange={handleChange}
                className={`mt-2 ${inputClass}`}
              />
            </label>

            <div className="flex items-end pb-1 sm:col-span-2">
              <Switch
                checked={formData.is_actv}
                onChange={(value) => setFormData((prev) => ({ ...prev, is_actv: value }))}
                label={formData.is_actv ? 'Aktif (IS_ACTV)' : 'Pasif (IS_ACTV)'}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Forma Eklenecek Sorular</h2>
              <p className="mt-1 text-sm text-slate-500">
                Havuzdaki soruları seçin veya yeni soru oluşturup forma otomatik ekleyin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowQuestionModal(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Yeni Soru Oluştur
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Seç</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Soru</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Tip</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Zorunlu mu?</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Sıra No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {questions.map((question) => {
                  const attached = attachments[question.question_id]
                  return (
                    <tr
                      key={question.question_id}
                      className={attached ? 'bg-blue-50/70' : 'hover:bg-slate-50'}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={Boolean(attached)}
                          onChange={() => toggleQuestion(question.question_id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-700">{question.question_text}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${typeBadgeClass(question.tp_id)}`}>
                          {QUESTION_TYPES[question.tp_id]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={Boolean(attached?.is_required)}
                          onChange={(value) => {
                            setAttachments((prev) => {
                              const current = prev[question.question_id] || {
                                question_id: question.question_id,
                                ord_no: Object.keys(prev).length + 1,
                              }
                              return {
                                ...prev,
                                [question.question_id]: {
                                  ...current,
                                  is_required: value,
                                },
                              }
                            })
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          disabled={!attached}
                          value={attached?.ord_no ?? ''}
                          onChange={(event) =>
                            updateAttachment(question.question_id, 'ord_no', Number(event.target.value))
                          }
                          className={`w-20 ${inputClass} disabled:bg-slate-100`}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Formu Kaydet
          </button>
        </div>
      </form>

      {showOrgModal && (
        <OrganizationModal
          onClose={() => setShowOrgModal(false)}
          onSave={(orgName) => {
            const organizationId = onAddOrganization(orgName)
            setFormData((prev) => ({ ...prev, organization_id: organizationId }))
            setShowOrgModal(false)
          }}
        />
      )}

      {showQuestionModal && (
        <QuestionModal
          onClose={() => setShowQuestionModal(false)}
          onSave={(payload) => {
            const questionId = onAddQuestion(payload)
            attachQuestion(questionId)
            setShowQuestionModal(false)
          }}
        />
      )}
    </div>
  )
}

function QuestionModal({ onClose, onSave }) {
  const [questionText, setQuestionText] = useState('')
  const [tpId, setTpId] = useState(1)
  const [choices, setChoices] = useState([
    { key: 1, choice_text: '', score: 0, ord_no: 1 },
    { key: 2, choice_text: '', score: 0, ord_no: 2 },
  ])
  useEscape(onClose)

  const isChoiceType = tpId === 1 || tpId === 2

  const addChoice = () => {
    setChoices((prev) => [
      ...prev,
      { key: Date.now(), choice_text: '', score: 0, ord_no: prev.length + 1 },
    ])
  }

  const updateChoice = (key, field, value) => {
    setChoices((prev) =>
      prev.map((choice) => (choice.key === key ? { ...choice, [field]: value } : choice))
    )
  }

  const removeChoice = (key) => {
    setChoices((prev) => prev.filter((choice) => choice.key !== key).map((choice, index) => ({
      ...choice,
      ord_no: index + 1,
    })))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const preparedChoices = isChoiceType
      ? choices
          .filter((choice) => choice.choice_text.trim())
          .map((choice, index) => ({
            choice_text: choice.choice_text.trim(),
            score: Number(choice.score) || 0,
            ord_no: index + 1,
          }))
      : []

    const scores = preparedChoices.map((choice) => choice.score)
    onSave({
      question_text: questionText.trim(),
      tp_id: Number(tpId),
      min_score: isChoiceType ? Math.min(0, ...scores) : 0,
      max_score: isChoiceType ? Math.max(0, ...scores) : 10,
      choices: preparedChoices,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Yeni Soru Ekle</h2>
            <p className="mt-1 text-sm text-slate-500">QUESTION ve QUESTION_CHOICE alanlarına uygun taslak.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            <label className="block text-sm font-medium text-slate-700">
              Soru Metni
              <textarea
                required
                rows="3"
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                className={`mt-2 resize-none ${inputClass}`}
                placeholder="Adaya gösterilecek soruyu yazın."
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Soru Tipi
              <select
                value={tpId}
                onChange={(event) => setTpId(Number(event.target.value))}
                className={`mt-2 ${inputClass}`}
              >
                <option value={1}>Tek Seçmeli</option>
                <option value={2}>Çok Seçmeli</option>
                <option value={3}>Açık Uçlu</option>
              </select>
            </label>

            {isChoiceType && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-800">Şıklar</h3>
                  <button
                    type="button"
                    onClick={addChoice}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-slate-200 hover:bg-blue-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Şık Ekle
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {choices.map((choice, index) => (
                    <div key={choice.key} className="grid grid-cols-[1fr_6rem_auto] items-center gap-3">
                      <input
                        type="text"
                        required
                        value={choice.choice_text}
                        onChange={(event) => updateChoice(choice.key, 'choice_text', event.target.value)}
                        className={inputClass}
                        placeholder={`${index + 1}. şık metni`}
                      />
                      <input
                        type="number"
                        value={choice.score}
                        onChange={(event) => updateChoice(choice.key, 'score', event.target.value)}
                        className={inputClass}
                        placeholder="Puan"
                      />
                      <button
                        type="button"
                        onClick={() => removeChoice(choice.key)}
                        disabled={choices.length <= 2}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Şıkkı sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300"
            >
              İptal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Soruyu Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QuestionPoolView({ questions, onAddQuestion }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Soru Havuzu</h1>
          <p className="mt-1 text-sm text-slate-600">QUESTION ve QUESTION_CHOICE kayıtlarının statik listesi.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Soru Ekle
        </button>
      </div>

      <div className="space-y-3">
        {questions.map((question) => (
          <div key={question.question_id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${typeBadgeClass(question.tp_id)}`}>
                {QUESTION_TYPES[question.tp_id]}
              </span>
              <span className="text-xs text-slate-400">
                Puan aralığı: {question.min_score}–{question.max_score}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-800">{question.question_text}</p>
            {question.choices.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {question.choices
                  .slice()
                  .sort((a, b) => a.ord_no - b.ord_no)
                  .map((choice) => (
                    <li key={choice.question_choice_id} className="flex items-center justify-between text-sm text-slate-600">
                      <span>{choice.ord_no}. {choice.choice_text}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {choice.score} puan
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <QuestionModal
          onClose={() => setShowModal(false)}
          onSave={(payload) => {
            onAddQuestion(payload)
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

export default function AcademyManager() {
  const [activeMenu, setActiveMenu] = useState('forms')
  const [selectedForm, setSelectedForm] = useState(null)
  const [evaluatingCandidate, setEvaluatingCandidate] = useState(null)
  const [forms, setForms] = useState(INITIAL_FORMS)
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS)
  const [organizations, setOrganizations] = useState(INITIAL_ORGANIZATIONS)
  const [applications] = useState(INITIAL_APPS)
  const [answers] = useState(INITIAL_ANSWERS)
  const [nextFormId, setNextFormId] = useState(5)
  const [nextQuestionId, setNextQuestionId] = useState(4)
  const [nextOrgId, setNextOrgId] = useState(4)

  const handleMenuChange = (menuId) => {
    setActiveMenu(menuId)
    setSelectedForm(null)
    setEvaluatingCandidate(null)
  }

  const handleSaveForm = (payload) => {
    setForms((prev) => [
      {
        form_id: nextFormId,
        organization_id: payload.organization_id,
        title: payload.title,
        descr: payload.descr,
        is_actv: payload.is_actv,
        sdate: payload.sdate,
        edate: payload.edate,
        form_questions: payload.form_questions,
      },
      ...prev,
    ])
    setNextFormId((value) => value + 1)
    setActiveMenu('forms')
    setSelectedForm(null)
  }

  const handleAddQuestion = (payload) => {
    const questionId = nextQuestionId
    setQuestions((prev) => [
      ...prev,
      {
        question_id: questionId,
        question_text: payload.question_text,
        tp_id: payload.tp_id,
        min_score: payload.min_score,
        max_score: payload.max_score,
        choices: payload.choices.map((choice, index) => ({
          question_choice_id: Number(`${questionId}${index + 1}`),
          question_id: questionId,
          choice_text: choice.choice_text,
          score: choice.score,
          ord_no: choice.ord_no,
        })),
      },
    ])
    setNextQuestionId((value) => value + 1)
    return questionId
  }

  const handleAddOrganization = (name) => {
    const organizationId = nextOrgId
    setOrganizations((prev) => [
      ...prev,
      { organization_id: organizationId, name },
    ])
    setNextOrgId((value) => value + 1)
    return organizationId
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <header className="w-full flex-shrink-0 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex h-12 items-center justify-between px-6">
          <Link to="/" className="group flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm transition-shadow group-hover:shadow-md">
              <span className="text-xs font-bold text-white">HF</span>
            </div>
            <h1 className="text-base font-bold text-slate-800 transition-colors group-hover:text-blue-700">
              HireFlow
            </h1>
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Akademi Yöneticisi
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
          <nav className="p-4">
            <ul className="space-y-1">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = activeMenu === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleMenuChange(item.id)}
                      className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>
                        {item.label}
                        {item.hint ? (
                          <span className="ml-1 text-xs font-normal text-slate-400">({item.hint})</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {activeMenu === 'forms' && !selectedForm && (
            <FormCards forms={forms} applications={applications} onSelect={setSelectedForm} />
          )}
          {activeMenu === 'forms' && selectedForm && (
            <ApplicationList
              form={selectedForm}
              applications={applications}
              onBack={() => setSelectedForm(null)}
              onEvaluate={setEvaluatingCandidate}
            />
          )}
          {activeMenu === 'create' && (
            <CreateFormView
              questions={questions}
              organizations={organizations}
              onSave={handleSaveForm}
              onAddQuestion={handleAddQuestion}
              onAddOrganization={handleAddOrganization}
            />
          )}
          {activeMenu === 'pool' && (
            <QuestionPoolView questions={questions} onAddQuestion={handleAddQuestion} />
          )}
        </main>
      </div>

      {evaluatingCandidate && (
        <EvaluationModal
          candidate={evaluatingCandidate}
          questions={questions}
          answers={answers}
          onClose={() => setEvaluatingCandidate(null)}
        />
      )}
    </div>
  )
}
