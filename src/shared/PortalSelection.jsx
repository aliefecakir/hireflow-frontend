import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, GraduationCap } from 'lucide-react'
import BrandMark from './BrandMark'
import { getErrorMessage } from './api/client'
import { supabase } from './supabaseClient'
import { showToast } from './toast/ToastProvider'

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <BrandMark className="h-10 w-10" />
      <span className="text-lg font-bold tracking-tight text-slate-900">
        Hire<span className="text-blue-600">Flow</span>
      </span>
    </Link>
  )
}

function PortalHeader() {
  const [loading, setLoading] = useState(false)

  const handleMicrosoftSignIn = async () => {
    setLoading(true)
    sessionStorage.setItem('hireflow.loginIntent', '1')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile',
          redirectTo: `${window.location.origin}/login`,
        },
      })

      if (error) {
        throw error
      }
    } catch (err) {
      console.error('Microsoft girişi başarısız:', err)
      showToast.error('Hata Oluştu', getErrorMessage(err) || 'Microsoft ile giriş başlatılamadı.')
      setLoading(false)
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <button
          type="button"
          onClick={handleMicrosoftSignIn}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 23 23" aria-hidden="true">
            <rect x="1" y="1" width="10" height="10" fill="#F25022" />
            <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
            <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
            <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
          </svg>
          {loading ? 'Yönlendiriliyor...' : 'Çalışan Girişi'}
        </button>
      </div>
    </header>
  )
}

function PortalCard({ icon: Icon, title, description, note, buttonText, to }) {
  return (
    <div className="flex flex-col rounded-xl bg-white p-8 shadow-lg transition duration-200 hover:-translate-y-1 hover:shadow-xl">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
        <Icon className="h-6 w-6 text-blue-600" />
      </span>
      <h3 className="mt-5 text-xl font-bold tracking-tight text-blue-600">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
        {description}
        {note ? <span className="mt-1 block whitespace-nowrap">{note}</span> : null}
      </p>
      <Link
        to={to}
        className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        {buttonText}
      </Link>
    </div>
  )
}

export default function PortalSelection() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PortalHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-3xl">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              HireFlow'a Hoş Geldiniz
            </h1>
            <p className="mt-4 text-base text-slate-500 sm:text-lg">
              Lütfen ilerlemek istediğiniz portalı seçin
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <PortalCard
              icon={Building2}
              title="KARİYER"
              description="Profesyonel açık iş ilanlarımıza başvurun ve sürecinizi izleyin."
              note="(Kayıt Gerektirir)"
              buttonText="Aday Girişi Yap"
              to="/login"
            />
            <PortalCard
              icon={GraduationCap}
              title="AKADEMİ"
              description="Geleceğin yetenekleri arasına katılmak için akademi programlarını keşfedin."
              note="(Kayıt Gerektirmez)"
              buttonText="İlanları Görüntüle"
              to="/academy"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
