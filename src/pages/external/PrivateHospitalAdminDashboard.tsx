import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { Link } from 'react-router-dom';
import type { ExternalImagingRequest } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import {
  Building2,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Send,
  Users,
} from 'lucide-react';

export default function PrivateHospitalAdminDashboard() {
  const { currentUser } = useAuth();
  const { externalReferrals, cases, users, hospitalAdminAssignRadiographer } = useData();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [selectedReferral, setSelectedReferral] = useState<ExternalImagingRequest | null>(null);
  const [assignedRadId, setAssignedRadId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Available private hospital clinical imaging team
  const adminCenterId = currentUser?.healthcareCenterId || currentUser?.deploymentLocationId;
  const privateRadiographers = useMemo(() => {
    return users.filter(
      (u) =>
        (u.role === 'Private Hospital Radiographer' || u.role === 'Radiographer') &&
        (adminCenterId ? (u.healthcareCenterId === adminCenterId || u.deploymentLocationId === adminCenterId) : true)
    );
  }, [users, adminCenterId]);

  // Referrals routed to this private hospital admin (Strictly excludes Public Hospital cases)
  const myHospitalReferrals = useMemo(() => {
    return externalReferrals.filter((r) => {
      if (adminCenterId) {
        return (
          r.assignedFacilityId === adminCenterId ||
          r.assignedHospitalAdminId === currentUser?.id
        );
      }
      return (
        (r.facilityType === 'PRIVATE_HOSPITAL' ||
          r.assignedHospitalAdminId === currentUser?.id ||
          (r.status === 'PRIVATE_ADMIN_REVIEW' && r.facilityType !== 'PUBLIC_HOSPITAL')) &&
        r.facilityType !== 'PUBLIC_HOSPITAL'
      );
    });
  }, [externalReferrals, adminCenterId, currentUser?.id]);

  const pendingAssignment = myHospitalReferrals.filter(
    (r) => r.status === 'PRIVATE_ADMIN_REVIEW' || !r.assignedRadiographerId
  );

  const inProgressReferrals = myHospitalReferrals.filter(
    (r) => r.status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED' || r.status === 'SCANNING'
  );

  const completedReferrals = myHospitalReferrals.filter(
    (r) => r.status === 'SCANNED' || r.status === 'COMPLETED'
  );

  const filteredReferrals = useMemo(() => {
    return myHospitalReferrals.filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.caseNumber.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        (r.assignedFacilityName || '').toLowerCase().includes(q)
      );
    });
  }, [myHospitalReferrals, search]);

  const openAssignModal = (ref: ExternalImagingRequest) => {
    setSelectedReferral(ref);
    setAssignedRadId(privateRadiographers[0]?.id || '');
    setAdminNotes('');
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferral || !currentUser) return;

    setSubmitting(true);
    try {
      const rad = privateRadiographers.find((u) => u.id === assignedRadId);
      await hospitalAdminAssignRadiographer(selectedReferral.id, {
        radiographerId: assignedRadId,
        radiographerName: rad?.name || 'Private Radiographer',
        adminUser: currentUser,
        notes: adminNotes.trim(),
      });

      toast.success(`Assigned Radiographer ${rad?.name} to Case ${selectedReferral.caseNumber}`);
      setSelectedReferral(null);
    } catch (err: any) {
      console.error('Failed to assign radiographer:', err);
      toast.error(err.message || 'Failed to assign radiographer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-800 text-white rounded">
              PRIVATE HOSPITAL ADMIN WORKSPACE
            </span>
            <span className="text-xs text-slate-500 font-medium">BEMS External Referrals Intake</span>
          </div>
          <h1 className="page-title">Private Hospital Referral Administration</h1>
          <p className="page-subtitle">
            Manage incoming external imaging requests dispatched by BEMS and assign available hospital radiographers.
          </p>
        </div>
      </div>

      {/* ── METRICS GRID ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 space-y-1 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Awaiting Radiographer Assignment</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{pendingAssignment.length}</div>
          <p className="text-[11px] text-amber-700">Needs in-house radiographer</p>
        </div>

        <div className="card p-4 space-y-1 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Scanning in Progress</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{inProgressReferrals.length}</div>
          <p className="text-[11px] text-blue-700">Assigned &amp; imaging</p>
        </div>

        <div className="card p-4 space-y-1 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Completed &amp; Returned</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{completedReferrals.length}</div>
          <p className="text-[11px] text-emerald-700">Images uploaded back to HealthGrid IQ</p>
        </div>
      </div>

      {/* ── PENDING ASSIGNMENT QUEUE ──────────────────────────────────────── */}
      {pendingAssignment.length > 0 && (
        <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-700" />
              <h2 className="text-sm font-bold text-purple-900">
                Action Required: Pending Radiographer Assignment ({pendingAssignment.length})
              </h2>
            </div>
            <span className="text-[11px] text-purple-800">
              Assign an available hospital radiographer to execute the scan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingAssignment.map((req) => (
              <div key={req.id} className="bg-white border border-purple-200 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/case/${req.caseId}`} className="font-mono font-bold text-xs text-[#0F4C42] hover:underline">
                        {req.caseNumber}
                      </Link>
                      <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 font-bold rounded text-[10px]">
                        {req.modality}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mt-1">
                      Patient: {req.patientName}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Originating Clinic: {req.originatingClinicName || 'Primary Clinic'}
                    </p>
                  </div>

                  <button
                    onClick={() => openAssignModal(req)}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Assign Radiographer</span>
                  </button>
                </div>

                {req.bemzNotes && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-2">
                    <span className="font-semibold text-slate-700">BEMS Notes:</span> {req.bemzNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REFERRALS TABLE ───────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Hospital Referral Queue</h2>
            <p className="text-xs text-slate-500">All external cases referred to this medical center</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search case number or patient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-3 font-bold">Case</th>
                <th className="py-2.5 px-3 font-bold">Patient</th>
                <th className="py-2.5 px-3 font-bold">Modality</th>
                <th className="py-2.5 px-3 font-bold">Assigned Radiographer</th>
                <th className="py-2.5 px-3 font-bold">Status</th>
                <th className="py-2.5 px-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReferrals.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3">
                    <Link to={`/case/${req.caseId}`} className="font-mono font-bold text-[#0F4C42] hover:underline">
                      {req.caseNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900">{req.patientName}</td>
                  <td className="py-3 px-3 text-slate-700">{req.modality}</td>
                  <td className="py-3 px-3">
                    {req.assignedRadiographerName ? (
                      <span className="font-medium text-slate-800">{req.assignedRadiographerName}</span>
                    ) : (
                      <span className="text-amber-600 font-semibold">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    {!req.assignedRadiographerId ? (
                      <button
                        onClick={() => openAssignModal(req)}
                        className="btn-primary text-xs py-1 px-2.5"
                      >
                        Assign Radiographer
                      </button>
                    ) : (
                      <Link to={`/case/${req.caseId}`} className="btn-secondary text-xs py-1 px-2.5">
                        View Details
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {filteredReferrals.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    No private hospital referrals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ASSIGN RADIOGRAPHER MODAL ─────────────────────────────────────── */}
      {selectedReferral && (
        <Modal
          isOpen={Boolean(selectedReferral)}
          onClose={() => setSelectedReferral(null)}
          title={`Assign Hospital Radiographer: ${selectedReferral.caseNumber}`}
        >
          <form onSubmit={handleConfirmAssignment} className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient Name:</span>
                <span className="font-bold text-slate-800">{selectedReferral.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Modality:</span>
                <span className="font-semibold text-slate-800">{selectedReferral.modality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Originating Facility:</span>
                <span className="text-slate-700">{selectedReferral.originatingClinicName || 'Primary Health Center'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Select Hospital Radiographer / Radiologist <span className="text-red-500">*</span>
              </label>
              <select
                value={assignedRadId}
                onChange={(e) => setAssignedRadId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                required
              >
                {privateRadiographers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.role} ({r.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Internal Appointment &amp; Scanning Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add scheduled time slot, suite number, or specific radiographer instructions..."
                rows={2}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedReferral(null)}
                disabled={submitting}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {submitting ? 'Assigning...' : 'Confirm Radiographer Assignment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
