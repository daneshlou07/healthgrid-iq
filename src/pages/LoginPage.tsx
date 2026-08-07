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
    <div className="fixed inset-0 overflow-hidden bg-[#F4F5F7] flex flex-col justify-between items-center p-4 sm:p-6 font-sans text-[#111827]">
      
      {/* ── FORGOT PASSWORD MODAL ────────────────────────────────────────── */}
      {showForgot && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4 shadow-none">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h2 className="text-[16px] font-semibold text-[#111827]">Password Reset Request</h2>
              <button onClick={closeForgot} className="text-[#64748B] hover:text-[#111827] text-xs cursor-pointer">✕</button>
            </div>

            {forgotStep === 'email' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-[#475569] text-[13px]">Enter your registered user email address below to receive password reset instructions.</p>
                {forgotError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium rounded-[4px]">
                    {forgotError}
                  </div>
                )}
                <div>
                  <label className="block text-[14px] font-medium text-[#1E293B] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-[14px] text-[#111827] focus:outline-none focus:border-[#0A5236]"
                    placeholder="name@healthgrid.com"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button type="button" onClick={closeForgot} className="w-1/2 py-2 border border-[#CBD5E1] rounded-[4px] text-[14px] font-medium text-[#1E293B] hover:bg-gray-50 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={forgotLoading} className="w-1/2 py-2 bg-[#0A5236] hover:bg-[#073D28] text-white rounded-[4px] text-[14px] font-semibold cursor-pointer">
                    {forgotLoading ? 'Processing...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'sent' && (
              <div className="space-y-4 text-center">
                <p className="text-[13px] text-[#1E293B] bg-[#F8FAFC] p-3 border border-[#E2E8F0] rounded-[4px]">
                  A password reset link has been sent to <strong>{forgotEmail}</strong>.
                </p>
                <button onClick={closeForgot} className="w-full py-2 bg-[#0A5236] text-white rounded-[4px] text-[14px] font-semibold cursor-pointer">
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CENTERED DESKTOP LOGIN CARD (EXACT 30-35% SCREEN WIDTH, ZERO SCROLLING) ── */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 py-2">
        <main className="w-full max-w-[540px] bg-white border border-[#CBD5E1] rounded-[8px] p-7 sm:p-9 md:p-10 space-y-5 shadow-xs">
          
          {/* Dual Logos Section (Prominent, Large & Balanced) */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-7 sm:gap-9 py-2">
              <img
                src="/assets/theta-logo.png"
                alt="Theta Edge"
                className="h-14 sm:h-16 md:h-16 max-h-[58px] w-auto max-w-[190px] object-contain shrink-0"
              />
              <div className="w-[1px] h-14 sm:h-16 md:h-16 bg-[#CBD5E1] shrink-0" />
              <img
                src="/assets/healthgrid-logo.jpg"
                alt="HealthGrid IQ"
                className="h-14 sm:h-16 md:h-16 max-h-[58px] w-auto max-w-[240px] object-contain shrink-0 scale-110"
              />
            </div>
            {/* Thin Horizontal Divider Below Logos */}
            <div className="w-full h-[1px] bg-[#E2E8F0] mt-5 mb-1" />
          </div>

          {/* Title Header */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-[28px] font-semibold text-[#0F172A] tracking-tight">Sign In</h1>
            <p className="text-xs sm:text-[14px] text-[#475569] font-normal">
              Please enter your credentials to continue.
            </p>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-[13px] text-red-700 font-semibold rounded-[4px]">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email Address Field */}
            <div>
              <label className="block text-[14px] font-medium text-[#1E293B] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0A5236] transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[14px] font-medium text-[#1E293B] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0A5236] transition-colors"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-[14px] pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-[3px] border-[#CBD5E1] text-[#0A5236] focus:ring-0 cursor-pointer"
                />
                <span className="text-[#1E293B]">Remember me</span>
              </label>

              <button
                type="button"
                onClick={openForgot}
                className="text-[14px] font-normal text-[#2563EB] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Dark Green Sign In Button */}
            <button
              type="submit"
              className="w-full py-3 bg-[#0A5236] hover:bg-[#073D28] text-white font-semibold text-[15px] rounded-[4px] transition-colors cursor-pointer mt-1"
            >
              Sign In
            </button>
          </form>

          {/* HIS Clinical Demo Account Quick Selector (Subtle Testing Dropdown) */}
          <div className="pt-3.5 border-t border-[#E2E8F0]">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  loginAsRole(e.target.value as UserRole);
                }
              }}
              defaultValue=""
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] text-[12px] text-[#475569] cursor-pointer font-normal hover:border-[#94A3B8] transition-colors"
            >
              <option value="" disabled>-- Demo Quick Role Login (HIS System) --</option>
              <option value="Medical Officer">Medical Officer (Dr. Ahmad R. - Putrajaya)</option>
              <option value="Radiographer">Radiographer (Lim Mei L. - Cyberjaya)</option>
              <option value="Radiologist">Radiologist (Dr. Kumaran S. - Bangi)</option>
              <option value="Administrator">IT Administrator (Zainal Ab. - Tanjong Karang)</option>
            </select>
          </div>

        </main>
      </div>

      {/* ── FOOTER SECTION (STRICT NO-SCROLL SINGLE VIEWPORT) ── */}
      <footer className="w-full max-w-[1200px] shrink-0 pt-2 pb-3 px-2">
        <div className="w-full h-[1px] bg-[#CBD5E1] mb-3" />
        <div className="flex items-center justify-between text-[12px] text-[#64748B]">
          <p>&copy; 2026 Theta Edge Berhad. All rights reserved.</p>
          <p>Version {SYSTEM_VERSION}</p>
        </div>
      </footer>

    </div>
  );
}
