import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ToastProvider } from './toast/ToastProvider'
import ProtectedRoute from './ProtectedRoute'
import AuthLayout from './AuthLayout'
import PortalSelection from './PortalSelection'
import Academy from './Academy'
import Login from './Login'
import Register from './Register'
import CandidateLayout from './CandidateLayout'
import CandidateJobs from './CandidateJobs'
import CandidateProfile from './CandidateProfile'
import CandidateApplications from './CandidateApplications'
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
    <ToastProvider>
      <AuthProvider>
        <Routes>
          {/* Landing page where users pick a portal */}
          <Route path="/" element={<PortalSelection />} />

          {/* Auth routes with decorative background */}
          <Route path="/login" element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          } />

          {/* HR login reuses the shared form; the role lookup redirects HR users to /hr */}
          <Route path="/hr/login" element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          } />
          
          <Route path="/register" element={
            <AuthLayout>
              <Register />
            </AuthLayout>
          } />

          {/* Academy portal is public, no registration required */}
          <Route path="/academy" element={<Academy />} />
          
          {/* Protected Candidate routes with nested routing */}
          <Route path="/candidate" element={
            <ProtectedRoute allowedRoles={['CAND']}>
              <CandidateLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/candidate/posts" replace />} />
            <Route path="posts" element={<CandidateJobs />} />
            <Route path="profile" element={<CandidateProfile />} />
            <Route path="applications" element={<CandidateApplications />} />
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
          
          {/* Catch-all route redirecting back to portal selection */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  )
}
