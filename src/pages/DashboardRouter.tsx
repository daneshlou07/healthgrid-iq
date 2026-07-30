import React from 'react';
import { useAuth } from '../context/AuthContext';
import RadiogrDashboard from './radiographer/RadiogrDashboard';
import RadiologistDashboard from './radiologist/RadiologistDashboard';
import DepartmentDashboard from './department/DepartmentDashboard';
import AdminDashboard from './admin/AdminDashboard';

export default function DashboardRouter() {
  const { currentUser } = useAuth();

  switch (currentUser?.role) {
    case 'Radiographer':
      return <RadiogrDashboard />;
    case 'Radiologist':
      return <RadiologistDashboard />;
    case 'Radiology Department':
      return <DepartmentDashboard />;
    case 'Administrator':
      return <AdminDashboard />;
    default:
      return <DepartmentDashboard />;
  }
}
