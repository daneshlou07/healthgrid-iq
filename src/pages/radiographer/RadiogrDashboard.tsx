import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatsCard from '../../components/ui/StatsCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { Calendar, Upload, CheckCircle, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RadiogrDashboard() {
  const { currentUser } = useAuth();
  const { cases, getScopedCases } = useData();

  const myCases = React.useMemo(() => {
    if (!currentUser) return [];
    const centerId = currentUser.healthcareCenterId || currentUser.deploymentLocationId;
    const scoped = getScopedCases ? getScopedCases() : cases;

    if (currentUser.role === 'Public Hospital Radiographer' || currentUser.role === 'Private Hospital Radiographer') {
      return scoped.filter(
        (c) =>
          c.externalRadiographerId === currentUser.id ||
          c.radiographerId === currentUser.id ||
          (c.externalReferral && c.externalReferral.assignedRadiographerId === currentUser.id) ||
          c.externalFacilityId === centerId ||
          (c.originatingCenterId || c.clinicId) === centerId
      );
    }

    return scoped.filter(
      (c) =>
        c.radiographerId === currentUser.id ||
        c.externalRadiographerId === currentUser.id ||
        c.registeredById === currentUser.id ||
        (c.originatingCenterId || c.clinicId) === centerId ||
        c.externalFacilityId === centerId
    );
  }, [cases, currentUser, getScopedCases]);
  const scheduled = myCases.filter(
    (c) => c.status === 'SCHEDULED' || c.status === 'READY_FOR_SCAN' || c.status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED'
  );
  const scanned = myCases.filter(
    (c) => c.status === 'SCANNED' || c.status === 'IMAGES_AVAILABLE' || c.status === 'COMPLETED' || c.status === 'FINALIZED'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome, {currentUser?.name?.split(' ')[0]}</h1>
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
