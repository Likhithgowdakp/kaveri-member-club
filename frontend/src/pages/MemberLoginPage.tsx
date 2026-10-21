import React, { useState } from 'react';
import { api, ApiError } from '../api/client';
import { Store, UserCheck, ArrowRight, Key, Award, CheckCircle2, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';

interface MemberLoginPageProps {
  onLoginSuccess: (memberData: any) => void;
  onNavigateToRegister: () => void;
  justLoggedOut?: boolean;
}

export const MemberLoginPage: React.FC<MemberLoginPageProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
  justLoggedOut = false,
}) => {
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(
    justLoggedOut ? 'You have logged out successfully. You can log back in anytime below.' : null
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberIdentifier.trim() || !password) {
      setErrorMsg('Please enter both your Member ID and Password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setNoticeMsg(null);

    try {
      const data = await api.memberLogin({
        member_identifier: memberIdentifier.trim(),
        password: password,
      });
      // Save session
      localStorage.setItem('kaveri_member_session', JSON.stringify(data));
      onLoginSuccess(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMsg('Invalid Member ID or Password. Please check your credentials and try again.');
        } else if (err.status === 403) {
          setErrorMsg(err.detail || 'Access restricted. Please contact Kaveri Electronic store.');
        } else {
          setErrorMsg(err.detail || 'Login failed. Please check your credentials.');
        }
      } else {
        setErrorMsg('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-14">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gold-900/20">
          <Store className="w-8 h-8 text-brand-950 font-bold" />
        </div>
        <span className="text-xs uppercase font-extrabold px-3 py-1 rounded-full bg-gold-500/20 text-gold-700 border border-gold-500/30">
          KAVERI ELECTRONIC HALAGURU
        </span>
        <h1 className="text-3xl font-black text-brand-950 mt-2 tracking-tight">
          Member Sign In
        </h1>
        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
          Access your digital loyalty card, points balance, and exclusive member discounts with your Member ID and Password.
        </p>
      </div>

      {noticeMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{noticeMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100">
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-brand-700" />
              <span>Kaveri Member ID or Mobile Number *</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. KAV-000001 or 9845123456"
              value={memberIdentifier}
              onChange={(e) => setMemberIdentifier(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 uppercase text-sm tracking-wide font-medium"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Your Member ID was issued at registration and sent to your phone via SMS.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-700" />
              <span>Password *</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-200 text-sm tracking-wide font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-brand-900 hover:bg-brand-800 transition-all shadow-md shadow-brand-950/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 text-sm cursor-pointer"
          >
            {loading ? (
              <span>Verifying & Signing In...</span>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-gold-400" />
                <span>Sign In with Member ID & Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Don't have a membership yet?{' '}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="font-bold text-brand-900 hover:underline cursor-pointer"
            >
              Join Kaveri Member Club
            </button>
          </p>
        </div>
      </div>

      {/* Info Badge */}
      <div className="mt-8 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-center space-x-3">
        <Award className="w-5 h-5 text-gold-600 flex-shrink-0" />
        <p className="leading-relaxed">
          Members receive <strong className="font-bold">50 welcome loyalty points</strong>, festival discounts, warranty tracking, and exclusive store benefits at HMS Complex, Halaguru!
        </p>
      </div>
    </div>
  );
};
