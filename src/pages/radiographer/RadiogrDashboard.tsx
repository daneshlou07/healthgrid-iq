import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatsCard from '../../components/ui/StatsCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { Calendar, Upload, CheckCircle, CheckCircle2, ScanLine, Building2, MapPin, Navigation, Clock, Truck, Share2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { openWazeNavigation, openGoogleMapsNavigation, shareNavigationToWhatsApp } from '../../utils/navigationUtils';

export default function RadiogrDashboard() {
  const { currentUser, updateCurrentUser } = useAuth();
  const { cases, clinics, updateUserLocally } = useData();
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);

  const myCases = cases.filter(
    (c) =>
      c.radiographerId === currentUser?.id ||
      c.registeredById === currentUser?.id ||
      c.externalRadiographerId === currentUser?.id ||
      (c.externalReferral && c.externalReferral.assignedRadiographerId === currentUser?.id) ||
      ((currentUser?.role === 'Public Hospital Radiographer' || currentUser?.role === 'Private Hospital Radiographer') &&
        c.status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED')
  );
  const scheduled = myCases.filter(
    (c) => c.status === 'SCHEDULED' || c.status === 'READY_FOR_SCAN' || c.status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED'
  );
  const scanned = myCases.filter(
    (c) => c.status === 'SCANNED' || c.status === 'IMAGES_AVAILABLE' || c.status === 'COMPLETED' || c.status === 'FINALIZED'
  );

  const assignedClinic = clinics.find((c) => c.id === currentUser?.deploymentLocationId);
  const isShiftCompleted = currentUser?.shiftStatus === 'COMPLETED';

  const handleCompleteShift = () => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    updateCurrentUser({
      shiftStatus: 'COMPLETED',
      shiftCompletedAt: nowIso,
    });
    updateUserLocally(currentUser.id, {
      shiftStatus: 'COMPLETED',
      shiftCompletedAt: nowIso,
    });
    setShowEndShiftModal(false);
  };

  const handleResumeShift = () => {
    if (!currentUser) return;
    updateCurrentUser({
      shiftStatus: 'ACTIVE',
      shiftCompletedAt: undefined,
    });
    updateUserLocally(currentUser.id, {
      shiftStatus: 'ACTIVE',
      shiftCompletedAt: undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome, {currentUser?.name?.split(' ')[0]}</h1>
        <p className="page-subtitle">Radiographer workspace — Scan queue & imaging uploads</p>
      </div>

      {/* Assigned Deployment & Mobile Fleet Navigation Card */}
      {isShiftCompleted ? (
        <div className="card p-4 border-l-4 border-l-slate-400 bg-slate-50/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider bg-slate-200 px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Duty Shift Concluded
                </span>
                {currentUser.shiftCompletedAt && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Concluded at {new Date(currentUser.shiftCompletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-700">
                Imaging deployment at <span className="font-semibold text-slate-900">{assignedClinic?.name || 'Assigned Center'}</span> completed for today.
              </p>
              <p className="text-[11px] text-slate-500">
                All imaging acquisitions uploaded. Mobile PACS vehicle powered down & awaiting next dispatch.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
              <button
                type="button"
                onClick={handleResumeShift}
                className="btn-secondary text-xs flex items-center gap-1.5 border-slate-300 hover:bg-white text-slate-700 shadow-sm"
                title="Resume or reopen duty shift"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reopen Shift
              </button>
            </div>
          </div>
        </div>
      ) : (
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
              <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0">
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

                <button
                  type="button"
                  onClick={() => shareNavigationToWhatsApp(assignedClinic.name, assignedClinic.latitude, assignedClinic.longitude, assignedClinic.address)}
                  className="btn-secondary text-xs flex items-center gap-1.5 text-teal-800 border-teal-300 hover:bg-teal-50"
                  title="Share dispatch location and GPS links to Driver via WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share to Driver
                </button>

                <button
                  type="button"
                  onClick={() => setShowEndShiftModal(true)}
                  className="btn-secondary text-xs flex items-center gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                  title="Conclude active duty shift for today"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Complete Shift
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Ending Shift */}
      {showEndShiftModal && assignedClinic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-surface-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900">Complete Radiography Shift</h3>
                <p className="text-xs text-surface-500">{assignedClinic.name}</p>
              </div>
            </div>

            <p className="text-xs text-surface-600 mb-6 leading-relaxed">
              Mark today's imaging deployment at <strong>{assignedClinic.name}</strong> as completed. This will close your active duty session until the next scheduled dispatch.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEndShiftModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteShift}
                className="btn-primary text-xs px-4 py-2 bg-[#0F4C42] hover:bg-[#0c3c34]"
              >
                Confirm & Complete Shift
              </button>
            </div>
          </div>
        </div>
      )}

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
                {c.externalReferral ? (
                  <span className="text-[10px] text-purple-800 font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 mt-1 inline-block">
                    Referred via BEMS &middot; Assigned by {c.externalReferral.bemzOfficerName || c.externalReferral.assignedHospitalAdminName || 'BEMS'} &middot; Origin MO: {c.initialMoName || 'Initial MO'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-1 inline-block">
                    Origin: {c.clinicName || 'Local Center'} &middot; MO: {c.initialMoName || c.registeredByName || 'Initial MO'}
                  </span>
                )}
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
