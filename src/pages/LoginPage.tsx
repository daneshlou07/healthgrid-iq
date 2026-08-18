import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SYSTEM_VERSION } from '../config/systemVersion';
import { Eye, EyeOff, ShoppingBag, ShieldCheck, X } from 'lucide-react';

type ForgotStep = 'email' | 'sent';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, registerMarketplaceUser } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Marketplace registration state
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please check your Email/Username and Password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim()) {
      setForgotError('Email address or User ID is required.');
      return;
    }

    setForgotLoading(true);
    try {
      const existingReqs = JSON.parse(localStorage.getItem('healthgrid_password_reset_requests') || '[]');
      const newReq = {
        id: `req-${Date.now()}`,
        identifier: forgotEmail.trim(),
        requestedAt: new Date().toISOString(),
        status: 'PENDING_ADMIN_ACTION',
      };
      localStorage.setItem('healthgrid_password_reset_requests', JSON.stringify([...existingReqs, newReq]));
      setForgotStep('sent');
    } catch (err: unknown) {
      setForgotError('Unable to log request. Please contact your System Admin directly.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim() || !regOrg.trim() || !regEmail.trim() || !regPassword) {
      setRegError('Please complete all required fields.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsRegistering(true);
    try {
      await registerMarketplaceUser({
        name: regName.trim(),
        email: regEmail.trim(),
        organization: regOrg.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      });
      setShowRegister(false);
      navigate('/marketplace');
    } catch (err: any) {
      setRegError(err.message || 'Failed to create marketplace account. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep('email');
    setForgotEmail(identifier.includes('@') ? identifier : identifier);
    setForgotError('');
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotError('');
  };

  const openRegister = () => {
    setShowRegister(true);
    setRegError('');
    setRegName('');
    setRegOrg('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
    setRegConfirmPassword('');
  };

  const closeRegister = () => {
    setShowRegister(false);
    setRegError('');
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#F4F5F7] flex flex-col justify-between items-center p-4 sm:p-6 font-sans text-[#111827]">

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
                <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] text-[13px] text-[#334155] space-y-1.5">
                  <p className="font-semibold text-[#0F172A]">System Security Policy Notice:</p>
                  <p className="leading-relaxed">To reset your account password, please submit your request below and contact a <strong>System Admin</strong> or <strong>Master Admin</strong>.</p>
                </div>

                {forgotError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium rounded-[4px]">
                    {forgotError}
                  </div>
                )}
                <div>
                  <label className="block text-[14px] font-medium text-[#1E293B] mb-1">Account Email or User ID</label>
                  <input
                    type="text"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-[14px] text-[#111827] focus:outline-none focus:border-[#0A5236]"
                    placeholder="Enter email or ID (e.g. rad-001)"
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
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[4px] text-[13px] text-emerald-900 space-y-1.5">
                  <p className="font-bold text-emerald-800">✓ Request Logged</p>
                  <p>Your password reset request for <strong>{forgotEmail}</strong> has been registered in the system.</p>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] text-[12px] space-y-2 text-[#334155]">
                  <p className="font-semibold text-[#0F172A]">Please contact system administration to issue your reset password:</p>
                  <ul className="list-disc pl-4 space-y-1 font-medium">
                    <li><strong>System Admin</strong>: Tan Wei Ming (<code>weiming.tan@healthgrid.my</code>)</li>
                    <li><strong>Master Admin</strong>: Master Administrator (<code>daneshlou05@gmail.com</code>)</li>
                  </ul>
                </div>

                <button onClick={closeForgot} className="w-full py-2 bg-[#0A5236] text-white rounded-[4px] text-[14px] font-semibold cursor-pointer">
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MARKETPLACE REGISTRATION MODAL ─────────────────────────────────── */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white border border-[#CBD5E1] rounded-xl p-6 sm:p-7 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF6F3] text-[#0F4C42]">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-[#112A28]">Marketplace Access Registration</h2>
                  <p className="text-[11px] text-[#64748B]">Institutional Procurement & Equipment Sourcing Account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeRegister}
                className="text-[#64748B] hover:text-[#111827] text-sm p-1 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 bg-[#EFF6F3] border border-[#CDE1DA] rounded-lg text-xs text-[#0F4C42] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>Authorized Procurement Access</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#45645E]">
                This registration provides access to browse medical/facility equipment, submit RFQ quotation requests, and track lead times.
              </p>
            </div>

            {regError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 font-medium rounded-lg">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F4C42]"
                  placeholder="e.g. Dr. Jason Lee / Sarah Ahmad"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                  Healthcare Facility / Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={regOrg}
                  onChange={(e) => setRegOrg(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F4C42]"
                  placeholder="e.g. Pantai Hospital Cheras / Apex Medical Center"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                    Institutional Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F4C42]"
                    placeholder="name@organization.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F4C42]"
                    placeholder="+60 12-345 6789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F4C42]"
                      placeholder="Min 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F4C42]"
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={closeRegister}
                  className="w-1/2 py-2.5 border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#1E293B] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-1/2 py-2.5 bg-[#0F4C42] hover:bg-[#0B3831] text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isRegistering ? 'Creating Account...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CENTERED DESKTOP LOGIN CARD (EXACT TWIN-BOX DUAL LOGOS AT TOP) ── */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 py-6">
        <main className="w-full max-w-[580px] bg-white border border-[#CBD5E1] rounded-[6px] p-6 sm:p-8 md:p-8 space-y-5 shadow-xs">

          {/* HealthGrid IQ Logo Header */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center">
              <img
                src="/assets/healthgrid-iq-logo.png"
                alt="HealthGrid IQ"
                className="h-[64px] w-auto object-contain"
              />
            </div>

            <div className="w-[90%] h-[1px] bg-[#E2E8F0] mt-3 mb-1 mx-auto" />
          </div>

          {/* Title Header */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-[28px] font-bold">Sign In</h1>
            <p className="text-xs sm:text-[14px] text-[#475569] font-normal">
              Please enter your credentials to continue.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium rounded-[4px]">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Identifier Field (Email Address or Username) */}
            <div>
              <label className="block text-[14px] font-medium text-[#1E293B] mb-1.5">
                Email Address or Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-3 bg-white border border-[#CBD5E1] rounded-[4px] text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0A5236] transition-colors"
                placeholder="Enter your email or username"
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

            {/* Forgot Password Row */}
            <div className="flex items-center justify-end text-[14px] pt-0.5">
              <button
                type="button"
                onClick={openForgot}
                className="text-[14px] font-medium text-[#64748B] hover:text-[#0A5236] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Dark Green Sign In Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-[#0A5236] hover:bg-[#073D28] text-white font-semibold text-[15px] rounded-[8px] transition-colors cursor-pointer mt-1 disabled:opacity-50"
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* ── SELF-SERVICE MARKETPLACE REGISTRATION ENTRY ── */}
          <div className="pt-4 border-t border-[#E2E8F0] text-center">
            <p className="text-xs text-[#64748B]">
              Procuring equipment for your hospital or clinic?
            </p>
            <button
              type="button"
              onClick={openRegister}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#0F4C42] hover:text-[#0B3831] hover:underline cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Register for Marketplace Access</span>
            </button>
          </div>

        </main>
      </div>

      {/* ── FOOTER SECTION ── */}
      <footer className="w-full max-w-[1200px] shrink-0 pt-2 pb-3 px-2">
        <div className="w-full h-[1px] bg-[#CBD5E1] mb-3" />
        <div className="flex items-center justify-between text-[12px] text-[#64748B]">
          <p>&copy; 2026 Theta Edge Berhad.</p>
          <p>{SYSTEM_VERSION}</p>
        </div>
      </footer>

    </div>
  );
}
