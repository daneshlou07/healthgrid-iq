import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Users, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { normalizeNric, formatNric } from '../../utils/malaysianNric';

function displayNric(nric: string): string {
  if (!nric) return '—';

  const digits = normalizeNric(nric);
  return digits.length === 12 ? formatNric(digits) : nric;
}

export default function PatientsList() {
  const { currentUser } = useAuth();
  const { patients, cases, getScopedCases } = useData();
  const [search, setSearch] = useState('');
  const scopedCases = getScopedCases ? getScopedCases() : cases;

  const userCenterId = currentUser?.healthcareCenterId || currentUser?.deploymentLocationId;
  const isPlatformOfficer = currentUser?.role === 'Super Admin' || currentUser?.role === 'BEMS Officer';

  const visiblePatients = useMemo(() => {
    if (isPlatformOfficer || !userCenterId) return patients;
    const authorizedPatientIds = new Set(scopedCases.map((c) => c.patientId));
    return patients.filter((p) => {
      const isLocalOrigin = (p.registeredAtCenterId || p.clinicId || p.primaryClinicId) === userCenterId;
      const isReferredPatient = authorizedPatientIds.has(p.id);
      return isLocalOrigin || isReferredPatient;
    });
  }, [patients, scopedCases, userCenterId, isPlatformOfficer]);

  const filtered = visiblePatients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      p.nric.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">Patients</h1>

          <p className="page-subtitle">
            Manage registered patients and their associated cases.
          </p>
        </div>

        {/* Page Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500"
              aria-hidden="true"
            />

            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search patients"
              className="input-field pl-10"
            />
          </div>

          {/* Primary Action */}
          <Link
            to="/patients/register"
            className="btn-primary"
          >
            <Plus
              className="h-4 w-4"
              aria-hidden="true"
            />

            <span>Register Patient</span>
          </Link>
        </div>
      </div>

      {/* Patient Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-surface-300">
                <th
                  scope="col"
                  className="table-header w-[48%]"
                >
                  Patient Name
                </th>

                <th
                  scope="col"
                  className="table-header w-[32%]"
                >
                  IC Number
                </th>

                <th
                  scope="col"
                  className="table-header w-[20%]"
                >
                  Cases
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-surface-200">
              {filtered.map((patient) => {
                const caseCount = scopedCases.filter(
                  (c) => c.patientId === patient.id
                ).length;

                return (
                  <tr
                    key={patient.id}
                    className="transition-colors hover:bg-surface-100/70"
                  >
                    <td className="table-cell">
                      <Link
                        to={`/patient/${patient.id}`}
                        className="font-medium text-surface-900 hover:text-navy-600 hover:underline"
                      >
                        {patient.name}
                      </Link>
                    </td>

                    <td className="table-cell">
                      <span className="font-mono text-[13px] font-normal text-surface-500">
                        {displayNric(patient.nric)}
                      </span>
                    </td>

                    <td className="table-cell">
                      <span className="font-medium text-surface-900">
                        {caseCount}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100">
              <Users
                className="h-5 w-5 text-surface-500"
                aria-hidden="true"
              />
            </div>

            <p className="text-[14px] font-medium leading-5 text-surface-800">
              No patients found
            </p>

            <p className="mt-1 text-[12px] font-normal leading-4 text-surface-500">
              Try adjusting your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}