import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { SYSTEM_VERSION } from '../config/systemVersion';
import {
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

type ForgotStep = 'email' | 'sent';

export default function LoginPage() {
  const { login, sendPasswordReset } = useAuth();
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
      setError(err.message || 'Invalid credentials. Please try again.');
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
    <div className="min-h-screen w-full bg-[#f5f6f8] flex flex-col justify-between p-4 md:p-8 font-sans text-[#1F2937]">
      
      {/* ── FORGOT PASSWORD MODAL ────────────────────────────────────────── */}
      {showForgot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white border border-[#d9dde3] rounded-[4px] p-6 shadow-none space-y-4">
            <div className="flex items-center justify-between border-b border-[#d9dde3] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#0f5132]" />
                <h2 className="text-[16px] font-semibold text-[#111827]">Password Recovery</h2>
              </div>
              <button
                onClick={closeForgot}
                className="text-[#6B7280] hover:text-[#111827] text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {forgotStep === 'email' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-[14px] text-[#4B5563]">Enter your email address to receive password reset instructions.</p>
                {forgotError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-[4px] text-[13px] text-red-700 font-medium">
                    {forgotError}
                  </div>
                )}
                <div>
                  <label className="block text-[14px] font-medium text-[#1F2937] mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full h-[44px] px-3.5 bg-white border border-[#d9dde3] rounded-[4px] text-[14px] text-[#111827] focus:outline-none focus:border-[#0f5132]"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeForgot}
                    className="w-1/2 h-[40px] border border-[#d9dde3] rounded-[4px] text-[14px] font-medium hover:bg-[#f5f6f8] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-1/2 h-[40px] bg-[#0f5132] hover:bg-[#0b3e26] text-white rounded-[4px] text-[14px] font-semibold cursor-pointer"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'sent' && (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[4px] space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-[#0f5132] mx-auto" />
                  <h3 className="text-[15px] font-semibold text-[#0f5132]">Reset Link Sent</h3>
                  <p className="text-[13px] text-[#374151]">If an account exists for {forgotEmail}, instructions have been sent.</p>
                </div>
                <button
                  onClick={closeForgot}
                  className="w-full h-[40px] bg-[#0f5132] hover:bg-[#0b3e26] text-white rounded-[4px] text-[14px] font-semibold cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CENTERED LOGIN CARD ─────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center py-6 md:py-10">
        <div className="w-full max-w-[760px] bg-white border border-[#d9dde3] rounded-[4px] p-8 md:p-12 shadow-none my-auto">
          
          {/* Header Logos Row */}
          <div className="flex items-center justify-center gap-6 py-2">
            {/* Theta Logo (25-35% smaller than HealthGrid IQ) */}
            <img
              src="/assets/theta-logo.png"
              alt="Theta Edge Berhad"
              className="h-[28px] md:h-[30px] w-auto object-contain"
            />
            
            {/* Thin vertical divider */}
            <div className="h-9 w-px bg-[#d9dde3]" />

            {/* HealthGrid IQ Logo (Cropped to hide slogan) */}
            <div className="h-[38px] overflow-hidden flex items-start justify-center">
              <img
                src="/assets/healthgrid-logo.jpg"
                alt="HealthGrid IQ"
                className="h-[56px] -mt-1 object-cover object-top"
              />
            </div>
          </div>

          {/* Thin horizontal divider below logos */}
          <div className="w-full border-b border-[#d9dde3] my-8" />

          {/* Form Header */}
          <div className="mb-7">
            <h1 className="text-[28px] font-semibold text-[#111827] tracking-tight mb-1.5">Sign In</h1>
            <p className="text-[15px] text-[#4B5563]">Please enter your credentials to continue.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-[4px] text-[14px] text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleEmailLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-[14px] font-medium text-[#1F2937] mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[44px] px-3.5 bg-white border border-[#d9dde3] rounded-[4px] text-[14px] text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#0f5132] transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[14px] font-medium text-[#1F2937] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[44px] pl-3.5 pr-10 bg-white border border-[#d9dde3] rounded-[4px] text-[14px] text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#0f5132] transition-colors"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checkbox & Forgot Password Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[14px] text-[#374151]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 border-[#d9dde3] rounded-[2px] text-[#0f5132] focus:ring-0 cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={openForgot}
                className="text-[14px] text-[#0066cc] hover:underline font-normal cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full h-[44px] bg-[#0f5132] hover:bg-[#0b3e26] text-white text-[15px] font-semibold rounded-[4px] transition-colors cursor-pointer mt-2"
            >
              Sign In
            </button>
          </form>

        </div>
      </main>

      {/* ── PAGE FOOTER ─────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-[#d9dde3] pt-5 pb-3">
        <div className="max-w-[760px] mx-auto flex items-center justify-between text-[12px] text-[#6B7280]">
          <div>&copy; 2026 Theta Edge Berhad. All rights reserved.</div>
          <div>Version v{SYSTEM_VERSION}</div>
        </div>
      </footer>

    </div>
  );
}
