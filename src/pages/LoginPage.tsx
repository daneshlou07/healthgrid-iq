import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { SYSTEM_VERSION } from '../config/systemVersion';
import { Eye, EyeOff } from 'lucide-react';

type ForgotStep = 'email' | 'sent';

export default function LoginPage() {
  const { login, loginAsRole, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen w-full bg-[#F3F4F6] flex flex-col justify-between items-center p-6 md:p-10 font-sans text-slate-800">
      
      {/* ── FORGOT PASSWORD MODAL ────────────────────────────────────────── */}
      {showForgot && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-md p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Password Reset Request</h2>
              <button onClick={closeForgot} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">✕</button>
            </div>

            {forgotStep === 'email' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-slate-600 text-xs">Enter your registered user email address below to receive password reset instructions.</p>
                {forgotError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-700 font-medium rounded-xs">
                    {forgotError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[4px] text-xs text-slate-900 focus:outline-none focus:border-[#0A5236]"
                    placeholder="name@healthgrid.com"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button type="button" onClick={closeForgot} className="w-1/2 py-2 border border-slate-300 rounded-[4px] text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={forgotLoading} className="w-1/2 py-2 bg-[#0A5236] hover:bg-[#073D28] text-white rounded-[4px] text-xs font-semibold cursor-pointer">
                    {forgotLoading ? 'Processing...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'sent' && (
              <div className="space-y-4 text-center">
                <p className="text-xs text-slate-700 bg-slate-50 p-3 border border-slate-200 rounded-[4px]">
                  A password reset link has been generated for <strong>{forgotEmail}</strong>.
                </p>
                <button onClick={closeForgot} className="w-full py-2 bg-[#0A5236] text-white rounded-[4px] text-xs font-semibold cursor-pointer">
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center w-full my-auto py-8">
        {/* ── MAIN SIGN IN CARD (EXACT MATCH TO SPECIFIED MOCKUP) ─────────── */}
        <main className="w-full max-w-[540px] bg-white border border-[#CBD5E1] rounded-[6px] p-8 md:p-12 space-y-7 shadow-xs">
          
          {/* Dual Logos Header Section */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-8 md:gap-10 py-3">
              <img
                src="/assets/theta-logo.png"
                alt="Theta Edge Berhad"
                className="h-14 md:h-20 lg:h-22 w-auto max-w-[200px] object-contain"
              />
              <div className="w-[1px] h-14 md:h-20 lg:h-22 bg-[#CBD5E1]" />
              <img
                src="/assets/healthgrid-logo.jpg"
                alt="HealthGrid IQ"
                className="h-14 md:h-20 lg:h-22 w-auto max-w-[220px] object-contain"
              />
            </div>
            {/* Horizontal Line Divider Below Logos */}
            <div className="w-full h-[1px] bg-[#E2E8F0] mt-8" />
          </div>

          {/* Title Header */}
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Sign In</h1>
            <p className="text-sm text-slate-500 font-normal">
              Please enter your credentials to continue.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 font-semibold rounded-[4px]">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs md:text-sm font-semibold text-slate-800 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-3 bg-white border border-[#CBD5E1] rounded-[4px] text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0A5236] transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs md:text-sm font-semibold text-slate-800 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-3 bg-white border border-[#CBD5E1] rounded-[4px] text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0A5236] transition-colors"
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

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs md:text-sm text-slate-700 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-[3px] border-[#CBD5E1] text-[#0A5236] focus:ring-0 cursor-pointer"
                />
                <span className="font-normal text-slate-700">Remember me</span>
              </label>

              <button
                type="button"
                onClick={openForgot}
                className="text-xs md:text-sm font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Solid Dark Green Primary Action Button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-[#0A5236] hover:bg-[#073D28] text-white font-bold text-sm rounded-[4px] transition-colors cursor-pointer mt-2 shadow-2xs"
            >
              Sign In
            </button>
          </form>

          {/* Quick Access Selector (HIS Clinical Demo Accounts) */}
          <div className="pt-5 border-t border-[#E2E8F0] space-y-2">
            <label className="block text-xs font-semibold text-slate-500 text-center">
              Quick Demo Role Select
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  loginAsRole(e.target.value as UserRole);
                }
              }}
              defaultValue=""
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] text-xs text-slate-700 focus:outline-none focus:border-[#0A5236] cursor-pointer font-medium"
            >
              <option value="" disabled>-- Select Role to Log In Instantly --</option>
              <option value="Medical Officer">Medical Officer (Dr. Ahmad R. - Putrajaya)</option>
              <option value="Radiographer">Radiographer (Lim Mei L. - Cyberjaya)</option>
              <option value="Radiologist">Radiologist (Dr. Kumaran S. - Bangi)</option>
              <option value="Administrator">IT Administrator (Zainal Ab. - Tanjong Karang)</option>
            </select>
          </div>

        </main>
      </div>

      {/* ── FOOTER SECTION WITH FULL-WIDTH TOP DIVIDER ─────────────────── */}
      <footer className="w-full max-w-5xl mx-auto pt-6 pb-2">
        <div className="w-full h-[1px] bg-[#CBD5E1] mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>&copy; 2026 Theta Edge Berhad. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>Version v{SYSTEM_VERSION}</span>
            <span className="text-slate-300">|</span>
            <span>Powered by Theta Edge Berhad</span>
          </p>
        </div>
      </footer>

    </div>
  );
}
