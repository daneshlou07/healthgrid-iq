import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { ArrowLeft, User, FolderOpen, FileText, MapPin, Phone, Mail } from 'lucide-react';

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients, cases, reports, addRecentItem } = useData();

  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return <div className="text-center py-20 text-surface-400">Patient not found.</div>;

  const patientCases = cases.filter((c) => c.patientId === patientId);
  const patientReports = reports.filter((r) => patientCases.some((c) => c.id === r.caseId));

  // Track recently viewed
  React.useEffect(() => {
    addRecentItem({ id: patient.id, type: 'patient', title: patient.name, subtitle: patient.mrn, path: `/patient/${patient.id}` });
  }, [patient.id]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-surface-500" />
        </button>
        <div>
          <h1 className="page-title">{patient.name}</h1>
          <p className="page-subtitle">{patient.mrn} &middot; {patient.nric}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-navy-700">{patient.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-base font-semibold text-navy-800">{patient.name}</p>
                <p className="text-xs text-surface-500">{patient.gender} &middot; DOB: {patient.dob}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2"><Phone className="w-3.5 h-3.5 text-surface-400 mt-0.5" /><span className="text-surface-700">{patient.phone}</span></div>
              {patient.email && <div className="flex items-start gap-2"><Mail className="w-3.5 h-3.5 text-surface-400 mt-0.5" /><span className="text-surface-700">{patient.email}</span></div>}
              <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-surface-400 mt-0.5" /><span className="text-surface-700 text-xs">{patient.address}</span></div>
            </div>
          </div>

          {/* Medical History */}
          <div className="card">
            <h2 className="section-title mb-3">Medical History</h2>
            {patient.medicalHistory.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {patient.medicalHistory.map((h) => <span key={h} className="badge-info text-[10px]">{h}</span>)}
              </div>
            ) : <p className="text-sm text-surface-400">No medical history recorded.</p>}
          </div>

          {/* Emergency Contact */}
          {patient.emergencyContact && (
            <div className="card">
              <h2 className="section-title mb-3">Emergency Contact</h2>
              <p className="text-sm text-surface-700">{patient.emergencyContact}</p>
            </div>
          )}
        </div>

        {/* Cases & Reports */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cases */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2"><FolderOpen className="w-4 h-4 text-navy-600" /> Cases ({patientCases.length})</h2>
            </div>
            {patientCases.length === 0 ? <p className="text-sm text-surface-400">No cases for this patient.</p> : (
              <div className="space-y-2">
                {patientCases.map((c) => (
                  <Link key={c.id} to={`/case/${c.id}`} className="flex items-center justify-between p-3 bg-surface-100 rounded-lg border border-surface-200 hover:border-navy-300 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-navy-700 font-mono">{c.caseNumber}</p>
                      <p className="text-xs text-surface-500">{c.scanType} &middot; {c.disease || ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={c.severity} />
                      <StatusBadge status={c.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Reports */}
          <div className="card">
            <h2 className="section-title flex items-center gap-2 mb-4"><FileText className="w-4 h-4 text-navy-600" /> Reports ({patientReports.length})</h2>
            {patientReports.length === 0 ? <p className="text-sm text-surface-400">No reports available.</p> : (
              <div className="space-y-2">
                {patientReports.map((r) => (
                  <div key={r.id} className="p-3 bg-surface-100 rounded-lg border border-surface-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-navy-700 font-mono">{r.caseNumber}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-surface-600 line-clamp-2">{r.impression}</p>
                    <p className="text-[10px] text-surface-400 mt-1">By {r.radiologistName} &middot; {r.signedAt ? new Date(r.signedAt).toLocaleDateString() : '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
