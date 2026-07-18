import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, User, ShieldCheck } from 'lucide-react';

export default function Onboarding() {
  const { currentUser } = useAuth();

  const checklist = [
    { label: 'Account created', done: true },
    { label: 'Profile information completed', done: true },
    { label: 'Medical license verification', done: true },
    { label: 'Radiology board certification', done: true },
    { label: 'Reporting standards acknowledgement', done: true },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Onboarding Status</h1>
        <p className="page-subtitle">Your profile and credential verification status.</p>
      </div>

      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-navy-700">{currentUser?.name?.charAt(0)}</span>
          </div>
          <div>
            <p className="text-base font-semibold text-navy-800">{currentUser?.name}</p>
            <p className="text-sm text-surface-500 uppercase">{currentUser?.role}</p>
          </div>
        </div>
        <span className="badge-success text-xs font-semibold px-3 py-1">Approved</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-navy-600" />
            <h3 className="text-sm font-semibold text-navy-700">Personal Information</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div><span className="text-xs text-surface-500 uppercase">Full Name</span><p className="text-surface-800 font-medium">{currentUser?.name}</p></div>
            <div><span className="text-xs text-surface-500 uppercase">Email</span><p className="text-surface-800">{currentUser?.email}</p></div>
            <div><span className="text-xs text-surface-500 uppercase">Role</span><p className="text-surface-800 uppercase font-medium">{currentUser?.role}</p></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-navy-700">Credentials</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div><span className="text-xs text-surface-500 uppercase">License Number</span><p className="text-surface-800 font-medium font-mono">RADIO-2026-001</p></div>
            <div><span className="text-xs text-surface-500 uppercase">Credential Status</span><p><span className="badge-success">Verified</span></p></div>
            <div><span className="text-xs text-surface-500 uppercase">Specialisation</span><p className="text-surface-800">{currentUser?.specialty || 'Diagnostic Radiology'}</p></div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-navy-700 mb-4">Onboarding Checklist</h3>
        <div className="space-y-3">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <CheckCircle className={`w-5 h-5 ${item.done ? 'text-emerald-500' : 'text-surface-300'}`} />
              <span className={`text-sm ${item.done ? 'text-surface-700' : 'text-surface-400'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
