import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import StatsCard from '../../components/ui/StatsCard';
import { Truck, ScrollText, Building2, Users, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const { equipment, auditLogs, clinics, users, cases, recentItems } = useData();

  const lastLogin = localStorage.getItem('healthgrid_last_login');
  const pendingCases = cases.filter((c) => c.status === 'CREATED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome, {currentUser?.name?.split(' ')[0]}</h1>
        <p className="page-subtitle">System administration & oversight</p>
        {lastLogin && <p className="text-[10px] text-surface-400 mt-1">Last login: {new Date(lastLogin).toLocaleString()}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Fleet Vehicles" value={equipment.length} icon={<Truck className="w-5 h-5" />} color="navy" />
        <StatsCard title="Audit Events" value={auditLogs.length} icon={<ScrollText className="w-5 h-5" />} color="purple" />
        <Link to="/clinics">
          <StatsCard title="Clinics" value={clinics.filter((c) => c.status === 'active').length} icon={<Building2 className="w-5 h-5" />} color="emerald" />
        </Link>
        <StatsCard title="Users" value={users.length} icon={<Users className="w-5 h-5" />} color="amber" />
      </div>

      {/* Pending Cases Alert */}
      {pendingCases.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">{pendingCases.length} cases pending scheduling</p>
              <p className="text-xs text-amber-600">These cases require AI Scheduler assignment.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/track-status" className="btn-secondary text-xs">Track Status</Link>
            <Link to="/ai-scheduler" className="btn-primary text-xs">Open Scheduler</Link>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Activity</h2>
          <Link to="/audit-logs" className="text-sm text-navy-600 hover:text-navy-700 font-medium">View all &rarr;</Link>
        </div>
        <div className="space-y-2">
          {auditLogs.slice(0, 6).map((log) => (
            <div key={log.id} className="flex items-center gap-3 p-3 bg-surface-100 rounded-lg border border-surface-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-700 truncate">{log.details}</p>
                <p className="text-xs text-surface-500">{log.userName} &middot; {log.action}</p>
              </div>
              <span className="text-[10px] text-surface-400 flex-shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Viewed */}
      {recentItems.length > 0 && (
        <div className="card">
          <h2 className="section-title mb-4">Recently Viewed</h2>
          <div className="flex flex-wrap gap-2">
            {recentItems.map((item) => (
              <Link key={item.id} to={item.path} className="px-3 py-1.5 bg-surface-100 border border-surface-200 rounded-lg text-xs text-surface-700 hover:border-navy-300 hover:bg-navy-50 transition-colors">
                {item.title} {item.subtitle && <span className="text-surface-400">— {item.subtitle}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
