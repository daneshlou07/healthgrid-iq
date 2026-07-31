import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import TabFilter from '../../components/ui/TabFilter';
import BulkActionBar from '../../components/ui/BulkActionBar';
import { Search, Plus, X, ChevronLeft, ChevronRight, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCaseIndication } from '../../utils/caseDisplay';
import { exportToCSV } from '../../utils/exportUtils';
import { useToast } from '../../components/ux/Toast';

const STATUS_GROUPS: Record<string, string[] | null> = {
  'All Cases': null,
  'Pending Triage': ['CREATED', 'SCHEDULED'],
  'In Progress': ['SCANNED', 'REPORTED'],
  'Completed': ['FINALIZED'],
};

const TABS = ['All Cases', 'Pending Triage', 'In Progress', 'Completed'];

function getInitials(name: string): string {
  if (!name) return 'PT';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-purple-100 text-purple-700 border-purple-200',
  ];
  let charSum = 0;
  for (let i = 0; i < name.length; i++) charSum += name.charCodeAt(i);
  return colors[charSum % colors.length];
}

export default function AllCases() {
  const { cases } = useData();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('All Cases');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = cases.filter((c) => {
    const allowedStatuses = STATUS_GROUPS[activeTab];
    const statusMatch = allowedStatuses === null || allowedStatuses.includes(c.status);

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

  // Calculate tab counts
  const counts: Record<string, number> = {};
  TABS.forEach((t) => {
    const statuses = STATUS_GROUPS[t];
    counts[t] = statuses === null ? cases.length : cases.filter((c) => statuses.includes(c.status)).length;
  });

  // Pagination bounds
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCases = filtered.slice(startIndex, startIndex + pageSize);

  const isAllSelected = paginatedCases.length > 0 && paginatedCases.every((c) => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedCases.some((c) => c.id === id)));
    } else {
      const pageIds = paginatedCases.map((c) => c.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkExport = () => {
    const selectedCases = cases.filter((c) => selectedIds.includes(c.id));
    exportToCSV(selectedCases, `Cases_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${selectedCases.length} cases to CSV`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Cases Queue</h1>
            <span className="px-2 py-0.5 bg-navy-50 text-navy-700 border border-navy-200/80 font-mono text-[11px] font-bold rounded-md">
              MO QUEUE
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            {cases.length} referral cases &middot; Review incoming clinical cases, manage status, and access diagnostic records.
          </p>
        </div>

        <div>
          <Link
            to="/cases/new"
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Case</span>
          </Link>
        </div>
      </div>

      {/* 2. Unified Toolbar (Tab Filter + Search Bar) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <TabFilter
          tabs={TABS}
          active={activeTab}
          onChange={(t) => {
            setActiveTab(t);
            setCurrentPage(1);
          }}
          counts={counts}
        />

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Filter queue by case #, patient, symptom..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-surface-300 rounded-lg pl-9 pr-8 py-1.5 text-xs text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Clinical Data Table (Gmail Soft Card Style) */}
      <div className="bg-white border border-surface-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50/80 border-b border-surface-200/80 text-[11px] font-semibold text-surface-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-navy-600 rounded border-surface-300 focus:ring-navy-200 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Case #</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Indication / Symptom</th>
                <th className="py-3 px-4">Modality</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-xs text-surface-700">
              {paginatedCases.map((c) => {
                const isSelected = selectedIds.includes(c.id);
                const indication = getCaseIndication(c);
                const avatarStyle = getAvatarColor(c.patientName);
                const initials = getInitials(c.patientName);

                return (
                  <tr
                    key={c.id}
                    className={`transition-colors hover:bg-[#F2F6FC] ${
                      isSelected ? 'bg-[#E8F0FE]' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 text-navy-600 rounded border-surface-300 focus:ring-navy-200 cursor-pointer"
                      />
                    </td>

                    {/* Case # */}
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/case/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-navy-800 bg-surface-100 hover:bg-navy-100/70 hover:text-navy-900 px-2.5 py-1 rounded-md transition-colors"
                      >
                        {c.caseNumber}
                      </Link>
                    </td>

                    {/* Patient info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${avatarStyle}`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/patient/${c.patientId}`}
                            className="font-semibold text-surface-900 hover:text-navy-700 hover:underline block truncate"
                          >
                            {c.patientName}
                          </Link>
                          <span className="text-[10px] text-surface-400 block font-medium">
                            MRN: {c.patientId ? c.patientId.slice(0, 8) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Indication / Symptom */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="truncate text-surface-700 font-medium" title={indication}>
                        {indication || '—'}
                      </div>
                      {c.bodyRegion && (
                        <span className="text-[10px] text-surface-400 block mt-0.5">
                          Region: {c.bodyRegion}
                        </span>
                      )}
                    </td>

                    {/* Modality */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-100 text-surface-700 border border-surface-200 text-[11px] font-medium">
                        {c.scanType}
                      </span>
                    </td>

                    {/* Assigned To */}
                    <td className="py-3.5 px-4">
                      {c.radiographerName ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[9px] flex items-center justify-center">
                            {getInitials(c.radiographerName)}
                          </div>
                          <span className="text-surface-700 font-medium text-[11px]">
                            {c.radiographerName}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Severity */}
                    <td className="py-3.5 px-4">
                      <SeverityBadge severity={c.severity} />
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge
                        status={c.status}
                        timestamp={c.finalizedAt || c.scannedAt || c.scheduledAt || c.createdAt}
                      />
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-4 text-surface-500 text-[11px] whitespace-nowrap">
                      <div className="font-medium text-surface-800">
                        {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-surface-400 font-medium">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Action Column */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/case/${c.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-600 hover:text-navy-800 bg-surface-100 hover:bg-surface-200 px-2.5 py-1 rounded-md transition-colors border border-surface-200"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
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
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-surface-100 text-surface-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-surface-700">No matching referral cases found</p>
            <p className="text-xs text-surface-400 mt-1">
              Try adjusting your active filter or search keywords.
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-3 text-xs font-semibold text-navy-600 hover:text-navy-800 underline"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-surface-50 border-t border-surface-200 text-xs text-surface-600">
            <div>
              Showing <span className="font-semibold text-surface-800">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-surface-800">
                {Math.min(startIndex + pageSize, totalItems)}
              </span>{' '}
              of <span className="font-semibold text-surface-800">{totalItems}</span> cases
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-surface-500">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-surface-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1 rounded border border-surface-300 bg-white hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="p-1 rounded border border-surface-300 bg-white hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onBulkExport={handleBulkExport}
      />
    </div>
  );
}
