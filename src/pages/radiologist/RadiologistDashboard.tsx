import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatsCard from '../../components/ui/StatsCard';
import {
  Eye,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RadiologistDashboard() {
  const { currentUser } = useAuth();
  const { cases, reports } = useData();

  // --------------------------------------------------
  // REPORT DATA
  // --------------------------------------------------

  // Cases that have completed imaging/scanning
  const scannedCases = cases.filter(
    (c) => c.status === 'SCANNED'
  );

  // Reports belonging to the currently logged-in radiologist
  const myReports = reports.filter(
    (r) => r.radiologistId === currentUser?.id
  );

  // Reports that have been verified and signed off
  const signedReports = myReports.filter(
    (r) => r.status === 'Verified / Signed Off'
  );

  // --------------------------------------------------
  // PENDING REVIEWS
  // --------------------------------------------------

  // A scanned case is pending if it does not yet have
  // a verified/signed-off report.
  const pendingCases = scannedCases.filter((c) => {
    const report = myReports.find(
      (r) => r.caseId === c.id
    );

    return !report || report.status !== 'Verified / Signed Off';
  });

  // --------------------------------------------------
  // SLA CALCULATION
  // --------------------------------------------------

  // SLA target:
  // Report must be signed within 48 hours of scanning.
  const slaCompliant = signedReports.filter((r) => {
    const matchingCase = cases.find(
      (c) => c.id === r.caseId
    );

    if (!matchingCase?.scannedAt || !r.signedAt) {
      return false;
    }

    const diff =
      new Date(r.signedAt).getTime() -
      new Date(matchingCase.scannedAt).getTime();

    return diff <= 48 * 60 * 60 * 1000;
  });

  // If there are no completed reports, show "—"
  // instead of incorrectly displaying 100%.
  const slaPercent =
    signedReports.length > 0
      ? Math.round(
        (slaCompliant.length / signedReports.length) * 100
      )
      : null;

  // --------------------------------------------------
  // OVERDUE REPORTS
  // --------------------------------------------------

  // A case is overdue only when:
  // 1. It is still pending
  // 2. It has been more than 48 hours since scanning
  const now = new Date();

  const overdue = pendingCases.filter((c) => {
    if (!c.scannedAt) {
      return false;
    }

    const diff =
      now.getTime() -
      new Date(c.scannedAt).getTime();

    return diff > 48 * 60 * 60 * 1000;
  });

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div>
        <h1 className="page-title">
          Radiologist Dashboard
        </h1>

        <p className="page-subtitle">
          Radiology reporting workload and SLA overview
        </p>
      </div>


      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <StatsCard
          title="Pending Reviews"
          value={pendingCases.length}
          icon={<Eye className="w-5 h-5" />}
          color="navy"
        />

        <StatsCard
          title="Completed Reports"
          value={signedReports.length}
          icon={<CheckCircle className="w-5 h-5" />}
          color="emerald"
        />

        <StatsCard
          title="SLA Compliance"
          value={
            slaPercent !== null
              ? `${slaPercent}%`
              : '—'
          }
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />

        <StatsCard
          title="Overdue Reports"
          value={overdue.length}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="amber"
        />

      </div>


      {/* Pending Reviews */}
      <div className="card">

        <div className="flex items-center justify-between mb-4">

          <h2 className="section-title">
            Pending Reviews
          </h2>

          <Link
            to="/review-queue"
            className="text-sm text-navy-600 hover:text-navy-700 font-medium"
          >
            View all &rarr;
          </Link>

        </div>


        {/* Empty State */}
        {pendingCases.length === 0 ? (

          <div className="text-center py-10">

            <Eye className="w-8 h-8 text-surface-300 mx-auto mb-2" />

            <p className="text-sm font-medium text-surface-600">
              Review queue is clear
            </p>

            <p className="text-xs text-surface-400">
              No pending reports. Great work!
            </p>

          </div>

        ) : (

          /* Pending Case List */
          <div className="space-y-2">

            {pendingCases.slice(0, 5).map((c) => (

              <div
                key={c.id}
                className="flex items-center justify-between p-3 bg-surface-100 rounded-lg border border-surface-200"
              >

                <div>

                  <p className="text-sm font-medium text-navy-700">
                    {c.caseNumber} — {c.patientName}
                  </p>

                  <p className="text-xs text-surface-500">
                    {c.scanType} &middot; {c.clinicName}
                  </p>

                </div>


                <Link
                  to="/reporting"
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  Review
                </Link>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}