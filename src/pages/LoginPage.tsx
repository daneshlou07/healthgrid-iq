import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { mockUsers } from '../services/mockData';
import {
  Stethoscope,
  ScanLine,
  FileSearch,
  Settings,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Brain,
  Heart,
  ArrowLeft,
  CheckCircle,
  KeyRound,
} from 'lucide-react';

const roleCards: { role: UserRole; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { role: 'Doctor', label: 'Doctor', sublabel: 'Workspace', icon: <Stethoscope className="w-6 h-6" /> },
  { role: 'Radiographer', label: 'Radiographer', sublabel: 'Workspace', icon: <ScanLine className="w-6 h-6" /> },
  { role: 'Radiologist', label: 'Radiologist', sublabel: 'Workspace', icon: <FileSearch className="w-6 h-6" /> },
  { role: 'Radiology Department', label: 'Operations', sublabel: 'Dispatch', icon: <Brain className="w-6 h-6" /> },
  { role: 'Administrator', label: 'IT Admin', sublabel: 'Panel', icon: <Settings className="w-6 h-6" /> },
];

// Simulated password reset service (replaceable with real provider)
const passwordResetService = {
  validateEmail: (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  accountExists: (email: string): boolean => mockUsers.some((u) => u.email === email),
  generateToken: (): string => `reset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  sendResetEmail: async (email: string, token: string): Promise<void> => {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1000));
    console.log(`[SIMULATED] Reset email sent to ${email} with token: ${token}`);
  },
  validateToken: (token: string): boolean => token.startsWith('reset-'),
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await new Promise((r) => setTimeout(r, 500));
    console.log(`[SIMULATED] Password reset with token: ${token}`);
  },
};

type ForgotStep = 'email' | 'sent' | 'reset' | 'success';

export default function LoginPage() {
  const { login, loginAsRole, loginAsUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    // Always show success message regardless of whether account exists (security best practice)
    await passwordResetService.sendResetEmail(forgotEmail, token);
    setForgotLoading(false);
    setForgotStep('sent');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!newPassword) { setForgotError('Password cannot be empty.'); return; }
    if (newPassword.length < 8) { setForgotError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setForgotError('Passwords do not match.'); return; }
    if (!passwordResetService.validateToken(resetToken)) { setForgotError('Reset token is invalid or expired.'); return; }

    setForgotLoading(true);
    await passwordResetService.resetPassword(resetToken, newPassword);
    setForgotLoading(false);
    setResetToken(''); // Invalidate token
    setForgotStep('success');
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep('email');
    setForgotEmail('');
    setForgotError('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotStep('email');
    setForgotError('');
  };

  // Forgot Password UI
  if (showForgot) {
    return (
      <div className="min-h-screen flex">
        {/* Left Panel — same branding */}
        <div className="hidden lg:flex lg:w-[45%] bg-navy-600 relative overflow-hidden flex-col justify-between p-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-navy-400 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
          </div>
          <div className="relative z-10">
            <div className="mb-16">
              <p className="text-white/60 text-xs font-medium tracking-widest uppercase">Theta Edge Berhad</p>
              <p className="text-white/40 text-xs mt-0.5">Technology & Telecommunication</p>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight">HealthGrid <span className="text-emerald-400">IQ</span></h1>
              <p className="text-lg text-white/70 mt-2">Clinical Imaging & Diagnostic Platform</p>
              <div className="mt-8 space-y-2">
                <p className="text-white/80 text-base">Secure password recovery.</p>
                <p className="text-white/80 text-base">HIPAA-compliant workflow.</p>
                <p className="text-white/80 text-base">Zero-trust security.</p>
              </div>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-8 pt-8">
            <div className="flex items-center gap-2"><div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-emerald-400" /></div><div><p className="text-white text-xs font-medium">Encrypted</p><p className="text-white/50 text-[10px]">End-to-End</p></div></div>
            <div className="flex items-center gap-2"><div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center"><KeyRound className="w-4 h-4 text-purple-300" /></div><div><p className="text-white text-xs font-medium">Token-Based</p><p className="text-white/50 text-[10px]">Secure Reset</p></div></div>
          </div>
        </div>

        {/* Right Panel — Forgot Password Flow */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            {forgotStep === 'email' && (
              <div>
                <button onClick={closeForgot} className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-navy-600 mb-6 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
                <h2 className="text-2xl font-bold text-navy-800 mb-1">Forgot Password</h2>
                <p className="text-surface-500 text-sm mb-8">Enter your email address and we'll send you a password reset link.</p>

                <form onSubmit={handleForgotSubmit} className="space-y-5">
                  {forgotError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{forgotError}</div>}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="input-field pl-10" placeholder="name@healthgrid.my" required />
                    </div>
                  </div>
                  <button type="submit" disabled={forgotLoading} className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50">
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'} {!forgotLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>

                <p className="text-[11px] text-surface-400 mt-6 text-center">
                  For security, we'll send a reset link regardless of whether the account exists.
                </p>
              </div>
            )}

            {forgotStep === 'sent' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-navy-800 mb-2">Check Your Email</h2>
                <p className="text-surface-500 text-sm mb-2">If an account exists with <span className="font-medium text-surface-700">{forgotEmail}</span>, a password reset link has been sent.</p>
                <p className="text-surface-400 text-xs mb-8">The link will expire in 15 minutes.</p>

                {/* Simulated: direct access to reset form for prototype */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <p className="text-xs text-blue-700 font-medium mb-1">Prototype Mode</p>
                  <p className="text-xs text-blue-600">In production, the user would click a link in their email. For testing, click below to proceed directly.</p>
                </div>

                <button onClick={() => setForgotStep('reset')} className="btn-primary w-full py-3">
                  Proceed to Reset Password
                </button>
                <button onClick={closeForgot} className="btn-ghost w-full mt-3 text-sm">
                  Back to Sign In
                </button>
              </div>
            )}

            {forgotStep === 'reset' && (
              <div>
                <button onClick={() => setForgotStep('sent')} className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-navy-600 mb-6 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h2 className="text-2xl font-bold text-navy-800 mb-1">Reset Password</h2>
                <p className="text-surface-500 text-sm mb-8">Create a new password for your account.</p>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  {forgotError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{forgotError}</div>}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field pl-10 pr-10" placeholder="Min. 8 characters" required />
                      <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPassword && newPassword.length < 8 && <p className="text-[10px] text-amber-600 mt-1">Minimum 8 characters required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field pl-10" placeholder="Re-enter password" required />
                    </div>
                    {newPassword && confirmPassword && newPassword !== confirmPassword && <p className="text-[10px] text-red-500 mt-1">Passwords do not match</p>}
                  </div>

                  <div className="p-3 bg-surface-50 border border-surface-200 rounded-lg">
                    <p className="text-[10px] font-medium text-surface-600 mb-1">Password Requirements:</p>
                    <ul className="text-[10px] text-surface-500 space-y-0.5 list-disc list-inside">
                      <li className={newPassword.length >= 8 ? 'text-emerald-600' : ''}>Minimum 8 characters</li>
                      <li className={newPassword && confirmPassword && newPassword === confirmPassword ? 'text-emerald-600' : ''}>Both fields must match</li>
                    </ul>
                  </div>

                  <button type="submit" disabled={forgotLoading} className="btn-primary w-full py-3 disabled:opacity-50">
                    {forgotLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </div>
            )}

            {forgotStep === 'success' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-navy-800 mb-2">Password Reset Complete</h2>
                <p className="text-surface-500 text-sm mb-8">Your password has been updated successfully. You can now sign in with your new password.</p>
                <button onClick={closeForgot} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  Back to Sign In <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Login UI
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-navy-600 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-navy-400 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative z-10">
          <div className="mb-16">
            <p className="text-white/60 text-xs font-medium tracking-widest uppercase">Theta Edge Berhad</p>
            <p className="text-white/40 text-xs mt-0.5">Technology & Telecommunication</p>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">HealthGrid <span className="text-emerald-400">IQ</span></h1>
            <p className="text-lg text-white/70 mt-2">Clinical Imaging & Diagnostic Platform</p>
            <div className="mt-8 space-y-2">
              <p className="text-white/80 text-base">Smarter workflows.</p>
              <p className="text-white/80 text-base">Sharper insights.</p>
              <p className="text-white/80 text-base">Better patient outcomes.</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-8 pt-8">
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-emerald-400" /></div><div><p className="text-white text-xs font-medium">Secure</p><p className="text-white/50 text-[10px]">HIPAA Compliant</p></div></div>
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center"><Brain className="w-4 h-4 text-purple-300" /></div><div><p className="text-white text-xs font-medium">Intelligent</p><p className="text-white/50 text-[10px]">AI-Powered</p></div></div>
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center"><Heart className="w-4 h-4 text-emerald-400" /></div><div><p className="text-white text-xs font-medium">Connected</p><p className="text-white/50 text-[10px]">Real-time</p></div></div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-6">
            <span className="badge-success text-[10px]"><Shield className="w-3 h-3 mr-1" /> HIPAA Secure</span>
          </div>
          <h2 className="text-2xl font-bold text-navy-800 mb-1">Welcome back</h2>
          <p className="text-surface-500 text-sm mb-8">Sign in to continue to your secure workspace.</p>

          <form onSubmit={handleEmailLogin} className="space-y-5">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-10" placeholder="name@healthgrid.com" required />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-surface-700">Password</label>
                <button type="button" onClick={openForgot} className="text-xs text-purple-500 hover:text-purple-600 font-medium">Forgot Password?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pl-10 pr-10" placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-3">Sign In <ArrowRight className="w-4 h-4" /></button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-surface-300" />
              <span className="text-xs text-surface-500 font-medium">Quick Access</span>
              <div className="flex-1 h-px bg-surface-300" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {roleCards.map(({ role, label, sublabel, icon }) => (
                <button key={role} onClick={() => loginAsRole(role)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-surface-300 hover:border-navy-300 hover:bg-surface-100 transition-all duration-150 group">
                  <div className="w-10 h-10 bg-surface-100 group-hover:bg-navy-50 rounded-lg flex items-center justify-center text-navy-600 transition-colors">{icon}</div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-surface-800">{label}</p>
                    <p className="text-[10px] text-surface-500">{sublabel}</p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-surface-400 group-hover:text-navy-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between text-[11px] text-surface-400">
            <span>Need help? <button className="text-purple-500 hover:text-purple-600 font-medium">Contact Support</button></span>
            <span>&copy; 2026 Theta Edge Berhad. All rights reserved.</span>
          </div>

          {/* Test Accounts — Radiographers */}
          <details className="mt-6">
            <summary className="text-[11px] text-surface-400 cursor-pointer hover:text-navy-600 select-none">
              Test Accounts (Radiographers)
            </summary>
            <div className="mt-2 p-3 bg-surface-100 border border-surface-200 rounded-lg space-y-1.5">
              {mockUsers.filter((u) => u.role === 'Radiographer' && u.status === 'active').map((u) => (
                <button key={u.id} onClick={() => loginAsUser(u.id)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white border border-transparent hover:border-surface-300 transition-colors text-left">
                  <div>
                    <p className="text-xs font-medium text-surface-800">{u.name}</p>
                    <p className="text-[10px] text-surface-500">{u.email}</p>
                  </div>
                  <span className="text-[9px] text-surface-400">{u.deploymentLocationId || 'Unassigned'}</span>
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
