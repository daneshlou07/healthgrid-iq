import React, { useEffect, useState } from 'react';
import { getMobilePacsVans, getClinics, getCases } from '../../services/dataService';
import type { MobilePacsVan, Clinic, Case } from '../../types';
import { Brain, Lightbulb, TrendingUp, MapPin } from 'lucide-react';

interface Recommendation { id: string; priority: 'high' | 'medium' | 'low'; title: string; description: string; action: string; impact: string; }

export default function AIRecommendations() {
  const [vans, setVans] = useState<MobilePacsVan[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    Promise.all([getMobilePacsVans(), getClinics(), getCases()]).then(([v, c, ca]) => {
      setVans(v); setClinics(c); setCases(ca);
      setRecommendations(generate(v, c, ca));
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">AI Recommendation Engine</h1>
        <p className="page-subtitle">Deployment recommendations based on regional demand</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-amber-500" /><p className="text-xs font-medium text-surface-500">Backlog</p></div><p className="text-2xl font-bold text-navy-800">{cases.filter((c) => c.status === 'CREATED').length}</p><p className="text-xs text-surface-500">Unscheduled cases</p></div>
        <div className="card"><div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-navy-500" /><p className="text-xs font-medium text-surface-500">Utilization</p></div><p className="text-2xl font-bold text-navy-800">{vans.filter((v) => v.status === 'deployed').length}/{vans.length}</p><p className="text-xs text-surface-500">Vans deployed</p></div>
        <div className="card"><div className="flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-emerald-500" /><p className="text-xs font-medium text-surface-500">Insights</p></div><p className="text-2xl font-bold text-navy-800">{recommendations.length}</p><p className="text-xs text-surface-500">Recommendations</p></div>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => {
          const border = rec.priority === 'high' ? 'border-l-red-500' : rec.priority === 'medium' ? 'border-l-amber-500' : 'border-l-blue-500';
          const badge = rec.priority === 'high' ? 'badge-error' : rec.priority === 'medium' ? 'badge-warning' : 'badge-info';
          return (
            <div key={rec.id} className={`card border-l-4 ${border}`}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-navy-700">{rec.title}</h3>
                <span className={badge}>{rec.priority}</span>
              </div>
              <p className="text-sm text-surface-600 mb-3">{rec.description}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 bg-surface-100 rounded-lg border border-surface-200"><span className="text-surface-500">Action:</span><p className="text-surface-700 mt-0.5">{rec.action}</p></div>
                <div className="p-2 bg-surface-100 rounded-lg border border-surface-200"><span className="text-surface-500">Impact:</span><p className="text-emerald-600 mt-0.5">{rec.impact}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function generate(vans: MobilePacsVan[], clinics: Clinic[], cases: Case[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const pending = cases.filter((c) => c.status === 'CREATED');
  const idle = vans.filter((v) => v.status === 'idle');

  if (idle.length > 0 && pending.length > 0) recs.push({ id: 'r1', priority: 'high', title: 'Deploy Idle Van', description: `${idle[0].name} is idle. ${pending.length} case(s) unscheduled.`, action: `Deploy ${idle[0].name} to highest-demand clinic`, impact: `Reduce wait by ~${Math.min(pending.length * 2, 10)} days` });

  const clinicCount: Record<string, number> = {};
  pending.forEach((c) => { if (c.clinicId) clinicCount[c.clinicId] = (clinicCount[c.clinicId] || 0) + 1; });
  const busiest = Object.entries(clinicCount).sort((a, b) => b[1] - a[1])[0];
  if (busiest) { const clinic = clinics.find((c) => c.id === busiest[0]); recs.push({ id: 'r2', priority: 'medium', title: `Increase Coverage: ${clinic?.name || 'Clinic'}`, description: `${busiest[1]} pending cases at this location.`, action: 'Assign additional radiographer or extend hours', impact: 'Clear backlog in 3-5 days' }); }

  if (vans.filter((v) => v.status === 'deployed').length >= 2) recs.push({ id: 'r3', priority: 'low', title: 'Optimize Distribution', description: 'Multiple vans may have overlapping coverage.', action: 'Review demand heatmaps and redistribute', impact: 'Improve coverage equity ~20%' });

  if (recs.length === 0) recs.push({ id: 'r0', priority: 'low', title: 'System Normal', description: 'Fleet optimally distributed.', action: 'Monitor', impact: 'Maintain throughput' });
  return recs;
}
