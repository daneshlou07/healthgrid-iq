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
import PageLoader from './components/ux/PageLoader';
import DevAccountSwitcher from './components/ux/DevAccountSwitcher';

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
const PatientsList = safeLazy(() => import('./pages/department/PatientsList'));
const PatientRegistration = safeLazy(() => import('./pages/department/PatientRegistration'));
const NewCaseRegistration = safeLazy(() => import('./pages/department/NewCaseRegistration'));
const DepartmentReports = safeLazy(() => import('./pages/department/DepartmentReports'));
const PatientRequests = safeLazy(() => import('./pages/department/PatientRequests'));
const Scheduling = safeLazy(() => import('./pages/department/Scheduling'));
const ScanQueue = safeLazy(() => import('./pages/radiographer/ScanQueue'));
const ScheduleView = safeLazy(() => import('./pages/radiographer/ScheduleView'));
const UploadScans = safeLazy(() => import('./pages/radiographer/UploadScans'));
const ReviewQueue = safeLazy(() => import('./pages/radiologist/ReviewQueue'));
const Reporting = safeLazy(() => import('./pages/radiologist/Reporting'));
const RadiologistOnboarding = safeLazy(() => import('./pages/radiologist/Onboarding'));
const RadiogrOnboarding = safeLazy(() => import('./pages/radiographer/Onboarding'));
const AllCases = safeLazy(() => import('./pages/department/AllCases'));
const TrackStatus = safeLazy(() => import('./pages/department/TrackStatus'));
const CaseDetail = safeLazy(() => import('./pages/shared/CaseDetail'));
const PatientDetail = safeLazy(() => import('./pages/shared/PatientDetail'));
const FleetManagement = safeLazy(() => import('./pages/admin/FleetManagement'));
const UsersManagement = safeLazy(() => import('./pages/admin/UsersManagement'));
const ClinicsManagement = safeLazy(() => import('./pages/department/ClinicsManagement'));
const PatientRequestsReview = safeLazy(() => import('./pages/department/PatientRequestsReview'));
const AuditLogs = safeLazy(() => import('./pages/admin/AuditLogs'));
const AISchedulerMap = safeLazy(() => import('./pages/department/AISchedulerMap'));
const Settings = safeLazy(() => import('./pages/admin/Settings'));
const Analytics = safeLazy(() => import('./pages/admin/Analytics'));
const Announcements = safeLazy(() => import('./pages/admin/Announcements'));
const TechStack = safeLazy(() => import('./pages/admin/TechStack'));
const PatientRegistry = safeLazy(() => import('./pages/admin/PatientRegistry'));
const RecycleBin = safeLazy(() => import('./pages/admin/RecycleBin'));
const NotFound = safeLazy(() => import('./pages/shared/NotFound'));



const MoOnboarding = safeLazy(() => import('./pages/mo/Onboarding'));

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
        {/* Shared dashboard route */}
        <Route path="/dashboard" element={<DashboardRouter />} />
        <Route path="/case/:caseId" element={<CaseDetail />} />
        <Route path="/patient/:patientId" element={<PatientDetail />} />

        {/* Radiology Department registration and case-management routes */}
        <Route path="/patients" element={<ProtectedRoute allowedRoles={['Radiology Department', 'Medical Officer', 'Administrator']}><PatientsList /></ProtectedRoute>} />
        <Route path="/patients/register" element={<ProtectedRoute allowedRoles={['Radiology Department', 'Medical Officer']}><PatientRegistration /></ProtectedRoute>} />
        <Route path="/cases" element={<ProtectedRoute allowedRoles={['Radiology Department', 'Medical Officer', 'Administrator']}><AllCases /></ProtectedRoute>} />
        <Route path="/cases/new" element={<ProtectedRoute allowedRoles={['Radiology Department', 'Medical Officer']}><NewCaseRegistration /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['Radiology Department', 'Medical Officer', 'Radiologist']}><DepartmentReports /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute allowedRoles={['Radiology Department', 'Medical Officer']}><PatientRequests /></ProtectedRoute>} />
        <Route path="/scheduling" element={<ProtectedRoute allowedRoles={['Administrator']}><Scheduling /></ProtectedRoute>} />

        {/* Radiographer routes */}
        <Route path="/scan-queue" element={<ProtectedRoute allowedRoles={['Radiographer']}><ScanQueue /></ProtectedRoute>} />
        <Route path="/schedule" element={<ProtectedRoute allowedRoles={['Radiographer']}><ScheduleView /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute allowedRoles={['Radiographer']}><UploadScans /></ProtectedRoute>} />

        {/* Radiologist & Medical Officer review and reporting routes */}
        <Route path="/review-queue" element={<ProtectedRoute allowedRoles={['Radiologist', 'Medical Officer']}><ReviewQueue /></ProtectedRoute>} />
        <Route path="/reporting" element={<ProtectedRoute allowedRoles={['Radiologist', 'Medical Officer']}><Reporting /></ProtectedRoute>} />

        {/* Onboarding routes */}
        <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['Radiographer', 'Medical Officer', 'Radiologist']}><OnboardingRouter /></ProtectedRoute>} />

        {/* Radiology Department routes */}
        <Route path="/track-status" element={<ProtectedRoute allowedRoles={['Radiology Department', 'Medical Officer']}><TrackStatus /></ProtectedRoute>} />

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
                  <DevAccountSwitcher />
                </ConfirmProvider>
              </SearchPaletteProvider>
            </ToastProvider>
          </DataProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
