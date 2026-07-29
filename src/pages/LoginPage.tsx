import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockUsers } from '../services/mockData';
import type { UserRole } from '../types';
import {
  Shield,
  Brain,
  Heart,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  UserCheck,
  Building2,
  Radio,
  FileText,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

interface RoleCard {
  role: UserRole;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

const roleCards: RoleCard[] = [
  {
    role: 'Radiology Department',
    label: 'Dept. Staff',
    sublabel: 'Patient Reg & Intake',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    role: 'Radiographer',
    label: 'Radiographer',
    sublabel: 'PACS Van & Scans',
    icon: <Radio className="w-5 h-5" />,
  },
  {
    role: 'Radiologist',
    label: 'Radiologist',
    sublabel: 'AI & Diagnostics',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    role: 'Administrator',
    label: 'System Admin',
    sublabel: 'Full Governance',
    icon: <Shield className="w-5 h-5" />,
  },
];

// Simulated password reset service
const passwordResetService = {
  validateEmail: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  accountExists: (email: string): boolean => mockUsers.some((u) => u.email === email),
  generateToken: (): string => Math.random().toString(36).substring(2, 10),
  sendResetEmail: async (email: string, token: string): Promise<void> => {
    await new Promise((r) => setTimeout(r, 800));
    console.log(`[SIMULATED] Reset link sent to ${email} with token: ${token}`);
  },
  validateToken: (token: string): boolean => Boolean(token && token.length >= 6),
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await new Promise((r) => setTimeout(r, 500));
    console.log(`[SIMULATED] Password reset with token: ${token}`);
  },
};

type ForgotStep = 'email' | 'sent' | 'reset' | 'success';

export default function LoginPage() {
  const { login, loginAsRole, loginAsUser } = useAuth();
  const [email, setEmail] = useState('daneshlou05@gmail.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

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
    if (!passwordResetService.validateEmail(forgotEmail)) { setForgotError('Please enter a valid email address.'); return; }

    setForgotLoading(true);
    const token = passwordResetService.generateToken();
    setResetToken(token);
    await passwordResetService.sendResetEmail(forgotEmail, token);
    setForgotLoading(false);
    setForgotStep('sent');
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (newPassword.length < 8) { setForgotError('Password must be at least 8 characters long.'); return; }
    if (newPassword !== confirmPassword) { setForgotError('Passwords do not match.'); return; }
    if (!passwordResetService.validateToken(resetToken)) { setForgotError('Reset token is invalid or expired.'); return; }

    setForgotLoading(true);
    await passwordResetService.resetPassword(resetToken, newPassword);
    setForgotLoading(false);
    setForgotStep('success');
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep('email');
    setForgotEmail(email);
    setForgotError('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotError('');
  };

  // Render Forgot Password Modal / View
  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-100 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-surface-200 shadow-xl overflow-hidden">
          {/* Modal Header */}
          <div className="bg-navy-600 p-6 text-white relative">
            <button
              onClick={closeForgot}
              className="absolute top-4 right-4 p-1 rounded-lg text-white/60 hover:text-white hover:bg-navy-500/50 transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-300">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Password Recovery</h2>
                <p className="text-white/80 text-xs">HealthGrid IQ Account Support</p>
              </div>
            </div>
          </div>

          {/* Modal Content based on step */}
          <div className="p-6">
            {forgotStep === 'email' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-surface-500 text-sm mb-4">Enter your registered email address and we will generate a password recovery token.</p>
                {forgotError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{forgotError}</div>}
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="input-field pl-9 text-sm" placeholder="name@healthgrid.my" required />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={closeForgot} className="btn-outline flex-1 text-sm py-2">Cancel</button>
                  <button type="submit" disabled={forgotLoading} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2">
                    {forgotLoading ? 'Processing...' : 'Send Recovery Token'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'sent' && (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-purple-600 mx-auto" />
                  <h3 className="text-sm font-semibold text-purple-900">Recovery Token Generated</h3>
                  <p className="text-xs text-purple-700">Simulated email dispatched to <strong className="font-mono">{forgotEmail}</strong></p>
                </div>
                <div className="p-3 bg-surface-100 rounded-lg border border-surface-200 text-xs">
                  <span className="font-semibold text-surface-700">Simulated Reset Token:</span>{' '}
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-surface-300 text-purple-600 font-bold">{resetToken}</span>
                </div>
                <button onClick={() => setForgotStep('reset')} className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2">
                  Proceed to Reset Password <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {forgotStep === 'reset' && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                {forgotError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{forgotError}</div>}
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Reset Token</label>
                  <input type="text" value={resetToken} onChange={(e) => setResetToken(e.target.value)} className="input-field text-sm font-mono" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field pl-9 text-sm" placeholder="Min. 8 characters" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field pl-9 text-sm" placeholder="Re-enter new password" required />
                  </div>
                </div>
                <button type="submit" disabled={forgotLoading} className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2">
                  {forgotLoading ? 'Updating...' : 'Set New Password'} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {forgotStep === 'success' && (
              <div className="text-center space-y-4 py-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-bold text-surface-900">Password Reset Complete</h3>
                <p className="text-xs text-surface-500">Your password has been successfully updated. You can now sign in with your new password.</p>
                <button onClick={closeForgot} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
                  Back to Sign In <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Login UI with Clean Solid Aesthetic (No Gradients)
  return (
    <div className="min-h-screen flex bg-surface-50 font-sans">
      {/* Left Panel — Solid Corporate Branding (No Gradients) */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#0f172a] relative flex-col justify-between p-12 text-white">
        <div>
          {/* Official Theta Edge Logo Header Container */}
          <div className="bg-white rounded-xl p-4 inline-block mb-10 shadow-sm">
            <img 
              src="/assets/theta-logo.png" 
              alt="Theta Edge Berhad — Technology & Telecommunication" 
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-navy-800/80 border border-navy-700 rounded-full text-xs text-navy-200 font-medium">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Enterprise Healthcare Suite
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              HealthGrid <span className="text-emerald-400">IQ</span>
            </h1>
            <p className="text-base text-slate-300 font-medium">
              Clinical Imaging &amp; Diagnostic Platform
            </p>
          </div>

          <div className="mt-10 space-y-3 border-l-2 border-emerald-500/40 pl-4">
            <p className="text-slate-200 text-sm font-medium">Smarter workflows.</p>
            <p className="text-slate-200 text-sm font-medium">Sharper diagnostic insights.</p>
            <p className="text-slate-200 text-sm font-medium">Better patient outcomes.</p>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-3 gap-3 pt-8 border-t border-slate-800">
          <div className="flex items-center gap-2 p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-white text-xs font-semibold">Secure</p>
              <p className="text-slate-400 text-[10px]">HIPAA Compliant</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <Brain className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <p className="text-white text-xs font-semibold">Intelligent</p>
              <p className="text-slate-400 text-[10px]">AI Diagnostic</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <Heart className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-white text-xs font-semibold">Connected</p>
              <p className="text-slate-400 text-[10px]">PACS &amp; RIS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Clean Sign-In Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/assets/theta-logo.png" alt="Theta Edge" className="h-7 w-auto" />
            </div>
            <div className="ml-auto">
              <span className="badge-success text-[10px] inline-flex items-center gap-1">
                <Shield className="w-3 h-3" /> HIPAA Secure
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1">Sign in to access your secure clinical workspace.</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="input-field pl-10" 
                  placeholder="name@healthgrid.com" 
                  required 
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button 
                  type="button" 
                  onClick={openForgot} 
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="input-field pl-10 pr-10" 
                  placeholder="Enter your password" 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold">
              Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Access Roles */}
          <div className="pt-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Quick Access Roles</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {roleCards.map(({ role, label, sublabel, icon }) => (
                <button 
                  key={role} 
                  onClick={() => loginAsRole(role)} 
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-center group"
                >
                  <div className="w-8 h-8 bg-slate-100 group-hover:bg-purple-50 rounded-lg flex items-center justify-center text-slate-700 group-hover:text-purple-600 transition-colors">
                    {icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{label}</p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[80px]">{sublabel}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Demo Test Accounts Grid */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700">Demo Test Accounts</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">No password needed</span>
            </div>

            <p className="text-[11px] text-slate-500 mb-2 font-medium">🩻 Healthcare Centre Radiographers (1 per clinic)</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mb-3">
              {[
                { id: 'rad-001', name: 'Ahmad Razak',       clinic: 'Putrajaya' },
                { id: 'rad-002', name: 'Lim Mei Ling',      clinic: 'Cyberjaya' },
                { id: 'rad-003', name: 'Kumaran Pillai',    clinic: 'Bangi' },
                { id: 'rad-006', name: 'Zainal Abidin',     clinic: 'Tanjong Karang' },
                { id: 'rad-008', name: 'Syed Farid Hassan', clinic: 'Ijok' },
              ].map((u) => (
                <button
                  key={u.id}
                  onClick={() => loginAsUser(u.id)}
                  className="p-2 bg-slate-50 border border-slate-200 hover:bg-purple-50 hover:border-purple-300 rounded-lg transition-all text-left"
                >
                  <p className="text-xs font-semibold text-slate-800 truncate">{u.name}</p>
                  <p className="text-[10px] text-purple-700 font-medium truncate">{u.clinic}</p>
                </button>
              ))}
            </div>

            <details>
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-purple-600 select-none font-medium">
                View other roles (Dept Staff · Radiologist · Admin)
              </summary>
              <div className="mt-2 space-y-2">
                {(['Radiology Department', 'Radiologist', 'Administrator'] as const).map((role) => {
                  const roleLabel: Record<string, string> = {
                    'Radiology Department': '🏥 Dept. Staff',
                    'Radiologist': '🔬 Radiologist',
                    'Administrator': '🛡 Administrator',
                  };
                  const roleUsers = mockUsers.filter((u) => u.role === role && u.status === 'active');
                  if (!roleUsers.length) return null;
                  return (
                    <div key={role} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-[10px] font-semibold text-slate-500 mb-1">{roleLabel[role]}</p>
                      <div className="space-y-1">
                        {roleUsers.map((u) => (
                          <button 
                            key={u.id} 
                            onClick={() => loginAsUser(u.id)} 
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-slate-300 transition-colors text-left"
                          >
                            <div>
                              <p className="text-xs font-medium text-slate-800">{u.name}</p>
                              <p className="text-[10px] text-slate-500">{u.email}</p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>

          {/* User Registration Architecture Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <p className="text-xs text-slate-600 font-medium">
              Don't have an account? <span className="text-slate-800 font-semibold">Contact your System Administrator</span> to request account provisioning.
            </p>
          </div>

          {/* Footer Branding */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>&copy; 2026 Theta Edge Berhad</span>
            <span>Technology &amp; Telecommunication</span>
          </div>
        </div>
      </div>
    </div>
  );
}

