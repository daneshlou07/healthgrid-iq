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
import PageLoader from './components/ux/PageLoader';

// Helper for resilient lazy loading across new deployments
function safeLazy<T extends React.ComponentType<any>>(importFn: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error: any) {
      console.warn('Chunk load error (new deployment detected):', error);
      const hasReloaded = sessionStorage.getItem('chunk_reload_retry');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload_retry', 'true');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      sessionStorage.removeItem('chunk_reload_retry');
      throw error;
    }
  });
}

// Lazy-loaded pages (code splitting per workspace)
const DashboardRouter = safeLazy(() => import('./pages/DashboardRouter'));
const ScanQueue = safeLazy(() => import('./pages/radiographer/ScanQueue'));
const ScheduleView = safeLazy(() => import('./pages/radiographer/ScheduleView'));
const UploadScans = safeLazy(() => import('./pages/radiographer/UploadScans'));
const ReviewQueue = safeLazy(() => import('./pages/radiologist/ReviewQueue'));
const Reporting = safeLazy(() => import('./pages/radiologist/Reporting'));
const RadiologistOnboarding = safeLazy(() => import('./pages/radiologist/Onboarding'));
const RadiogrOnboarding = safeLazy(() => import('./pages/radiographer/Onboarding'));
const CaseDetail = safeLazy(() => import('./pages/shared/CaseDetail'));
const PatientDetail = safeLazy(() => import('./pages/shared/PatientDetail'));
const FleetManagement = safeLazy(() => import('./pages/admin/FleetManagement'));
const UsersManagement = safeLazy(() => import('./pages/admin/UsersManagement'));
const AuditLogs = safeLazy(() => import('./pages/admin/AuditLogs'));
const Analytics = safeLazy(() => import('./pages/admin/Analytics'));
const Announcements = safeLazy(() => import('./pages/admin/Announcements'));
const TechStack = safeLazy(() => import('./pages/admin/TechStack'));
const PatientRegistry = safeLazy(() => import('./pages/admin/PatientRegistry'));
const RecycleBin = safeLazy(() => import('./pages/admin/RecycleBin'));
const NotFound = safeLazy(() => import('./pages/shared/NotFound'));
const PatientReportView = safeLazy(() => import('./pages/shared/PatientReportView'));

// Medical Officer & Shared Operational Pages
const MoOnboarding = safeLazy(() => import('./pages/mo/Onboarding'));
const MoPatientsList = safeLazy(() => import('./pages/mo/PatientsList'));
const MoPatientRegistration = safeLazy(() => import('./pages/mo/PatientRegistration'));
const MoNewCaseRegistration = safeLazy(() => import('./pages/mo/NewCaseRegistration'));
const MoAllCases = safeLazy(() => import('./pages/mo/AllCases'));
const MoDepartmentReports = safeLazy(() => import('./pages/mo/DepartmentReports'));
const MoPatientRequests = safeLazy(() => import('./pages/mo/PatientRequests'));
const MoTrackStatus = safeLazy(() => import('./pages/mo/TrackStatus'));
const MoReviewQueue = safeLazy(() => import('./pages/mo/ReviewQueue'));
const MoReporting = safeLazy(() => import('./pages/mo/Reporting'));
const Scheduling = safeLazy(() => import('./pages/mo/Scheduling'));
const ClinicsManagement = safeLazy(() => import('./pages/mo/ClinicsManagement'));
const PatientRequestsReview = safeLazy(() => import('./pages/mo/PatientRequestsReview'));
const AISchedulerMap = safeLazy(() => import('./pages/mo/AISchedulerMap'));

// ---------------------------------------------------------------------------
// Role-aware page router for Radiologist vs Medical Officer review/reporting
// ---------------------------------------------------------------------------
function RoleRouter({
  moPage,
  defaultPage: Default,
}: {
  moPage: React.ComponentType;
  defaultPage: React.ComponentType;
}) {
  const { currentUser } = useAuth();
  const Mo = moPage;
  return currentUser?.role === 'Medical Officer' ? <Mo /> : <Default />;
}

