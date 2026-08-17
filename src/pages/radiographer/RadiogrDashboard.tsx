import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatsCard from '../../components/ui/StatsCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { Calendar, Upload, CheckCircle, ScanLine, Building2, MapPin, Navigation, Clock, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { openWazeNavigation, openGoogleMapsNavigation } from '../../utils/navigationUtils';

export default function RadiogrDashboard() {
  const { currentUser } = useAuth();
  const { cases, clinics } = useData();

  const myCases = cases.filter((c) => c.radiographerId === currentUser?.id);
  const scheduled = myCases.filter((c) => c.status === 'SCHEDULED');
  const scanned = myCases.filter((c) => c.status === 'SCANNED');

  const assignedClinic = clinics.find((c) => c.id === currentUser?.deploymentLocationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome, {currentUser?.name?.split(' ')[0]}</h1>
        <p className="page-subtitle">Radiographer workspace — Scan queue & imaging uploads</p>
      </div>

      {/* Assigned Deployment & Mobile Fleet Navigation Card */}
      <div className="card p-4 border-l-4 border-l-[#0F4C42] bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#0F4C42] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Assigned Deployment Location
              </span>
              {currentUser?.shift && (
                <span className="text-[11px] font-medium text-surface-600 flex items-center gap-1 bg-surface-100 px-2 py-0.5 rounded">
                  <Clock className="w-3 h-3 text-surface-500" />
                  {currentUser.shift} Shift
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-navy-700 shrink-0" />
              <h2 className="text-base font-bold text-navy-900 truncate">
                {assignedClinic ? assignedClinic.name : 'Central Mobile Roving Fleet (Unassigned Base)'}
              </h2>
            </div>

            {assignedClinic ? (
              <p className="text-xs text-surface-600 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-surface-400 shrink-0 mt-0.5" />
                <span>{assignedClinic.address}</span>
              </p>
            ) : (
              <p className="text-xs text-surface-500">
                Deployable across regional healthcare centers as dispatched by the scheduling desk.
              </p>
            )}

            {currentUser?.mobilePacsAssignment && (
              <p className="text-xs text-surface-600 flex items-center gap-1.5 font-medium">
                <Truck className="w-3.5 h-3.5 text-navy-600" />
                <span>Vehicle: {currentUser.mobilePacsAssignment}</span>
              </p>
            )}
          </div>

          {assignedClinic && (
            <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
              <button
                type="button"
                onClick={() => openWazeNavigation(assignedClinic.latitude, assignedClinic.longitude, assignedClinic.address)}
                className="btn-primary text-xs flex items-center gap-1.5 bg-[#0F4C42] hover:bg-[#0c3c34] shadow-sm"
                title="Launch turn-by-turn navigation in Waze"
              >
                <Navigation className="w-3.5 h-3.5" />
                Navigate with Waze
              </button>

              <button
                type="button"
                onClick={() => openGoogleMapsNavigation(assignedClinic.latitude, assignedClinic.longitude, assignedClinic.address)}
                className="btn-secondary text-xs flex items-center gap-1.5"
                title="Open location in Google Maps"
              >
                <MapPin className="w-3.5 h-3.5" />
                Google Maps
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Scheduled" value={scheduled.length} icon={<Calendar className="w-5 h-5" />} color="navy" />
        <StatsCard title="Imaging Completed" value={scanned.length} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
        <StatsCard title="Total Assigned" value={myCases.length} icon={<ScanLine className="w-5 h-5" />} color="purple" />
        <StatsCard title="Pending Upload" value={scheduled.length} icon={<Upload className="w-5 h-5" />} color="amber" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">My Scan Queue</h2>
          <Link to="/scan-queue" className="text-sm text-navy-600 hover:text-navy-700 font-medium">View all &rarr;</Link>
        </div>
        <div className="space-y-2">
          {scheduled.length === 0 && <p className="text-surface-400 text-sm text-center py-6">No scans scheduled.</p>}
          {scheduled.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-surface-100 rounded-lg border border-surface-200">
              <div>
                <Link to={`/case/${c.id}`} className="text-sm font-medium text-navy-700 hover:underline">{c.caseNumber} — {c.patientName}</Link>
                <p className="text-xs text-surface-500">{c.scanType} &middot; {c.clinicName}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
