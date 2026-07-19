'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Shield, Key, Eye, EyeOff, HelpCircle, Server } from 'lucide-react';

export function AWSLogin() {
  const { login, error: authError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (!success) {
      setError(authError || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleAutofill = () => {
    setEmail('admin@example.com');
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#eaeded] flex flex-col items-center justify-between font-sans text-[#16191f] py-8 px-4" id="aws-login-page">
      {/* Top Header Logo */}
      <div className="w-full max-w-[420px] flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <svg className="w-12 h-8 text-[#232f3e]" viewBox="0 0 100 62" fill="currentColor">
            <path d="M78.6,35.1c-1-0.9-2.3-1.4-3.8-1.4c-2.3,0-4,1.3-4.9,3.8c-0.8,2.2-0.8,5.1,0,7.2c0.8,2.4,2.6,3.8,4.9,3.8c1.5,0,2.8-0.5,3.8-1.4V35.1z M86.6,52.3c-1.8,1.8-4.4,2.8-7.5,2.8c-4.8,0-8.6-2.6-9.7-7.4c-0.5-2.2-0.5-5.2,0-7.4c1.1-4.7,5-7.4,9.7-7.4c3.1,0,5.7,1,7.5,2.8V23.4h7.9v28.9H86.6z M51.9,35.1c-1-0.9-2.3-1.4-3.8-1.4c-2.3,0-4,1.3-4.9,3.8c-0.8,2.2-0.8,5.1,0,7.2c0.8,2.4,2.6,3.8,4.9,3.8c1.5,0,2.8-0.5,3.8-1.4V35.1z M59.9,52.3c-1.8,1.8-4.4,2.8-7.5,2.8c-4.8,0-8.6-2.6-9.7-7.4c-0.5-2.2-0.5-5.2,0-7.4c1.1-4.7,5-7.4,9.7-7.4c3.1,0,5.7,1,7.5,2.8V23.4h7.9v28.9H59.9z M22.7,29.9h8.8l5,16.5l4.8-16.5h8.1l-8.6,25H32L27,33.5l-5.1,21.4H13.1l-8.6-25h8.1l4.8,16.5L22.7,29.9z" />
            <path d="M12.9,56.5c16.3,6.2,39.6,8.6,59.3,5.1c8.7-1.5,18.4-4.8,24.4-11c1.3-1.3,0.3-2.6-1.1-2c-6.8,2.8-16.4,4.9-25.2,5.5c-18.4,1.2-39.7-1.1-55-7C14.3,46.7,11.5,50.1,12.9,56.5z" fill="#ff9900" />
          </svg>
          <span className="font-bold text-[#232f3e] text-lg tracking-wide border-l border-gray-400 pl-3">Console Sign In</span>
        </div>
      </div>

      {/* Main Login Box */}
      <div className="w-full max-w-[420px] bg-white border border-[#b8c2cc] p-8 shadow-md rounded">
        <h1 className="text-2xl font-bold text-[#16191f] mb-6">Sign in</h1>

        {/* User Type Selectors */}
        <div className="flex border-b border-[#eaeded] mb-6 text-sm">
          <button className="flex-1 pb-3 text-center border-b-2 border-[#ff9900] font-semibold text-[#16191f]">
            IAM User
          </button>
          <button className="flex-1 pb-3 text-center text-gray-400 cursor-not-allowed" disabled>
            Root User
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-600 p-3 mb-5 text-xs text-red-800 flex items-start space-x-2">
            <Shield className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Sign-in failed</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#16191f]" htmlFor="login-email">
              IAM User Email address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Key className="w-4 h-4" />
              </span>
              <input
                id="login-email"
                type="email"
                placeholder="e.g. admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-400 rounded focus:border-[#ff9900] focus:ring-1 focus:ring-[#ff9900] outline-none"
                required
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-[#16191f]" htmlFor="login-password">
                Password
              </label>
              <a href="#" className="text-xs text-[#0073bb] hover:underline" onClick={(e) => e.preventDefault()}>
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2 text-sm border border-gray-400 rounded focus:border-[#ff9900] focus:ring-1 focus:ring-[#ff9900] outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff9900] hover:bg-[#ec7211] text-[#16191f] font-bold text-sm py-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:ring-offset-2 transition duration-150 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>

        {/* Preset autofill section */}
        <div className="mt-8 pt-6 border-t border-[#eaeded]">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 mb-3">
            <Server className="w-4 h-4" />
            <span>MOCK ROUTE53 CONSOLE CREDENTIALS</span>
          </div>
          <div className="bg-[#f2f3f3] border border-[#d5dbdb] p-3.5 rounded text-xs">
            <p className="text-gray-600">
              This sandbox environment uses a local database initialized with default administrator credentials.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-1 text-[11px] text-gray-700 bg-white p-2 rounded border border-gray-300 font-mono">
              <div><span className="font-semibold text-gray-500">Email:</span></div>
              <div>admin@example.com</div>
              <div><span className="font-semibold text-gray-500">Password:</span></div>
              <div>password123</div>
            </div>
            <button
              onClick={handleAutofill}
              className="mt-3 w-full bg-[#0073bb] hover:bg-[#005a9e] text-white font-semibold text-xs py-1.5 px-3 rounded transition flex items-center justify-center space-x-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Auto-fill Demo Credentials</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-8 space-y-2">
        <div className="flex justify-center space-x-4">
          <a href="#" className="hover:underline" onClick={(e) => e.preventDefault()}>Terms of Use</a>
          <a href="#" className="hover:underline" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
          <a href="#" className="hover:underline" onClick={(e) => e.preventDefault()}>Security Notice</a>
        </div>
        <p>© 2026, Amazon Web Services, Inc. or its affiliates. All rights reserved.</p>
      </div>
    </div>
  );
}
