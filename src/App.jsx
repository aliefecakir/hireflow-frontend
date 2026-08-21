import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'
import Login from './Login'
import Register from './Register'
import CandidateLayout from './CandidateLayout'
import CandidateJobs from './CandidateJobs'
import CandidateProfile from './CandidateProfile'
import HRLayout from './HRLayout'
import HRJobs from './HRJobs'
import HRApplications from './HRApplications'

function ManagerPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <h1 className="text-2xl font-semibold text-slate-800">
        Yönetici Paneli
      </h1>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Root path automatically redirects to /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Auth routes with decorative background */}
        <Route path="/login" element={
          <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950" />
            <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
            <div className="relative z-10 w-full flex items-center justify-center p-4">
              <Login />
            </div>
          </div>
        } />
        
        <Route path="/register" element={
          <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950" />
            <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
            <div className="relative z-10 w-full flex items-center justify-center p-4">
              <Register />
            </div>
          </div>
        } />
        
        {/* Protected Candidate routes with nested routing */}
        <Route path="/candidate" element={
          <ProtectedRoute allowedRoles={['CAND']}>
            <CandidateLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/candidate/posts" replace />} />
          <Route path="posts" element={<CandidateJobs />} />
          <Route path="profile" element={<CandidateProfile />} />
          <Route path="applications" element={
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">
                Başvurularım
              </h2>
              <p className="text-slate-600">
                Yaptığınız başvurular burada görüntülenecek.
              </p>
            </div>
          } />
        </Route>

        {/* Protected HR routes with nested routing */}
        <Route path="/hr" element={
          <ProtectedRoute allowedRoles={['HR']}>
            <HRLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/hr/jobs" replace />} />
          <Route path="jobs" element={<HRJobs />} />
          <Route path="applications" element={<HRApplications />} />
        </Route>

        {/* Protected role-specific panels */}
        <Route path="/manager" element={
          <ProtectedRoute allowedRoles={['MNGR']}>
            <ManagerPage />
          </ProtectedRoute>
        } />
        
        {/* Catch-all route redirecting back to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
