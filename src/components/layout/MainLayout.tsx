import React, { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ErrorBoundary from '../ux/ErrorBoundary';
import SessionTimeout from '../ux/SessionTimeout';
import { Menu, X } from 'lucide-react';

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-navy-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header with mobile menu toggle */}
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-3 text-surface-500 hover:text-navy-600 hover:bg-surface-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <Header />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <SessionTimeout />
    </div>
  );
}
