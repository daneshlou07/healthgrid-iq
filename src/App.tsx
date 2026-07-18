import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/ux/Toast';
import { SearchPaletteProvider } from './components/ux/SearchPalette';
import { ConfirmProvider } from './components/ux/ConfirmDialog';
import KeyboardShortcutsOverlay from './components/ux/KeyboardShortcuts';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardRouter from './pages/DashboardRouter';

// Lazy-loaded pages (code splitting per workspace)
const PatientsList = lazy(() => import('./pages/doctor/PatientsList'));
const PatientRegistration = lazy(() => import('./pages/doctor/PatientRegistration'));
const DoctorCases = lazy(() => import('./pages/doctor/DoctorCases'));
const NewCaseReferral = lazy(() => import('./pages/doctor/NewCaseReferral'));
const DoctorReports = lazy(() => import('./pages/doctor/DoctorReports'));
const PatientRequests = lazy(() => import('./pages/doctor/PatientRequests'));
const ScanQueue = lazy(() => import('./pages/radiographer/ScanQueue'));
const ScheduleView = lazy(() => import('./pages/radiographer/ScheduleView'));
const UploadScans = lazy(() => import('./pages/radiographer/UploadScans'));
const ReviewQueue = lazy(() => import('./pages/radiologist/ReviewQueue'));
const Reporting = lazy(() => import('./pages/radiologist/Reporting'));
const SignedReports = lazy(() => import('./pages/radiologist/SignedReports'));
const RadiologistOnboarding = lazy(() => import('./pages/radiologist/Onboarding'));
const RadiogrOnboarding = lazy(() => import('./pages/radiographer/Onboarding'));
const AllCases = lazy(() => import('./pages/department/AllCases'));
const TrackStatus = lazy(() => import('./pages/department/TrackStatus'));
const CaseDetail = lazy(() => import('./pages/shared/CaseDetail'));
const PatientDetail = lazy(() => import('./pages/shared/PatientDetail'));
const FleetManagement = lazy(() => import('./pages/admin/FleetManagement'));
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement'));
const ClinicsManagement = lazy(() => import('./pages/department/ClinicsManagement'));
const PatientRequestsReview = lazy(() => import('./pages/department/PatientRequestsReview'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const AISchedulerMap = lazy(() => import('./pages/department/AISchedulerMap'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const Announcements = lazy(() => import('./pages/admin/Announcements'));
const TechStack = lazy(() => import('./pages/admin/TechStack'));
const PatientRegistry = lazy(() => import('./pages/admin/PatientRegistry'));
const RecycleBin = lazy(() => import('./pages/admin/RecycleBin'));
const NotFound = lazy(() => import('./pages/shared/NotFound'));

// Loading fallback
function PageLoader() {
  return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-navy-500 border-t-transparent rounded-full animate-spin" /></div>;
}

function OnboardingRouter() {
  const { currentUser } = useAuth();
  if (currentUser?.role === 'Radiographer') return <RadiogrOnboarding />;
  if (currentUser?.role === 'Radiologist') return <RadiologistOnboarding />;
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Shared dashboard route */}
        <Route path="/dashboard" element={<DashboardRouter />} />
        <Route path="/case/:caseId" element={<CaseDetail />} />
        <Route path="/patient/:patientId" element={<PatientDetail />} />

        {/* Doctor routes */}
        <Route path="/patients" element={<ProtectedRoute allowedRoles={['Doctor']}><PatientsList /></ProtectedRoute>} />
        <Route path="/patients/register" element={<ProtectedRoute allowedRoles={['Doctor']}><PatientRegistration /></ProtectedRoute>} />
        <Route path="/cases" element={<ProtectedRoute allowedRoles={['Doctor', 'Radiology Department', 'Administrator']}><DoctorCases /></ProtectedRoute>} />
        <Route path="/cases/new" element={<ProtectedRoute allowedRoles={['Doctor', 'Radiology Department']}><NewCaseReferral /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['Doctor', 'Radiologist']}><DoctorReports /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute allowedRoles={['Doctor']}><PatientRequests /></ProtectedRoute>} />

        {/* Radiographer routes */}
        <Route path="/scan-queue" element={<ProtectedRoute allowedRoles={['Radiographer']}><ScanQueue /></ProtectedRoute>} />
        <Route path="/schedule" element={<ProtectedRoute allowedRoles={['Radiographer']}><ScheduleView /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute allowedRoles={['Radiographer']}><UploadScans /></ProtectedRoute>} />

        {/* Radiologist routes */}
        <Route path="/review-queue" element={<ProtectedRoute allowedRoles={['Radiologist']}><ReviewQueue /></ProtectedRoute>} />
        <Route path="/reporting" element={<ProtectedRoute allowedRoles={['Radiologist']}><Reporting /></ProtectedRoute>} />

        {/* Onboarding routes */}
        <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['Radiographer', 'Radiologist']}><OnboardingRouter /></ProtectedRoute>} />

        {/* Radiology Department routes */}
        <Route path="/track-status" element={<ProtectedRoute allowedRoles={['Radiology Department']}><TrackStatus /></ProtectedRoute>} />

        {/* Administrator routes (full CRUD access) */}
        <Route path="/users" element={<ProtectedRoute allowedRoles={['Administrator']}><UsersManagement /></ProtectedRoute>} />
        <Route path="/clinics" element={<ProtectedRoute allowedRoles={['Administrator']}><ClinicsManagement /></ProtectedRoute>} />
        <Route path="/fleet" element={<ProtectedRoute allowedRoles={['Administrator']}><FleetManagement /></ProtectedRoute>} />
        <Route path="/patient-registry" element={<ProtectedRoute allowedRoles={['Administrator']}><PatientRegistry /></ProtectedRoute>} />
        <Route path="/patient-requests" element={<ProtectedRoute allowedRoles={['Administrator']}><PatientRequestsReview /></ProtectedRoute>} />
        <Route path="/ai-scheduler" element={<ProtectedRoute allowedRoles={['Administrator']}><AISchedulerMap /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute allowedRoles={['Administrator']}><Analytics /></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute allowedRoles={['Administrator']}><Announcements /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['Administrator']}><Settings /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['Administrator']}><AuditLogs /></ProtectedRoute>} />
        <Route path="/tech-stack" element={<ProtectedRoute allowedRoles={['Administrator']}><TechStack /></ProtectedRoute>} />
        <Route path="/recycle-bin" element={<ProtectedRoute allowedRoles={['Administrator']}><RecycleBin /></ProtectedRoute>} />
      </Route>

      {/* Catch-all — redirect root and unknown routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Suspense fallback={<div />}><NotFound /></Suspense>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <DataProvider>
            <ToastProvider>
              <SearchPaletteProvider>
                <ConfirmProvider>
                  <AppRoutes />
                  <KeyboardShortcutsOverlay />
                </ConfirmProvider>
              </SearchPaletteProvider>
            </ToastProvider>
          </DataProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
