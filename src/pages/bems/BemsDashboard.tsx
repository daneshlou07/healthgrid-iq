import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { Link } from 'react-router-dom';
import type { ExternalImagingRequest, ExternalFacilityType } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import Modal from '../../components/ui/Modal';
import {
  Wrench,
  Building2,
  GitBranch,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
  Activity,
  FileText,
} from 'lucide-react';

export default function BemsDashboard() {
  const { currentUser } = useAuth();
  const { externalReferrals, cases, clinics, users, bemsAssignFacility } = useData();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [selectedFacilityTypeFilter, setSelectedFacilityTypeFilter] = useState<'ALL' | 'PENDING' | 'PUBLIC' | 'PRIVATE'>('ALL');

  // Assign Modal State
  const [selectedReferral, setSelectedReferral] = useState<ExternalImagingRequest | null>(null);
  const [targetFacilityType, setTargetFacilityType] = useState<ExternalFacilityType>('PUBLIC_HOSPITAL');
  const [selectedFacilityName, setSelectedFacilityName] = useState('');
  const [selectedPublicRadId, setSelectedPublicRadId] = useState('');
  const [selectedPrivAdminId, setSelectedPrivAdminId] = useState('');
  const [bemsNotes, setBemsNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Filter public radiographers, public admins & private admins from dynamic users list
  const [publicRoutingMode, setPublicRoutingMode] = useState<'admin' | 'direct'>('direct');
  const [selectedPublicAdminId, setSelectedPublicAdminId] = useState('');

  const publicRadiographers = useMemo(() => {
    return users.filter((u) => {
      if (u.role === 'Public Hospital Radiographer') return true;
      if (u.role === 'Radiographer') {
        const center = clinics.find((c) => c.id === (u.healthcareCenterId || u.deploymentLocationId));
        return center?.organizationType === 'Public Hospital';
      }
      return false;
    });
  }, [users, clinics]);

  const publicHospitalAdmins = useMemo(() => {
    return users.filter((u) => {
      if (u.role === 'Public Hospital Admin') return true;
      if (u.role === 'Administrator') {
        const center = clinics.find((c) => c.id === (u.healthcareCenterId || u.deploymentLocationId));
        return center?.organizationType === 'Public Hospital';
      }
      return false;
    });
  }, [users, clinics]);

  const privateHospitalAdmins = useMemo(() => {
    return users.filter((u) => {
      if (u.role === 'Private Hospital Admin') return true;
      if (u.role === 'Administrator') {
        const center = clinics.find((c) => c.id === (u.healthcareCenterId || u.deploymentLocationId));
        return center?.organizationType === 'Private Hospital';
      }
      return false;
    });
  }, [users, clinics]);

  // Aggregate and synchronize all equipment issue tickets from externalReferrals and active cases
  const allReferrals = useMemo(() => {
    const list: ExternalImagingRequest[] = [];
    const seenCaseIds = new Set<string>();

    // 1. Add all from live externalReferrals
    externalReferrals.forEach((r) => {
      list.push(r);
      if (r.caseId) seenCaseIds.add(r.caseId);
      if (r.id) seenCaseIds.add(r.id);
    });

    // 2. Synthesize from cases with machineIssue or pending referral status
    cases.forEach((c) => {
      if (
        c.status === 'EXTERNAL_REFERRAL_PENDING' ||
        c.status === 'MACHINE_UNAVAILABLE' ||
        c.status === 'BEMZ_REVIEW' ||
        Boolean(c.machineIssue) ||
        Boolean(c.externalReferralId)
      ) {
        if (!seenCaseIds.has(c.id) && (!c.externalReferralId || !seenCaseIds.has(c.externalReferralId))) {
          const synthReferral: ExternalImagingRequest = {
            id: c.externalReferralId || `bems-ref-${c.id}`,
            caseId: c.id,
            caseNumber: c.caseNumber,
            patientId: c.patientId,
            patientName: c.patientName,
            originatingClinicId: c.clinicId,
            originatingClinicName: c.clinicName,
            requestingRadiographerId: c.machineIssue?.reportedById || c.radiographerId || 'rad-unknown',
            requestingRadiographerName: c.machineIssue?.reportedByName || c.radiographerName || 'Radiographer',
            machineIssueReason: (c.machineIssue?.reason as any) || 'Broken',
            machineIssueDetails: c.machineIssue?.notes || c.notes,
            submittedAt: c.machineIssue?.reportedAt || c.createdAt || new Date().toISOString(),
            status: 'PENDING_BEMZ',
            modality: c.modality || c.scanType,
            urgency: c.severity === 'Critical' ? 'Emergency' : c.severity === 'Severe' ? 'Urgent' : 'Routine',
          };
          list.unshift(synthReferral);
          seenCaseIds.add(c.id);
        }
      }
    });

    return list;
  }, [externalReferrals, cases]);

  // Computed metrics
  const pendingRequests = allReferrals.filter(
    (r) =>
      r.status === 'PENDING_BEMZ' ||
      r.status === 'BEMZ_REVIEWING' ||
      (r.status as string) === 'EXTERNAL_REFERRAL_PENDING' ||
      (!r.facilityType && r.status !== 'SCANNED' && r.status !== 'COMPLETED')
  );
  const activeReferrals = allReferrals.filter(
    (r) =>
      r.status === 'FACILITY_SELECTED' ||
      r.status === 'PRIVATE_ADMIN_REVIEW' ||
      r.status === 'EXTERNAL_RADIOGRAPHER_ASSIGNED' ||
      r.status === 'SCANNING'
  );
  const completedReferrals = allReferrals.filter(
    (r) => r.status === 'SCANNED' || r.status === 'COMPLETED'
  );

  const filteredReferrals = useMemo(() => {
    return allReferrals.filter((r) => {
      const matchSearch =
        !search ||
        r.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.patientName.toLowerCase().includes(search.toLowerCase()) ||
        (r.originatingClinicName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.assignedFacilityName || '').toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (selectedFacilityTypeFilter === 'PENDING') {
        return r.status === 'PENDING_BEMZ' || r.status === 'BEMZ_REVIEWING';
      }
      if (selectedFacilityTypeFilter === 'PUBLIC') {
        return r.facilityType === 'PUBLIC_HOSPITAL';
      }
      if (selectedFacilityTypeFilter === 'PRIVATE') {
        return r.facilityType === 'PRIVATE_HOSPITAL';
      }
      return true;
    });
  }, [allReferrals, search, selectedFacilityTypeFilter]);

  const openAssignModal = (ref: ExternalImagingRequest) => {
    setSelectedReferral(ref);
    setTargetFacilityType('PUBLIC_HOSPITAL');
    setSelectedFacilityName('Hospital Kuala Lumpur (HKL)');
    setSelectedPublicRadId(publicRadiographers[0]?.id || '');
    setSelectedPublicAdminId(publicHospitalAdmins[0]?.id || '');
    setSelectedPrivAdminId(privateHospitalAdmins[0]?.id || '');
    setPublicRoutingMode('direct');
    setBemsNotes('');
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferral || !currentUser) return;

    setAssigning(true);
    try {
      const isPublic = targetFacilityType === 'PUBLIC_HOSPITAL';
      const isPublicDirect = isPublic && publicRoutingMode === 'direct';
      const assignedPublicRad = publicRadiographers.find((u) => u.id === selectedPublicRadId);
      const assignedPublicAdmin = publicHospitalAdmins.find((u) => u.id === selectedPublicAdminId);
      const assignedPrivAdmin = privateHospitalAdmins.find((u) => u.id === selectedPrivAdminId);

      const assignedRadiographer = isPublicDirect ? assignedPublicRad : undefined;
      const assignedAdmin = isPublic
        ? (!isPublicDirect ? assignedPublicAdmin : undefined)
        : assignedPrivAdmin;

      await bemsAssignFacility(selectedReferral.id, {
        facilityType: targetFacilityType,
        facilityId: `fac-${Date.now()}`,
        facilityName: selectedFacilityName.trim() || (isPublic ? 'Public Hospital' : 'Private Hospital'),
        radiographerId: assignedRadiographer?.id,
        radiographerName: assignedRadiographer?.name,
        hospitalAdminId: assignedAdmin?.id,
        hospitalAdminName: assignedAdmin?.name,
        bemsOfficer: currentUser,
        bemsNotes: bemsNotes.trim(),
      });

      toast.success(
        isPublicDirect
          ? `Directly assigned to Public Hospital Radiographer: ${assignedPublicRad?.name || 'Assigned'}`
          : `Referral routed to Hospital Admin: ${assignedAdmin?.name || 'Assigned'}`
      );
      setSelectedReferral(null);
    } catch (err: any) {
      console.error('Failed to assign external facility:', err);
      toast.error(err.message || 'Failed to complete BEMS assignment.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>

          <h1 className="page-title">Biomedical Engineering Maintenance Services (BEMS)</h1>
          <p className="page-subtitle">
            Manage medical imaging equipment issues, review maintenance requests, and coordinate external referrals to public or private hospitals.
          </p>
        </div>
      </div>

      {/* ── METRICS GRID ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending BEMS Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{pendingRequests.length}</div>
          <p className="text-[11px] text-amber-700">Awaiting facility assignment</p>
        </div>

        <div className="card p-4 space-y-1 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active External Cases</span>
            <GitBranch className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{activeReferrals.length}</div>
          <p className="text-[11px] text-blue-700">In Public/Private queues</p>
        </div>

        <div className="card p-4 space-y-1 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Scans Returned</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{completedReferrals.length}</div>
          <p className="text-[11px] text-emerald-700">Returned to Initial MO</p>
        </div>

        <div className="card p-4 space-y-1 bg-white border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Referrals Managed</span>
            <Activity className="w-4 h-4 text-[#0F4C42]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{externalReferrals.length}</div>
          <p className="text-[11px] text-slate-500">Live database records</p>
        </div>
      </div>

      {/* ── ACTION QUEUE: PENDING BEMS REFERRAL REQUESTS ───────────────────── */}
      {pendingRequests.length > 0 && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h2 className="text-sm font-bold text-amber-900">
                Action Required: Pending Referral Requests ({pendingRequests.length})
              </h2>
            </div>
            <span className="text-[11px] text-amber-800">
              Select facility type (Public / Private) to proceed with scan execution
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.map((req) => {
              const matchedCase = cases.find((c) => c.id === req.caseId);
              return (
                <div key={req.id} className="bg-white border border-amber-300 rounded-lg p-4 space-y-2 shadow-none">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#0F4C42]">
                          {req.caseNumber}
                        </span>
                        <span className="px-1.5 py-0.2 bg-red-100 text-red-800 font-bold rounded text-[10px]">
                          {req.machineIssueReason}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1">
                        Modality: {req.modality}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Origin Facility: {req.originatingClinicName || 'Primary Care Center'}
                      </p>
                    </div>

                    <button
                      onClick={() => openAssignModal(req)}
                      className="px-3.5 py-1.5 bg-[#0F4C42] hover:bg-[#0c3c34] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                    >
                      <span>Relocate to Hospital</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {req.machineIssueDetails && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-2">
                      <span className="font-semibold text-slate-700">Machine Failure Details:</span> {req.machineIssueDetails}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Reported by: {req.requestingRadiographerName}</span>
                    <span>Submitted: {new Date(req.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALL EXTERNAL REFERRALS REPOSITORY ─────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">External Referrals Repository</h2>
            <p className="text-xs text-slate-500">Live referral lifecycle status across Public and Private facilities</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search referral or case..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setSelectedFacilityTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition-all ${selectedFacilityTypeFilter === 'ALL' ? 'bg-white text-[#0F4C42] shadow-sm' : 'text-slate-600'
                  }`}
              >
                All ({externalReferrals.length})
              </button>
              <button
                onClick={() => setSelectedFacilityTypeFilter('PENDING')}
                className={`px-2.5 py-1 rounded-md transition-all ${selectedFacilityTypeFilter === 'PENDING' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-600'
                  }`}
              >
                Pending ({pendingRequests.length})
              </button>
              <button
                onClick={() => setSelectedFacilityTypeFilter('PUBLIC')}
                className={`px-2.5 py-1 rounded-md transition-all ${selectedFacilityTypeFilter === 'PUBLIC' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600'
                  }`}
              >
                Public Hospital
              </button>
              <button
                onClick={() => setSelectedFacilityTypeFilter('PRIVATE')}
                className={`px-2.5 py-1 rounded-md transition-all ${selectedFacilityTypeFilter === 'PRIVATE' ? 'bg-white text-purple-800 shadow-sm' : 'text-slate-600'
                  }`}
              >
                Private Hospital
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-3 font-bold">Case Reference</th>
                <th className="py-2.5 px-3 font-bold">Modality &amp; Origin Clinic</th>
                <th className="py-2.5 px-3 font-bold">Machine Fault</th>
                <th className="py-2.5 px-3 font-bold">Relocation Pathway</th>
                <th className="py-2.5 px-3 font-bold">Assigned Staff</th>
                <th className="py-2.5 px-3 font-bold">Status</th>
                <th className="py-2.5 px-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReferrals.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-[#0F4C42]">
                      {req.caseNumber}
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono">{req.id}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{req.modality}</div>
                    <div className="text-[10px] text-slate-500">{req.originatingClinicName || 'Primary Clinic'}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-semibold text-[10px]">
                      {req.machineIssueReason}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {req.facilityType ? (
                      <div>
                        <div className="font-semibold text-slate-800">{req.assignedFacilityName}</div>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${req.facilityType === 'PUBLIC_HOSPITAL' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                          }`}>
                          {req.facilityType === 'PUBLIC_HOSPITAL' ? 'Public Hospital' : 'Private Hospital'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-amber-600 font-semibold text-[11px]">Pending Relocation</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    {req.assignedRadiographerName ? (
                      <div>
                        <div className="font-medium text-slate-800">Rad: {req.assignedRadiographerName}</div>
                        <div className="text-[10px] text-slate-400">Directly assigned</div>
                      </div>
                    ) : req.assignedHospitalAdminName ? (
                      <div>
                        <div className="font-medium text-slate-800">Admin: {req.assignedHospitalAdminName}</div>
                        <div className="text-[10px] text-slate-400">Reviewing assignment</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    {req.status === 'PENDING_BEMZ' ? (
                      <button
                        onClick={() => openAssignModal(req)}
                        className="btn-primary text-xs py-1 px-2.5"
                      >
                        Relocate Scan
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">Relocated</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredReferrals.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                    No equipment maintenance referrals match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ASSIGN EXTERNAL FACILITY MODAL ─────────────────────────────────── */}
      {selectedReferral && (
        <Modal
          isOpen={Boolean(selectedReferral)}
          onClose={() => setSelectedReferral(null)}
          title="BEMS: Relocate Imaging Due to Equipment Breakdown"
        >
          <form onSubmit={handleConfirmAssignment} className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Case Reference:</span>
                <span className="font-mono font-bold text-slate-800">{selectedReferral.caseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Modality Needed:</span>
                <span className="font-bold text-slate-800">{selectedReferral.modality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Originating Facility:</span>
                <span className="font-medium text-slate-800">{selectedReferral.originatingClinicName || 'Primary Care Center'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Equipment Breakdown Reason:</span>
                <span className="text-red-600 font-semibold">{selectedReferral.machineIssueReason}</span>
              </div>
            </div>

            {/* Facility Type Selector (Public vs Private) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Select Facility Pathway <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetFacilityType('PUBLIC_HOSPITAL');
                    setSelectedFacilityName('Public Hospital');
                  }}
                  className={`p-3 rounded-lg border text-left transition-all text-xs space-y-1 ${targetFacilityType === 'PUBLIC_HOSPITAL'
                    ? 'bg-[#EFF6F3] border-[#0F4C42] ring-1 ring-[#0F4C42]'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <div className="font-bold text-[#0F4C42]">Public Hospital</div>
                  <p className="text-[11px] text-slate-600">
                    Direct assignment to Public Hospital Radiographer
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetFacilityType('PRIVATE_HOSPITAL');
                    setSelectedFacilityName('Private Hospital');
                  }}
                  className={`p-3 rounded-lg border text-left transition-all text-xs space-y-1 ${targetFacilityType === 'PRIVATE_HOSPITAL'
                    ? 'bg-[#EFF6F3] border-[#0F4C42] ring-1 ring-[#0F4C42]'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <div className="font-bold text-purple-900">Private Hospital</div>
                  <p className="text-[11px] text-slate-600">
                    Dispatched to Hospital Admin for internal assignment
                  </p>
                </button>
              </div>
            </div>

            {/* Facility Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Hospital / Medical Centre Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={selectedFacilityName}
                onChange={(e) => setSelectedFacilityName(e.target.value)}
                placeholder="e.g. Public Hospital / Private Hospital"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                required
              />
            </div>

            {/* If Public Hospital: Choose Direct Radiographer or Hospital Admin */}
            {targetFacilityType === 'PUBLIC_HOSPITAL' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Public Hospital Routing Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPublicRoutingMode('direct')}
                      className={`p-2.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                        publicRoutingMode === 'direct'
                          ? 'bg-[#EFF6F3] border-[#0F4C42] text-[#0F4C42] ring-1 ring-[#0F4C42]'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Direct to Radiographer
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublicRoutingMode('admin')}
                      className={`p-2.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                        publicRoutingMode === 'admin'
                          ? 'bg-[#EFF6F3] border-[#0F4C42] text-[#0F4C42] ring-1 ring-[#0F4C42]'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Route to Hospital Admin
                    </button>
                  </div>
                </div>

                {publicRoutingMode === 'direct' ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Select Public Hospital Radiographer <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedPublicRadId}
                      onChange={(e) => setSelectedPublicRadId(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                      required
                    >
                      {publicRadiographers.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.email})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Public hospital radiographers receive the case directly in their scanning workspace.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Select Public Hospital Admin <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedPublicAdminId}
                      onChange={(e) => setSelectedPublicAdminId(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                      required
                    >
                      {publicHospitalAdmins.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.email})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      The public hospital admin will review this referral and assign their available staff.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* If Private Hospital: Route to Hospital Admin */}
            {targetFacilityType === 'PRIVATE_HOSPITAL' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Select Private Hospital Admin <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPrivAdminId}
                  onChange={(e) => setSelectedPrivAdminId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
                  required
                >
                  {privateHospitalAdmins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  The private hospital admin will assign their available in-house radiographer.
                </p>
              </div>
            )}

            {/* BEMS Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                BEMS Clinical &amp; Operational Notes
              </label>
              <textarea
                value={bemsNotes}
                onChange={(e) => setBemsNotes(e.target.value)}
                placeholder="Add special modality protocols, urgency notes, or equipment repair updates..."
                rows={2}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedReferral(null)}
                disabled={assigning}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigning}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {assigning ? 'Routing Referral...' : 'Confirm BEMS Routing'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
