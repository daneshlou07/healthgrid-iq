import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import { Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ScheduleView() {
  const { currentUser } = useAuth();
  const { cases } = useData();

  const myCases = cases
    .filter((c) => c.radiographerId === currentUser?.id)
    .sort((a, b) => (a.scheduledAt || '').localeCompare(b.scheduledAt || ''));

  const groupByDate = (items: typeof myCases) => {
    const groups: Record<string, typeof myCases> = {};
    items.forEach((c) => {
      const date = c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : 'Unscheduled';
      if (!groups[date]) groups[date] = [];
      groups[date].push(c);
    });
    return groups;
  };

  const grouped = groupByDate(myCases);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Schedule</h1>
        <p className="page-subtitle">{myCases.length} appointments across {Object.keys(grouped).length} days</p>
      </div>

      {Object.entries(grouped).map(([date, dateCases]) => (
        <div key={date}>
          <h2 className="text-xs font-semibold text-navy-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> {date}
          </h2>
          <div className="space-y-2">
            {dateCases.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-white border border-surface-300 rounded-lg">
                <div>
                  <Link to={`/case/${c.id}`} className="text-sm font-medium text-navy-700 hover:underline">{c.caseNumber}</Link>
                  <p className="text-xs text-surface-500">{c.patientName} &middot; {c.scanType} &middot; {c.clinicName}</p>
                  {c.scheduledAt && <p className="text-xs text-surface-400 mt-1">{new Date(c.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {myCases.length === 0 && <div className="text-center py-12 text-surface-400 text-sm">No scheduled appointments.</div>}
    </div>
  );
}
