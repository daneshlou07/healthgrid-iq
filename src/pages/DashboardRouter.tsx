import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RadiogrDashboard from './radiographer/RadiogrDashboard';
import RadiologistDashboard from './radiologist/RadiologistDashboard';
import MoDashboard from './mo/DepartmentDashboard';
import AdminDashboard from './admin/AdminDashboard';
import BemsDashboard from './bemz/BemsDashboard';
import PublicHospitalAdminDashboard from './external/PublicHospitalAdminDashboard';
import PrivateHospitalAdminDashboard from './external/PrivateHospitalAdminDashboard';
import ExternalRadiographerWorkspace from './external/ExternalRadiographerWorkspace';

export default function DashboardRouter() {
  const { currentUser } = useAuth();

  const renderDashboard = () => {
    switch (currentUser?.role) {
      case 'Radiographer':
      case 'Public Hospital Radiographer':
      case 'Private Hospital Radiographer':
        return <RadiogrDashboard />;
      case 'Radiologist':
        return <RadiologistDashboard />;
      case 'Medical Officer':
        return <MoDashboard />;
      case 'BEMZ':
        return <BemsDashboard />;
      case 'Public Hospital Admin':
        return <PublicHospitalAdminDashboard />;
      case 'Private Hospital Admin':
        return <PrivateHospitalAdminDashboard />;
      case 'Equipment Marketplace':
        return <Navigate to="/marketplace" replace />;
      case 'Administrator':
      case 'Super Admin':
        return <AdminDashboard />;
      default:
        return <MoDashboard />;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F4F5F7]">
      <div className="flex-1 min-h-0 flex flex-col">
        {renderDashboard()}
      </div>
    </div>
  );
}


