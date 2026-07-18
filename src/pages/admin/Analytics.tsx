import React, { useEffect, useState } from 'react';
import { getCases, getPatients, getClinics, getUsers } from '../../services/dataService';
import type { Case, Patient } from '../../types';
import StatsCard from '../../components/ui/StatsCard';
import { BarChart3, Users, FolderOpen, Building2, TrendingUp, Clock } from 'lucide-react';

export default function Analytics() {
  const [cases, setCases] = useState<Case[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinicCount, setClinicCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    getCases().then(setCases);
    getPatients().then(setPatients);
    getClinics().then((c) => setClinicCount(c.length));
    getUsers().then((u) => setUserCount(u.length));
  }, []);

  const casesByStatus = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const casesByScanType = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.scanType] = (acc[c.scanType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Operational Analytics</h1>
        <p className="page-subtitle">System-wide performance metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Cases" value={cases.length} icon={<FolderOpen className="w-5 h-5" />} color="navy" />
        <StatsCard title="Total Patients" value={patients.length} icon={<Users className="w-5 h-5" />} color="purple" />
        <StatsCard title="Active Clinics" value={clinicCount} icon={<Building2 className="w-5 h-5" />} color="emerald" />
        <StatsCard title="System Users" value={userCount} icon={<Users className="w-5 h-5" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Status */}
        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-navy-600" /> Cases by Status
          </h2>
          <div className="space-y-3">
            {Object.entries(casesByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xs font-medium text-surface-700 w-24">{status}</span>
                  <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-navy-500 rounded-full"
                      style={{ width: `${(count / cases.length) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-navy-700 ml-3 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cases by Scan Type */}
        <div className="card">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-500" /> Cases by Modality
          </h2>
          <div className="space-y-3">
            {Object.entries(casesByScanType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xs font-medium text-surface-700 w-36 truncate">{type}</span>
                  <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${(count / cases.length) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-navy-700 ml-3 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Average processing time */}
      <div className="card">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" /> Processing Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-surface-100 rounded-lg border border-surface-200">
            <p className="text-2xl font-bold text-navy-800">{casesByStatus['CREATED'] || 0}</p>
            <p className="text-xs text-surface-500 mt-1">Awaiting Scheduling</p>
          </div>
          <div className="p-4 bg-surface-100 rounded-lg border border-surface-200">
            <p className="text-2xl font-bold text-navy-800">{casesByStatus['SCHEDULED'] || 0}</p>
            <p className="text-xs text-surface-500 mt-1">Scheduled</p>
          </div>
          <div className="p-4 bg-surface-100 rounded-lg border border-surface-200">
            <p className="text-2xl font-bold text-navy-800">{casesByStatus['SCANNED'] || 0}</p>
            <p className="text-xs text-surface-500 mt-1">Awaiting Report</p>
          </div>
          <div className="p-4 bg-surface-100 rounded-lg border border-surface-200">
            <p className="text-2xl font-bold text-navy-800">{casesByStatus['FINALIZED'] || 0}</p>
            <p className="text-xs text-surface-500 mt-1">Completed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
