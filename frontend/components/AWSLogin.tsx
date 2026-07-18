import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { ShieldCheck, Info, Eye, EyeOff } from 'lucide-react';

export const AWSLogin: React.FC = () => {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setSubmitError('Please enter both email and password.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setSubmitError(err.message || 'Invalid IAM Username or Password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eaeded] flex flex-col justify-between font-sans">
      {/* Top Header */}
      <div className="bg-[#232f3e] py-3 px-6 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* AWS Logo Symbol */}
          <div className="bg-aws-orange text-white p-1.5 rounded font-black tracking-tight text-xs flex items-center justify-center">
            aws
          </div>
          <span className="text-white text-sm font-semibold tracking-wide">
            Amazon Web Services
          </span>
        </div>
        <div className="text-white text-xs hover:underline cursor-pointer">
          Support
        </div>
      </div>

      {/* Main Login Frame */}
      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-[#b8c2cc] shadow-sm rounded p-8">
          
          {/* Logo & Sign In Header */}
          <div className="mb-6 flex flex-col items-center">
            <div className="flex items-center space-x-1.5 text-aws-orange mb-2">
              <ShieldCheck className="w-8 h-8" />
              <span className="text-lg font-bold text-aws-text">AWS Management Console</span>
            </div>
            <h1 className="text-xl font-medium text-aws-text mt-2 text-center">
              Sign in as IAM user
            </h1>
          </div>

          {/* Alert Credentials Box */}
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-900 rounded p-4 text-xs flex items-start space-x-2.5">
            <Info className="w-5 h-5 text-aws-blue shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-aws-blue mb-1">Mock AWS Console Sandbox Credentials</p>
              <p className="text-aws-text-muted mb-1">Use these pre-configured login details:</p>
              <div className="font-mono mt-1 space-y-0.5">
                <div>Email: <span className="font-semibold text-aws-text">admin@example.com</span></div>
                <div>Password: <span className="font-semibold text-aws-text">password123</span></div>
              </div>
            </div>
          </div>

          {/* Login Error Alert */}
          {submitError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-600 text-red-900 p-3 rounded text-xs">
              <p className="font-semibold">Authentication Alert</p>
              <p>{submitError}</p>
            </div>
          )}

          {/* IAM Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Account ID (Disabled AWS standard) */}
            <div>
              <label className="block text-xs font-semibold text-aws-text-muted uppercase tracking-wider mb-1">
                Account ID (12-digit) or alias
              </label>
              <input
                type="text"
                value="4725-1425-7619 (Route53-Mock-Account)"
                disabled
                className="w-full px-3 py-2 border border-[#b8c2cc] bg-gray-100 text-gray-500 rounded text-sm font-mono cursor-not-allowed"
              />
            </div>

            {/* Email/IAM User Name */}
            <div>
              <label className="block text-xs font-semibold text-aws-text mb-1">
                IAM user name (Email)
              </label>
              <input
                type="email"
                id="email_input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@example.com"
                required
                className="w-full px-3 py-2 border border-[#b8c2cc] rounded text-sm input-focus-ring"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-aws-text">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-aws-blue hover:underline flex items-center space-x-1"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password_input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 border border-[#b8c2cc] rounded text-sm input-focus-ring"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="signin_btn"
              disabled={isSubmitting}
              className={`w-full py-2.5 px-4 bg-aws-orange hover:bg-aws-orange-hover text-white font-medium rounded text-sm shadow-sm transition flex items-center justify-center ${
                isSubmitting ? 'opacity-80 cursor-wait' : ''
              }`}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Links Grid */}
          <div className="mt-6 pt-4 border-t border-[#eaeded] grid grid-cols-2 gap-2 text-xs text-aws-blue">
            <span className="hover:underline cursor-pointer">Sign in to different account</span>
            <span className="hover:underline cursor-pointer text-right">Forgot password?</span>
            <span className="hover:underline cursor-pointer col-span-2 mt-2 text-center text-aws-text-muted">
              AWS Route53 console session lasts 24h
            </span>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-[#b8c2cc] py-4 text-center text-[11px] text-aws-text-muted space-y-1">
        <div className="flex justify-center space-y-0 space-x-4">
          <span className="hover:underline cursor-pointer">Terms of Use</span>
          <span className="hover:underline cursor-pointer">Privacy Policy</span>
          <span className="hover:underline cursor-pointer">Cookie Preferences</span>
        </div>
        <div>© 2026, Amazon Web Services, Inc. or its affiliates. All rights reserved.</div>
      </div>
    </div>
  );
};
