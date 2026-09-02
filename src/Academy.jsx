import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Code, GraduationCap, MonitorPlay } from 'lucide-react'

const activePrograms = [
  {
    id: '2026-q3',
    title: '2026 3. Çeyrek HireFlow Yazılım Akademisi',
    description: 'Backend ve Frontend alanlarında uzmanlaşmak, gerçek projelerde deneyim kazanmak ve ekibimizin bir parçası olmak için başvurunu yap.',
    deadline: '15 Eylül 2026',
    type: 'Uzaktan (Online) Eğitim',
    topics: 'Frontend & Backend',
  },
]

export default function Academy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Portala Dön
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Akademi
          </span>
        </div>
      </header>

      <main className="flex items-center justify-center px-4 py-24">
        {activePrograms.length > 0 ? (
          <div className="grid w-full max-w-4xl mx-auto gap-6">
            {activePrograms.map((program) => (
              <article
                key={program.id}
                className="overflow-hidden rounded-2xl bg-white shadow-md"
              >
                <div className="h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {program.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
                    {program.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600">
                      <Calendar className="h-3.5 w-3.5" />
                      {program.deadline}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                      <MonitorPlay className="h-3.5 w-3.5" />
                      {program.type}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
                      <Code className="h-3.5 w-3.5" />
                      {program.topics}
                    </span>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Link
                      to={`/academy/apply/${program.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Hemen Başvur ve Sınava Başla
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
              <GraduationCap className="h-7 w-7 text-blue-600" />
            </span>
            <h1 className="mt-6 text-2xl font-bold text-slate-900">
              Akademi İlanları
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Akademi program ilanları yakında burada listelenecek.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
