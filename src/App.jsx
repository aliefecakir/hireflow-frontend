import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './shared/AuthContext'
import { ToastProvider } from './shared/toast/ToastProvider'
import ProtectedRoute, { RoleGuard } from './shared/ProtectedRoute'
import AuthLayout from './shared/AuthLayout'
import PortalSelection from './shared/PortalSelection'
import {
  ACADEMY_ACCESS_ROLES,
  ACADEMY_ADMIN_ROLES,
  ACADEMY_WRITE_ROLES,
} from './shared/api/auth'
import Academy from './academy/public/Academy'
import AcademyApply from './academy/public/AcademyApply'
import AcademyManagerLayout from './academy/manager/AcademyManagerLayout'
import FormListPage from './academy/manager/FormListPage'
import CreateFormPage from './academy/manager/CreateFormPage'
import QuestionPoolPage from './academy/manager/QuestionPoolPage'
import ApplicationListPage from './academy/manager/ApplicationListPage'
import AdminPanelPage from './academy/manager/AdminPanelPage'
import Login from './shared/Login'
import Register from './shared/Register'
import CandidateLayout from './hire/CandidateLayout'
import CandidateJobs from './hire/CandidateJobs'
import CandidateProfile from './hire/CandidateProfile'
import CandidateApplications from './hire/CandidateApplications'
import HRLayout from './hire/HRLayout'
import HRJobs from './hire/HRJobs'
import HRApplications from './hire/HRApplications'
import AppVersion from './shared/AppVersion'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PortalSelection />} />

          <Route path="/login" element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          } />

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

          <Route path="/academy" element={<Academy />} />
          <Route path="/academy/apply/:formId" element={<AcademyApply />} />
          <Route path="/academy/manager" element={
            <ProtectedRoute allowedRoles={[...ACADEMY_ACCESS_ROLES]}>
              <AcademyManagerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="forms" replace />} />
            <Route path="forms" element={<FormListPage />} />
            <Route path="forms/:formId/applications" element={<ApplicationListPage />} />
            <Route path="forms/:formId/edit" element={
              <RoleGuard allowedRoles={[...ACADEMY_WRITE_ROLES]}>
                <CreateFormPage />
              </RoleGuard>
            } />
            <Route path="create" element={
              <RoleGuard allowedRoles={[...ACADEMY_WRITE_ROLES]}>
                <CreateFormPage />
              </RoleGuard>
            } />
            <Route path="pool" element={
              <RoleGuard allowedRoles={[...ACADEMY_WRITE_ROLES]}>
                <QuestionPoolPage />
              </RoleGuard>
            } />
            <Route path="admin" element={
              <RoleGuard allowedRoles={[...ACADEMY_ADMIN_ROLES]}>
                <AdminPanelPage />
              </RoleGuard>
            } />
          </Route>

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

          <Route path="/hr" element={
            <ProtectedRoute allowedRoles={['HR']}>
              <HRLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/hr/jobs" replace />} />
            <Route path="jobs" element={<HRJobs />} />
            <Route path="applications" element={<HRApplications />} />
          </Route>

          <Route path="/admin" element={<Navigate to="/academy/manager/admin" replace />} />
          <Route path="/manager" element={<Navigate to="/academy/manager" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AppVersion />
      </AuthProvider>
    </ToastProvider>
  )
}
