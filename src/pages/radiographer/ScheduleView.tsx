import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { Calendar, Clock, Search, AlertTriangle, LayoutGrid, ListFilter, ChevronLeft, ChevronRight, ArrowRight, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

type ViewMode = 'agenda' | 'timetable';
type FilterTab = 'today' | 'upcoming' | 'unscheduled' | 'critical' | 'all';

const HOURLY_SLOTS = [
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];

function isSameDay(date1Str?: string, date2Str?: string): boolean {
  if (!date1Str || !date2Str) return false;
  const d1 = new Date(date1Str).toISOString().split('T')[0];
  const d2 = new Date(date2Str).toISOString().split('T')[0];
  return d1 === d2;
}

export default function ScheduleView() {
  const { currentUser } = useAuth();
  const { cases } = useData();

  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [filterTab, setFilterTab] = useState<FilterTab>('today');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Radiographer's relevant cases
  const radiographerCases = useMemo(() => {
    if (!currentUser) return [];
    return cases.filter((c) => c.radiographerId === currentUser.id || c.registeredById === currentUser.id);
  }, [cases, currentUser]);

  // Filtered cases for agenda view
  const filteredCases = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const searchLower = search.toLowerCase().trim();

    return radiographerCases
      .filter((c) => {
        // Search match
        const searchMatch =
          !searchLower ||
          c.caseNumber.toLowerCase().includes(searchLower) ||
          c.patientName.toLowerCase().includes(searchLower) ||
          (c.scanType || '').toLowerCase().includes(searchLower) ||
          (c.clinicName || '').toLowerCase().includes(searchLower);

        if (!searchMatch) return false;

        // Filter tab match
        if (filterTab === 'today') {
          return c.scheduledAt && isSameDay(c.scheduledAt, todayStr);
        }
        if (filterTab === 'upcoming') {
          if (!c.scheduledAt) return false;
          const scheduledDay = new Date(c.scheduledAt).toISOString().split('T')[0];
          return scheduledDay > todayStr;
        }
        if (filterTab === 'unscheduled') {
          return !c.scheduledAt || c.status === 'CREATED';
        }
        if (filterTab === 'critical') {
          return c.severity === 'Critical' || c.isCriticalFinding;
        }
        return true; // 'all'
      })
      .sort((a, b) => {
        if (filterTab === 'unscheduled') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (!a.scheduledAt) return 1;
        if (!b.scheduledAt) return -1;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      });
  }, [radiographerCases, filterTab, search]);

  // Tab counts
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = radiographerCases.filter((c) => c.scheduledAt && isSameDay(c.scheduledAt, todayStr)).length;
  const upcomingCount = radiographerCases.filter((c) => c.scheduledAt && new Date(c.scheduledAt).toISOString().split('T')[0] > todayStr).length;
  const unscheduledCount = radiographerCases.filter((c) => !c.scheduledAt || c.status === 'CREATED').length;
  const criticalCount = radiographerCases.filter((c) => c.severity === 'Critical' || c.isCriticalFinding).length;

  // Grouping for Agenda view
  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filteredCases> = {};
    filteredCases.forEach((c) => {
      let dateLabel = 'Unscheduled / Pending Slot';
      if (c.scheduledAt) {
        const d = new Date(c.scheduledAt);
        const dayStr = d.toISOString().split('T')[0];
        if (dayStr === todayStr) {
          dateLabel = `Today (${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })})`;
        } else {
          dateLabel = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push(c);
    });
    return groups;
  }, [filteredCases, todayStr]);

  // Timetable view cases for selectedDate
  const timetableCases = useMemo(() => {
    return radiographerCases.filter((c) => c.scheduledAt && isSameDay(c.scheduledAt, selectedDate));
  }, [radiographerCases, selectedDate]);

  const handleDateShift = (days: number) => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() + days);
    setSelectedDate(curr.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">My Radiography Schedule</h1>
            <span className="px-2 py-0.5 bg-navy-50 text-navy-700 border border-navy-200 font-mono text-[11px] font-bold rounded-md">
              RADIOGRAPHER
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Manage daily scanning appointments, patient slots, and emergency triage workloads.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-surface-100 p-1 border border-surface-300 rounded-xl">
          <button
            onClick={() => setViewMode('agenda')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'agenda'
                ? 'bg-navy-700 text-white shadow-xs'
                : 'text-surface-600 hover:text-navy-900 hover:bg-surface-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Agenda View</span>
          </button>
          <button
            onClick={() => setViewMode('timetable')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'timetable'
                ? 'bg-navy-700 text-white shadow-xs'
                : 'text-surface-600 hover:text-navy-900 hover:bg-surface-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Timetable Grid</span>
          </button>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-surface-300 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search schedule by case #, patient, scan, or clinic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-50 border border-surface-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterTab('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filterTab === 'today'
                ? 'bg-navy-700 text-white'
                : 'bg-surface-100 text-surface-700 hover:bg-surface-200 border border-surface-300'
            }`}
          >
            <span>Today</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${filterTab === 'today' ? 'bg-white/20 text-white' : 'bg-surface-200 text-surface-700'}`}>
              {todayCount}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filterTab === 'upcoming'
                ? 'bg-navy-700 text-white'
                : 'bg-surface-100 text-surface-700 hover:bg-surface-200 border border-surface-300'
            }`}
          >
            <span>Upcoming</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${filterTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-surface-200 text-surface-700'}`}>
              {upcomingCount}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('unscheduled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filterTab === 'unscheduled'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span>Unscheduled</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${filterTab === 'unscheduled' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'}`}>
              {unscheduledCount}
            </span>
          </button>

          {criticalCount > 0 && (
            <button
              onClick={() => setFilterTab('critical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                filterTab === 'critical'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Critical</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${filterTab === 'critical' ? 'bg-white/20 text-white' : 'bg-red-200 text-red-900'}`}>
                {criticalCount}
              </span>
            </button>
          )}

          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              filterTab === 'all'
                ? 'bg-navy-700 text-white'
                : 'bg-surface-100 text-surface-700 hover:bg-surface-200 border border-surface-300'
            }`}
          >
            All ({radiographerCases.length})
          </button>
        </div>
      </div>

      {/* AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <div className="space-y-6">
          {Object.keys(groupedByDate).length === 0 ? (
            <div className="bg-white border border-surface-300 rounded-xl p-12 text-center space-y-2">
              <Calendar className="w-8 h-8 text-surface-400 mx-auto mb-1" />
              <p className="text-sm font-semibold text-navy-800">No appointments found</p>
              <p className="text-xs text-surface-500">There are no appointments matching the selected filter criteria.</p>
            </div>
          ) : (
            Object.entries(groupedByDate).map(([dateGroup, dateCases]) => (
              <div key={dateGroup} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
                  <Calendar className="w-4 h-4 text-navy-600 shrink-0" />
                  <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">{dateGroup}</h2>
                  <span className="text-xs text-surface-500 font-mono">({dateCases.length} case{dateCases.length > 1 ? 's' : ''})</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {dateCases.map((c) => (
                    <div
                      key={c.id}
                      className={`p-4 bg-white border rounded-xl shadow-xs transition-all hover:border-navy-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        c.severity === 'Critical' || c.isCriticalFinding
                          ? 'border-l-4 border-l-red-500 border-surface-300'
                          : 'border-surface-300'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/case/${c.id}`} className="text-sm font-bold text-navy-900 hover:text-navy-700 hover:underline">
                            {c.caseNumber}
                          </Link>
                          {c.severity && <SeverityBadge severity={c.severity} />}
                          <StatusBadge status={c.status} />
                        </div>

                        <p className="text-xs font-semibold text-surface-800">
                          {c.patientName} &middot; <span className="font-mono text-surface-600">MRN: {c.patientId}</span>
                        </p>

                        <div className="flex items-center gap-3 text-xs text-surface-600 flex-wrap">
                          <span className="font-medium text-navy-800">{c.scanType || c.modality}</span>
                          <span>&bull;</span>
                          <span>{c.clinicName || 'Radiology Department'}</span>
                          {c.scheduledAt && (
                            <>
                              <span>&bull;</span>
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-navy-700 bg-navy-50 px-2 py-0.5 rounded border border-navy-200">
                                <Clock className="w-3 h-3 text-navy-600" />
                                {new Date(c.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {c.status === 'SCHEDULED' && (
                          <Link
                            to="/upload-scans"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Scan</span>
                          </Link>
                        )}

                        <Link
                          to={`/case/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 text-surface-800 rounded-lg text-xs font-bold transition-all"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TIMETABLE GRID VIEW */}
      {viewMode === 'timetable' && (
        <div className="space-y-4">
          {/* Date Navigator */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-surface-300 shadow-xs">
            <button
              onClick={() => handleDateShift(-1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 rounded-lg text-xs font-bold text-navy-800 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Day</span>
            </button>

            <div className="flex items-center gap-2 text-center">
              <Calendar className="w-4 h-4 text-navy-700" />
              <span className="text-sm font-bold text-navy-900">
                {new Date(selectedDate).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              {isSameDay(selectedDate, todayStr) && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold rounded border border-emerald-200">
                  TODAY
                </span>
              )}
            </div>

            <button
              onClick={() => handleDateShift(1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 rounded-lg text-xs font-bold text-navy-800 transition-all cursor-pointer"
            >
              <span>Next Day</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Timetable Slots Grid */}
          <div className="bg-white border border-surface-300 rounded-xl overflow-hidden shadow-xs divide-y divide-surface-200">
            {HOURLY_SLOTS.map((slot) => {
              // Find cases scheduled near this hour slot
              const slotCases = timetableCases.filter((c) => {
                if (!c.scheduledAt) return false;
                const timeStr = new Date(c.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const caseHour = new Date(c.scheduledAt).getHours();
                // Compare hour
                let slotHour = parseInt(slot.split(':')[0], 10);
                if (slot.includes('PM') && slotHour !== 12) slotHour += 12;
                if (slot.includes('AM') && slotHour === 12) slotHour = 0;
                return caseHour === slotHour;
              });

              return (
                <div key={slot} className="flex flex-col sm:flex-row items-stretch min-h-[70px]">
                  {/* Hour Label */}
                  <div className="w-28 p-3 bg-surface-50 border-r border-surface-200 flex items-center gap-1.5 text-xs font-mono font-bold text-navy-800 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-navy-600" />
                    <span>{slot}</span>
                  </div>

                  {/* Slot Appointments */}
                  <div className="flex-1 p-3 bg-white flex flex-col justify-center">
                    {slotCases.length === 0 ? (
                      <div className="text-xs text-surface-400 italic">Available scanning slot</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {slotCases.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 bg-navy-50/60 border border-navy-200 rounded-lg flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Link to={`/case/${c.id}`} className="text-xs font-bold text-navy-900 hover:underline truncate">
                                  {c.caseNumber} &middot; {c.patientName}
                                </Link>
                              </div>
                              <p className="text-[11px] text-surface-600 truncate mt-0.5">
                                {c.scanType || c.modality} &bull; {c.clinicName}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <StatusBadge status={c.status} />
                              <Link
                                to={`/case/${c.id}`}
                                className="p-1 bg-white hover:bg-surface-100 border border-surface-300 rounded text-surface-700"
                                title="View details"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
