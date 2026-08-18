import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import {
  updatePatientRequest,
  updatePatient,
} from '../../services/dataService';
import type { PatientRequest } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import {
  CheckCircle,
  XCircle,
  Trash2,
  Search,
  Eye,
} from 'lucide-react';

export default function PatientRequestsReview() {
  const { currentUser } = useAuth();
  const {
    patientRequests,
    setPatientRequests,
    editPatient,
    addAuditLog,
  } = useData();

  const toast = useToast();

  const [selectedReq, setSelectedReq] =
    useState<PatientRequest | null>(null);

  const [remarks, setRemarks] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] =
    useState<string>('all');

  const filtered = patientRequests.filter((r) => {
    const searchTerm = search.toLowerCase().trim();

    const matchSearch =
      r.patientName.toLowerCase().includes(searchTerm) ||
      r.mrn.toLowerCase().includes(searchTerm) ||
      r.requestedBy.toLowerCase().includes(searchTerm);

    const matchStatus =
      filterStatus === 'all' ||
      r.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const handleDecision = async (
    decision: 'Approved' | 'Rejected'
  ) => {
    if (!currentUser || !selectedReq) return;

    const updated = {
      status: decision,
      approverName: currentUser.name,
      approvedOrRejectedAt: new Date().toISOString(),
      remarks,
    };

    setPatientRequests((prev) =>
      prev.map((r) =>
        r.id === selectedReq.id
          ? { ...r, ...updated }
          : r
      )
    );

    updatePatientRequest(
      selectedReq.id,
      updated
    ).catch(() => { });

    if (
      decision === 'Approved' &&
      selectedReq.requestType === 'Update'
    ) {
      editPatient(
        selectedReq.patientId,
        selectedReq.requestedChanges as Record<string, any>
      );

      updatePatient(
        selectedReq.patientId,
        selectedReq.requestedChanges as Record<string, any>
      ).catch(() => { });
    }

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: `PATIENT_REQUEST_${decision.toUpperCase()}`,
      target: `patient_requests/${selectedReq.id}`,
      details: `${decision} ${selectedReq.requestType} request for ${selectedReq.patientName} (${selectedReq.mrn})`,
      timestamp: new Date().toISOString(),
    });

    toast.success(
      `Request ${decision.toLowerCase()} for ${selectedReq.patientName}`
    );

    setSelectedReq(null);
    setRemarks('');
  };

  const deleteRequest = async (
    req: PatientRequest
  ) => {
    if (!currentUser) return;

    if (
      !confirm(
        `Delete this ${req.requestType} request for ${req.patientName}?`
      )
    ) {
      return;
    }

    setPatientRequests((prev) =>
      prev.filter((r) => r.id !== req.id)
    );

    addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'PATIENT_REQUEST_DELETED',
      target: `patient_requests/${req.id}`,
      details: `Deleted ${req.requestType} request for ${req.patientName}`,
      timestamp: new Date().toISOString(),
    });

    toast.success('Request deleted');
  };

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'Update':
        return (
          <span className="badge-info">
            Update Profile
          </span>
        );

      case 'Archive':
        return (
          <span className="badge-warning">
            Archive Record
          </span>
        );

      case 'Transfer':
        return (
          <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Transfer Request
          </span>
        );

      case 'DICOM_COPY':
        return (
          <span className="badge-neutral">
            DICOM Copy
          </span>
        );

      case 'REPORT_COPY':
        return (
          <span className="badge-neutral">
            Report Copy
          </span>
        );

      default:
        return (
          <span className="badge-neutral">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div>
        <h1 className="page-title">
          Patient Record &amp; Transfer Requests
        </h1>

        <p className="page-subtitle">
          Administrative approval queue for patient transfer,
          record archiving, and demographic update requests.
        </p>
      </div>


      {/* =====================================================
          TABLE TOOLBAR
          ===================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500"
            aria-hidden="true"
          />

          <input
            type="text"
            placeholder="Search by patient, MRN, requester..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search patient requests"
            className="input-field pl-10"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          aria-label="Filter request status"
          className="select-field w-full sm:w-40"
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>


      {/* =====================================================
          REQUEST TABLE
          ===================================================== */}

      <div className="card overflow-hidden p-0">

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">

            <thead>
              <tr>
                <th className="table-header">
                  Patient
                </th>

                <th className="table-header">
                  MRN
                </th>

                <th className="table-header">
                  Request Type
                </th>

                <th className="table-header">
                  Requested By
                </th>

                <th className="table-header">
                  Date Submitted
                </th>

                <th className="table-header">
                  Status
                </th>

                <th className="table-header text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-surface-200">

              {filtered.map((req) => (
                <tr
                  key={req.id}
                  className="transition-colors hover:bg-surface-100/70"
                >

                  {/* Patient */}
                  <td className="table-cell">
                    <span className="font-medium text-surface-900">
                      {req.patientName}
                    </span>
                  </td>


                  {/* MRN */}
                  <td className="table-cell">
                    <span className="font-mono text-[13px] font-normal text-surface-500">
                      {req.mrn}
                    </span>
                  </td>


                  {/* Request Type */}
                  <td className="table-cell">
                    {getRequestTypeBadge(
                      req.requestType
                    )}
                  </td>


                  {/* Requested By */}
                  <td className="table-cell">
                    <div>
                      <span className="block font-medium text-surface-800">
                        {req.requestedBy}
                      </span>

                      {req.requestedByRole && (
                        <span className="mt-0.5 block text-[12px] leading-4 text-surface-500">
                          {req.requestedByRole}
                        </span>
                      )}
                    </div>
                  </td>


                  {/* Date */}
                  <td className="table-cell">
                    <span className="text-[13px] text-surface-600">
                      {new Date(
                        req.dateSubmitted
                      ).toLocaleString()}
                    </span>
                  </td>


                  {/* Status */}
                  <td className="table-cell">
                    <StatusBadge
                      status={req.status}
                    />
                  </td>


                  {/* Actions */}
                  <td className="table-cell text-right">

                    <div className="flex items-center justify-end gap-1">

                      {/* Review */}
                      {req.status === 'Pending' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReq(req);
                            setRemarks('');
                          }}
                          title="Review Request Details"
                          aria-label="Review request details"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-surface-100 hover:text-navy-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}


                      {/* Approve */}
                      {req.status === 'Pending' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReq(req);
                            setRemarks('');
                            handleDecision('Approved');
                          }}
                          title="Approve Request"
                          aria-label="Approve request"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}


                      {/* Reject */}
                      {req.status === 'Pending' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReq(req);
                            setRemarks('');
                            handleDecision('Rejected');
                          }}
                          title="Reject Request"
                          aria-label="Reject request"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}


                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() =>
                          deleteRequest(req)
                        }
                        title="Delete Request"
                        aria-label="Delete request"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>

                  </td>

                </tr>
              ))}

            </tbody>

          </table>
        </div>


        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">

            <p className="text-[14px] font-medium text-surface-800">
              No requests found
            </p>

            <p className="mt-1 text-[12px] text-surface-500">
              Try adjusting your search or status filter.
            </p>

          </div>
        )}

      </div>


      {/* =====================================================
          REVIEW MODAL
          ===================================================== */}

      <Modal
        isOpen={
          !!selectedReq &&
          !['Approved', 'Rejected'].includes(
            selectedReq?.status || ''
          )
        }
        onClose={() =>
          setSelectedReq(null)
        }
        title="Review Patient Request"
      >

        {selectedReq &&
          selectedReq.status === 'Pending' && (
            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-3 text-sm">

                <div>
                  <span className="text-xs text-surface-500">
                    Patient
                  </span>

                  <p className="font-medium text-surface-800">
                    {selectedReq.patientName}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-surface-500">
                    MRN
                  </span>

                  <p className="font-mono text-surface-800">
                    {selectedReq.mrn}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-surface-500">
                    Request Type
                  </span>

                  <p className="text-surface-800">
                    {selectedReq.requestType}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-surface-500">
                    Requested By
                  </span>

                  <p className="text-surface-800">
                    {selectedReq.requestedBy}{' '}
                    ({selectedReq.requestedByRole})
                  </p>
                </div>

              </div>


              <div className="rounded-lg border border-surface-200 bg-surface-100 p-3">

                <p className="mb-1 text-xs text-surface-500">
                  Reason
                </p>

                <p className="text-sm text-surface-700">
                  {selectedReq.reason}
                </p>

              </div>


              {Object.keys(
                selectedReq.requestedChanges
              ).length > 0 && (
                  <div className="rounded-lg border border-surface-200 bg-surface-100 p-3">

                    <p className="mb-1 text-xs text-surface-500">
                      Proposed Changes
                    </p>

                    <pre className="whitespace-pre-wrap font-mono text-xs text-navy-600">
                      {JSON.stringify(
                        selectedReq.requestedChanges,
                        null,
                        2
                      )}
                    </pre>

                  </div>
                )}


              <div>

                <label className="mb-1 block text-sm font-medium text-surface-700">
                  Review Remarks
                </label>

                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) =>
                    setRemarks(e.target.value)
                  }
                  className="input-field resize-none text-sm"
                  placeholder="Optional remarks for the requester..."
                />

              </div>


              <div className="flex justify-end gap-2 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    handleDecision('Rejected')
                  }
                  className="btn-danger"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDecision('Approved')
                  }
                  className="btn-success"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </button>

              </div>

            </div>
          )}

      </Modal>

    </div>
  );
}