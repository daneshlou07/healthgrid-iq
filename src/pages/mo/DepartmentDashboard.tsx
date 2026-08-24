import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatsCard from '../../components/ui/StatsCard';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { FolderOpen, Clock, CheckCircle, CheckCircle2, FileText, Calendar, AlertTriangle, Building2, MapPin, Navigation, Share2, RotateCcw, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { openWazeNavigation, openGoogleMapsNavigation, shareNavigationToWhatsApp } from '../../utils/navigationUtils';

export default function DepartmentDashboard() {
  const { currentUser, updateCurrentUser } = useAuth();
  const { cases, clinics, getScopedCases, updateUserLocally } = useData();
  const scopedCases = getScopedCases ? getScopedCases() : cases;
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);

  const pending = scopedCases.filter((c) => c.status === 'CREATED' || c.status === 'CASE_CREATED' || !c.status);
  const scheduled = scopedCases.filter((c) => c.status === 'SCHEDULED' || c.status === 'SCHEDULING' || c.status === 'RADIOGRAPHER_ASSIGNED' || c.status === 'READY_FOR_SCAN' || c.status === 'SCANNING' || c.status === 'EXTERNAL_SCANNING' || c.status === 'MACHINE_UNAVAILABLE' || c.status === 'EXTERNAL_REFERRAL_PENDING' || c.status === 'BEMZ_REVIEW' || c.status === 'FACILITY_SELECTED' || c.status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED' || c.status === 'PRIVATE_HOSPITAL_ADMIN_REVIEW');
  const scanned = scopedCases.filter((c) => (c.status === 'SCANNED' || c.status === 'IMAGES_AVAILABLE' || c.status === 'EXTERNAL_IMAGES_AVAILABLE' || c.status === 'RADIOLOGIST_REVIEW' || c.status === 'MO_REVIEW' || c.status === 'REPORTED') && !c.finalizedAt);
  const finalized = scopedCases.filter((c) => c.status === 'FINALIZED' || c.status === 'COMPLETED' || c.status === 'REPORT_SUBMITTED' || Boolean(c.finalizedAt));
  const recentCases = [...scopedCases].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  const centerId = currentUser?.healthcareCenterId || currentUser?.deploymentLocationId;
  const assignedClinic = clinics.find((c) => c.id === centerId);
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

  // Cases that are CREATED (no scheduling) or SCHEDULED but with no radiographer assigned
  const unassigned = scopedCases.filter((c) => (c.status === 'CREATED') || (c.status === 'SCHEDULED' && !c.radiographerId));

  // Overdue: CREATED cases older than 24h without scheduling
  const now = new Date();
  const overdue = pending.filter((c) => {
    const diff = now.getTime() - new Date(c.createdAt).getTime();
    return diff > 24 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-navy-800">Medical Officer Dashboard</h1>
        </div>
        <p className="page-subtitle">Patient triage, imaging requisition & diagnostic review</p>
      </div>

      {/* Assigned Deployment Location Card */}
      {assignedClinic && (
        isShiftCompleted ? (
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
                  Duty deployment at <span className="font-semibold text-slate-900">{assignedClinic.name}</span> completed for today.
                </p>
                <p className="text-[11px] text-slate-500">
                  All clinical workflows and patient examinations logged. Awaiting next dispatch from scheduling desk.
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
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#0F4C42] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Assigned Healthcare Facility
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
                    {assignedClinic.name}
                  </h2>
                </div>

                <p className="text-xs text-surface-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-surface-400 shrink-0 mt-0.5" />
                  <span>{assignedClinic.address}</span>
                </p>
              </div>

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
                  title="Share dispatch location and GPS links to Driver or Team via WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share Location
                </button>

                <button
                  type="button"
                  onClick={() => setShowEndShiftModal(true)}
                  className="btn-secondary text-xs flex items-center gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                  title="Conclude duty shift for today"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Complete Shift
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── MODAL: Complete Shift & Official PKD Outreach Summary ── */}
      {showEndShiftModal && assignedClinic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-surface-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-surface-200 pb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900">
                  Laporan Ringkasan Tugas Saringan PKD (MOH)
                </h3>
                <p className="text-xs text-surface-500">
                  Outreach Deployment Summary &bull; {assignedClinic.name}
                </p>
              </div>
            </div>

            {/* Summary Statistics Card */}
            <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-surface-200/80 pb-1.5">
                <span className="text-surface-500">Pusat / Lokasi Saringan:</span>
                <span className="font-bold text-navy-900">{assignedClinic.name}</span>
              </div>
              <div className="flex justify-between border-b border-surface-200/80 pb-1.5">
                <span className="text-surface-500">Pegawai Perubatan (MO On-Duty):</span>
                <span className="font-bold text-navy-900">{currentUser?.name || 'Dr. Michelle Tan'} ({currentUser?.mmcNumber || 'MMC 58921'})</span>
              </div>
              <div className="flex justify-between border-b border-surface-200/80 pb-1.5">
                <span className="text-surface-500">Jumlah Pesakit Disaring (Total Screened):</span>
                <span className="font-bold text-navy-900">
                  {cases.filter((c) => c.clinicId === assignedClinic.id || c.clinicName === assignedClinic.name).length} Pesakit
                </span>
              </div>
              <div className="flex justify-between border-b border-surface-200/80 pb-1.5">
                <span className="text-surface-500">Saringan Normal Disahkan (MO Cleared):</span>
                <span className="font-bold text-emerald-800">
                  {cases.filter((c) => (c.clinicId === assignedClinic.id || c.clinicName === assignedClinic.name) && (c.status === 'FINALIZED' || c.status === 'COMPLETED' || c.status === 'REPORT_SUBMITTED' || Boolean(c.finalizedAt)) && !c.isEscalated).length} Kes
                </span>
              </div>
              <div className="flex justify-between border-b border-surface-200/80 pb-1.5">
                <span className="text-surface-500">Rujukan Teleradiologi Hospital (Escalated):</span>
                <span className="font-bold text-purple-900">
                  {cases.filter((c) => (c.clinicId === assignedClinic.id || c.clinicName === assignedClinic.name) && c.isEscalated).length} Kes
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Surat Rujukan Hospital Dijana:</span>
                <span className="font-bold text-red-800">
                  {cases.filter((c) => (c.clinicId === assignedClinic.id || c.clinicName === assignedClinic.name) && c.severity === 'Critical').length} Rujukan
                </span>
              </div>
            </div>

            <p className="text-[11px] text-surface-500 leading-relaxed">
              Semua rekod klinikal, imbasan digital, dan pengesahan diagnosa bagi sesi ini telah disimpan secara automatik dalam pangkalan data RIS/PACS HealthGrid IQ.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-surface-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
                title="Print official shift summary report"
              >
                <FileText className="w-3.5 h-3.5" />
                Cetak Laporan (Print)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEndShiftModal(false)}
                  className="btn-secondary text-xs px-3 py-2"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleCompleteShift}
                  className="btn-primary text-xs px-4 py-2 bg-[#0F4C42] hover:bg-[#0c3c34] font-bold"
                >
                  Sahkan &amp; Tamat Syif
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Pending Scheduling" value={pending.length} icon={<Clock className="w-5 h-5" />} color="amber" />
        <StatsCard title="Scheduled" value={scheduled.length} icon={<Calendar className="w-5 h-5" />} color="navy" />
        <StatsCard title="Imaging Done" value={scanned.length} icon={<FolderOpen className="w-5 h-5" />} color="purple" />
        <StatsCard title="Report Finalized" value={finalized.length} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
        <StatsCard title="Total Cases" value={cases.length} icon={<FileText className="w-5 h-5" />} color="navy" />
      </div>

      {/* ── TODAY'S OUTREACH LIVE MANIFEST (Field Triage & Screening Progress) ── */}
      {assignedClinic && (
        <div className="card border-l-4 border-l-[#0F4C42] bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F4C42]" />
                  Today's Field Outreach Manifest — {assignedClinic.name}
                </h2>
                <span className="px-2 py-0.5 bg-emerald-50 text-[#0F4C42] text-[10px] font-bold rounded-full border border-emerald-200">
                  LIVE OUTREACH
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Real-time patient throughput, on-site MO triage, and hospital teleradiology escalations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEndShiftModal(true)}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 text-[#0F4C42] border-emerald-300 hover:bg-emerald-50 font-semibold"
              >
                <FileText className="w-3.5 h-3.5" />
                PKD Duty Summary
              </button>
              <Link
                to="/cases/new"
                className="btn-primary text-xs px-3 py-1.5 bg-[#0F4C42] hover:bg-[#0c3c34] flex items-center gap-1 font-bold shadow-xs"
              >
                + Register Screening Patient
              </Link>
            </div>
          </div>

          {/* Outreach Throughput Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-50 p-3 rounded-lg border border-surface-200">
              <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">Patients Screened</p>
              <p className="text-xl font-bold text-navy-900 mt-1">
                {cases.filter((c) => c.clinicId === assignedClinic.id || c.clinicName === assignedClinic.name).length}
              </p>
              <p className="text-[10px] text-surface-400 mt-0.5">Assigned to this facility</p>
            </div>

            <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Cleared Normal (MO)</p>
              <p className="text-xl font-bold text-emerald-900 mt-1">
                {cases.filter((c) => (c.clinicId === assignedClinic.id || c.clinicName === assignedClinic.name) && (c.status === 'FINALIZED' || c.status === 'COMPLETED' || c.status === 'REPORT_SUBMITTED' || Boolean(c.finalizedAt)) && !c.isEscalated).length}
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">Routine screening signed off</p>
            </div>

            <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-200">
              <p className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider">Teleradiology Sent</p>
              <p className="text-xl font-bold text-purple-950 mt-1">
                {cases.filter((c) => (c.clinicId === assignedClinic.id || c.clinicName === assignedClinic.name) && c.isEscalated).length}
              </p>
              <p className="text-[10px] text-purple-700 mt-0.5">Escalated to Specialist</p>
            </div>

            <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200">
              <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Awaiting MO Review</p>
              <p className="text-xl font-bold text-amber-900 mt-1">
                {cases.filter((c) => (c.clinicId === assignedClinic.id || c.clinicName === assignedClinic.name) && c.status === 'SCANNED' && !c.isEscalated).length}
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">Scanned on bus / pending read</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Cases */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Cases</h2>
          <Link to="/cases" className="text-sm text-navy-600 hover:text-navy-700 font-medium">View all &rarr;</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="table-header">Case #</th>
                <th className="table-header">Patient</th>
                <th className="table-header">Clinic</th>
                <th className="table-header">Modality</th>
                <th className="table-header">Severity</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {recentCases.map((c) => (
                <tr key={c.id} className="hover:bg-surface-100 transition-colors">
                  <td className="table-cell"><Link to={`/case/${c.id}`} className="font-mono text-navy-600 font-medium text-xs hover:underline">{c.caseNumber}</Link></td>
                  <td className="table-cell font-medium text-surface-800">{c.patientName}</td>
                  <td className="table-cell text-xs text-surface-500">{c.clinicName || 'Pending'}</td>
                  <td className="table-cell text-surface-600 text-xs">{c.scanType}</td>
                  <td className="table-cell"><SeverityBadge severity={c.severity} /></td>
                  <td className="table-cell"><StatusBadge status={c.status} /></td>
                  <td className="table-cell text-surface-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cases.length === 0 && <div className="text-center py-10 text-surface-400 text-sm">No cases yet.</div>}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/patients/register" className="card-hover group">
          <h3 className="text-sm font-semibold text-navy-700 group-hover:text-navy-800">Register Patient</h3>
          <p className="text-xs text-surface-500 mt-1">Add a patient to the radiology patient registry</p>
        </Link>
        <Link to="/cases/new" className="card-hover group">
          <h3 className="text-sm font-semibold text-navy-700 group-hover:text-navy-800">Register New Case</h3>
          <p className="text-xs text-surface-500 mt-1">Record the patient's indication or symptom and imaging study</p>
        </Link>
        <Link to="/track-status" className="card-hover group">
          <h3 className="text-sm font-semibold text-navy-700 group-hover:text-navy-800">Track Status</h3>
          <p className="text-xs text-surface-500 mt-1">Monitor case pipeline — flag delays and bottlenecks</p>
        </Link>
        <Link to="/onboarding" className="card-hover group">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-700 group-hover:text-navy-800">Clinical Credentials</h3>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">VERIFIED</span>
          </div>
          <p className="text-xs text-surface-500 mt-1">MMC registration &amp; clinical requisition authorization</p>
        </Link>
      </div>
    </div>
  );
}
