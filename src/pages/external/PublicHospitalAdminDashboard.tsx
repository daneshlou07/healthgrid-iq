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
  Search,
  Users,
  ShieldCheck,
  Filter,
} from 'lucide-react';

export default function PublicHospitalAdminDashboard() {
  const { currentUser } = useAuth();
  const {
    externalReferrals,
    crossOrgReferrals,
    users,
    hospitalAdminAssignRadiographer,
    receivingAdminAcceptCrossOrgReferral,
    receivingAdminAssignRadiographerToReferral,
  } = useData();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'scanning' | 'completed'>('all');
  const [selectedReferral, setSelectedReferral] = useState<ExternalImagingRequest | null>(null);
  const [assignedRadId, setAssignedRadId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Available public hospital diagnostic imaging team
  const adminCenterId = currentUser?.healthcareCenterId || currentUser?.deploymentLocationId;
  const publicRadiographers = useMemo(() => {
    return users.filter(
      (u) =>
        (u.role === 'Public Hospital Radiographer' || u.role === 'Radiographer') &&
        (adminCenterId ? (u.healthcareCenterId === adminCenterId || u.deploymentLocationId === adminCenterId) : true)
    );
  }, [users, adminCenterId]);

  // Referrals routed to this Public Hospital administration
  const publicHospitalReferrals = useMemo(() => {
    return externalReferrals.filter((r) => {
      if (adminCenterId) {
        return (
          r.assignedFacilityId === adminCenterId ||
          r.assignedHospitalAdminId === currentUser?.id
        );
      }
      return r.facilityType === 'PUBLIC_HOSPITAL' || r.assignedHospitalAdminId === currentUser?.id;
    });
  }, [externalReferrals, adminCenterId, currentUser?.id]);

  const pendingAssignment = useMemo(() => {
    return publicHospitalReferrals.filter(
      (r) =>
        r.status === 'BEMZ_REVIEWING' ||
        r.status === 'PENDING_BEMZ' ||
        (r.status === 'PRIVATE_ADMIN_REVIEW' && !r.assignedRadiographerId) ||
        !r.assignedRadiographerId
    );
  }, [publicHospitalReferrals]);

  const inProgressReferrals = useMemo(() => {
    return publicHospitalReferrals.filter(
      (r) => r.status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED' || r.status === 'SCANNING'
    );
  }, [publicHospitalReferrals]);

  const completedReferrals = useMemo(() => {
    return publicHospitalReferrals.filter(
      (r) => r.status === 'SCANNED' || r.status === 'COMPLETED'
    );
  }, [publicHospitalReferrals]);

  const filteredReferrals = useMemo(() => {
    return publicHospitalReferrals.filter((r) => {
      if (statusFilter === 'pending') {
        if (r.assignedRadiographerId) return false;
      } else if (statusFilter === 'scanning') {
        if (r.status !== 'EXTERNAL_RADIOGRAPHER_ASSIGNED' && r.status !== 'SCANNING') return false;
      } else if (statusFilter === 'completed') {
        if (r.status !== 'SCANNED' && r.status !== 'COMPLETED') return false;
      }

      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.caseNumber.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        (r.assignedFacilityName || '').toLowerCase().includes(q) ||
        (r.modality || '').toLowerCase().includes(q)
      );
    });
  }, [publicHospitalReferrals, search, statusFilter]);

  const openAssignModal = (ref: ExternalImagingRequest) => {
    setSelectedReferral(ref);
    setAssignedRadId(publicRadiographers[0]?.id || '');
    setAdminNotes('');
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferral || !currentUser) return;

    setSubmitting(true);
    try {
      const rad = publicRadiographers.find((u) => u.id === assignedRadId);
      await hospitalAdminAssignRadiographer(selectedReferral.id, {
        radiographerId: assignedRadId,
        radiographerName: rad?.name || 'Public Hospital Radiographer',
        adminUser: currentUser,
        notes: adminNotes.trim(),
      });

      // Update matching CrossOrganizationReferral if present
      const matchingCrossRef = crossOrgReferrals?.find((r) => r.caseId === selectedReferral.caseId || r.id === selectedReferral.id);
      if (matchingCrossRef) {
        if (matchingCrossRef.status === 'DISPATCHED' && receivingAdminAcceptCrossOrgReferral) {
          await receivingAdminAcceptCrossOrgReferral(matchingCrossRef.id, currentUser.id, currentUser.name);
        }
        if (receivingAdminAssignRadiographerToReferral && rad) {
          await receivingAdminAssignRadiographerToReferral(matchingCrossRef.id, rad.id, rad.name);
        }
      }

      toast.success(`Assigned Radiographer ${rad?.name} to Case ${selectedReferral.caseNumber}`);
      setSelectedReferral(null);
    } catch (err: any) {
      console.error('Failed to assign public radiographer:', err);
      toast.error(err.message || 'Failed to assign radiographer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0F4C42] text-white rounded">
              PUBLIC HOSPITAL ADMIN WORKSPACE
            </span>
            <span className="text-xs text-slate-500 font-medium">BEMS Public Referrals Intake &amp; Staffing</span>
          </div>
          <h1 className="page-title">Public Hospital Referral Administration</h1>
          <p className="page-subtitle">
            Oversee external diagnostic imaging referrals dispatched to public hospital facilities and assign certified radiographers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F4C42] bg-[#EFF6F3] border border-[#CDE1DA] px-3 py-2 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-[#0F4C42]" />
          <span>MOH Public Facility Administration Portal</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 space-y-1 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Awaiting Radiographer Assignment</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{pendingAssignment.length}</div>
          <p className="text-[11px] text-amber-700">Requires public radiographer assignment</p>
        </div>

        <div className="card p-4 space-y-1 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Scanning in Progress</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{inProgressReferrals.length}</div>
          <p className="text-[11px] text-blue-700">Assigned &amp; currently undergoing scan</p>
        </div>

        <div className="card p-4 space-y-1 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Completed &amp; Returned</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{completedReferrals.length}</div>
          <p className="text-[11px] text-emerald-700">Scanned images uploaded to HealthGrid IQ</p>
        </div>
      </div>

      {/* Action Required: Pending Radiographer Assignment */}
      {pendingAssignment.length > 0 && (
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0F4C42]" />
              <h2 className="text-sm font-bold text-[#0F4C42]">
                Action Required: Pending Radiographer Assignment ({pendingAssignment.length})
              </h2>
            </div>
            <span className="text-[11px] text-emerald-800">
              Assign an available public hospital radiographer to execute diagnostic imaging
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingAssignment.map((req) => (
              <div key={req.id} className="bg-white border border-emerald-200 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/case/${req.caseId}`} className="font-mono font-bold text-xs text-[#0F4C42] hover:underline">
                        {req.caseNumber}
                      </Link>
                      <span className="px-1.5 py-0.5 bg-[#EFF6F3] text-[#0F4C42] font-bold rounded text-[10px]">
                        {req.modality}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mt-1">
                      Patient: {req.patientName}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Originating Clinic: {req.originatingClinicName || 'Primary Healthcare Centre'}
                    </p>
                  </div>

                  <button
                    onClick={() => openAssignModal(req)}
                    className="px-3 py-1.5 bg-[#0F4C42] hover:bg-[#0B3831] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
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

      {/* Referrals Table */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Public Hospital Referral Queue</h2>
            <p className="text-xs text-slate-500">All external referral cases directed to this public healthcare center</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({publicHospitalReferrals.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingAssignment.length})
              </button>
              <button
                onClick={() => setStatusFilter('scanning')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === 'scanning' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Scanning ({inProgressReferrals.length})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === 'completed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Completed ({completedReferrals.length})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search case, patient, modality..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
              />
            </div>
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
                    <div className="text-[10px] text-slate-400">
                      Dispatched: {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : 'Recent'}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{req.patientName}</div>
                    <div className="text-[10px] text-slate-500">{req.originatingClinicName || 'MOH Clinic'}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 bg-[#EFF6F3] text-[#0F4C42] font-semibold rounded text-[11px]">
                      {req.modality}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {req.assignedRadiographerName ? (
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                        <Users className="w-3.5 h-3.5 text-[#0F4C42]" />
                        <span>{req.assignedRadiographerName}</span>
                      </div>
                    ) : (
                      <span className="text-amber-600 font-semibold italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openAssignModal(req)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-[#0F4C42] bg-[#EFF6F3] hover:bg-[#D8ECE5] border border-[#CDE1DA] rounded transition-colors cursor-pointer"
                      >
                        {req.assignedRadiographerId ? 'Reassign' : 'Assign'}
                      </button>
                      <Link
                        to={`/case/${req.caseId}`}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredReferrals.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No public hospital referrals match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {selectedReferral && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReferral(null)}
          title={`Assign Public Radiographer — ${selectedReferral.caseNumber}`}
        >
          <form onSubmit={handleConfirmAssignment} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div>
                <span className="text-slate-500">Patient:</span>{' '}
                <strong className="text-slate-800">{selectedReferral.patientName}</strong>
              </div>
              <div>
                <span className="text-slate-500">Requested Modality:</span>{' '}
                <span className="font-semibold text-[#0F4C42]">{selectedReferral.modality}</span>
              </div>
              <div>
                <span className="text-slate-500">Originating Facility:</span>{' '}
                <span className="text-slate-700">{selectedReferral.originatingClinicName || 'Primary Clinic'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Select Public Hospital Radiographer <span className="text-red-500">*</span>
              </label>
              <select
                value={assignedRadId}
                onChange={(e) => setAssignedRadId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                required
              >
                {publicRadiographers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.specialty || 'Radiographer'} ({r.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Hospital Administration Directives &amp; Scheduling Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Include imaging suite location, priority directives, or preparation notes..."
                rows={3}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedReferral(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !assignedRadId}
                className="px-4 py-2 bg-[#0F4C42] hover:bg-[#0B3831] text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
