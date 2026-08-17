import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, currentUser, isLoading, isMasterAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="text-surface-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && currentUser) {
    const hasRole =
      isMasterAdmin ||
      currentUser.role === 'Super Admin' ||
      allowedRoles.includes(currentUser.role);

    if (!hasRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
