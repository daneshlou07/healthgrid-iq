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
      <div className="h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Modal Header */}
          <div className="bg-[#0B192C] p-5 text-white relative">
            <button
              onClick={closeForgot}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Password Recovery</h2>
                <p className="text-slate-300 text-xs">HealthGrid IQ Account Support</p>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-5">
            {forgotStep === 'email' && (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                <p className="text-slate-500 text-xs">Enter your email address and we will send a secure password-reset link.</p>
                {forgotError && <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{forgotError}</div>}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="input-field pl-9 text-xs py-2" placeholder="name@healthgrid.com" required />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button type="button" onClick={closeForgot} className="btn-secondary flex-1 text-xs py-2">Cancel</button>
                  <button type="submit" disabled={forgotLoading} className="bg-[#064E3B] hover:bg-[#023829] text-white font-semibold flex-1 text-xs py-2 rounded-lg flex items-center justify-center gap-2">
                    {forgotLoading ? 'Processing...' : 'Send Reset Email'} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'sent' && (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1.5">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                  <h3 className="text-xs font-semibold text-emerald-900">Check your email</h3>
                  <p className="text-xs text-emerald-700">If an account exists for <strong className="font-mono">{forgotEmail}</strong>, a password-reset link has been sent.</p>
                </div>
                <button onClick={closeForgot} className="bg-[#064E3B] hover:bg-[#023829] text-white font-semibold w-full py-2 rounded-lg flex items-center justify-center gap-2 text-xs">
                  Back to Sign In <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-white font-sans">
      {/* ── LEFT PANEL — DARK CORPORATE BRANDING ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[40%] bg-[#0B192C] relative flex-col justify-between p-8 xl:p-10 text-white border-r border-slate-800 h-full overflow-hidden">
        
        <div className="relative z-10 space-y-6">
          {/* Theta Edge Logo Container */}
          <div className="bg-white rounded-xl p-2.5 inline-block shadow-xs">
            <img
              src="/assets/theta-logo.png"
              alt="Theta Edge Berhad — Technology & Telecommunication"
              className="h-7 xl:h-8 w-auto object-contain"
            />
          </div>

          {/* Hero Branding */}
          <div className="space-y-2">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              HealthGrid <span className="text-[#10B981]">IQ</span>
            </h1>
            <p className="text-sm xl:text-base text-slate-300 font-medium tracking-wide">
              Clinical Imaging Platform
            </p>
            <div className="w-8 h-0.5 bg-[#10B981] rounded-full my-2.5" />
            <p className="text-xs xl:text-sm text-slate-300 leading-relaxed max-w-sm font-normal">
              An integrated imaging ecosystem connecting people, data, and technology to improve healthcare outcomes.
            </p>
          </div>

          {/* 4 Feature Items Stack */}
          <div className="space-y-2.5 max-w-sm">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="p-1.5 rounded-lg bg-[#042F2C] border border-[#065F56] text-[#10B981] shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">PACS Integration</h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Store, manage and access images securely.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="p-1.5 rounded-lg bg-[#042F2C] border border-[#065F56] text-[#10B981] shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Mobile Radiography</h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Fleet management and remote workflows.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="p-1.5 rounded-lg bg-[#042F2C] border border-[#065F56] text-[#10B981] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">AI Assisted Scheduling</h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Intelligent scheduling and resource allocation.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="p-1.5 rounded-lg bg-[#042F2C] border border-[#065F56] text-[#10B981] shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Digital Reporting</h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Structured reporting with digital signatures.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Badges & Copyright */}
        <div className="relative z-10 space-y-2.5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-300" /> HIPAA Ready
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-[#10B981]" /> PDPA Compliant
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-slate-300" /> ISO 27001
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            &copy; 2026 Theta Edge Berhad. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — LIGHT CLINICAL SIGN-IN FORM ──────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-5 lg:p-8 xl:p-10 bg-white h-full overflow-y-auto lg:overflow-hidden">
        
        {/* Top Header Badge Row */}
        <div className="flex items-center justify-between shrink-0 mb-2">
          <div className="lg:hidden flex items-center gap-2">
            <img src="/assets/theta-logo.png" alt="Theta Edge" className="h-6 w-auto" />
          </div>
          <div className="ml-auto">
            <span className="border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#064E3B]" /> HIPAA Secure
            </span>
          </div>
        </div>

        {/* Form Container */}
        <div className="max-w-md xl:max-w-lg w-full mx-auto space-y-3.5 my-auto py-1 shrink-0">
          {/* Title Header */}
          <div>
            <h2 className="text-2xl xl:text-3xl font-extrabold text-slate-900 tracking-tight">Sign in</h2>
            <p className="text-slate-500 text-xs xl:text-sm font-medium mt-0.5">Access your clinical workspace</p>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/30 focus:border-[#064E3B] transition-all"
                  placeholder="name@healthgrid.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={openForgot}
                  className="text-xs text-[#065F46] hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/30 focus:border-[#064E3B] transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox (Default Unchecked) */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#064E3B] focus:ring-[#064E3B] border-slate-300 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                Remember me
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#064E3B] hover:bg-[#023829] text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-xs cursor-pointer"
            >
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 py-0.5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              OR QUICK ACCESS WITH ROLE
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* 4 Quick Access Role Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {roleCards.map(({ role, label, sublabel, icon }) => (
              <button
                key={role}
                type="button"
                onClick={() => loginAsRole(role)}
                className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:border-[#10B981] hover:shadow-xs transition-all text-center group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-[#064E3B] flex items-center justify-center text-[#064E3B] group-hover:text-white transition-colors mb-1">
                  {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
                </div>
                <p className="text-[11px] font-bold text-slate-900 group-hover:text-[#064E3B] transition-colors leading-tight">{label}</p>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight font-medium line-clamp-1">{sublabel}</p>
              </button>
            ))}
          </div>

          {/* Demo Accounts Table Container */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50/70 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-900">Demo Accounts</span>
              <span className="bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[9px] font-bold px-2 py-0.5 rounded-full">
                No password needed
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-1.5 px-3">Name</th>
                    <th className="py-1.5 px-3">Role</th>
                    <th className="py-1.5 px-3">Clinic / Location</th>
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
                      onClick={() => loginAsUser(userRow.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-1.5 px-3 flex items-center gap-1.5 font-semibold text-slate-900 text-[11px]">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{userRow.name}</span>
                      </td>
                      <td className="py-1.5 px-3 text-slate-600 text-[11px]">{userRow.role}</td>
                      <td className="py-1.5 px-3 text-slate-500 text-[11px]">{userRow.clinic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Footer Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2.5 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <Info className="w-3 h-3 text-slate-400" /> Version {SYSTEM_VERSION}
            </span>
            <span>|</span>
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3 h-3 text-slate-400" /> Updated: {LAST_UPDATED_DATE}
            </span>
          </div>

          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 font-medium">Need another role?</span>
              <button
                type="button"
                onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                className="border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-700 font-bold hover:bg-slate-50 flex items-center gap-1 shadow-xs transition-colors"
              >
                <span>Switch Workspace</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            {/* Quick Switch Dropdown */}
            {showWorkspaceMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 space-y-0.5">
                {(['Medical Officer', 'Radiographer', 'Radiologist', 'Administrator'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { loginAsRole(r); setShowWorkspaceMenu(false); }}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-between"
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
