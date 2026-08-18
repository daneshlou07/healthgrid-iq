import React, { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import ErrorBoundary from '../ux/ErrorBoundary';
import SessionTimeout from '../ux/SessionTimeout';
import PageLoader from '../ux/PageLoader';
import HealthGridMascot from '../mascot/HealthGridMascot';

export default function MainLayout() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Hide sidebar and header on marketplace routes / for marketplace users
  const isMarketplace =
    currentUser?.role === 'Equipment Marketplace' ||
    location.pathname.startsWith('/marketplace');

  return (
    <div className="flex h-screen overflow-hidden bg-surface-100 relative">
      {/* Mobile sidebar overlay */}
      {!isMarketplace && sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 h-full">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMarketplace && sidebarOpen && (
        <div className="hidden lg:block shrink-0 h-full transition-all duration-200">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Only show header on non-marketplace pages */}
        {!isMarketplace && (
          <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        )}

        <main className={`flex-1 overflow-y-auto ${isMarketplace ? 'p-0' : 'p-4 md:p-6'}`}>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <SessionTimeout />
      <HealthGridMascot />
    </div>
  );
}
