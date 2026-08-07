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
    <div className="h-screen w-screen overflow-hidden bg-[#f5f6f8] flex flex-col justify-between items-center p-8 font-sans text-[#111827]">
      
      {/* ── FORGOT PASSWORD MODAL ────────────────────────────────────────── */}
      {showForgot && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-[#d1d5db] rounded-[6px] p-6 space-y-4 shadow-none">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <h2 className="text-[16px] font-semibold text-[#111827]">Password Reset Request</h2>
              <button onClick={closeForgot} className="text-[#6b7280] hover:text-[#111827] text-xs cursor-pointer">✕</button>
            </div>

            {forgotStep === 'email' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-[#4b5563] text-[13px]">Enter your registered user email address below to receive password reset instructions.</p>
                {forgotError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium rounded-[4px]">
                    {forgotError}
                  </div>
                )}
                <div>
                  <label className="block text-[14px] font-medium text-[#374151] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d1d5db] rounded-[4px] text-[14px] text-[#111827] focus:outline-none focus:border-[#0A5236]"
                    placeholder="name@healthgrid.com"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button type="button" onClick={closeForgot} className="w-1/2 py-2 border border-[#d1d5db] rounded-[4px] text-[14px] font-medium text-[#374151] hover:bg-gray-50 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={forgotLoading} className="w-1/2 py-2 bg-[#0A5236] hover:bg-[#073d28] text-white rounded-[4px] text-[14px] font-semibold cursor-pointer">
                    {forgotLoading ? 'Processing...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'sent' && (
              <div className="space-y-4 text-center">
                <p className="text-[13px] text-[#374151] bg-[#f9fafb] p-3 border border-[#e5e7eb] rounded-[4px]">
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

      {/* ── CENTERED DESKTOP LOGIN CARD (OCCUPIES ~30-35% OF VIEWPORT WIDTH) ── */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 py-4">
        <main className="w-full max-w-[540px] bg-white border border-[#d1d5db] rounded-[6px] p-10 md:p-12 space-y-6 shadow-none">
          
          {/* Dual Logos Section (Theta logo ~30% smaller than HealthGrid logo) */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-6 py-1">
              <img
                src="/assets/theta-logo.png"
                alt="Theta Edge"
                className="h-9 w-auto object-contain"
              />
              <div className="w-[1px] h-12 bg-[#d1d5db]" />
              <img
                src="/assets/healthgrid-logo.jpg"
                alt="HealthGrid IQ"
                className="h-13 w-auto object-contain"
              />
            </div>
            {/* Thin Horizontal Divider Below Logos */}
            <div className="w-full h-[1px] bg-[#e5e7eb] mt-6 mb-2" />
          </div>

          {/* Title Header */}
          <div className="space-y-1">
            <h1 className="text-[28px] font-semibold text-[#111827] tracking-tight">Sign In</h1>
            <p className="text-[14px] text-[#6b7280] font-normal">
              Please enter your credentials to continue.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium rounded-[4px]">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
            {/* Email Address Field */}
            <div>
              <label className="block text-[14px] font-medium text-[#374151] mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#d1d5db] rounded-[4px] text-[14px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0A5236] transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[14px] font-medium text-[#374151] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-[#d1d5db] rounded-[4px] text-[14px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0A5236] transition-colors"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#4b5563] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-[14px]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-[3px] border-[#d1d5db] text-[#0A5236] focus:ring-0 cursor-pointer"
                />
                <span className="text-[#374151]">Remember me</span>
              </label>

              <button
                type="button"
                onClick={openForgot}
                className="text-[14px] font-normal text-[#2563eb] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Dark Green Sign In Button */}
            <button
              type="submit"
              className="w-full py-3 bg-[#0A5236] hover:bg-[#073d28] text-white font-semibold text-[15px] rounded-[4px] transition-colors cursor-pointer mt-1"
            >
              Sign In
            </button>
          </form>

          {/* HIS Clinical Demo Account Quick Selector (Subtle Testing Dropdown) */}
          <div className="pt-4 border-t border-[#e5e7eb]">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  loginAsRole(e.target.value as UserRole);
                }
              }}
              defaultValue=""
              className="w-full px-2.5 py-1.5 bg-[#f9fafb] border border-[#d1d5db] rounded-[4px] text-[12px] text-[#4b5563] cursor-pointer font-normal"
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

      {/* ── FOOTER SECTION (SUBTLE 12PX GREY TEXT WITH FULL-WIDTH TOP BORDER) ── */}
      <footer className="w-full max-w-[1200px] shrink-0 pb-2">
        <div className="w-full h-[1px] bg-[#d1d5db] mb-4" />
        <div className="flex items-center justify-between text-[12px] text-[#6b7280]">
          <p>&copy; 2026 Theta Edge Berhad. All rights reserved.</p>
          <p>Version v{SYSTEM_VERSION}</p>
        </div>
      </footer>

    </div>
  );
}