function OnboardingRouter() {
  const { currentUser } = useAuth();
  if (currentUser?.role === 'Radiographer') return <RadiogrOnboarding />;
  if (currentUser?.role === 'Radiologist') return <RadiologistOnboarding />;
  if (currentUser?.role === 'Medical Officer') return <MoOnboarding />;
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
        {/* Shared dashboard route — lazy loaded to avoid remount on role switch */}
        <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardRouter /></Suspense>} />
        <Route path="/case/:caseId" element={<CaseDetail />} />
        <Route path="/patient/:patientId" element={<PatientDetail />} />

        {/* Medical Officer & Admin routes */}
        <Route path="/patients" element={<ProtectedRoute allowedRoles={['Medical Officer', 'Administrator']}><MoPatientsList /></ProtectedRoute>} />
        <Route path="/patients/register" element={<ProtectedRoute allowedRoles={['Medical Officer', 'Administrator']}><MoPatientRegistration /></ProtectedRoute>} />
        <Route path="/cases" element={<ProtectedRoute allowedRoles={['Medical Officer', 'Administrator']}><MoAllCases /></ProtectedRoute>} />
        <Route path="/cases/new" element={<ProtectedRoute allowedRoles={['Medical Officer', 'Administrator']}><MoNewCaseRegistration /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['Medical Officer', 'Radiologist', 'Administrator']}><MoDepartmentReports /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute allowedRoles={['Medical Officer', 'Administrator']}><MoPatientRequests /></ProtectedRoute>} />
        <Route path="/scheduling" element={<ProtectedRoute allowedRoles={['Administrator']}><Scheduling /></ProtectedRoute>} />

        {/* Radiographer routes */}
        <Route path="/scan-queue" element={<ProtectedRoute allowedRoles={['Radiographer']}><ScanQueue /></ProtectedRoute>} />
        <Route path="/schedule" element={<ProtectedRoute allowedRoles={['Radiographer']}><ScheduleView /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute allowedRoles={['Radiographer']}><UploadScans /></ProtectedRoute>} />

        {/* Radiologist & Medical Officer review and reporting routes */}
        <Route path="/review-queue" element={<ProtectedRoute allowedRoles={['Radiologist', 'Medical Officer']}><RoleRouter moPage={MoReviewQueue} defaultPage={ReviewQueue} /></ProtectedRoute>} />
        <Route path="/reporting" element={<ProtectedRoute allowedRoles={['Radiologist', 'Medical Officer']}><RoleRouter moPage={MoReporting} defaultPage={Reporting} /></ProtectedRoute>} />

        {/* Onboarding & Credentials routes */}
        <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['Radiographer', 'Medical Officer', 'Radiologist']}><OnboardingRouter /></ProtectedRoute>} />
        <Route path="/credentials" element={<ProtectedRoute allowedRoles={['Radiographer', 'Medical Officer', 'Radiologist']}><OnboardingRouter /></ProtectedRoute>} />

        {/* Track Status route */}
        <Route path="/track-status" element={<ProtectedRoute allowedRoles={['Medical Officer', 'Administrator']}><MoTrackStatus /></ProtectedRoute>} />

        {/* Administrator routes (full CRUD access) */}
        <Route path="/users" element={<ProtectedRoute allowedRoles={['Administrator']}><UsersManagement /></ProtectedRoute>} />
        <Route path="/clinics" element={<ProtectedRoute allowedRoles={['Administrator', 'Super Admin']}><ClinicsManagement /></ProtectedRoute>} />
        <Route path="/fleet" element={<ProtectedRoute allowedRoles={['Administrator']}><FleetManagement /></ProtectedRoute>} />
        <Route path="/patient-registry" element={<ProtectedRoute allowedRoles={['Administrator']}><PatientRegistry /></ProtectedRoute>} />
        <Route path="/patient-requests" element={<ProtectedRoute allowedRoles={['Administrator']}><PatientRequestsReview /></ProtectedRoute>} />
        <Route path="/ai-scheduler" element={<ProtectedRoute allowedRoles={['Administrator']}><AISchedulerMap /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute allowedRoles={['Administrator']}><Analytics /></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute allowedRoles={['Administrator']}><Announcements /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['Administrator']}><AuditLogs /></ProtectedRoute>} />
        <Route path="/tech-stack" element={<ProtectedRoute allowedRoles={['Administrator']}><TechStack /></ProtectedRoute>} />
        <Route path="/recycle-bin" element={<ProtectedRoute allowedRoles={['Administrator']}><RecycleBin /></ProtectedRoute>} />
        <Route path="/trash" element={<ProtectedRoute allowedRoles={['Administrator']}><RecycleBin /></ProtectedRoute>} />
      </Route>

      {/* Public patient report access — no login required */}
      <Route path="/report/:caseId/:token" element={<Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>}><PatientReportView /></Suspense>} />

      {/* Catch-all — redirect root and unknown routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Suspense fallback={<div />}><NotFound /></Suspense>} />
    </Routes>
  );
}

import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
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
      </LanguageProvider>
    </BrowserRouter>
  );
}
