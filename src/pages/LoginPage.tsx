import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockUsers } from '../services/mockData';
import { isDemoMode } from '../services/firebase';
import type { UserRole } from '../types';
import { SYSTEM_VERSION, LAST_UPDATED_DATE } from '../config/systemVersion';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Radio,
  FileText,
  Settings,
  Layers,
  Smartphone,
  Calendar,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  Info,
  ChevronDown,
  User,
  Shield,
  Check,
} from 'lucide-react';

interface RoleCard {
  role: UserRole;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

const roleCards: RoleCard[] = [
  {
    role: 'Medical Officer',
    label: 'Medical Officer',
    sublabel: 'Clinical review and referrals',
    icon: <UserCheck className="w-5 h-5" />,
  },
  {
    role: 'Radiographer',
    label: 'Radiographer',
    sublabel: 'Image acquisition and workflow',
    icon: <Radio className="w-5 h-5" />,
  },
  {
    role: 'Radiologist',
    label: 'Radiologist',
    sublabel: 'Reporting and diagnosis',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    role: 'Administrator',
    label: 'IT Administrator',
    sublabel: 'System and user management',
    icon: <Settings className="w-5 h-5" />,
  },
];

type ForgotStep = 'email' | 'sent';

export default function LoginPage() {
  const { login, loginAsRole, loginAsUser, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim()) { setForgotError('Email address is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) { setForgotError('Please enter a valid email address.'); return; }

    setForgotLoading(true);
    try {
      await sendPasswordReset(forgotEmail.trim());
      setForgotStep('sent');
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Unable to send the reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep('email');
    setForgotEmail(email);
    setForgotError('');
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotError('');
  };

  // Render Forgot Password Modal
  if (showForgot) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 z-50">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
          {/* Modal Header */}
          <div className="bg-[#0B192C] p-6 text-white relative">
            <button
              onClick={closeForgot}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center text-teal-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Password Recovery</h2>
                <p className="text-slate-300 text-xs">HealthGrid IQ Account Support</p>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            {forgotStep === 'email' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-slate-600 text-xs leading-relaxed">Enter your email address and we will send a secure password-reset link.</p>
                {forgotError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{forgotError}</div>}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/30 focus:border-[#064E3B]" placeholder="name@healthgrid.com" required />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={closeForgot} className="btn-secondary flex-1 text-xs py-2.5 font-semibold">Cancel</button>
                  <button type="submit" disabled={forgotLoading} className="bg-[#064E3B] hover:bg-[#023829] text-white font-semibold flex-1 text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
                    {forgotLoading ? 'Processing...' : 'Send Reset Email'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'sent' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="text-sm font-bold text-emerald-900">Check your email</h3>
                  <p className="text-xs text-emerald-700">If an account exists for <strong className="font-mono">{forgotEmail}</strong>, a password-reset link has been sent.</p>
                </div>
                <button onClick={closeForgot} className="bg-[#064E3B] hover:bg-[#023829] text-white font-semibold w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs cursor-pointer">
                  Back to Sign In <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-white font-sans relative">
      {/* ── DEMO ACCOUNTS MODAL ───────────────────────────────────────────── */}
      {showDemoModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setShowDemoModal(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0B192C] px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <User className="w-4 h-4 text-[#10B981]" />
                  <span>Select Demo Account</span>
                </h3>
                <p className="text-slate-300 text-xs mt-0.5">Click any clinical account below to log in instantly without password</p>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Table Content */}
            <div className="p-6">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Clinic / Location</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {[
                      { id: 'mo-001', name: 'Ahmad R.', role: 'Medical Officer', clinic: 'Putrajaya' },
                      { id: 'rad-002', name: 'Lim Mei L.', role: 'Radiographer', clinic: 'Cyberjaya' },
                      { id: 'rad-003', name: 'Kumaran S.', role: 'Radiologist', clinic: 'Bangi' },
                      { id: 'rad-006', name: 'Zainal Ab.', role: 'IT Administrator', clinic: 'Tanjong Karang' },
                      { id: 'rad-008', name: 'Syed Fariq', role: 'Radiographer', clinic: 'Ijok' },
                    ].map((userRow) => (
                      <tr
                        key={userRow.id}
                        onClick={() => { loginAsUser(userRow.id); setShowDemoModal(false); }}
                        className="hover:bg-teal-50/50 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4 flex items-center gap-2.5 font-bold text-slate-900">
                          <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-[#064E3B] group-hover:text-white flex items-center justify-center transition-colors text-slate-500">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span>{userRow.name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">{userRow.role}</td>
                        <td className="py-3 px-4 text-slate-500">{userRow.clinic}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-xs font-bold text-[#064E3B] group-hover:underline flex items-center gap-1 justify-end">
                            Sign In <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDemoModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LEFT PANEL — DARK CORPORATE BRANDING ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] bg-[#0B192C] relative flex-col justify-between p-10 xl:p-12 text-white border-r border-slate-800 h-full overflow-hidden shrink-0">
        
        <div className="relative z-10 space-y-8">
          {/* Dual Brand Logos Container */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-700">
              <img
                src="/assets/theta-logo.png"
                alt="Theta Edge Berhad"
                className="h-8 xl:h-9 w-auto object-contain"
              />
            </div>
            <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-700">
              <img
                src="/assets/healthgrid-logo.jpg"
                alt="HealthGrid IQ Logo"
                className="h-8 xl:h-9 w-auto object-contain rounded"
              />
            </div>
          </div>

          {/* Hero Branding */}
          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              HealthGrid <span className="text-[#10B981]">IQ</span>
            </h1>
            <p className="text-base text-slate-300 font-medium tracking-wide">
              Connected Capacity. Better Care.
            </p>
            <div className="w-10 h-1 bg-[#10B981] rounded-full my-3" />
            <p className="text-sm text-slate-300 leading-relaxed max-w-md font-normal">
              An integrated imaging ecosystem connecting people, data, and technology to improve healthcare outcomes.
            </p>
          </div>

          {/* 4 Feature Items Stack */}
          <div className="space-y-3 max-w-md">
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="p-2 rounded-lg bg-[#042F2C] border border-[#065F56] text-[#10B981] shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">PACS Integration</h4>
                <p className="text-xs text-slate-400 mt-0.5">Store, manage and access images securely.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="p-2 rounded-lg bg-[#042F2C] border border-[#065F56] text-[#10B981] shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Mobile Radiography</h4>
                <p className="text-xs text-slate-400 mt-0.5">Fleet management and remote workflows.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="p-2 rounded-lg bg-[#042F2C] border border-[#065F56] text-[#10B981] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">AI Assisted Scheduling</h4>
                <p className="text-xs text-slate-400 mt-0.5">Intelligent scheduling and resource allocation.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="p-2 rounded-lg bg-[#042F2C] border border-[#065F56] text-[#10B981] shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Digital Reporting</h4>
                <p className="text-xs text-slate-400 mt-0.5">Structured reporting with digital signatures.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Badges & Copyright */}
        <div className="relative z-10 space-y-3 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-3.5 text-xs text-slate-300 font-medium flex-wrap">
            <span className="inline-flex items-center gap-1.5 leading-none">
              <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span>HIPAA Ready</span>
            </span>
            <span className="text-slate-600 font-bold leading-none">&bull;</span>
            <span className="inline-flex items-center gap-1.5 leading-none">
              <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span className="text-emerald-400 font-semibold">PDPA Compliant</span>
            </span>
            <span className="text-slate-600 font-bold leading-none">&bull;</span>
            <span className="inline-flex items-center gap-1.5 leading-none">
              <Shield className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span>ISO 27001</span>
            </span>
          </div>

          <p className="text-xs text-slate-400 font-normal pt-1">
            &copy; 2026 Theta Edge Berhad. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — LIGHT CLINICAL SIGN-IN FORM ──────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-6 lg:p-10 xl:p-12 bg-white h-full overflow-y-auto lg:overflow-hidden">
        
        {/* Top Header Badge Row */}
        <div className="flex items-center justify-between shrink-0">
          <div className="lg:hidden flex items-center gap-2">
            <img src="/assets/theta-logo.png" alt="Theta Edge" className="h-7 w-auto" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDemoModal(true)}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-amber-700" />
              <span>Demo Preset Accounts</span>
            </button>

            <span className="border border-slate-200 bg-white text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[#064E3B]" /> HIPAA Secure
            </span>
          </div>
        </div>

        {/* Form Container */}
        <div className="max-w-md xl:max-w-lg w-full mx-auto space-y-5 my-auto py-2 shrink-0">
          {/* Title Header */}
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sign in</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Access your clinical workspace</p>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/30 focus:border-[#064E3B] transition-all"
                  placeholder="name@healthgrid.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={openForgot}
                  className="text-xs text-[#065F46] hover:underline font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/30 focus:border-[#064E3B] transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#064E3B] focus:ring-[#064E3B] border-slate-300 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                Remember me
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#064E3B] hover:bg-[#023829] text-white font-semibold py-3 rounded-lg text-sm transition-all shadow-sm cursor-pointer"
            >
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              OR QUICK ACCESS WITH ROLE
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* 4 Quick Access Role Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {roleCards.map(({ role, label, sublabel, icon }) => (
              <button
                key={role}
                type="button"
                onClick={() => loginAsRole(role)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-white hover:border-[#10B981] hover:shadow-md transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-[#064E3B] flex items-center justify-center text-[#064E3B] group-hover:text-white transition-colors mb-1.5">
                  {icon}
                </div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-[#064E3B] transition-colors leading-tight">{label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-medium">{sublabel}</p>
              </button>
            ))}
          </div>

          {/* Demo Accounts Action Bar */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-[#064E3B]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Preset Clinical Accounts</p>
                <p className="text-[10px] text-slate-500 font-medium">5 demo users (Putrajaya, Cyberjaya, Bangi...)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDemoModal(true)}
              className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>View List</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Bottom Footer Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 text-slate-400" /> Version {SYSTEM_VERSION}
            </span>
            <span>|</span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Updated: {LAST_UPDATED_DATE}
            </span>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Need another role?</span>
              <button
                type="button"
                onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-bold hover:bg-slate-50 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <span>Switch Workspace</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Quick Switch Dropdown */}
            {showWorkspaceMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 space-y-1">
                {(['Medical Officer', 'Radiographer', 'Radiologist', 'Administrator'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { loginAsRole(r); setShowWorkspaceMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{r}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
