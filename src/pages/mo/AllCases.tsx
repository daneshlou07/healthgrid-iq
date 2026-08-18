import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import TabFilter from '../../components/ui/TabFilter';
import BulkActionBar from '../../components/ui/BulkActionBar';
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCaseIndication } from '../../utils/caseDisplay';
import { exportToCSV } from '../../utils/exportUtils';
import { useToast } from '../../components/ux/Toast';

const STATUS_GROUPS: Record<string, string[] | null> = {
  'All Cases': null,
  'Pending Triage': ['CREATED', 'SCHEDULED'],
  'In Progress': ['SCANNED', 'REPORTED'],
  Completed: ['FINALIZED'],
};

const TABS = [
  'All Cases',
  'Pending Triage',
  'In Progress',
  'Completed',
];

function getInitials(name: string): string {
  if (!name) return 'PT';

  const parts = name.trim().split(' ');

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (
    parts[0][0] + parts[parts.length - 1][0]
  ).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-surface-100 text-surface-700 border-surface-300',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-teal-50 text-teal-700 border-teal-200',
  ];

  let charSum = 0;

  for (let i = 0; i < name.length; i++) {
    charSum += name.charCodeAt(i);
  }

  return colors[charSum % colors.length];
}

export default function AllCases() {
  const { cases } = useData();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('All Cases');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = cases.filter((c) => {
    const allowedStatuses = STATUS_GROUPS[activeTab];

    const statusMatch =
      allowedStatuses === null ||
      allowedStatuses.includes(c.status);

    const searchLower = search.toLowerCase().trim();

    const searchMatch =
      !searchLower ||
      c.caseNumber.toLowerCase().includes(searchLower) ||
      c.patientName.toLowerCase().includes(searchLower) ||
      getCaseIndication(c).toLowerCase().includes(searchLower) ||
      (c.bodyRegion || '').toLowerCase().includes(searchLower) ||
      (c.scanType || '').toLowerCase().includes(searchLower);

    return statusMatch && searchMatch;
  });

  const counts: Record<string, number> = {};

  TABS.forEach((tab) => {
    const statuses = STATUS_GROUPS[tab];

    counts[tab] =
      statuses === null
        ? cases.length
        : cases.filter((c) => statuses.includes(c.status)).length;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;

  const paginatedCases = filtered.slice(
    startIndex,
    startIndex + pageSize
  );

  const isAllSelected =
    paginatedCases.length > 0 &&
    paginatedCases.every((c) => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) =>
        prev.filter(
          (id) =>
            !paginatedCases.some((c) => c.id === id)
        )
      );
    } else {
      const pageIds = paginatedCases.map((c) => c.id);

      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...pageIds]))
      );
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const handleBulkExport = () => {
    const selectedCases = cases.filter((c) =>
      selectedIds.includes(c.id)
    );

    exportToCSV(
      selectedCases,
      `Cases_Export_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );

    toast.success(
      `Exported ${selectedCases.length} cases to CSV`
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">Cases Queue</h1>

          <p className="page-subtitle">
            {cases.length} referral cases · Review incoming clinical
            cases, manage status, and access diagnostic records.
          </p>
        </div>

        <Link
          to="/cases/new"
          className="btn-primary"
        >
          <Plus
            className="h-4 w-4"
            aria-hidden="true"
          />

          <span>Register New Case</span>
        </Link>
      </div>

      {/* Queue Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TabFilter
          tabs={TABS}
          active={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setCurrentPage(1);
          }}
          counts={counts}
        />

        <div className="relative w-full lg:w-72">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500"
            aria-hidden="true"
          />

          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search cases"
            className="input-field pl-10 pr-10"
          />

          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 transition-colors hover:text-surface-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cases Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="table-header w-12"
                >
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all cases"
                    className="table-checkbox"
                  />
                </th>

                <th scope="col" className="table-header">
                  Case #
                </th>

                <th scope="col" className="table-header">
                  Patient
                </th>

                <th scope="col" className="table-header">
                  Indication / Symptom
                </th>

                <th scope="col" className="table-header">
                  Modality
                </th>

                <th scope="col" className="table-header">
                  Assigned To
                </th>

                <th scope="col" className="table-header">
                  Severity
                </th>

                <th scope="col" className="table-header">
                  Status
                </th>

                <th scope="col" className="table-header">
                  Date & Time
                </th>

                <th
                  scope="col"
                  className="table-header text-right"
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-surface-200">
              {paginatedCases.map((c) => {
                const isSelected = selectedIds.includes(c.id);
                const indication = getCaseIndication(c);
                const avatarStyle = getAvatarColor(c.patientName);
                const initials = getInitials(c.patientName);

                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${isSelected
                        ? 'bg-[#F0F7F5]'
                        : 'hover:bg-surface-100/70'
                      }`}
                  >
                    {/* Selection */}
                    <td className="table-cell-dense">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(c.id)}
                        aria-label={`Select ${c.caseNumber}`}
                        className="table-checkbox"
                      />
                    </td>

                    {/* Case Number */}
                    <td className="table-cell-dense whitespace-nowrap">
                      <Link
                        to={`/case/${c.id}`}
                        className="font-medium text-navy-600 transition-colors hover:text-navy-700 hover:underline"
                      >
                        {c.caseNumber}
                      </Link>
                    </td>

                    {/* Patient */}
                    <td className="table-cell-dense whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${avatarStyle}`}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0">
                          <Link
                            to={`/patient/${c.patientId}`}
                            className="block truncate font-medium text-surface-900 transition-colors hover:text-navy-600 hover:underline"
                          >
                            {c.patientName}
                          </Link>

                          <span className="mt-0.5 block text-[11px] font-normal leading-4 text-surface-500">
                            MRN: {c.patientId
                              ? c.patientId.slice(0, 8)
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Indication */}
                    <td className="table-cell-dense max-w-[220px]">
                      <div
                        className="truncate font-normal text-surface-700"
                        title={indication}
                      >
                        {indication || '—'}
                      </div>

                      {c.bodyRegion && (
                        <span className="mt-0.5 block truncate text-[11px] leading-4 text-surface-500">
                          Region: {c.bodyRegion}
                        </span>
                      )}
                    </td>

                    {/* Modality */}
                    <td className="table-cell-dense whitespace-nowrap">
                      <span
                        className="inline-flex max-w-[160px] truncate rounded-md bg-surface-100 px-2.5 py-1 text-[12px] font-medium text-surface-700"
                        title={c.scanType}
                      >
                        {c.scanType}
                      </span>
                    </td>

                    {/* Assigned To */}
                    <td className="table-cell-dense whitespace-nowrap">
                      {c.radiographerName ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                            {getInitials(c.radiographerName)}
                          </div>

                          <span className="font-normal text-surface-700">
                            {c.radiographerName}
                          </span>
                        </div>
                      ) : (
                        <span className="badge-warning">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Severity */}
                    <td className="table-cell-dense whitespace-nowrap">
                      <SeverityBadge severity={c.severity} />
                    </td>

                    {/* Status */}
                    <td className="table-cell-dense whitespace-nowrap">
                      <StatusBadge
                        status={c.status}
                        timestamp={
                          c.finalizedAt ||
                          c.scannedAt ||
                          c.scheduledAt ||
                          c.createdAt
                        }
                      />
                    </td>

                    {/* Date */}
                    <td className="table-cell-dense whitespace-nowrap">
                      <div className="font-normal text-surface-800">
                        {new Date(
                          c.createdAt
                        ).toLocaleDateString([], {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                        })}
                      </div>

                      <div className="mt-0.5 text-[11px] leading-4 text-surface-500">
                        {new Date(
                          c.createdAt
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="table-cell-dense whitespace-nowrap text-right">
                      <Link
                        to={`/case/${c.id}`}
                        className="table-action"
                      >
                        <span>View</span>

                        <ArrowRight
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </Link>
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
              <FileText
                className="h-5 w-5 text-surface-500"
                aria-hidden="true"
              />
            </div>

            <p className="text-[14px] font-medium leading-5 text-surface-800">
              No matching referral cases found
            </p>

            <p className="mt-1 text-[12px] font-normal leading-4 text-surface-500">
              Try adjusting your active filter or search keywords.
            </p>

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCurrentPage(1);
                }}
                className="mt-3 text-[12px] font-medium text-navy-600 underline hover:text-navy-800"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-surface-200 bg-surface-50 px-4 py-3 text-[12px] text-surface-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Showing{' '}
              <span className="font-medium text-surface-800">
                {startIndex + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium text-surface-800">
                {Math.min(
                  startIndex + pageSize,
                  totalItems
                )}
              </span>{' '}
              of{' '}
              <span className="font-medium text-surface-800">
                {totalItems}
              </span>{' '}
              cases
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-surface-500">
                  Rows per page:
                </span>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 rounded-lg border border-surface-300 bg-white px-2 text-[12px] text-surface-700 focus:border-[#0F4C42] focus:outline-none focus:ring-2 focus:ring-[#0F4C42]/15"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(page - 1, 1)
                    )
                  }
                  aria-label="Previous page"
                  className="pagination-button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="min-w-[48px] text-center font-medium text-surface-700">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(page + 1, totalPages)
                    )
                  }
                  aria-label="Next page"
                  className="pagination-button"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onBulkExport={handleBulkExport}
      />
    </div>
  );
}